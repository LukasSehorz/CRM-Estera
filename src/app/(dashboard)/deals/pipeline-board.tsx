"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import {
  ZeitraumFilter,
  ZEITRAUM_ALLE,
  type ZeitraumAuswahl,
} from "@/components/ui/zeitraum-filter";
import { imZeitraum, zeitraumGrenzen, zeitraumLabel } from "@/lib/zeitraum";
import { moveDeal } from "./actions";
import { celebrateWin } from "./win-celebration";
import {
  DealCardContent,
  type BoardDeal,
  type BoardStage,
} from "./deal-card";

function DraggableCard({
  deal,
  beraterName,
  isGf,
}: {
  deal: BoardDeal;
  beraterName: string;
  isGf: boolean;
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
      <DealCardContent deal={deal} beraterName={beraterName} isGf={isGf} />
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
  ausgeblendet,
  beraterMap,
  isGf,
}: {
  stage: BoardStage;
  deals: BoardDeal[];
  /** Wie viele Karten dieser Phase Suche/Zeitraum gerade wegfiltern. */
  ausgeblendet: number;
  beraterMap: Record<string, string>;
  isGf: boolean;
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
          {ausgeblendet > 0 && (
            <span className="text-warning"> · {ausgeblendet} ausgeblendet</span>
          )}
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
            {ausgeblendet > 0 ? "Keine Treffer im Filter" : "Keine Deals"}
          </p>
        ) : (
          deals.map((d) => (
            <DraggableCard
              key={d.id}
              deal={d}
              beraterName={beraterMap[d.berater_id] ?? "—"}
              isGf={isGf}
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
  isGf,
}: {
  stages: BoardStage[];
  deals: BoardDeal[];
  beraterMap: Record<string, string>;
  isGf: boolean;
}) {
  const router = useRouter();
  const [deals, setDeals] = useState<BoardDeal[]>(initialDeals);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Board-Filter (Feedback Mandant 07.09.): Suche über alle Phasen, Zeitraum
  // NUR über die Abschluss-/Verlustphasen — offene Deals haben kein
  // Abschlussdatum und dürfen nie durch den Zeitraum verschwinden.
  const [q, setQ] = useState("");
  const [zeitraum, setZeitraum] = useState<ZeitraumAuswahl>({
    wert: "jahr",
    von: "",
    bis: "",
  });
  // Ein gerade verschobener Deal bleibt sichtbar, auch wenn sein frisches
  // Abschlussdatum außerhalb des Zeitraums liegt — sonst verschwindet die
  // Karte unmittelbar nach dem Ablegen spurlos.
  const [zuletztVerschoben, setZuletztVerschoben] = useState<string | null>(null);

  // Nach revalidate/refresh den lokalen (optimistischen) Stand mit der
  // Server-Wahrheit überschreiben.
  useEffect(() => setDeals(initialDeals), [initialDeals]);

  // Die Ausnahme für die zuletzt verschobene Karte läuft ab — sonst bliebe
  // sie bis zum Seitenwechsel entgegen dem Filter stehen.
  useEffect(() => {
    if (!zuletztVerschoben) return;
    const t = setTimeout(() => setZuletztVerschoben(null), 30_000);
    return () => clearTimeout(t);
  }, [zuletztVerschoben]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      // Enter bleibt für „Öffnen" reserviert -> Tastatur-Drag nur über Leertaste.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const activeDeal = deals.find((d) => d.id === activeId) ?? null;

  const grenzen = useMemo(
    () => zeitraumGrenzen(zeitraum.wert, { von: zeitraum.von, bis: zeitraum.bis }),
    [zeitraum],
  );

  const sichtbar = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const treffer = (d: BoardDeal) => {
      if (d.id === zuletztVerschoben) return true;
      if (needle) {
        const hay =
          `${d.dealname} ${d.kunde} ${d.objekt_adresse ?? ""} ${d.tippgeber ?? ""} ${beraterMap[d.berater_id] ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      // abschluss_datum ist nur in Abschluss-/Verlustphasen gesetzt.
      if (d.abschluss_datum && !imZeitraum(d.abschluss_datum, grenzen))
        return false;
      return true;
    };
    const map = new Map<string, { deals: BoardDeal[]; ausgeblendet: number }>();
    for (const st of stages) map.set(st.id, { deals: [], ausgeblendet: 0 });
    for (const d of deals) {
      const eintrag = map.get(d.stage_id);
      if (!eintrag) continue; // Phase eines anderen Bereichs — nicht anzeigen
      if (treffer(d)) eintrag.deals.push(d);
      else eintrag.ausgeblendet += 1;
    }
    return map;
  }, [deals, stages, q, grenzen, zuletztVerschoben, beraterMap]);

  // „Eigener Zeitraum" ohne Datumsangaben filtert nichts — dann auch keinen
  // Zurücksetzen-Knopf anbieten.
  const gefiltert =
    q.trim() !== "" || Boolean(grenzen.von || grenzen.bis);
  const sichtbarGesamt = [...sichtbar.values()].reduce(
    (n, e) => n + e.deals.length,
    0,
  );
  const ausgeblendetGesamt = deals.length - sichtbarGesamt;

  function filterZuruecksetzen() {
    setQ("");
    setZeitraum(ZEITRAUM_ALLE);
    setZuletztVerschoben(null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const dealId = String(active.id);
    const targetStageId = String(over.id); // Droppables sind ausschließlich Spalten (= Phasen)
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === targetStageId) return;

    // Erfolgs-Moment (9.2): Wechsel in eine Gewinn-Phase feiern.
    const zielStage = stages.find((s) => s.id === targetStageId);
    const vorherStage = stages.find((s) => s.id === deal.stage_id);
    const wirdGewonnen = !!zielStage?.is_won && !vorherStage?.is_won;

    const prev = deals;
    setZuletztVerschoben(dealId);
    // Optimistisch verschieben
    setDeals((ds) =>
      ds.map((d) => (d.id === dealId ? { ...d, stage_id: targetStageId } : d)),
    );
    startTransition(async () => {
      const res = await moveDeal(dealId, targetStageId);
      if ("error" in res) {
        setDeals(prev); // Rollback bei Fehler
        setZuletztVerschoben(null);
        toast.error(res.error);
      } else {
        if (wirdGewonnen) celebrateWin(deal.dealname);
        // Ehrlich bleiben: Der Deal liegt jetzt außerhalb des Zeitraums.
        if (
          zielStage &&
          (zielStage.is_won || zielStage.is_lost) &&
          !imZeitraum(new Date(), grenzen)
        )
          toast.info(
            `„${deal.dealname}“ liegt außerhalb des gewählten Abschluss-Zeitraums.`,
          );
        // Server-Wahrheit holen (closed_at, Historie etc.)
        router.refresh();
      }
    });
  }

  return (
    <>
      {/* Board-Toolbar: Suche + Abschluss-Zeitraum */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Nach Kunde, Deal oder Adresse suchen …"
          aria-label="Deals durchsuchen"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setZuletztVerschoben(null);
          }}
          className="sm:max-w-xs"
        />
        <ZeitraumFilter
          label="Abschluss"
          value={zeitraum}
          onChange={(z) => {
            setZeitraum(z);
            setZuletztVerschoben(null);
          }}
          className="sm:w-60"
        />
        {gefiltert && (
          <button
            type="button"
            onClick={filterZuruecksetzen}
            className="w-fit rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Filter zurücksetzen
          </button>
        )}
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {sichtbarGesamt} von {deals.length}{" "}
          {deals.length === 1 ? "Deal" : "Deals"}
        </span>
      </div>

      {/* Ausgeblendetes deutlich sichtbar machen: Das Board startet bewusst
          auf „Dieses Jahr", damit die Abschlussphase nicht überläuft — aber
          niemand soll rätseln, wo ein alter Deal geblieben ist. */}
      {ausgeblendetGesamt > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm"
        >
          <span className="font-medium">
            {ausgeblendetGesamt}{" "}
            {ausgeblendetGesamt === 1 ? "Deal ist" : "Deals sind"} ausgeblendet
          </span>
          <span className="text-muted-foreground">
            — Abschluss: {zeitraumLabel(zeitraum.wert)}
            {q.trim() !== "" && ` · Suche „${q.trim()}“`}
          </span>
          <button
            type="button"
            onClick={filterZuruecksetzen}
            className="ml-auto shrink-0 font-medium underline underline-offset-2"
          >
            Alle anzeigen
          </button>
        </div>
      )}
      <p className="mb-3 text-xs text-muted-foreground">
        Der Zeitraum filtert nur die Abschluss- und Verlustphasen — laufende
        Deals bleiben immer sichtbar.
      </p>

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
            deals={sichtbar.get(stage.id)?.deals ?? []}
            ausgeblendet={sichtbar.get(stage.id)?.ausgeblendet ?? 0}
            beraterMap={beraterMap}
            isGf={isGf}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <div className="w-72 rotate-2 rounded-lg border border-primary/50 bg-surface-2 p-3 pr-8 shadow-lg">
            <DealCardContent
              deal={activeDeal}
              beraterName={beraterMap[activeDeal.berater_id] ?? "—"}
              isGf={isGf}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
    </>
  );
}
