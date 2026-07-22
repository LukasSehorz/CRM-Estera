import {
  CardSkeleton,
  KpiRowSkeleton,
  TableSkeleton,
  TabsSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Sofort sichtbares Skelett bei Navigation auf die Berater-Performance. */
export default function PerformanceLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-6 px-6 py-6">
        <TabsSkeleton />
        <KpiRowSkeleton count={4} />
        <TableSkeleton rows={7} cols={7} />
        <CardSkeleton bodyClassName="h-64" />
        <KpiRowSkeleton count={4} />
      </div>
    </>
  );
}
