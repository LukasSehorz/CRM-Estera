"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Handshake, Minus, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEUR } from "@/lib/format";

export type TreeNode = {
  id: string;
  name: string;
  kind: "gf" | "berater" | "tippgeber";
  stufe?: string;
  immoAnteil?: string;
  provisionSatz?: string;
  bereiche?: ("immobilien" | "vv")[];
  perf?: { abschluesse: number; umsatz: number; pipeline: number };
  children: TreeNode[];
};

// Layout-Konstanten (Top-Down-Baum wie Entscheidungsbaum).
const LEVEL_H = 138; // vertikaler Abstand je Ebene
const X_GAP = 158; // horizontaler Abstand je Blatt
const NODE_R = 30; // Andock-Radius für Konnektoren
const PAD = 92; // Rand (genug für die zentrierten Labels)

type Pos = { x: number; y: number; depth: number };

/**
 * Entscheidungsbaum der Struktur (Call SJ): GF ganz oben (Raute), darunter die
 * Berater (Kreise), Tippgeber als Blätter (Pillen), verbunden mit Linien.
 * Hover hebt den Pfad hervor (Lichtimpuls) und graut den Rest aus; Knoten mit
 * Downline lassen sich auf-/zuklappen (mehrere Ebenen, aufgeräumt).
 */
export function DecisionTree({ root }: { root: TreeNode }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(
    // Standard: nur die ersten zwei Ebenen offen (Rest eingeklappt).
    () => {
      const s = new Set<string>();
      const walk = (n: TreeNode, depth: number) => {
        if (depth >= 1 && n.children.length > 0) s.add(n.id);
        n.children.forEach((c) => walk(c, depth + 1));
      };
      walk(root, 0);
      return s;
    },
  );
  const [hovered, setHovered] = useState<string | null>(null);

  // Sichtbaren Baum (unter Berücksichtigung eingeklappter Knoten) auslegen.
  const { pos, edges, parentOf, width, height, visible } = useMemo(() => {
    const pos = new Map<string, Pos>();
    const parentOf = new Map<string, string>();
    const edges: { from: string; to: string }[] = [];
    const visible = new Set<string>();
    let leaf = 0;

    const layout = (n: TreeNode, depth: number, parent?: string): number => {
      visible.add(n.id);
      if (parent) parentOf.set(n.id, parent);
      const kids = collapsed.has(n.id) ? [] : n.children;
      let x: number;
      if (kids.length === 0) {
        x = leaf * X_GAP;
        leaf += 1;
      } else {
        const xs = kids.map((c) => {
          edges.push({ from: n.id, to: c.id });
          return layout(c, depth + 1, n.id);
        });
        x = (xs[0] + xs[xs.length - 1]) / 2;
      }
      pos.set(n.id, { x, y: depth * LEVEL_H, depth });
      return x;
    };
    layout(root, 0);

    let maxX = 0;
    let maxY = 0;
    for (const p of pos.values()) {
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return {
      pos,
      edges,
      parentOf,
      visible,
      width: maxX + PAD * 2,
      height: maxY + PAD * 2 + NODE_R,
    };
  }, [root, collapsed]);

  // Node-Index für schnellen Zugriff.
  const byId = useMemo(() => {
    const m = new Map<string, TreeNode>();
    const walk = (n: TreeNode) => {
      m.set(n.id, n);
      n.children.forEach(walk);
    };
    walk(root);
    return m;
  }, [root]);

  // Aktiver Pfad = Wurzel → gehoverter Knoten.
  const activePath = useMemo(() => {
    const s = new Set<string>();
    let cur = hovered;
    while (cur) {
      s.add(cur);
      cur = parentOf.get(cur) ?? null;
    }
    return s;
  }, [hovered, parentOf]);

  const px = (id: string) => (pos.get(id)?.x ?? 0) + PAD;
  const py = (id: string) => (pos.get(id)?.y ?? 0) + PAD;

  function toggle(id: string) {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="relative mx-auto"
        style={{ width, height }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Konnektoren */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
        >
          {edges.map((e) => {
            const x1 = px(e.from);
            const y1 = py(e.from) + NODE_R;
            const x2 = px(e.to);
            const y2 = py(e.to) - NODE_R;
            const midY = (y1 + y2) / 2;
            const dir = x2 > x1 ? 1 : x2 < x1 ? -1 : 0;
            const cr = 12;
            const d =
              dir === 0
                ? `M ${x1} ${y1} L ${x2} ${y2}`
                : `M ${x1} ${y1} L ${x1} ${midY - cr} Q ${x1} ${midY} ${x1 + dir * cr} ${midY} L ${x2 - dir * cr} ${midY} Q ${x2} ${midY} ${x2} ${midY + cr} L ${x2} ${y2}`;
            const active =
              activePath.has(e.from) && activePath.has(e.to);
            const dim = hovered !== null && !active;
            return (
              <g key={`${e.from}-${e.to}`}>
                <path
                  d={d}
                  fill="none"
                  className={cn(
                    "transition-[stroke,opacity] duration-300",
                    active ? "stroke-primary" : "stroke-border",
                  )}
                  strokeWidth={active ? 2.5 : 1.5}
                  style={{ opacity: dim ? 0.25 : 1 }}
                />
                {active && (
                  <path
                    d={d}
                    fill="none"
                    className="decision-pulse stroke-primary"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Knoten */}
        {[...visible].map((id, i) => {
          const node = byId.get(id);
          if (!node) return null;
          const active = activePath.has(id);
          const dim = hovered !== null && !active;
          const kids = node.children.length;
          const isCollapsed = collapsed.has(id);
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: dim ? 0.35 : 1, scale: 1 }}
              transition={{ duration: 0.28, delay: Math.min(i * 0.02, 0.3) }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: px(id), top: py(id) }}
              onMouseEnter={() => setHovered(id)}
            >
              <div className="flex flex-col items-center gap-1.5">
                <NodeShape node={node} active={active} />
                <div className="whitespace-nowrap text-center">
                  <div
                    className={cn(
                      "text-xs font-semibold",
                      active ? "text-foreground" : "text-foreground/90",
                    )}
                  >
                    {node.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {node.kind === "tippgeber"
                      ? `Tippgeber${node.provisionSatz ? ` · ${node.provisionSatz} %` : ""}`
                      : node.kind === "gf"
                        ? "Geschäftsführung"
                        : node.perf
                          ? `${node.perf.abschluesse} Abschl. · ${formatEUR(node.perf.umsatz)}`
                          : "Berater"}
                  </div>
                </div>

                {/* Auf-/Zuklappen, wenn Downline vorhanden */}
                {kids > 0 && (
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="grid h-5 w-5 place-items-center rounded-full border border-border bg-surface text-muted-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
                    aria-label={isCollapsed ? "Aufklappen" : "Zuklappen"}
                  >
                    {isCollapsed ? (
                      <Plus className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>

              {/* Hover-Detail */}
              <AnimatePresence>
                {hovered === id && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-surface p-3 text-xs shadow-xl"
                  >
                    <div className="mb-1.5 font-semibold">{node.name}</div>
                    {node.kind === "tippgeber" ? (
                      <Detail label="Provision" value={node.provisionSatz ? `${node.provisionSatz} %` : "—"} />
                    ) : (
                      <>
                        <Detail label="Abschlüsse" value={String(node.perf?.abschluesse ?? 0)} />
                        <Detail label="Umsatz" value={formatEUR(node.perf?.umsatz ?? 0)} />
                        <Detail label="Offene Pipeline" value={formatEUR(node.perf?.pipeline ?? 0)} />
                        {node.stufe ? <Detail label="Stufe VV" value={`${node.stufe} %`} /> : null}
                        {node.immoAnteil ? <Detail label="Immo-Anteil" value={`${node.immoAnteil} %`} /> : null}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function NodeShape({ node, active }: { node: TreeNode; active: boolean }) {
  if (node.kind === "gf") {
    return (
      <motion.div
        whileHover={{ scale: 1.08 }}
        className={cn(
          "grid h-14 w-14 rotate-45 place-items-center rounded-[14px] shadow-md ring-2 transition-shadow",
          "bg-primary text-primary-foreground",
          active ? "ring-primary shadow-primary/40" : "ring-transparent",
        )}
      >
        <Crown className="h-5 w-5 -rotate-45" />
      </motion.div>
    );
  }
  if (node.kind === "tippgeber") {
    return (
      <motion.div
        whileHover={{ scale: 1.06 }}
        className={cn(
          "flex h-11 items-center gap-1.5 rounded-full border-2 px-3 shadow-sm transition-colors",
          active
            ? "border-amber-500 bg-amber-500/15 text-amber-600"
            : "border-border bg-surface text-muted-foreground",
        )}
      >
        <Handshake className="h-4 w-4" />
      </motion.div>
    );
  }
  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      className={cn(
        "grid h-14 w-14 place-items-center rounded-full text-white shadow-md ring-2 transition-shadow",
        "bg-amber-500",
        active ? "ring-amber-500 shadow-amber-500/40" : "ring-transparent",
      )}
    >
      <User className="h-5 w-5" />
    </motion.div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
