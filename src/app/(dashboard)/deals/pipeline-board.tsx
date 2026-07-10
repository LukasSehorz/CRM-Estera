"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { moveDeal } from "./actions";
import {
  DealCardContent,
  type BoardDeal,
  type BoardStage,
} from "./deal-card";

function DraggableCard({
  deal,
  beraterName,
}: {
  deal: BoardDeal;
  beraterName: string;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const href = `/deals/${deal.id}`;

  // Ganze Karte ist Drag-Griff: bei Bewegung > 6px zieht dnd-kit, ein echter
  // Klick (ohne Bewegung) öffnet stattdessen die Detailseite.
  function handlePointerDown(e: React.PointerEvent) {
    downPos.current = { x: e.clientX, y: e.clientY };
    listeners?.onPointerDown?.(e);
  }
  function handleClick(e: React.MouseEvent) {
    const p = downPos.current;
    downPos.current = null;
    if (p && (Math.abs(e.clientX - p.x) > 6 || Math.abs(e.clientY - p.y) > 6))
      return; // war ein Drag, kein Klick
    router.push(href);
  }
  function handleKeyDown(e: React.KeyboardEvent) {
    listeners?.onKeyDown?.(e); // Leertaste = aufnehmen/ablegen (Tastatur-Drag)
    if (e.key === "Enter") {
      e.preventDefault();
      router.push(href);
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      aria-label={`Deal ${deal.dealname} — Enter zum Öffnen, Leertaste zum Verschieben`}
      className={cn(
        "group relative cursor-grab touch-none rounded-lg border border-border bg-surface-2 p-3 pr-8 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      <DealCardContent deal={deal} beraterName={beraterName} />
      <span
        aria-hidden
        className="pointer-events-none absolute right-1.5 top-1.5 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground/70"
      >
        <GripVertical className="h-4 w-4" />
      </span>
    </div>
  );
}

function Column({
  stage,
  deals,
  beraterMap,
}: {
  stage: BoardStage;
  deals: BoardDeal[];
  beraterMap: Record<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const topBorder = stage.is_won
    ? "border-t-success"
    : stage.is_lost
      ? "border-t-danger"
      : "border-t-primary/50";

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div
        className={cn(
          "rounded-t-xl border border-b-0 border-t-2 border-border bg-surface px-3 py-2.5",
          topBorder,
        )}
      >
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium">{stage.name}</span>
          <span className="ml-2 shrink-0 rounded-full bg-secondary px-1.5 text-xs tabular-nums text-muted-foreground">
            {deals.length}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {stage.wahrscheinlichkeit}% Wahrscheinlichkeit
        </span>
      </div>
      <div
        ref={setNodeRef}
        role="list"
        aria-label={`Phase ${stage.name}`}
        className={cn(
          "min-h-[140px] flex-1 space-y-2 rounded-b-xl border border-t-0 border-border bg-surface/40 p-2 transition-colors",
          isOver && "bg-primary/5 ring-1 ring-inset ring-primary/30",
        )}
      >
        {deals.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            Keine Deals
          </p>
        ) : (
          deals.map((d) => (
            <DraggableCard
              key={d.id}
              deal={d}
              beraterName={beraterMap[d.berater_id] ?? "—"}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function PipelineBoard({
  stages,
  deals: initialDeals,
  beraterMap,
}: {
  stages: BoardStage[];
  deals: BoardDeal[];
  beraterMap: Record<string, string>;
}) {
  const router = useRouter();
  const [deals, setDeals] = useState<BoardDeal[]>(initialDeals);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Nach revalidate/refresh den lokalen (optimistischen) Stand mit der
  // Server-Wahrheit überschreiben.
  useEffect(() => setDeals(initialDeals), [initialDeals]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      // Enter bleibt für „Öffnen" reserviert -> Tastatur-Drag nur über Leertaste.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const activeDeal = deals.find((d) => d.id === activeId) ?? null;

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const dealId = String(active.id);
    const targetStageId = String(over.id); // Droppables sind ausschließlich Spalten (= Phasen)
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === targetStageId) return;

    const prev = deals;
    // Optimistisch verschieben
    setDeals((ds) =>
      ds.map((d) => (d.id === dealId ? { ...d, stage_id: targetStageId } : d)),
    );
    startTransition(async () => {
      const res = await moveDeal(dealId, targetStageId);
      if ("error" in res) {
        setDeals(prev); // Rollback bei Fehler
        toast.error(res.error);
      } else {
        // Server-Wahrheit holen (closed_at, Historie etc.)
        router.refresh();
      }
    });
  }

  return (
    <DndContext
      id="pipeline-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="scrollbar-elegant flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            deals={deals.filter((d) => d.stage_id === stage.id)}
            beraterMap={beraterMap}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <div className="w-72 rotate-2 rounded-lg border border-primary/50 bg-surface-2 p-3 pr-8 shadow-lg">
            <DealCardContent
              deal={activeDeal}
              beraterName={beraterMap[activeDeal.berater_id] ?? "—"}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
