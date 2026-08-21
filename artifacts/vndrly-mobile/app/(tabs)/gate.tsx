import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
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
import ScreenSafeArea from "@/components/ScreenSafeArea";
import VisitorHostPicker from "@/components/VisitorHostPicker";
import { useColors } from "@/hooks/useColors";
import { translateApiError } from "@/lib/apiErrors";
import { captureAndUploadImage } from "@/lib/photos";
import { fetchSiteContext, type SiteContext } from "@/lib/guest";
import {
  fetchGatekeeperVisits,
  gatekeeperCheckOut,
  submitGatekeeperVisit,
} from "@/lib/gatekeeper";

export default function GatekeeperScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [siteCode, setSiteCode] = useState("");
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);
  const [hostKey, setHostKey] = useState<string | null>(null);
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

  const activeVisits = useQuery({
    queryKey: ["gatekeeper-visits"],
    queryFn: fetchGatekeeperVisits,
    refetchInterval: 30000,
    retry: false,
  });
  const ctxQuery = useQuery<SiteContext>({
    queryKey: ["gatekeeper-site-context", confirmedCode],
    queryFn: () => fetchSiteContext(confirmedCode!),
    enabled: !!confirmedCode,
    retry: false,
  });

  const inputStyle = [
    styles.input,
    { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card },
  ];

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setCompany("");
    setPhone("");
    setEmail("");
    setVehiclePlate("");
    setPurpose("");
    setDuration("60");
    setPlatePhotoUrl(null);
    setVehiclePhotoUrl(null);
    setHostKey(null);
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
      const result = await captureAndUploadImage();
      if (!result) return;
      if (kind === "plate") setPlatePhotoUrl(result.objectPath);
      else setVehiclePhotoUrl(result.objectPath);
    } catch (e) {
      Alert.alert(t("visitor.error"), translateApiError(e, t, t("tickets.errorAttachPhoto")));
    } finally {
      setBusy(false);
    }
  };

  const onCheckIn = async () => {
    const ctx = ctxQuery.data;
    if (!ctx) {
      Alert.alert(t("visitor.error"), t("visitor.siteLookupFailed"));
      return;
    }
    setBusy(true);
    try {
      const result = await submitGatekeeperVisit({
        ctx,
        hostKey: hostKey ?? "",
        firstName,
        lastName,
        company,
        phone,
        email,
        vehiclePlate,
        purpose,
        durationStr: duration,
        platePhotoUrl: platePhotoUrl ?? undefined,
        vehiclePhotoUrl: vehiclePhotoUrl ?? undefined,
      });
      if (!result.ok) {
        const message =
          result.reason === "missing-name"
            ? t("gatekeeper.nameRequired")
            : result.reason === "no-host"
              ? t("visitor.pickHost")
              : t("visitor.locationDenied");
        Alert.alert(t("visitor.error"), message);
        return;
      }
      resetForm();
      await qc.invalidateQueries({ queryKey: ["gatekeeper-visits"] });
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
          <Text style={[styles.title, { color: colors.foreground }]}>{t("gatekeeper.portal")}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t("gatekeeper.subtitle")}</Text>

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
            <View style={styles.twoCol}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>{t("visitor.firstName")} *</Text>
                <TextInput testID="gate-first-name" value={firstName} onChangeText={setFirstName} style={inputStyle} placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>{t("visitor.lastName")} *</Text>
                <TextInput testID="gate-last-name" value={lastName} onChangeText={setLastName} style={inputStyle} placeholderTextColor={colors.mutedForeground} />
              </View>
            </View>
            <Text style={[styles.label, { color: colors.foreground }]}>{t("visitor.company")}</Text>
            <TextInput value={company} onChangeText={setCompany} style={inputStyle} placeholderTextColor={colors.mutedForeground} />
            <Text style={[styles.label, { color: colors.foreground }]}>{t("visitor.vehiclePlate")}</Text>
            <TextInput value={vehiclePlate} onChangeText={setVehiclePlate} autoCapitalize="characters" style={inputStyle} placeholderTextColor={colors.mutedForeground} />
            <View style={styles.twoCol}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>{t("visitor.phone")}</Text>
                <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={inputStyle} placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>{t("visitor.email")}</Text>
                <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={inputStyle} placeholderTextColor={colors.mutedForeground} />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>{t("visitor.siteCodeLabel")}</Text>
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
                platePhotoAttached={!!platePhotoUrl}
                vehiclePhotoAttached={!!vehiclePhotoUrl}
                onCapturePlatePhoto={() => onCaptureEvidence("plate")}
                onCaptureVehiclePhoto={() => onCaptureEvidence("vehicle")}
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
                  vehicleEvidence: t("visitor.vehicleEvidence"),
                  capturePlatePhoto: t("visitor.capturePlatePhoto"),
                  captureVehiclePhoto: t("visitor.captureVehiclePhoto"),
                  attached: t("visitor.photoAttached"),
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
  label: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 6, marginTop: 6 },
  input: { borderRadius: 10, borderWidth: 1, fontFamily: "Inter_400Regular", fontSize: 15, paddingHorizontal: 12, paddingVertical: 10 },
  lookupRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  iconButton: { alignItems: "center", borderRadius: 10, borderWidth: 1.5, justifyContent: "center", minHeight: 44, minWidth: 44 },
  loading: { marginTop: 10 },
  error: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 10 },
  visitRow: { alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, paddingTop: 10 },
  visitText: { flex: 1, minWidth: 0 },
  visitName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  muted: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
});
