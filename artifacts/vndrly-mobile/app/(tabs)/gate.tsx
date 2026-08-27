import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AmberButton from "@/components/AmberButton";
import BrandTitleRow from "@/components/BrandTitleRow";
import PlateStatePicker from "@/components/PlateStatePicker";
import ScreenSafeArea from "@/components/ScreenSafeArea";
import VisitorHostPicker from "@/components/VisitorHostPicker";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/useColors";
import { translateApiError } from "@/lib/apiErrors";
import {
  pickDefaultGateHostKey,
  pickPreferredGateDefaultSite,
  resolveAssignedGateSites,
  shouldApplyDefaultGateSite,
} from "@/lib/gate-default-site";
import { fetchSiteContext, type ActiveVisit, type SiteContext } from "@/lib/guest";
import {
  fetchAssignedGateSites,
  fetchPreferredPlateStates,
  deleteGateEvidence,
  fetchGatekeeperRecentVisits,
  fetchGatekeeperVisits,
  gatekeeperCheckOut,
  readGatePlate,
  submitGatekeeperVisit,
} from "@/lib/gatekeeper";
import { captureAndUploadImage } from "@/lib/photos";
import { parseGateVoiceEntry } from "@/lib/gate-voice-entry";
import { transcribeAskVRecording } from "@/lib/askv-transcribe";
import { createPttRecorder, PttMicPermissionError, type PttRecorder } from "@/lib/ptt";
import { buildHostOptions } from "@/lib/visitorCheckin";
import {
  NATIONAL_PLATE_STATE_FALLBACK,
  PLATE_OCR_STATE_CONFIDENCE_THRESHOLD,
  normalizePlateState,
  plateMatchKey,
  type PlateStateCode,
} from "@workspace/plate-state";

type DriverNameField = "firstName" | "lastName";

function driverSuggestions(
  visits: ActiveVisit[],
  field: DriverNameField | null,
  query: string,
  company: string,
): ActiveVisit[] {
  if (!field || !query.trim()) return [];
  const needle = query.trim().toLowerCase();
  const companyNeedle = company.trim().toLowerCase();
  const seen = new Set<string>();
  return [...visits]
    .sort((a, b) => Date.parse(b.checkInTime) - Date.parse(a.checkInTime))
    .filter((visit) => {
      if (!(visit[field] ?? "").trim().toLowerCase().startsWith(needle)) return false;
      if (companyNeedle && !(visit.company ?? "").trim().toLowerCase().startsWith(companyNeedle)) return false;
      const key = `${(visit.firstName ?? "").trim().toLowerCase()}|${(visit.lastName ?? "").trim().toLowerCase()}|${(visit.company ?? "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

export default function GatekeeperScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const appliedDefault = useRef(false);
  const voiceRecorderRef = useRef<PttRecorder | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [siteCode, setSiteCode] = useState("");
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);
  const [hostKey, setHostKey] = useState<string | null>(null);
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
  const [activeNameField, setActiveNameField] = useState<DriverNameField | null>(null);
  const [voiceListening, setVoiceListening] = useState(false);

  const activeVisits = useQuery({
    queryKey: ["gatekeeper-visits"],
    queryFn: fetchGatekeeperVisits,
    refetchInterval: 30000,
    retry: false,
  });
  const recentVisits = useQuery({
    queryKey: ["gatekeeper-recent-visits"],
    queryFn: fetchGatekeeperRecentVisits,
    retry: false,
  });
  const assigned = useQuery({
    queryKey: ["gatekeeper-assigned-sites", user?.vendorId],
    queryFn: () =>
      resolveAssignedGateSites({
        vendorId: user?.vendorId ?? null,
        listAssigned: fetchAssignedGateSites,
        getSiteContext: fetchSiteContext,
      }),
    retry: false,
  });
  const assignedSites = assigned.data?.sites ?? [];
  const preferredSite = pickPreferredGateDefaultSite(
    assignedSites,
    assigned.data?.defaultSite ?? null,
  );
  const defaultSiteCode = preferredSite?.siteCode;
  const ctxQuery = useQuery<SiteContext>({
    queryKey: ["gatekeeper-site-context", confirmedCode],
    queryFn: () => fetchSiteContext(confirmedCode!),
    enabled: !!confirmedCode,
    retry: false,
  });
  const preferredPlateStates = useQuery({
    queryKey: ["preferred-plate-states", ctxQuery.data?.site.id],
    queryFn: () => fetchPreferredPlateStates(ctxQuery.data!.site.id),
    enabled: Boolean(ctxQuery.data?.site.id),
    retry: false,
  });
  const orderedStatePreferences = preferredPlateStates.data?.preferred
    ?? NATIONAL_PLATE_STATE_FALLBACK;

  useEffect(() => {
    if (appliedDefault.current) return;
    if (!shouldApplyDefaultGateSite({ confirmedCode, typedCode: siteCode, defaultSiteCode })) return;
    if (!defaultSiteCode) return;
    appliedDefault.current = true;
    setSiteCode(defaultSiteCode);
    setConfirmedCode(defaultSiteCode);
    setHostKey(null);
  }, [confirmedCode, defaultSiteCode, siteCode]);

  const hosts = useMemo(() => buildHostOptions(ctxQuery.data), [ctxQuery.data]);
  useEffect(() => {
    if (hostKey || hosts.length === 0) return;
    const next = pickDefaultGateHostKey(hosts);
    if (next) setHostKey(next);
  }, [hostKey, hosts]);

  const inputStyle = [
    styles.input,
    { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card },
  ];
  const matchingDrivers = useMemo(
    () => driverSuggestions(
      recentVisits.data ?? [],
      activeNameField,
      activeNameField === "firstName" ? firstName : lastName,
      company,
    ),
    [activeNameField, company, firstName, lastName, recentVisits.data],
  );

  const useDriver = (visit: ActiveVisit) => {
    setFirstName(visit.firstName ?? "");
    setLastName(visit.lastName ?? "");
    setCompany(visit.company ?? company);
    if (!vehiclePlate.trim()) {
      setVehiclePlate((visit.vehiclePlate ?? "").toUpperCase());
      if (!plateState) setPlateState(normalizePlateState(visit.plateState));
    }
    if (!purpose.trim()) setPurpose(visit.purpose ?? "");
    if (duration === "60" && visit.expectedDurationMinutes) setDuration(String(visit.expectedDurationMinutes));
    setActiveNameField(null);
  };

  const finishGateVoiceEntry = async () => {
    if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    voiceTimerRef.current = null;
    const recorder = voiceRecorderRef.current;
    voiceRecorderRef.current = null;
    setVoiceListening(false);
    if (!recorder) return;
    try {
      const { uri, durationSeconds } = await recorder.stop();
      if (durationSeconds < 0.4) return;
      const fill = parseGateVoiceEntry(await transcribeAskVRecording(uri));
      if (!Object.keys(fill).length) {
        Alert.alert(t("visitor.error"), t("gatekeeper.voiceNotUnderstood"));
        return;
      }
      if (fill.firstName) setFirstName(fill.firstName);
      if (fill.lastName) setLastName(fill.lastName);
      if (fill.company) setCompany(fill.company);
      if (fill.vehiclePlate) setVehiclePlate(fill.vehiclePlate);
      if (fill.purpose) setPurpose(fill.purpose);
      if (fill.duration) setDuration(fill.duration);
      setActiveNameField(null);
    } catch (error) {
      Alert.alert(
        t("visitor.error"),
        error instanceof PttMicPermissionError ? t("foremanHome.pttMicDeniedBody") : t("gatekeeper.voiceNotUnderstood"),
      );
    } finally {
      await recorder.dispose();
    }
  };

  const startGateVoiceEntry = async () => {
    if (voiceListening) return;
    try {
      await voiceRecorderRef.current?.dispose();
      const recorder = await createPttRecorder();
      voiceRecorderRef.current = recorder;
      await recorder.start();
      setVoiceListening(true);
      voiceTimerRef.current = setTimeout(() => void finishGateVoiceEntry(), 6500);
    } catch (error) {
      voiceRecorderRef.current = null;
      Alert.alert(
        t("visitor.error"),
        error instanceof PttMicPermissionError ? t("foremanHome.pttMicDeniedBody") : t("gatekeeper.voiceNotUnderstood"),
      );
    }
  };

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("vndrly:gate-voice", () => {
      void startGateVoiceEntry();
    });
    return () => subscription.remove();
  }, [voiceListening]);

  useEffect(() => () => {
    if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    void voiceRecorderRef.current?.dispose();
  }, []);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setCompany("");
    setVehiclePlate("");
    setPlateState(null);
    setPlateStateError(null);
    setPurpose("");
    setDuration("60");
    setPlatePhotoUrl(null);
    setVehiclePhotoUrl(null);
    setHostKey(null);
    setActiveNameField(null);
  };

  const onLookupSite = () => {
    const code = siteCode.trim().toUpperCase();
    if (!code) return;
    setConfirmedCode(code);
    setHostKey(null);
  };

  const onCaptureEvidence = async (kind: "plate" | "vehicle") => {
    setBusy(true);
    try {
      const result = await captureAndUploadImage({ maxBytes: 8 * 1024 * 1024, purpose: "gate-evidence" });
      if (!result) return;
      if (kind === "plate") {
        void deleteGateEvidence(platePhotoUrl).catch(() => undefined);
        setPlatePhotoUrl(result.objectPath);
        const candidate = await readGatePlate(result.objectPath).catch(() => null);
        if (candidate?.plate) setVehiclePlate(candidate.plate);
        if (
          candidate?.stateConfidence != null
          && candidate.stateConfidence >= PLATE_OCR_STATE_CONFIDENCE_THRESHOLD
        ) {
          const normalizedState = normalizePlateState(candidate.state);
          if (normalizedState) {
            setPlateState(normalizedState);
            setPlateStateError(null);
          }
        }
      }
      else {
        void deleteGateEvidence(vehiclePhotoUrl).catch(() => undefined);
        setVehiclePhotoUrl(result.objectPath);
      }
    } catch (e) {
      Alert.alert(t("visitor.error"), translateApiError(e, t, t("tickets.errorAttachPhoto")));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const normalized = vehiclePlate.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (normalized.length < 3 || !plateState) return;
    const exactKey = plateMatchKey(plateState, vehiclePlate);
    const prior = [...(recentVisits.data ?? [])]
      .filter((visit) => {
        if ((visit.vehiclePlate ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "") !== normalized) return false;
        if (!plateState) return true;
        const visitState = normalizePlateState(visit.plateState);
        return !visitState || plateMatchKey(visitState, visit.vehiclePlate) === exactKey;
      })
      .sort((a, b) => {
        const priority = (visit: ActiveVisit) =>
          exactKey && plateMatchKey(visit.plateState, visit.vehiclePlate) === exactKey ? 0 : 1;
        return priority(a) - priority(b) || Date.parse(b.checkInTime) - Date.parse(a.checkInTime);
      })[0];
    if (!prior) return;
    if (!firstName) setFirstName(prior.firstName ?? "");
    if (!lastName) setLastName(prior.lastName ?? "");
    if (!company) setCompany(prior.company ?? "");
    if (!purpose) setPurpose(prior.purpose ?? "");
    if (duration === "60" && prior.expectedDurationMinutes) setDuration(String(prior.expectedDurationMinutes));
  }, [company, duration, firstName, lastName, plateState, purpose, recentVisits.data, vehiclePlate]);

  const onCheckIn = async () => {
    const ctx = ctxQuery.data;
    if (!ctx) {
      Alert.alert(t("visitor.error"), t("visitor.siteLookupFailed"));
      return;
    }
    if (!plateState) {
      setPlateStateError(t("gatekeeper.plateStateRequired"));
      return;
    }
    setPlateStateError(null);
    setBusy(true);
    try {
      const result = await submitGatekeeperVisit({
        ctx,
        hostKey: hostKey ?? "",
        firstName,
        lastName,
        company,
        vehiclePlate,
        plateState,
        purpose,
        durationStr: duration,
        platePhotoUrl: platePhotoUrl ?? undefined,
        vehiclePhotoUrl: vehiclePhotoUrl ?? undefined,
      });
      if (!result.ok) {
        const message =
          result.reason === "missing-name"
            ? t("gatekeeper.nameRequired")
            : result.reason === "missing-plate"
              ? t("gatekeeper.plateRequired")
            : result.reason === "missing-state"
              ? t("gatekeeper.plateStateRequired")
            : result.reason === "no-host"
              ? t("visitor.pickHost")
              : t("visitor.locationDenied");
        Alert.alert(t("visitor.error"), message);
        return;
      }
      resetForm();
      await qc.invalidateQueries({ queryKey: ["gatekeeper-visits"] });
      await qc.invalidateQueries({ queryKey: ["gatekeeper-recent-visits"] });
      Alert.alert(t("gatekeeper.checkedInTitle"), t("gatekeeper.checkedInBody"));
    } catch (e) {
      Alert.alert(t("visitor.error"), translateApiError(e, t, t("tickets.errorCheckIn")));
    } finally {
      setBusy(false);
    }
  };

  const onCheckOut = async (visitId: number) => {
    setBusy(true);
    try {
      await gatekeeperCheckOut(visitId);
      await qc.invalidateQueries({ queryKey: ["gatekeeper-visits"] });
      await qc.invalidateQueries({ queryKey: ["gatekeeper-recent-visits"] });
    } catch (e) {
      Alert.alert(t("visitor.error"), translateApiError(e, t, t("tickets.errorCheckOut")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenSafeArea style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <BrandTitleRow
            title={t("gatekeeper.portal")}
            subtitle={t("gatekeeper.subtitle")}
            logoTestId="gate-brand-logo"
          />

          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("gatekeeper.activeNow")}</Text>
            {activeVisits.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : activeVisits.data && activeVisits.data.length > 0 ? (
              activeVisits.data.map((visit) => (
                <View key={visit.id} style={[styles.visitRow, { borderColor: colors.border }]}>
                  <View style={styles.visitText}>
                    <Text style={[styles.visitName, { color: colors.foreground }]}>
                      {visit.firstName} {visit.lastName}
                    </Text>
                    <Text style={[styles.muted, { color: colors.mutedForeground }]}>
                      {[visit.company, visit.vehiclePlate, visit.siteName].filter(Boolean).join(" - ")}
                    </Text>
                    <Text style={[styles.muted, { color: colors.mutedForeground }]}>
                      {new Date(visit.checkInTime).toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    testID={`gate-checkout-${visit.id}`}
                    disabled={busy}
                    onPress={() => onCheckOut(visit.id)}
                    style={[styles.iconButton, { borderColor: colors.primary }]}
                  >
                    <Feather name="log-out" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t("gatekeeper.noActive")}</Text>
            )}
          </View>

          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("gatekeeper.newEntry")}</Text>
            {voiceListening ? (
              <View style={[styles.voiceStatus, { borderColor: colors.primary }]}>
                <Feather name="mic" size={18} color={colors.primary} />
                <Text style={[styles.voiceStatusText, { color: colors.primary }]}>{t("gatekeeper.voiceListening")}</Text>
              </View>
            ) : null}
            <View style={styles.twoCol}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>{t("visitor.firstName")} *</Text>
                <TextInput
                  testID="gate-first-name"
                  value={firstName}
                  onFocus={() => setActiveNameField("firstName")}
                  onChangeText={(value) => { setActiveNameField("firstName"); setFirstName(value); }}
                  style={inputStyle}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>{t("visitor.lastName")} *</Text>
                <TextInput
                  testID="gate-last-name"
                  value={lastName}
                  onFocus={() => setActiveNameField("lastName")}
                  onChangeText={(value) => { setActiveNameField("lastName"); setLastName(value); }}
                  style={inputStyle}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
            {matchingDrivers.length > 0 ? (
              <View style={[styles.suggestions, { borderColor: colors.border, backgroundColor: colors.card }]}>
                {matchingDrivers.map((visit) => (
                  <TouchableOpacity
                    key={`${visit.firstName}-${visit.lastName}-${visit.company ?? ""}-${visit.id}`}
                    testID={`gate-driver-suggestion-${visit.id}`}
                    onPress={() => useDriver(visit)}
                    style={[styles.suggestionRow, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.suggestionName, { color: colors.foreground }]}>{visit.firstName} {visit.lastName}</Text>
                    <Text style={[styles.muted, { color: colors.mutedForeground }]}>
                      {[visit.company, visit.vehiclePlate].filter(Boolean).join(" - ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <Text style={[styles.label, { color: colors.foreground }]}>{t("visitor.company")}</Text>
            <TextInput value={company} onChangeText={setCompany} style={inputStyle} placeholderTextColor={colors.mutedForeground} />
            <PlateStatePicker
              value={plateState}
              onChange={(state) => {
                setPlateState(state);
                setPlateStateError(null);
              }}
              preferredStates={orderedStatePreferences}
              error={plateStateError ?? undefined}
            />
            <Text style={[styles.label, { color: colors.foreground }]}>{t("visitor.vehiclePlate")} *</Text>
            <TextInput testID="gate-vehicle-plate" value={vehiclePlate} onChangeText={(value) => setVehiclePlate(value.toUpperCase())} autoCapitalize="characters" style={inputStyle} placeholderTextColor={colors.mutedForeground} />
            <View style={styles.twoCol}>
              <TouchableOpacity
                testID="gate-capture-tag-photo"
                onPress={() => onCaptureEvidence("plate")}
                disabled={busy}
                style={[styles.photoButton, { borderColor: colors.border, opacity: busy ? 0.6 : 1 }]}
              >
                <Feather
                  name={platePhotoUrl ? "check-circle" : "camera"}
                  size={16}
                  color={platePhotoUrl ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.photoLabel, { color: colors.foreground }]}>
                  {t("gatekeeper.tagPhoto")}{platePhotoUrl ? ` ${t("visitor.photoAttached")}` : ""}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="gate-capture-vehicle-photo"
                onPress={() => onCaptureEvidence("vehicle")}
                disabled={busy}
                style={[styles.photoButton, { borderColor: colors.border, opacity: busy ? 0.6 : 1 }]}
              >
                <Feather
                  name={vehiclePhotoUrl ? "check-circle" : "truck"}
                  size={16}
                  color={vehiclePhotoUrl ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.photoLabel, { color: colors.foreground }]}>
                  {t("gatekeeper.vehiclePhoto")}{vehiclePhotoUrl ? ` ${t("visitor.photoAttached")}` : ""}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>{t("gatekeeper.currentLocation")}</Text>
            {assignedSites.map((site) => {
              const selected = confirmedCode === site.siteCode;
              return (
                <TouchableOpacity
                  key={site.siteCode}
                  testID={`gate-site-option-${site.siteCode}`}
                  onPress={() => {
                    appliedDefault.current = true;
                    setSiteCode(site.siteCode);
                    setConfirmedCode(site.siteCode);
                    setHostKey(null);
                  }}
                  style={[
                    styles.siteOption,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <Text style={[styles.siteOptionName, { color: colors.foreground }]}>{site.name}</Text>
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>{site.siteCode}</Text>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.label, { color: colors.foreground }]}>{t("gatekeeper.siteCode")}</Text>
            <View style={styles.lookupRow}>
              <TextInput
                testID="gate-site-code"
                value={siteCode}
                onChangeText={setSiteCode}
                autoCapitalize="characters"
                placeholder={t("visitor.siteCodePlaceholder")}
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
              />
              <TouchableOpacity testID="gate-site-lookup" onPress={onLookupSite} style={[styles.iconButton, { borderColor: colors.primary }]}>
                <Feather name="search" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {ctxQuery.isLoading ? (
              <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
            ) : ctxQuery.error ? (
              <Text style={[styles.error, { color: colors.destructive }]}>{t("visitor.siteLookupFailed")}</Text>
            ) : ctxQuery.data ? (
              <VisitorHostPicker
                ctx={ctxQuery.data}
                hostKey={hostKey}
                onSelectHost={setHostKey}
                purpose={purpose}
                onPurposeChange={setPurpose}
                duration={duration}
                onDurationChange={setDuration}
                busy={busy}
                onSubmit={onCheckIn}
                onChangeSite={() => {
                  setConfirmedCode(null);
                  setHostKey(null);
                }}
                labels={{
                  changeSite: t("visitor.changeSite"),
                  whoVisiting: t("visitor.whoVisiting"),
                  noHosts: t("visitor.noHosts"),
                  purpose: t("visitor.purpose"),
                  purposePlaceholder: t("visitor.purposePlaceholder"),
                  expectedMinutes: t("visitor.expectedMinutes"),
                  checkIn: t("visitor.checkIn"),
                  geofenceNote: t("visitor.geofenceNote"),
                }}
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { gap: 14, padding: 20, paddingBottom: 40 },
  title: { fontFamily: "Inter_700Bold", fontSize: 24 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: -8 },
  card: { borderWidth: 1, borderRadius: 12, gap: 10, padding: 14 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  twoCol: { flexDirection: "row", gap: 10 },
  field: { flex: 1, minWidth: 0 },
  photoButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12 },
  photoLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "center" },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 6, marginTop: 6 },
  input: { borderRadius: 10, borderWidth: 1, fontFamily: "Inter_400Regular", fontSize: 15, paddingHorizontal: 12, paddingVertical: 10 },
  lookupRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  siteOption: { borderRadius: 10, borderWidth: 1, gap: 2, paddingHorizontal: 12, paddingVertical: 10 },
  siteOptionName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  iconButton: { alignItems: "center", borderRadius: 10, borderWidth: 1.5, justifyContent: "center", minHeight: 44, minWidth: 44 },
  loading: { marginTop: 10 },
  error: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 10 },
  visitRow: { alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, paddingTop: 10 },
  visitText: { flex: 1, minWidth: 0 },
  visitName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  muted: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  suggestions: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  suggestionRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 9 },
  suggestionName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  voiceStatus: { alignItems: "center", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 8, padding: 10 },
  voiceStatusText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
