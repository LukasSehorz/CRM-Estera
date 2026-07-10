import {
  TableSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Ladezustand der Kontaktliste. */
export default function KontakteLoading() {
  return (
    <>
      <TopbarSkeleton action />
      <div className="px-6 py-6">
        <TableSkeleton rows={9} cols={6} />
      </div>
    </>
  );
}
