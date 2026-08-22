import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, LogOut, RefreshCw, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import AmberButton from "@/components/amber-button";
import BlueButton from "@/components/blue-button";
import RedButton from "@/components/red-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { visitsApi, type SiteContext } from "@/lib/visits-api";
import { VNDRLY_LOGO_SQUARE } from "@/lib/vndrly-brand-assets";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Coordinates = { latitude: number; longitude: number };

function currentPosition(required: boolean): Promise<Coordinates | undefined> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      if (required) reject(new Error("Location is required for gate check-in."));
      else resolve(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => required ? reject(new Error("Allow location access to record this gate entry.")) : resolve(undefined),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}

async function uploadEvidence(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Select an image file.");
  const request = await fetch(`${BASE}/api/storage/uploads/request-url`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name || `gate-photo-${Date.now()}.jpg`, size: file.size, contentType: file.type || "image/jpeg" }),
  });
  if (!request.ok) throw new Error("Could not prepare the photo upload.");
  const descriptor = await request.json() as { uploadURL: string; objectPath: string };
  const uploadUrl = /^https?:\/\//i.test(descriptor.uploadURL) ? descriptor.uploadURL : `${BASE}${descriptor.uploadURL}`;
  const upload = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
  if (!upload.ok) throw new Error(upload.status === 413 ? "That photo is too large." : "Photo upload failed.");
  const finalize = await fetch(`${BASE}/api/storage/uploads/finalize`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectURL: descriptor.uploadURL, visibility: "public" }),
  });
  if (!finalize.ok) throw new Error("Photo upload could not be finalized.");
  return descriptor.objectPath;
}

export default function GatekeeperPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const plateInput = useRef<HTMLInputElement>(null);
  const vehicleInput = useRef<HTMLInputElement>(null);
  const [siteCode, setSiteCode] = useState("");
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);
  const [hostKey, setHostKey] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [duration, setDuration] = useState("60");
  const [platePhotoUrl, setPlatePhotoUrl] = useState<string | null>(null);
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visits = useQuery({
    queryKey: ["gatekeeper-visits"],
    queryFn: () => visitsApi.list(),
    refetchInterval: 30000,
    retry: false,
  });
  const site = useQuery<SiteContext>({
    queryKey: ["gatekeeper-site-context", confirmedCode],
    queryFn: () => visitsApi.getSiteContext(confirmedCode!),
    enabled: !!confirmedCode,
    retry: false,
  });
  const activeVisits = (visits.data ?? []).filter((visit) => !visit.checkOutTime);
  const hosts = useMemo(() => {
    if (!site.data) return [];
    return [
      ...(site.data.partner ? [{ key: `partner:${site.data.partner.id}`, id: site.data.partner.id, type: "partner" as const, label: site.data.partner.name }] : []),
      ...site.data.vendors.map((vendor) => ({ key: `vendor:${vendor.id}`, id: vendor.id, type: "vendor" as const, label: vendor.name })),
    ];
  }, [site.data]);

  const resetEntry = () => {
    setFirstName(""); setLastName(""); setCompany(""); setPhone(""); setEmail("");
    setVehiclePlate(""); setPurpose(""); setDuration("60"); setHostKey("");
    setPlatePhotoUrl(null); setVehiclePhotoUrl(null);
  };

  const capture = async (file: File | undefined, kind: "plate" | "vehicle") => {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const objectPath = await uploadEvidence(file);
      if (kind === "plate") setPlatePhotoUrl(objectPath); else setVehiclePhotoUrl(objectPath);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Photo upload failed.");
    } finally { setBusy(false); }
  };

  const checkIn = async () => {
    const context = site.data;
    const host = hosts.find((candidate) => candidate.key === hostKey);
    if (!context || !host || !firstName.trim() || !lastName.trim()) {
      setError("First name, last name, site, and host are required.");
      return;
    }
    setBusy(true); setError(null);
    try {
      const coords = await currentPosition(true);
      const minutes = Number.parseInt(duration, 10);
      await visitsApi.gateCheckIn({
        firstName: firstName.trim(), lastName: lastName.trim(), company: company.trim() || undefined,
        phone: phone.trim() || undefined, email: email.trim() || undefined, vehiclePlate: vehiclePlate.trim() || undefined,
        purpose: purpose.trim() || undefined, expectedDurationMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : undefined,
        siteLocationId: context.site.id, hostType: host.type,
        hostPartnerId: host.type === "partner" ? host.id : undefined,
        hostVendorId: host.type === "vendor" ? host.id : undefined,
        platePhotoUrl: platePhotoUrl ?? undefined, vehiclePhotoUrl: vehiclePhotoUrl ?? undefined,
        latitude: coords!.latitude, longitude: coords!.longitude,
      });
      resetEntry();
      await queryClient.invalidateQueries({ queryKey: ["gatekeeper-visits"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gate check-in failed.");
    } finally { setBusy(false); }
  };

  const checkOut = async (id: number) => {
    setBusy(true); setError(null);
    try {
      const coords = await currentPosition(false);
      await visitsApi.gateCheckOut(id, coords?.latitude, coords?.longitude);
      await queryClient.invalidateQueries({ queryKey: ["gatekeeper-visits"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gate check-out failed.");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/95 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3"><img src={VNDRLY_LOGO_SQUARE} alt="VNDRLY" className="h-10 w-10" /><div><h1 className="font-bold">VNDRLY Gate</h1><p className="text-xs text-slate-400">{user?.displayName}</p></div></div>
          <RedButton onClick={() => void logout()} disabled={busy}><LogOut className="mr-2 h-4 w-4" />Sign out</RedButton>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-700 bg-slate-900 text-white">
          <CardHeader className="flex-row items-center justify-between"><CardTitle>On site now</CardTitle><BlueButton onClick={() => void visits.refetch()} disabled={visits.isFetching}><RefreshCw className="h-4 w-4" /></BlueButton></CardHeader>
          <CardContent className="space-y-3">
            {visits.isLoading ? <Loader2 className="animate-spin" /> : activeVisits.length === 0 ? <p className="text-sm text-slate-400">No active gate entries.</p> : activeVisits.map((visit) => (
              <div key={visit.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 p-3">
                <div className="min-w-0"><p className="font-semibold">{visit.firstName} {visit.lastName}</p><p className="truncate text-xs text-slate-400">{[visit.company, visit.vehiclePlate, visit.siteName].filter(Boolean).join(" · ")}</p><p className="text-xs text-slate-500">{new Date(visit.checkInTime).toLocaleString()}</p></div>
                <AmberButton onClick={() => void checkOut(visit.id)} disabled={busy}>Check out</AmberButton>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900 text-white">
          <CardHeader><CardTitle>New gate entry</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {error && <div role="alert" className="rounded-md border border-red-500/50 bg-red-950/50 p-3 text-sm text-red-200">{error}</div>}
            <div className="grid grid-cols-2 gap-3"><div><Label>First name *</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div><div><Label>Last name *</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div><div><Label>Vehicle plate</Label><Input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())} /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Phone</Label><Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div><div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>
            <div><Label>Site code *</Label><div className="flex gap-2"><Input value={siteCode} onChange={(e) => setSiteCode(e.target.value.toUpperCase())} placeholder="SITE-XXXXXXXX" /><BlueButton onClick={() => { setConfirmedCode(siteCode.trim().toUpperCase() || null); setHostKey(""); }}><Search className="h-4 w-4" /></BlueButton></div></div>
            {site.isLoading && <Loader2 className="animate-spin" />}
            {site.error && <p className="text-sm text-red-300">Site not found or unavailable.</p>}
            {site.data && <><p className="rounded-md bg-slate-800 p-3 text-sm"><strong>{site.data.site.name}</strong><br /><span className="text-slate-400">{site.data.site.address}</span></p><div><Label>Host *</Label><Select value={hostKey} onValueChange={setHostKey}><SelectTrigger><SelectValue placeholder="Select partner or vendor" /></SelectTrigger><SelectContent>{hosts.map((host) => <SelectItem key={host.key} value={host.key}>{host.label} ({host.type})</SelectItem>)}</SelectContent></Select></div></>}
            <div><Label>Purpose</Label><Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
            <div><Label>Expected minutes</Label><Input inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3"><BlueButton onClick={() => plateInput.current?.click()} disabled={busy}><Camera className="mr-2 h-4 w-4" />{platePhotoUrl ? "Plate attached" : "Plate photo"}</BlueButton><BlueButton onClick={() => vehicleInput.current?.click()} disabled={busy}><Camera className="mr-2 h-4 w-4" />{vehiclePhotoUrl ? "Vehicle attached" : "Vehicle photo"}</BlueButton></div>
            <input ref={plateInput} className="hidden" type="file" accept="image/*" capture="environment" onChange={(e) => void capture(e.target.files?.[0], "plate")} />
            <input ref={vehicleInput} className="hidden" type="file" accept="image/*" capture="environment" onChange={(e) => void capture(e.target.files?.[0], "vehicle")} />
            <AmberButton className="w-full" onClick={() => void checkIn()} disabled={busy || !site.data}>{busy ? "Working…" : "Check in visitor"}</AmberButton>
            <p className="text-center text-xs text-slate-500">Location permission is required for check-in.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
