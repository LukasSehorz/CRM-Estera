import {
  KpiRowSkeleton,
  TableSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Sofort sichtbares Skelett bei Navigation auf die Deals-Liste. */
export default function DealsLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-6 px-6 py-6">
        <KpiRowSkeleton count={4} />
        <TableSkeleton rows={8} cols={5} />
      </div>
    </>
  );
}
