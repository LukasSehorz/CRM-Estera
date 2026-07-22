import {
  CardSkeleton,
  KpiRowSkeleton,
  TableSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Sofort sichtbares Skelett bei Navigation auf die Partner-Ansicht. */
export default function PartnerLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-6 px-6 py-6">
        <KpiRowSkeleton count={4} />
        <CardSkeleton bodyClassName="h-72" />
        <TableSkeleton rows={6} cols={4} />
      </div>
    </>
  );
}
