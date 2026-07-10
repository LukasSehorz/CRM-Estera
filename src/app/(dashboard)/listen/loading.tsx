import {
  CardSkeleton,
  KpiRowSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Ladezustand der Listen-Übersicht. */
export default function ListenLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-6 px-6 py-6">
        <KpiRowSkeleton count={3} />
        <div className="grid gap-4 md:grid-cols-2">
          <CardSkeleton bodyClassName="h-48" />
          <CardSkeleton bodyClassName="h-48" />
          <CardSkeleton bodyClassName="h-40" />
          <CardSkeleton bodyClassName="h-40" />
        </div>
      </div>
    </>
  );
}
