import {
  CardSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Sofort sichtbares Skelett bei Navigation auf das Dokumentenportal. */
export default function DokumenteLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-6 px-6 py-6">
        <CardSkeleton bodyClassName="h-96" />
      </div>
    </>
  );
}
