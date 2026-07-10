import {
  CardSkeleton,
  FormSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Ladezustand der Deal-Detailseite (Formular + Seitenleiste). */
export default function DealDetailLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FormSkeleton fields={8} />
          </div>
          <div className="space-y-4">
            <CardSkeleton bodyClassName="h-40" />
            <CardSkeleton bodyClassName="h-56" />
          </div>
        </div>
      </div>
    </>
  );
}
