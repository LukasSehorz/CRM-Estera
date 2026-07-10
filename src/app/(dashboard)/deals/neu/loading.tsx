import {
  FormSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Ladezustand der Deal-Neuanlage. */
export default function DealNeuLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="px-6 py-6">
        <FormSkeleton fields={8} />
      </div>
    </>
  );
}
