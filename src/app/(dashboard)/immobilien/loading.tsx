import {
  BoardSkeleton,
  TopbarSkeleton,
} from "@/components/layout/page-skeletons";

/** Ladezustand des Immobilien-Boards. */
export default function ImmobilienLoading() {
  return (
    <>
      <TopbarSkeleton action />
      <div className="px-6 py-6">
        <BoardSkeleton columns={5} />
      </div>
    </>
  );
}
