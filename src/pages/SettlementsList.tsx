import { useState } from "react";
import { useScrollRestore } from "@/hooks/useScrollRestore";
import { useSettlements, useSettlementStats } from "@/hooks/useSettlements";
import { SettlementsOverview } from "@/components/settlements/SettlementsOverview";
import { SettlementsWorksTab } from "@/components/settlements/SettlementsWorksTab";
import { SettlementsDetailsTab } from "@/components/settlements/SettlementsDetailsTab";
import { SettlementsPeriodFilter } from "@/components/settlements/SettlementsPeriodFilter";
import { SettlementsUpload } from "@/components/settlements/SettlementsUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SettlementsList = () => {
  const [distributionKey, setDistributionKey] = useState<string | null>(null);
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useSettlementStats(distributionKey);
  useScrollRestore(!statsLoading);
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 100;

  const { data: detailData, isLoading: detailsLoading } = useSettlements(
    page,
    pageSize,
    tab === "details" ? search : "",
    distributionKey,
    tab === "details"
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handlePeriodChange = (key: string | null) => {
    setDistributionKey(key);
    setPage(0);
    setTab("overview");
    window.scrollTo({ top: 0 });
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Laddar avräkningsdata...
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-destructive">Avräkningsdata kunde inte laddas.</p>
        <button className="text-sm font-medium text-primary underline" onClick={() => refetchStats()}>
          Försök igen
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const selectedKeys = distributionKey ? distributionKey.split(",") : [];
  const selectedPeriods = stats.periods.filter((p) =>
    selectedKeys.includes(`${p.publisher}::${p.distributionKey}`)
  );
  const selectedTotal = selectedPeriods.reduce((sum, p) => sum + p.total, 0);
  const selectedPublisher = selectedPeriods[0]?.publisher ?? null;
  const selectedLabel =
    selectedPeriods.length === 1
      ? selectedPeriods[0].distribution || selectedPeriods[0].distributionKey
      : `${selectedPeriods.length} avräkningsområden`;

  const isDetailView = !!distributionKey;

  return (
    <div className="space-y-6">
      {isDetailView ? (
        <div className="rounded-lg border bg-card p-4">
          <button
            onClick={() => handlePeriodChange(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Tillbaka till avräkningsperioder
          </button>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold">{selectedLabel}</h2>
            {selectedPublisher && (
              <span className="text-xs font-semibold text-muted-foreground">{selectedPublisher}</span>
            )}
            <span className="tabular-nums text-sm text-muted-foreground">
              {selectedTotal.toLocaleString("sv-SE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              kr
            </span>
          </div>
        </div>
      ) : (
        <>
          <SettlementsUpload />

          <SettlementsPeriodFilter
            periods={stats.periods}
            selectedKey={distributionKey}
            onSelect={handlePeriodChange}
          />
        </>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="works">Per verk</TabsTrigger>
          <TabsTrigger value="details">Alla rader</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SettlementsOverview stats={stats} distributionKey={distributionKey} />
        </TabsContent>

        <TabsContent value="works" className="space-y-4">
          <SettlementsWorksTab stats={stats} />
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <SettlementsDetailsTab
            rows={detailData?.rows ?? []}
            totalCount={detailData?.totalCount ?? 0}
            isLoading={detailsLoading}
            search={search}
            onSearchChange={handleSearch}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettlementsList;
