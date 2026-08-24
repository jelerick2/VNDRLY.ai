import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import ContentPaneBackLink from "@/components/content-pane-back-link";
import { Card, CardContent, CARD_INNER_TILE_CLASS } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FIELD_OPS_PAGE_CLASS } from "@/lib/field-ops-content-pane";
import { filterGateHistory, gateHistoryFromIso } from "@/lib/gate-history";
import { listAllVisits } from "@/lib/visits-api";

export default function GateHistoryPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const from = useMemo(() => gateHistoryFromIso(), []);
  const visits = useQuery({
    queryKey: ["gate-history", from],
    queryFn: () => listAllVisits({ from }),
    retry: false,
  });
  const rows = useMemo(
    () => filterGateHistory(visits.data ?? [], query),
    [query, visits.data],
  );

  return (
    <div className={FIELD_OPS_PAGE_CLASS} data-testid="gate-history-page">
      <div className="flex items-center gap-3">
        <ContentPaneBackLink
          href="/gate"
          ariaLabel={t("gatekeeper.backToGate")}
          testId="button-back"
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("gatekeeper.historyTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("gatekeeper.historySubtitle")}</p>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("gatekeeper.historySearch")}
          aria-label={t("gatekeeper.historySearch")}
          className="pl-9"
          data-testid="input-gate-history-search"
        />
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          {visits.isLoading ? (
            <Loader2 className="animate-spin text-muted-foreground" />
          ) : visits.isError ? (
            <p className="text-sm text-destructive">{t("gatekeeper.historyLoadFailed")}</p>
          ) : (visits.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("gatekeeper.historyEmpty")}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("gatekeeper.historyNoMatch")}</p>
          ) : (
            rows.map((visit) => (
              <div key={visit.id} className={CARD_INNER_TILE_CLASS} data-testid="gate-history-row">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {visit.firstName} {visit.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[visit.company, visit.vehiclePlate, visit.siteName].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(visit.checkInTime).toLocaleString()}
                      {visit.checkOutTime
                        ? ` → ${new Date(visit.checkOutTime).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                    {visit.checkOutTime ? t("gatekeeper.historyCheckedOut") : t("gatekeeper.historyOnSite")}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
