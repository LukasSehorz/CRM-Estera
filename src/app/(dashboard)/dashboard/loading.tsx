import {
  CardSkeleton,
  KpiRowSkeleton,
  TabsSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Ladezustand für alle Dashboard-Tabs (Übersicht, Pipeline, Performance …). */
export default function DashboardLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-6 px-6 py-6">
        <TabsSkeleton />
        <KpiRowSkeleton count={4} />
        <div className="grid gap-4 lg:grid-cols-3">
          <CardSkeleton className="lg:col-span-2" bodyClassName="h-72" />
          <CardSkeleton bodyClassName="h-72" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <CardSkeleton className="lg:col-span-2" bodyClassName="h-56" />
          <CardSkeleton bodyClassName="h-56" />
        </div>
      </div>
    </>
  );
}
