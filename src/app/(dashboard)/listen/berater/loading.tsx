import {
  TableSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Ladezustand der Berater-Übersicht. */
export default function ListenBeraterLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="px-6 py-6">
        <TableSkeleton rows={7} cols={6} />
      </div>
    </>
  );
}
