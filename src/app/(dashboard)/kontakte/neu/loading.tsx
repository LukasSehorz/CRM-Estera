import {
  FormSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Ladezustand der Kontakt-Neuanlage. */
export default function KontaktNeuLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="px-6 py-6">
        <FormSkeleton fields={8} />
      </div>
    </>
  );
}
