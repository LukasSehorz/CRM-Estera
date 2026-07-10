import {
  FormSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Ladezustand der Kontakt-Detailseite. */
export default function KontaktDetailLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-6 px-6 py-6">
        <FormSkeleton fields={8} />
        <FormSkeleton fields={4} />
      </div>
    </>
  );
}
