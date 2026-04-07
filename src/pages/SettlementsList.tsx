import { useState, useMemo } from "react";
import { useSettlements, useSettlementStats } from "@/hooks/useSettlements";
import { SettlementsOverview } from "@/components/settlements/SettlementsOverview";
import { SettlementsWorksTab } from "@/components/settlements/SettlementsWorksTab";
import { SettlementsDetailsTab } from "@/components/settlements/SettlementsDetailsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SettlementsList = () => {
  const { data: stats, isLoading: statsLoading } = useSettlementStats();
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 100;

  // Only fetch detail rows when on details tab
  const { data: detailData, isLoading: detailsLoading } = useSettlements(
    page,
    pageSize,
    tab === "details" ? search : ""
  );

  // Reset page when search changes
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Laddar avräkningsdata...
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="works">Per verk</TabsTrigger>
          <TabsTrigger value="details">Alla rader</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SettlementsOverview stats={stats} />
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
