"use client";

import { useState } from "react";
import { Building2, ChevronDown, Handshake, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEUR } from "@/lib/format";
import { Pill } from "@/components/ui/pill";

type Bereich = "immobilien" | "vv";

export type StructureNode = {
  id: string;
  name: string;
  kind: "gf" | "berater" | "tippgeber";
  stufe?: string;
  immoAnteil?: string;
  provisionSatz?: string;
  bereiche?: Bereich[];
  perf?: { abschluesse: number; umsatz: number; pipeline: number };
  children: StructureNode[];
};

/**
 * Organigramm der Struktur (Call SJ F5): mehrstufig (Anna → Eva → Lukas),
 * Berater und Tippgeber unterscheidbar. Hover über einen Knoten zeigt dessen
 * Performance (Abschlüsse, Umsatz, offene Pipeline).
 */
export function StructureTree({
  roots,
  leerText = "Noch keine Struktur angelegt.",
}: {
  roots: StructureNode[];
  leerText?: string;
}) {
  if (roots.length === 0)
    return <p className="text-sm text-muted-foreground">{leerText}</p>;
  return (
    <ul className="space-y-0.5">
      {roots.map((n) => (
        <TreeNode key={n.id} node={n} depth={0} />
      ))}
    </ul>
  );
}

function TreeNode({ node, depth }: { node: StructureNode; depth: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const Icon =
    node.kind === "tippgeber"
      ? Handshake
      : node.kind === "gf"
        ? Building2
        : Users;

  return (
    <li>
      <div
        className="group relative flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2"
        style={{ marginLeft: depth * 20 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 text-muted-foreground"
            aria-label={open ? "Zuklappen" : "Aufklappen"}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                !open && "-rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-md",
            node.kind === "tippgeber"
              ? "bg-amber-500/15 text-amber-600"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-medium">{node.name}</span>
        {node.kind === "tippgeber" ? (
          <Pill tone="warning">
            Tippgeber{node.provisionSatz ? ` · ${node.provisionSatz} %` : ""}
          </Pill>
        ) : node.kind === "gf" ? (
          <Pill tone="accent">Geschäftsführung</Pill>
        ) : (
          <span className="text-xs tabular-nums text-muted-foreground">
            {node.perf
              ? `${node.perf.abschluesse} Abschl. · ${formatEUR(node.perf.umsatz)}`
              : ""}
          </span>
        )}

        {/* Hover-Popover mit Performance */}
        <div className="pointer-events-none absolute left-8 top-full z-20 mt-1 hidden w-64 rounded-lg border border-border bg-surface p-3 text-xs shadow-lg group-hover:block">
          <div className="mb-1.5 font-semibold">{node.name}</div>
          {node.kind === "tippgeber" ? (
            <dl className="space-y-1">
              <Row label="Typ" value="Tippgeber (kein Login)" />
              <Row
                label="Provision"
                value={node.provisionSatz ? `${node.provisionSatz} %` : "—"}
              />
              <Row
                label="Sparten"
                value={
                  (node.bereiche ?? [])
                    .map((b) => (b === "immobilien" ? "Immobilien" : "VV"))
                    .join(", ") || "—"
                }
              />
            </dl>
          ) : (
            <dl className="space-y-1">
              <Row
                label="Abschlüsse"
                value={String(node.perf?.abschluesse ?? 0)}
              />
              <Row
                label="Umsatz (gewonnen)"
                value={formatEUR(node.perf?.umsatz ?? 0)}
              />
              <Row
                label="Offene Pipeline"
                value={formatEUR(node.perf?.pipeline ?? 0)}
              />
              {node.stufe ? <Row label="Stufe VV" value={`${node.stufe} %`} /> : null}
              {node.immoAnteil ? (
                <Row label="Immo-Anteil" value={`${node.immoAnteil} %`} />
              ) : null}
            </dl>
          )}
        </div>
      </div>
      {hasChildren && open && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
