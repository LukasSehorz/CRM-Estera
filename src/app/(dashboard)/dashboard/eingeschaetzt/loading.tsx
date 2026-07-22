import {
  KpiRowSkeleton,
  TableSkeleton,
  TabsSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Sofort sichtbares Skelett bei Navigation auf Eingeschätzte Kunden. */
export default function EingeschaetztLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-6 px-6 py-6">
        <TabsSkeleton />
        <KpiRowSkeleton count={3} />
        <TableSkeleton rows={8} cols={5} />
      </div>
    </>
  );
}
