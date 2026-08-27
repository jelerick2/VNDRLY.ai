import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import BrandTitleRow from "@/components/BrandTitleRow";
import ScreenSafeArea from "@/components/ScreenSafeArea";
import { useColors } from "@/hooks/useColors";
import { filterGateHistory, gateHistoryFromIso } from "@/lib/gate-history";
import { fetchGatekeeperHistory } from "@/lib/gatekeeper";
import { formatPlateForDisplay } from "@/lib/plate-display";

export default function GateHistoryScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const from = useMemo(() => gateHistoryFromIso(), []);
  const history = useQuery({
    queryKey: ["gatekeeper-history", from],
    queryFn: () => fetchGatekeeperHistory(from),
    retry: false,
    refetchInterval: 30000,
  });
  const rows = useMemo(
    () => filterGateHistory(history.data ?? [], query),
    [history.data, query],
  );

  return (
    <ScreenSafeArea style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BrandTitleRow
          title={t("gatekeeper.historyTitle")}
          subtitle={t("gatekeeper.historySubtitle")}
          logoTestId="gate-history-brand-logo"
        />
        <TextInput
          testID="gate-history-search"
          value={query}
          onChangeText={setQuery}
          placeholder={t("gatekeeper.historySearch")}
          placeholderTextColor={colors.mutedForeground}
          autoCorrect={false}
          autoCapitalize="none"
          style={[
            styles.search,
            { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card },
          ]}
        />
        {history.isLoading ? (
          <ActivityIndicator testID="gate-history-loading" color={colors.primary} />
        ) : history.isError ? (
          <Text testID="gate-history-error" style={[styles.message, { color: colors.destructive }]}>
            {t("gatekeeper.historyLoadFailed")}
          </Text>
        ) : (history.data ?? []).length === 0 ? (
          <Text testID="gate-history-empty" style={[styles.message, { color: colors.mutedForeground }]}>
            {t("gatekeeper.historyEmpty")}
          </Text>
        ) : rows.length === 0 ? (
          <Text testID="gate-history-no-match" style={[styles.message, { color: colors.mutedForeground }]}>
            {t("gatekeeper.historyNoMatch")}
          </Text>
        ) : (
          rows.map((visit) => (
            <View
              key={visit.id}
              testID={`gate-history-row-${visit.id}`}
              style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <View style={styles.rowHeader}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {`${visit.firstName ?? ""} ${visit.lastName ?? ""}`.trim()}
                </Text>
                <Text style={[styles.status, { color: colors.mutedForeground }]}>
                  {visit.checkOutTime ? t("gatekeeper.historyCheckedOut") : t("gatekeeper.historyOnSite")}
                </Text>
              </View>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {[
                  visit.company,
                  formatPlateForDisplay(
                    visit.plateState,
                    visit.vehiclePlate,
                    t("gatekeeper.plateStateUnconfirmed"),
                  ),
                  visit.siteName,
                ].filter(Boolean).join(" · ")}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {new Date(visit.checkInTime).toLocaleString()}
                {visit.checkOutTime ? ` → ${new Date(visit.checkOutTime).toLocaleString()}` : ""}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { gap: 14, padding: 20, paddingBottom: 40 },
  search: {
    borderRadius: 10,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  message: { fontFamily: "Inter_500Medium", fontSize: 14 },
  card: { borderRadius: 12, borderWidth: 1, gap: 4, padding: 14 },
  rowHeader: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  name: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 16 },
  status: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
});
