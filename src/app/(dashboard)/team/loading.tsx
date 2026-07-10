import {
  TableSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Ladezustand der Team-Verwaltung. */
export default function TeamLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="px-6 py-6">
        <TableSkeleton rows={6} cols={4} />
      </div>
    </>
  );
}
