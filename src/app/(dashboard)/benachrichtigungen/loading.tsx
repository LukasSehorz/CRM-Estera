import {
  CardSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Sofort sichtbares Skelett bei Navigation auf Benachrichtigungen. */
export default function BenachrichtigungenLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-2 px-6 py-6">
        <CardSkeleton bodyClassName="h-16" />
        <CardSkeleton bodyClassName="h-16" />
        <CardSkeleton bodyClassName="h-16" />
      </div>
    </>
  );
}
