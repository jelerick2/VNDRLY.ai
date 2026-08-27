import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Camera, FileText, History, Loader2, RefreshCw, Search, Sheet, Shield } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  NATIONAL_PLATE_STATE_FALLBACK,
  PLATE_OCR_STATE_CONFIDENCE_THRESHOLD,
  normalizePlateState,
  plateMatchKey,
  type PlateStateCode,
} from "@workspace/plate-state";

import AmberButton from "@/components/amber-button";
import BlueButton from "@/components/blue-button";
import { LiveConnectionPill } from "@/components/live-connection-pill";
import { GateMemoryInput } from "@/components/gate-memory-input";
import { PlateStatePicker } from "@/components/plate-state-picker";
import { Card, CardContent, CardHeader, CardTitle, CARD_INNER_TILE_CLASS, CARD_TITLE_ICON_CLASS } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useBrand } from "@/hooks/use-brand";
import { useGateLiveMonitor } from "@/hooks/use-gate-live-monitor";
import { FIELD_OPS_PAGE_CLASS } from "@/lib/field-ops-content-pane";
import { exportExcel, exportPdf, exportWord, latestVisitForPlate, toGateLogRows } from "@/lib/gatekeeper-log-export";
import { pickDefaultGateHostKey, resolveAssignedGateSites, shouldApplyDefaultGateSite } from "@/lib/gate-default-site";
import {
  draftsEqual,
  evaluateGateMemory,
  fillFromVisit,
  mergeGateFill,
  pickSuggestionFill,
  type GateEntryDraft,
  type GateMemoryField,
  type GateMemorySuggestion,
} from "@/lib/gate-entry-memory";
import { parseGateVoiceEntry } from "@/lib/gate-voice-entry";
import { listAllVisits, visitsApi, type SiteContext } from "@/lib/visits-api";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function evidenceUrl(path: string): string {
  return path.startsWith("/objects/") ? `${BASE}/api/storage${path}` : path;
}

type Coordinates = { latitude: number; longitude: number };
type Translate = (key: string) => string;
type PlateAutoFillField = "firstName" | "lastName" | "company" | "purpose" | "expectedDuration";
type PlateAutoFillSnapshot = {
  matchKey: string;
  values: Partial<Record<PlateAutoFillField, string>>;
};
const PLATE_AUTO_FILL_FIELDS: PlateAutoFillField[] = [
  "firstName",
  "lastName",
  "company",
  "purpose",
  "expectedDuration",
];

type GateSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } }; length: number } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function currentPosition(required: boolean, t: Translate): Promise<Coordinates | undefined> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      if (required) reject(new Error(t("gatekeeper.locationUnavailable")));
      else resolve(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => required ? reject(new Error(t("gatekeeper.locationDenied"))) : resolve(undefined),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}

async function uploadEvidence(file: File, t: Translate): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(t("gatekeeper.selectImage"));
  if (file.size > 8 * 1024 * 1024) throw new Error(t("gatekeeper.photoTooLarge"));
  const request = await fetch(`${BASE}/api/storage/uploads/request-url`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name || `gate-photo-${Date.now()}.jpg`, size: file.size, contentType: file.type || "image/jpeg" }),
  });
  if (!request.ok) throw new Error(t("gatekeeper.photoPrepareFailed"));
  const descriptor = await request.json() as { uploadURL: string; objectPath: string };
  const uploadUrl = /^https?:\/\//i.test(descriptor.uploadURL) ? descriptor.uploadURL : `${BASE}${descriptor.uploadURL}`;
  const upload = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
  if (!upload.ok) throw new Error(upload.status === 413 ? t("gatekeeper.photoTooLarge") : t("gatekeeper.photoUploadFailed"));
  const finalize = await fetch(`${BASE}/api/storage/uploads/finalize`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectURL: descriptor.uploadURL, visibility: "private", purpose: "gate-evidence" }),
  });
  if (!finalize.ok) throw new Error(t("gatekeeper.photoFinalizeFailed"));
  return descriptor.objectPath;
}

async function deleteUnattachedEvidence(objectPath: string | null): Promise<void> {
  if (!objectPath) return;
  await fetch(`${BASE}/api/storage/uploads`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectPath }),
  }).catch(() => undefined);
}

export default function GatekeeperPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const brand = useBrand();
  const iconStyle = { color: brand.isOrgBranded ? brand.primary : "#f59e0b" };
  const queryClient = useQueryClient();
  const plateInput = useRef<HTMLInputElement>(null);
  const vehicleInput = useRef<HTMLInputElement>(null);
  const appliedDefault = useRef(false);
  const plateAutoFillRef = useRef<PlateAutoFillSnapshot | null>(null);
  const [siteCode, setSiteCode] = useState("");
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);
  const [hostKey, setHostKey] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [plateState, setPlateState] = useState<PlateStateCode | null>(null);
  const [plateStateError, setPlateStateError] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("");
  const [duration, setDuration] = useState("60");
  const [platePhotoUrl, setPlatePhotoUrl] = useState<string | null>(null);
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const recognitionRef = useRef<GateSpeechRecognition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMemoryField, setActiveMemoryField] = useState<GateMemoryField | null>(null);
  const [memoryDeleting, setMemoryDeleting] = useState(false);
  const [plateOcrStatus, setPlateOcrStatus] = useState<"idle" | "reading" | "read" | "unreadable">("idle");
  const [ocrPlate, setOcrPlate] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const visits = useQuery({
    queryKey: ["gatekeeper-visits"],
    queryFn: () => visitsApi.list({ activeOnly: true, limit: 1000 }),
    refetchInterval: 30000,
    retry: false,
  });
  const recentVisits = useQuery({
    queryKey: ["gatekeeper-recent-visits"],
    queryFn: () => visitsApi.list({ limit: 1000 }),
    retry: false,
  });
  const assigned = useQuery({
    queryKey: ["gatekeeper-assigned-sites", user?.vendorId],
    queryFn: () =>
      resolveAssignedGateSites({
        vendorId: user?.vendorId ?? null,
        listAssigned: () => visitsApi.listAssignedGateSites(),
        getSiteContext: (code) => visitsApi.getSiteContext(code),
      }),
    retry: false,
  });
  const site = useQuery<SiteContext>({
    queryKey: ["gatekeeper-site-context", confirmedCode],
    queryFn: () => visitsApi.getSiteContext(confirmedCode!),
    enabled: !!confirmedCode,
    retry: false,
  });
  const preferredPlateStates = useQuery({
    queryKey: ["preferred-plate-states", site.data?.site.id],
    queryFn: () => visitsApi.listPreferredPlateStates(site.data!.site.id),
    enabled: Boolean(site.data?.site.id),
    retry: false,
  });
  const orderedStatePreferences = preferredPlateStates.data?.preferred
    ?? NATIONAL_PLATE_STATE_FALLBACK;
  const activeVisits = visits.data ?? [];
  const live = useGateLiveMonitor({
    enabled: Boolean(user),
    siteLocationId: site.data?.site.id ?? null,
    visits: (visits.data ?? []).map((visit) => ({
      id: visit.id,
      firstName: visit.firstName,
      lastName: visit.lastName,
      company: visit.company,
      vehiclePlate: visit.vehiclePlate,
      platePhotoUrl: visit.platePhotoUrl,
      siteName: visit.siteName,
      siteLocationId: visit.siteLocationId,
    })),
    queryKey: ["gatekeeper-visits"],
  });
  const exportRows = useMemo(() => toGateLogRows(recentVisits.data ?? []), [recentVisits.data]);
  const previousPlateVisit = useMemo(
    () => plateState
      ? latestVisitForPlate(recentVisits.data ?? [], plateState, vehiclePlate)
      : null,
    [plateState, vehiclePlate, recentVisits.data],
  );
  const entryDraft = useMemo<GateEntryDraft>(() => ({
    firstName,
    lastName,
    company,
    vehiclePlate,
    plateState,
    purpose,
    expectedDuration: duration,
  }), [company, duration, firstName, lastName, plateState, purpose, vehiclePlate]);
  const memory = useMemo(
    () => evaluateGateMemory({
      visits: recentVisits.data ?? [],
      draft: entryDraft,
      activeField: activeMemoryField,
      isDeleting: memoryDeleting,
    }),
    [activeMemoryField, entryDraft, memoryDeleting, recentVisits.data],
  );

  const applyEntryDraft = (next: GateEntryDraft) => {
    setFirstName(next.firstName);
    setLastName(next.lastName);
    setCompany(next.company);
    setVehiclePlate(next.vehiclePlate.toUpperCase());
    setPlateState(next.plateState);
    setPurpose(next.purpose);
    if (next.expectedDuration) setDuration(next.expectedDuration);
  };
  const forgetPlateAutoFill = (field: PlateAutoFillField) => {
    const snapshot = plateAutoFillRef.current;
    if (!snapshot) return;
    delete snapshot.values[field];
    if (Object.keys(snapshot.values).length === 0) plateAutoFillRef.current = null;
  };
  const onMemoryFieldChange = (field: GateMemoryField, value: string) => {
    const nextValue = field === "vehiclePlate" ? value.toUpperCase() : value;
    if (field !== "vehiclePlate") forgetPlateAutoFill(field);
    setMemoryDeleting(nextValue.length < entryDraft[field].length);
    setActiveMemoryField(field);
    if (field === "firstName") setFirstName(nextValue);
    else if (field === "lastName") setLastName(nextValue);
    else if (field === "company") setCompany(nextValue);
    else setVehiclePlate(nextValue);
  };
  const onMemoryPick = (suggestion: GateMemorySuggestion) => {
    plateAutoFillRef.current = null;
    setMemoryDeleting(false);
    applyEntryDraft(mergeGateFill(entryDraft, pickSuggestionFill(suggestion)));
  };

  const startGateVoiceEntry = () => {
    const win = window as typeof window & {
      SpeechRecognition?: new () => GateSpeechRecognition;
      webkitSpeechRecognition?: new () => GateSpeechRecognition;
    };
    const Recognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Recognition) {
      setError(t("gatekeeper.voiceUnavailable"));
      return;
    }
    recognitionRef.current?.stop();
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index][0].transcript).join(" ");
      const fill = parseGateVoiceEntry(transcript);
      if (Object.keys(fill).length === 0) {
        setError(t("gatekeeper.voiceNotUnderstood"));
        return;
      }
      applyEntryDraft({ ...entryDraft, ...fill });
      plateAutoFillRef.current = null;
      setError(null);
    };
    recognition.onerror = () => setError(t("gatekeeper.voiceNotUnderstood"));
    recognition.onend = () => setVoiceListening(false);
    setError(null);
    setVoiceListening(true);
    recognition.start();
  };

  useEffect(() => {
    const launch = () => startGateVoiceEntry();
    window.addEventListener("vndrly:gate-voice", launch);
    if (sessionStorage.getItem("vndrly:gate-voice-pending") === "1") {
      sessionStorage.removeItem("vndrly:gate-voice-pending");
      window.setTimeout(launch, 50);
    }
    return () => {
      window.removeEventListener("vndrly:gate-voice", launch);
      recognitionRef.current?.stop();
    };
  }, [entryDraft]);

  const hosts = useMemo(() => {
    if (!site.data) return [];
    return [
      ...(site.data.partner
        ? [{ key: `partner:${site.data.partner.id}`, id: site.data.partner.id, type: "partner" as const, label: site.data.partner.name }]
        : []),
      ...site.data.vendors.map((vendor) => ({
        key: `vendor:${vendor.id}`,
        id: vendor.id,
        type: "vendor" as const,
        label: vendor.name,
      })),
    ];
  }, [site.data]);
  const assignedSites = assigned.data?.sites ?? [];
  const defaultSiteCode = assigned.data?.defaultSite?.siteCode;
  const showPreviousBanner = Boolean(
    previousPlateVisit
    && (!firstName.trim() || !lastName.trim()
      || firstName !== previousPlateVisit.firstName
      || lastName !== previousPlateVisit.lastName),
  );

  useEffect(() => {
    if (appliedDefault.current) return;
    if (!shouldApplyDefaultGateSite({ confirmedCode, typedCode: siteCode, defaultSiteCode })) return;
    appliedDefault.current = true;
    setSiteCode(defaultSiteCode!);
    setConfirmedCode(defaultSiteCode!);
    setHostKey("");
  }, [confirmedCode, defaultSiteCode, siteCode]);

  useEffect(() => {
    if (hostKey || hosts.length === 0) return;
    const next = pickDefaultGateHostKey(hosts);
    if (next) setHostKey(next);
  }, [hostKey, hosts]);

  const currentPlateMatchKey = plateMatchKey(plateState, vehiclePlate);
  useEffect(() => {
    const snapshot = plateAutoFillRef.current;
    if (!snapshot || snapshot.matchKey === currentPlateMatchKey) return;
    const next = { ...entryDraft };
    const replacement = previousPlateVisit ? fillFromVisit(previousPlateVisit) : null;
    const replacementValues: Partial<Record<PlateAutoFillField, string>> = {};
    for (const field of PLATE_AUTO_FILL_FIELDS) {
      const autoFilledValue = snapshot.values[field];
      if (autoFilledValue == null || entryDraft[field] !== autoFilledValue) continue;
      const replacementValue = replacement?.[field]
        || (field === "expectedDuration" ? "60" : "");
      next[field] = replacementValue;
      if (replacement?.[field]) replacementValues[field] = replacementValue;
    }
    plateAutoFillRef.current = currentPlateMatchKey && Object.keys(replacementValues).length > 0
      ? { matchKey: currentPlateMatchKey, values: replacementValues }
      : null;
    if (!draftsEqual(next, entryDraft)) applyEntryDraft(next);
  }, [currentPlateMatchKey, entryDraft, previousPlateVisit]);

  useEffect(() => {
    if (!memory.fill) return;
    const next = mergeGateFill(entryDraft, memory.fill);
    if (draftsEqual(next, entryDraft)) return;
    if (currentPlateMatchKey) {
      const values = plateAutoFillRef.current?.matchKey === currentPlateMatchKey
        ? { ...plateAutoFillRef.current.values }
        : {};
      for (const field of PLATE_AUTO_FILL_FIELDS) {
        if (next[field] !== entryDraft[field]) values[field] = next[field];
      }
      if (Object.keys(values).length > 0) {
        plateAutoFillRef.current = { matchKey: currentPlateMatchKey, values };
      }
    }
    setMemoryDeleting(false);
    applyEntryDraft(next);
  }, [currentPlateMatchKey, entryDraft, memory.fill]);

  const resetEntry = () => {
    plateAutoFillRef.current = null;
    setFirstName(""); setLastName(""); setCompany("");
    setVehiclePlate(""); setPurpose(""); setDuration("60"); setHostKey("");
    setPlateState(null); setPlateStateError(null);
    setPlatePhotoUrl(null); setVehiclePhotoUrl(null);
    setActiveMemoryField(null);
    setMemoryDeleting(false);
    setPlateOcrStatus("idle");
    setOcrPlate(null);
  };

  const usePreviousPlateDetails = () => {
    if (!previousPlateVisit) return;
    plateAutoFillRef.current = null;
    setMemoryDeleting(false);
    applyEntryDraft(mergeGateFill(entryDraft, {
      firstName: previousPlateVisit.firstName,
      lastName: previousPlateVisit.lastName,
      company: previousPlateVisit.company ?? "",
      vehiclePlate: previousPlateVisit.vehiclePlate ?? "",
      plateState: previousPlateVisit.plateState,
      purpose: previousPlateVisit.purpose ?? "",
      expectedDuration: previousPlateVisit.expectedDurationMinutes?.toString() ?? "60",
    }));
  };

  const capture = async (file: File | undefined, kind: "plate" | "vehicle") => {
    if (!file) return;
    setBusy(true); setError(null);
    if (kind === "plate") setPlateOcrStatus("reading");
    try {
      if (kind === "vehicle") {
        const next = await uploadEvidence(file, t);
        void deleteUnattachedEvidence(vehiclePhotoUrl);
        setVehiclePhotoUrl(next);
        return;
      }
      const objectPath = await uploadEvidence(file, t);
      const candidate = await visitsApi.readPlate({ objectPath }).catch(() => null);
      void deleteUnattachedEvidence(platePhotoUrl);
      setPlatePhotoUrl(objectPath);
      if (candidate?.plate) {
        setMemoryDeleting(false);
        setActiveMemoryField("vehiclePlate");
        setVehiclePlate(candidate.plate);
        setOcrPlate(candidate.plate);
        if (
          candidate.stateConfidence != null
          && candidate.stateConfidence >= PLATE_OCR_STATE_CONFIDENCE_THRESHOLD
        ) {
          const normalizedState = normalizePlateState(candidate.state);
          if (normalizedState) {
            setPlateState(normalizedState);
            setPlateStateError(null);
          }
        }
        setPlateOcrStatus("read");
      } else {
        setPlateOcrStatus("unreadable");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("gatekeeper.photoUploadFailed"));
      if (kind === "plate") setPlateOcrStatus("unreadable");
    } finally {
      setBusy(false);
    }
  };

  const checkIn = async () => {
    const context = site.data;
    const host = hosts.find((candidate) => candidate.key === hostKey);
    if (!context || !host || !firstName.trim() || !lastName.trim() || !vehiclePlate.trim()) {
      setError(t("gatekeeper.requiredFields"));
      return;
    }
    if (!plateState) {
      setPlateStateError(t("gatekeeper.plateStateRequired"));
      return;
    }
    setPlateStateError(null);
    setBusy(true); setError(null);
    try {
      const coords = await currentPosition(true, t);
      const minutes = Number.parseInt(duration, 10);
      await visitsApi.gateCheckIn({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim() || undefined,
        vehiclePlate: vehiclePlate.trim() || undefined,
        plateState,
        purpose: purpose.trim() || undefined,
        expectedDurationMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : undefined,
        siteLocationId: context.site.id,
        hostType: host.type,
        hostPartnerId: host.type === "partner" ? host.id : undefined,
        hostVendorId: host.type === "vendor" ? host.id : undefined,
        platePhotoUrl: platePhotoUrl ?? undefined,
        vehiclePhotoUrl: vehiclePhotoUrl ?? undefined,
        latitude: coords!.latitude,
        longitude: coords!.longitude,
      });
      resetEntry();
      await queryClient.invalidateQueries({ queryKey: ["gatekeeper-visits"] });
      await queryClient.invalidateQueries({ queryKey: ["gatekeeper-recent-visits"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("gatekeeper.checkInFailed"));
    } finally {
      setBusy(false);
    }
  };

  const checkOut = async (id: number) => {
    setBusy(true); setError(null);
    try {
      const coords = await currentPosition(false, t);
      await visitsApi.gateCheckOut(id, coords?.latitude, coords?.longitude);
      await queryClient.invalidateQueries({ queryKey: ["gatekeeper-visits"] });
      await queryClient.invalidateQueries({ queryKey: ["gatekeeper-recent-visits"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("gatekeeper.checkOutFailed"));
    } finally {
      setBusy(false);
    }
  };

  const exportCompleteLog = async (format: "pdf" | "excel" | "word") => {
    setExporting(true); setError(null);
    try {
      const rows = toGateLogRows(await listAllVisits());
      if (format === "pdf") await exportPdf(rows);
      else if (format === "excel") exportExcel(rows);
      else exportWord(rows);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("gatekeeper.historyLoadFailed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={FIELD_OPS_PAGE_CLASS} data-testid="gatekeeper-page">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("gatekeeper.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("gatekeeper.subtitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("gatekeeper.handsFreeHint")}</p>
          {voiceListening && <p className="mt-1 text-sm font-medium text-[color:var(--brand-primary)]">{t("gatekeeper.voiceListening")}</p>}
        </div>
        <Link
          href="/gate/history"
          className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          data-testid="link-gate-history"
        >
          <History className="h-4 w-4" />
          {t("gatekeeper.history")}
        </Link>
      </div>

      {live.flash && (
        <div
          className="flex items-center gap-4 rounded-xl border-2 border-amber-500 bg-amber-50 p-4 text-foreground shadow-md dark:bg-amber-100/80"
          data-testid="gate-live-flash"
          role="status"
        >
          {live.flash.platePhotoUrl ? (
            <img src={evidenceUrl(live.flash.platePhotoUrl)} alt="" className="h-16 w-24 shrink-0 rounded-md object-cover" />
          ) : (
            <Shield className="h-10 w-10 shrink-0" style={iconStyle} />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight">
              {live.flash.kind === "checked_in"
                ? t("gatekeeper.liveCheckedIn", { name: `${live.flash.firstName} ${live.flash.lastName}`.trim() })
                : t("gatekeeper.liveCheckedOut", { name: `${live.flash.firstName} ${live.flash.lastName}`.trim() })}
            </p>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {[live.flash.company, live.flash.vehiclePlate, live.flash.siteName].filter(Boolean).join(" · ")}
            </p>
          </div>
          <LiveConnectionPill status={live.liveStatus} compact onRefresh={() => void visits.refetch()} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Shield className={CARD_TITLE_ICON_CLASS} style={iconStyle} />
              {t("gatekeeper.onSiteNow")}
            </CardTitle>
            <div className="flex items-center gap-2">
              {!live.flash && (
                <LiveConnectionPill status={live.liveStatus} compact onRefresh={() => void visits.refetch()} />
              )}
              <BlueButton onClick={() => void visits.refetch()} disabled={visits.isFetching} data-testid="button-gate-refresh">
                <RefreshCw className="h-4 w-4" />
              </BlueButton>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {visits.isLoading ? (
              <Loader2 className="animate-spin text-muted-foreground" />
            ) : activeVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("gatekeeper.noActive")}</p>
            ) : (
              activeVisits.map((visit) => (
                <div
                  key={visit.id}
                  className={`${CARD_INNER_TILE_CLASS} flex items-center justify-between gap-3 ${live.flash?.visitId === visit.id ? "ring-2 ring-amber-500" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{visit.firstName} {visit.lastName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[visit.company, visit.vehiclePlate, visit.siteName].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(visit.checkInTime).toLocaleString()}</p>
                  </div>
                  <AmberButton onClick={() => void checkOut(visit.id)} disabled={busy}>{t("gatekeeper.checkOut")}</AmberButton>
                </div>
              ))
            )}
            <div className="border-t-2 border-gray-300 pt-3 dark:border-gray-400">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{t("gatekeeper.gateLog")}</p>
                <span className="text-xs text-muted-foreground">{t("gatekeeper.records", { count: exportRows.length })}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <BlueButton onClick={() => void exportCompleteLog("pdf")} disabled={!exportRows.length || exporting}><FileText className="mr-1 h-4 w-4" />PDF</BlueButton>
                <BlueButton onClick={() => void exportCompleteLog("excel")} disabled={!exportRows.length || exporting}><Sheet className="mr-1 h-4 w-4" />Excel</BlueButton>
                <BlueButton onClick={() => void exportCompleteLog("word")} disabled={!exportRows.length || exporting}><FileText className="mr-1 h-4 w-4" />Word</BlueButton>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("gatekeeper.newEntry")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("gatekeeper.memoryHint")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("gatekeeper.firstName")} *</Label>
                <GateMemoryInput
                  value={firstName}
                  suggestions={activeMemoryField === "firstName" ? memory.suggestions : []}
                  suggestionsLabel={t("gatekeeper.memorySuggestions")}
                  onPick={onMemoryPick}
                  onChange={(event) => onMemoryFieldChange("firstName", event.target.value)}
                  onFocus={() => setActiveMemoryField("firstName")}
                  data-testid="input-gate-first-name"
                />
              </div>
              <div>
                <Label>{t("gatekeeper.lastName")} *</Label>
                <GateMemoryInput
                  value={lastName}
                  suggestions={activeMemoryField === "lastName" ? memory.suggestions : []}
                  suggestionsLabel={t("gatekeeper.memorySuggestions")}
                  onPick={onMemoryPick}
                  onChange={(event) => onMemoryFieldChange("lastName", event.target.value)}
                  onFocus={() => setActiveMemoryField("lastName")}
                  data-testid="input-gate-last-name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("gatekeeper.company")}</Label>
                <GateMemoryInput
                  value={company}
                  suggestions={activeMemoryField === "company" ? memory.suggestions : []}
                  suggestionsLabel={t("gatekeeper.memorySuggestions")}
                  onPick={onMemoryPick}
                  onChange={(event) => onMemoryFieldChange("company", event.target.value)}
                  onFocus={() => setActiveMemoryField("company")}
                  data-testid="input-gate-company"
                />
              </div>
              <div>
                <PlateStatePicker
                  value={plateState}
                  onChange={(stateCode) => {
                    setPlateState(stateCode);
                    setPlateStateError(null);
                  }}
                  preferredStates={orderedStatePreferences}
                  error={plateStateError ?? undefined}
                />
                <Label className="mt-2 block">{t("gatekeeper.vehiclePlate")} *</Label>
                <GateMemoryInput
                  value={vehiclePlate}
                  suggestions={activeMemoryField === "vehiclePlate" ? memory.suggestions : []}
                  suggestionsLabel={t("gatekeeper.memorySuggestions")}
                  onPick={onMemoryPick}
                  onChange={(event) => onMemoryFieldChange("vehiclePlate", event.target.value)}
                  onFocus={() => setActiveMemoryField("vehiclePlate")}
                  data-testid="input-gate-plate"
                />
              </div>
            </div>
            {showPreviousBanner && previousPlateVisit && (
              <div className={`${CARD_INNER_TILE_CLASS} flex items-center justify-between gap-3 text-sm`}>
                <span>{t("gatekeeper.previousVisit", { firstName: previousPlateVisit.firstName, lastName: previousPlateVisit.lastName })}</span>
                <BlueButton onClick={usePreviousPlateDetails}>{t("gatekeeper.useDetails")}</BlueButton>
              </div>
            )}
            {previousPlateVisit && firstName.trim() && lastName.trim() && (
              <p className="text-sm text-muted-foreground" data-testid="gate-last-driver-hint">
                {t("gatekeeper.lastDriverHint", {
                  firstName: previousPlateVisit.firstName,
                  lastName: previousPlateVisit.lastName,
                  company: previousPlateVisit.company ? ` · ${previousPlateVisit.company}` : "",
                })}
              </p>
            )}
            {plateOcrStatus === "reading" && <p className="text-sm text-muted-foreground">{t("gatekeeper.plateReading")}</p>}
            {plateOcrStatus === "read" && ocrPlate && <p className="text-sm text-muted-foreground">{t("gatekeeper.plateRead", { plate: ocrPlate })}</p>}
            {plateOcrStatus === "unreadable" && <p className="text-sm text-muted-foreground">{t("gatekeeper.plateUnreadable")}</p>}
            <div>
              <Label>{t("gatekeeper.currentLocation")} *</Label>
              {assignedSites.length > 0 ? (
                <Select
                  value={assignedSites.some((row) => row.siteCode === confirmedCode) ? confirmedCode! : ""}
                  onValueChange={(code) => {
                    setSiteCode(code);
                    setConfirmedCode(code);
                    setHostKey("");
                  }}
                >
                  <SelectTrigger data-testid="select-gate-current-location"><SelectValue placeholder={t("gatekeeper.selectSite")} /></SelectTrigger>
                  <SelectContent>
                    {assignedSites.map((row) => (
                      <SelectItem key={row.siteCode} value={row.siteCode}>{row.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <div className="mt-2 flex gap-2">
                <Input value={siteCode} onChange={(e) => setSiteCode(e.target.value.toUpperCase())} placeholder="SITE-XXXXXXXX" aria-label={t("gatekeeper.siteCode")} />
                <BlueButton onClick={() => { setConfirmedCode(siteCode.trim().toUpperCase() || null); setHostKey(""); }}><Search className="h-4 w-4" /></BlueButton>
              </div>
            </div>
            {site.isLoading && <Loader2 className="animate-spin text-muted-foreground" />}
            {site.error && <p className="text-sm text-destructive">{t("gatekeeper.siteNotFound")}</p>}
            {site.data && (
              <>
                <p className={`${CARD_INNER_TILE_CLASS} text-sm`}>
                  <strong>{site.data.site.name}</strong>
                  <br />
                  <span className="text-muted-foreground">{site.data.site.address}</span>
                </p>
                <div>
                  <Label>{t("gatekeeper.host")} *</Label>
                  <Select value={hostKey} onValueChange={setHostKey}>
                    <SelectTrigger><SelectValue placeholder={t("gatekeeper.selectHost")} /></SelectTrigger>
                    <SelectContent>
                      {hosts.map((host) => (
                        <SelectItem key={host.key} value={host.key}>{host.label} ({host.type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div><Label>{t("gatekeeper.purpose")}</Label><Textarea value={purpose} onChange={(e) => { forgetPlateAutoFill("purpose"); setPurpose(e.target.value); }} /></div>
            <div><Label>{t("gatekeeper.expectedMinutes")}</Label><Input inputMode="numeric" value={duration} onChange={(e) => { forgetPlateAutoFill("expectedDuration"); setDuration(e.target.value); }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <BlueButton onClick={() => plateInput.current?.click()} disabled={busy}>
                <Camera className="mr-2 h-4 w-4" />{platePhotoUrl ? t("gatekeeper.plateAttached") : t("gatekeeper.platePhoto")}
              </BlueButton>
              <BlueButton onClick={() => vehicleInput.current?.click()} disabled={busy}>
                <Camera className="mr-2 h-4 w-4" />{vehiclePhotoUrl ? t("gatekeeper.vehicleAttached") : t("gatekeeper.vehiclePhoto")}
              </BlueButton>
            </div>
            <input ref={plateInput} className="hidden" type="file" accept="image/*" capture="environment" onChange={(e) => void capture(e.target.files?.[0], "plate")} />
            <input ref={vehicleInput} className="hidden" type="file" accept="image/*" capture="environment" onChange={(e) => void capture(e.target.files?.[0], "vehicle")} />
            <AmberButton className="w-full" onClick={() => void checkIn()} disabled={busy || !site.data}>
              {busy ? t("gatekeeper.working") : t("gatekeeper.checkInVisitor")}
            </AmberButton>
            <p className="text-center text-xs text-muted-foreground">{t("gatekeeper.locationRequired")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
