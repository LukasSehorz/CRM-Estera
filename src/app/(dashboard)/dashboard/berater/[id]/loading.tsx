import {
  CardSkeleton,
  KpiRowSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Ladezustand des Berater-Drilldowns. */
export default function BeraterDrilldownLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-6 px-6 py-6">
        <KpiRowSkeleton count={4} />
        <div className="grid gap-4 lg:grid-cols-3">
          <CardSkeleton className="lg:col-span-2" bodyClassName="h-64" />
          <CardSkeleton bodyClassName="h-64" />
        </div>
        <CardSkeleton bodyClassName="h-48" />
      </div>
    </>
  );
}
