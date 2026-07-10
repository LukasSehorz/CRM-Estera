import {
  TableSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Ladezustand der Aufgaben-Seite. */
export default function AufgabenLoading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="space-y-6 px-6 py-6">
        <TableSkeleton rows={8} cols={4} />
      </div>
    </>
  );
}
