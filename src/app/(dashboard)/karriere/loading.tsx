import {
  CardSkeleton,
  KpiRowSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Sofort sichtbares Skelett bei Navigation auf Karriere. */
export default function KarriereLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-6 px-6 py-6">
        <KpiRowSkeleton count={4} />
        <CardSkeleton bodyClassName="h-64" />
        <CardSkeleton bodyClassName="h-48" />
      </div>
    </>
  );
}
