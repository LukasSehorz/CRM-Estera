import {
  CardSkeleton,
  KpiRowSkeleton,
  TabsSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Sofort sichtbares Skelett bei Navigation auf Pipeline-Volumen. */
export default function PipelineLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-6 px-6 py-6">
        <TabsSkeleton />
        <KpiRowSkeleton count={4} />
        <div className="grid gap-4 lg:grid-cols-2">
          <CardSkeleton bodyClassName="h-72" />
          <CardSkeleton bodyClassName="h-72" />
        </div>
        <CardSkeleton bodyClassName="h-56" />
      </div>
    </>
  );
}
