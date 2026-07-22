"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Crown,
  Handshake,
  Maximize2,
  MousePointerClick,
  User,
} from "lucide-react";
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
  /** Ziel für den Klick auf den Namen (Berater-Drilldown). */
  href?: string;
  children: TreeNode[];
};

// Layout-Konstanten (Top-Down-Entscheidungsbaum).
const LEVEL_H = 152; // vertikaler Abstand je Ebene
const X_GAP = 150; // horizontaler Abstand je Blatt
const NODE_R = 30; // Andock-Radius für Konnektoren
const PADX = 100;
const PADY = 92;
const PANEL_W = 248; // Breite des Hover-Info-Panels

type Pos = { x: number; y: number; depth: number };

/**
 * Entscheidungsbaum der Struktur (Call SJ): GF oben (Raute/Krone), Berater als
 * Kreise, Tippgeber als Pillen. Der komplette Baum wird ausgelegt; eine „Kamera"
 * (ein einziger GPU-Transform) zoomt beim Klick flüssig auf einen Ast, der Rest
 * tritt zurück. Hover hebt den Pfad hervor (Lichtimpuls); die Infos erscheinen
 * in einem festen Panel, das keine Knoten verdeckt.
 */
export function DecisionTree({ root }: { root: TreeNode }) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(960);
  const [ch, setCh] = useState(460);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Viewport messen (vor dem Paint → kein Flackern).
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      setCw(el.clientWidth);
      setCh(el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Vollständiges Layout — alle Knoten (Zoom statt Einklappen).
  const { pos, edges, parentOf, byId, childrenOf, treeW, treeH } = useMemo(() => {
    const pos = new Map<string, Pos>();
    const parentOf = new Map<string, string>();
    const byId = new Map<string, TreeNode>();
    const childrenOf = new Map<string, string[]>();
    const edges: { from: string; to: string }[] = [];
    let leaf = 0;

    const layout = (n: TreeNode, depth: number, parent?: string): number => {
      byId.set(n.id, n);
      if (parent) parentOf.set(n.id, parent);
      childrenOf.set(
        n.id,
        n.children.map((c) => c.id),
      );
      let x: number;
      if (n.children.length === 0) {
        x = leaf * X_GAP;
        leaf += 1;
      } else {
        const xs = n.children.map((c) => {
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
      byId,
      childrenOf,
      treeW: maxX + PADX * 2,
      treeH: maxY + PADY * 2,
    };
  }, [root]);

  const px = useCallback((id: string) => (pos.get(id)?.x ?? 0) + PADX, [pos]);
  const py = useCallback((id: string) => (pos.get(id)?.y ?? 0) + PADY, [pos]);

  const ancestors = useCallback(
    (id: string) => {
      const s: string[] = [];
      let cur: string | undefined = id;
      while (cur) {
        s.push(cur);
        cur = parentOf.get(cur);
      }
      return s;
    },
    [parentOf],
  );
  const descendants = useCallback(
    (id: string) => {
      const out: string[] = [];
      const stack = [...(childrenOf.get(id) ?? [])];
      while (stack.length) {
        const c = stack.pop()!;
        out.push(c);
        stack.push(...(childrenOf.get(c) ?? []));
      }
      return out;
    },
    [childrenOf],
  );

  // Fokus-Menge (bei Zoom sichtbar): Vorfahren + Knoten + gesamte Downline.
  const focusSet = useMemo(() => {
    if (!focusId) return null;
    return new Set<string>([
      ...ancestors(focusId),
      focusId,
      ...descendants(focusId),
    ]);
  }, [focusId, ancestors, descendants]);

  // Kamera („Weltkarten-Zoom"): beim Fokus wird NUR der Ast (Knoten + komplette
  // Downline) eingepasst — kleiner Ast ⇒ starker Rein-Zoom. Die Vorfahren
  // bleiben sichtbar und laufen oben aus dem Bild (Pfad-Kontext). Ohne Fokus
  // wird der ganze Baum mittig eingepasst.
  const cam = useMemo(() => {
    const ids = focusId ? [focusId, ...descendants(focusId)] : [...pos.keys()];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of ids) {
      minX = Math.min(minX, px(id));
      maxX = Math.max(maxX, px(id));
      minY = Math.min(minY, py(id));
      maxY = Math.max(maxY, py(id));
    }
    // Reale Ausdehnung eines Knotens: oben ~Radius, unten Label + Untertitel.
    const mX = focusId ? 78 : 84;
    const mTop = focusId ? 54 : 74;
    const mBot = focusId ? 96 : 74;
    const bw = maxX - minX + mX * 2;
    const bh = maxY - minY + mTop + mBot;
    const scale = Math.min(cw / bw, ch / bh, focusId ? 2.2 : 1.12);
    const cx = (minX + maxX) / 2;
    // Mittelpunkt inkl. asymmetrischer Ränder (Labels brauchen unten mehr Platz).
    const cy = (minY - mTop + maxY + mBot) / 2;
    return { scale, x: cw / 2 - scale * cx, y: ch / 2 - scale * cy };
  }, [focusId, descendants, pos, px, py, cw, ch]);

  // Aktiver Pfad (Hover) = Wurzel → gehoverter Knoten.
  const activePath = useMemo(
    () => new Set(hovered ? ancestors(hovered) : []),
    [hovered, ancestors],
  );

  const isVisible = (id: string) => !focusSet || focusSet.has(id);
  const hoveredNode = hovered ? (byId.get(hovered) ?? null) : null;

  // Info-Panel NAHE am Knoten, aber kollisionsfrei (Feedback SJ): vier
  // Kandidaten (rechts · links · unterhalb · oberhalb), gewählt wird die
  // Position, die keine sichtbaren Knoten verdeckt und im Viewport bleibt.
  // Geister (ausgeblendete Äste) zählen nicht als Kollision.
  const panelPos = useMemo(() => {
    if (!hovered) return null;
    const node = byId.get(hovered);
    if (!node) return null;
    const sc = cam.scale;
    const sx = cam.x + sc * px(hovered);
    const sy = cam.y + sc * py(hovered);

    // Höhe des Panels grob aus dem Inhalt schätzen (Zeilen + Fußnoten).
    const rows =
      node.kind === "tippgeber"
        ? 1 + (node.perf ? 2 : 0)
        : 3 + (node.stufe ? 1 : 0) + (node.immoAnteil ? 1 : 0);
    const footer = (node.children.length > 0 ? 1 : 0) + (node.href ? 1 : 0);
    const h = 76 + rows * 21 + (footer ? 12 + footer * 20 : 0);

    const sideOff = 88 * sc + 12; // Kreis + zentriertes Label freihalten
    const rechts = sx + sideOff;
    const links = sx - sideOff - PANEL_W;
    const unten = sy + 92 * sc + 10;
    const oben = sy - 42 * sc - 10 - h;
    // Seiten-Kandidaten in drei vertikalen Lagen (zentriert · nach oben ·
    // nach unten ausgerichtet), damit das Panel z. B. der Kinder-Reihe
    // darunter ausweichen kann.
    const cand = [
      { x: rechts, y: sy - h / 2 },
      { x: links, y: sy - h / 2 },
      { x: rechts, y: sy + 88 * sc - h }, // Unterkante am Label → ragt nach oben
      { x: links, y: sy + 88 * sc - h },
      { x: rechts, y: sy - 36 * sc }, // Oberkante am Kreis → ragt nach unten
      { x: links, y: sy - 36 * sc },
      { x: sx - PANEL_W / 2, y: unten }, // unter dem Label, zentriert
      { x: sx + 10, y: unten }, // unten, nach rechts versetzt
      { x: sx - PANEL_W - 10, y: unten }, // unten, nach links versetzt
      { x: sx - PANEL_W / 2, y: oben }, // über dem Knoten, zentriert
      { x: sx + 10, y: oben }, // oben rechts versetzt
      { x: sx - PANEL_W - 10, y: oben }, // oben links versetzt
    ];

    // Belegte Flächen: sichtbare Knoten (Kreis + Label) + Steuerleiste oben.
    const rects: { l: number; t: number; r: number; b: number }[] = [];
    for (const id of pos.keys()) {
      if (id === hovered) continue;
      if (focusSet && !focusSet.has(id)) continue;
      const nx = cam.x + sc * px(id);
      const ny = cam.y + sc * py(id);
      rects.push({
        l: nx - 76 * sc,
        t: ny - 36 * sc,
        r: nx + 76 * sc,
        b: ny + 88 * sc,
      });
    }
    rects.push({ l: 0, t: 0, r: cw, b: 48 });

    const score = (x: number, y: number) => {
      let sum = 0;
      for (const r of rects) {
        const w = Math.min(x + PANEL_W, r.r) - Math.max(x, r.l);
        const hh = Math.min(y + h, r.b) - Math.max(y, r.t);
        if (w > 0 && hh > 0) sum += w * hh;
      }
      return sum;
    };

    let best = { x: 0, y: 0 };
    let bestScore = Infinity;
    for (const c of cand) {
      // In den Viewport klemmen, dann bewerten; nötiges Verschieben
      // (Klemmen) zählt als leichte Strafe, damit die natürliche
      // Position gewinnt, wenn beide frei sind.
      const x = Math.min(Math.max(c.x, 8), cw - PANEL_W - 8);
      const y = Math.min(Math.max(c.y, 8), ch - h - 8);
      const s = score(x, y) + (Math.abs(x - c.x) + Math.abs(y - c.y)) * 4;
      if (s < bestScore - 0.5) {
        bestScore = s;
        best = { x, y };
      }
    }
    return best;
  }, [hovered, byId, cam, px, py, pos, focusSet, cw, ch]);

  function focusNode(node: TreeNode) {
    const target = node.children.length
      ? node.id
      : (parentOf.get(node.id) ?? node.id);
    setFocusId((cur) => (cur === target ? null : target));
  }

  // Hover-Panel schnell schließen, sobald die Maus den Knoten verlässt —
  // kurze Entprellung (Wechsel zwischen Knoten flackert nicht, leerer Raum
  // schließt in ~60 ms).
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterNode = useCallback((id: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(id);
  }, []);
  const leaveNode = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovered(null), 60);
  }, []);

  return (
    <div className="relative">
      {/* Steuerleiste */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3">
        <AnimatePresence>
          {focusId && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              onClick={() => setFocusId(null)}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:border-primary hover:text-primary"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Gesamtansicht
            </motion.button>
          )}
        </AnimatePresence>
        <div className="pointer-events-none ml-auto inline-flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur">
          <MousePointerClick className="h-3.5 w-3.5" />
          Knoten anklicken zum Zoomen
        </div>
      </div>

      {/* Viewport (Kamera) */}
      <div
        ref={viewportRef}
        onClick={() => setFocusId(null)}
        onMouseLeave={leaveNode}
        className="relative h-[440px] overflow-hidden rounded-xl border border-border/70 bg-[radial-gradient(circle_at_1px_1px,var(--tree-dot)_1px,transparent_0)] [background-size:22px_22px] sm:h-[500px] lg:h-[560px]"
      >
        <motion.div
          className="absolute left-0 top-0 origin-top-left [will-change:transform]"
          style={{ width: treeW, height: treeH }}
          initial={false}
          animate={{ x: cam.x, y: cam.y, scale: cam.scale }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Konnektoren */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={treeW}
            height={treeH}
          >
            {edges.map((e) => {
              const x1 = px(e.from);
              const y1 = py(e.from) + NODE_R;
              const x2 = px(e.to);
              const y2 = py(e.to) - NODE_R;
              const midY = (y1 + y2) / 2;
              const dir = x2 > x1 ? 1 : x2 < x1 ? -1 : 0;
              const cr = 14;
              const d =
                dir === 0
                  ? `M ${x1} ${y1} L ${x2} ${y2}`
                  : `M ${x1} ${y1} L ${x1} ${midY - cr} Q ${x1} ${midY} ${x1 + dir * cr} ${midY} L ${x2 - dir * cr} ${midY} Q ${x2} ${midY} ${x2} ${midY + cr} L ${x2} ${y2}`;
              const bothVisible = isVisible(e.from) && isVisible(e.to);
              const active = activePath.has(e.from) && activePath.has(e.to);
              // Im Fokus-Modus dimmt Hover nicht zusätzlich — der Ast bleibt
              // voll sichtbar, nur der Pfad leuchtet.
              const dim = hovered !== null && !active && !focusId;
              const opacity = !bothVisible ? 0.05 : dim ? 0.2 : 1;
              return (
                <g key={`${e.from}-${e.to}`}>
                  {/* Basis bleibt dezent grau — der Fluss wird allein vom
                      Licht-Puls gezeigt (Herzschlag, mit Lücken), keine
                      kräftige durchgehende Farblinie mehr (Feedback SJ). */}
                  <path
                    d={d}
                    fill="none"
                    className="stroke-border transition-opacity duration-300"
                    strokeWidth={active ? 2 : 1.5}
                    style={{ opacity }}
                  />
                  {active && bothVisible && (
                    <path
                      d={d}
                      fill="none"
                      className="decision-pulse"
                      strokeWidth={3}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Knoten */}
          {[...pos.keys()].map((id) => {
            const node = byId.get(id);
            if (!node) return null;
            const vis = isVisible(id);
            const active = activePath.has(id);
            const dim = hovered !== null && !active && !focusId;
            const canFocus = node.children.length > 0;
            return (
              <motion.div
                key={id}
                initial={false}
                animate={{ opacity: !vis ? 0.06 : dim ? 0.3 : 1 }}
                transition={{ duration: 0.3 }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: px(id),
                  top: py(id),
                  pointerEvents: vis ? "auto" : "none",
                }}
                onMouseEnter={() => vis && enterNode(id)}
                onMouseLeave={leaveNode}
                onClick={(e) => {
                  e.stopPropagation();
                  focusNode(node);
                }}
              >
                <div
                  className={cn(
                    "flex flex-col items-center gap-1.5",
                    canFocus
                      ? focusId === id
                        ? "cursor-zoom-out"
                        : "cursor-zoom-in"
                      : "cursor-default",
                  )}
                >
                  <NodeShape node={node} active={active} />
                  <div className="whitespace-nowrap text-center">
                    {node.href ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(node.href!);
                        }}
                        className={cn(
                          "group/name inline-flex items-center gap-0.5 text-xs font-semibold transition-colors hover:text-primary hover:underline",
                          active ? "text-foreground" : "text-foreground/90",
                        )}
                      >
                        {node.name}
                        <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover/name:opacity-100" />
                      </button>
                    ) : (
                      <div
                        className={cn(
                          "text-xs font-semibold",
                          active ? "text-foreground" : "text-foreground/90",
                        )}
                      >
                        {node.name}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      {node.kind === "tippgeber"
                        ? node.perf && node.perf.umsatz > 0
                          ? `Tippgeber · ${formatEUR(node.perf.umsatz)}`
                          : `Tippgeber${node.provisionSatz ? ` · ${node.provisionSatz} %` : ""}`
                        : node.kind === "gf"
                          ? "Geschäftsführung"
                          : node.perf
                            ? `${node.perf.abschluesse} Abschl. · ${formatEUR(node.perf.umsatz)}`
                            : "Berater"}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Info-Panel nahe am Knoten — kollisionsfrei platziert */}
        <AnimatePresence>
          {hoveredNode && panelPos && (
            <motion.div
              key={hoveredNode.id}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              style={{ left: panelPos.x, top: panelPos.y, width: PANEL_W }}
              className="pointer-events-none absolute z-20 rounded-xl border border-border bg-surface/95 p-3.5 shadow-xl backdrop-blur"
            >
              <div className="mb-2.5 flex items-center gap-2.5">
                <PanelBadge kind={hoveredNode.kind} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {hoveredNode.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {hoveredNode.kind === "gf"
                      ? "Geschäftsführung"
                      : hoveredNode.kind === "tippgeber"
                        ? "Tippgeber"
                        : "Berater"}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                {hoveredNode.kind === "tippgeber" ? (
                  <>
                    <Detail
                      label="Provision"
                      value={hoveredNode.provisionSatz ? `${hoveredNode.provisionSatz} %` : "—"}
                    />
                    {hoveredNode.perf && (
                      <>
                        <Detail
                          label="Vermittelt"
                          value={String(hoveredNode.perf.abschluesse)}
                        />
                        <Detail
                          label="Umsatz"
                          value={formatEUR(hoveredNode.perf.umsatz)}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Detail
                      label="Abschlüsse"
                      value={String(hoveredNode.perf?.abschluesse ?? 0)}
                    />
                    <Detail
                      label="Umsatz"
                      value={formatEUR(hoveredNode.perf?.umsatz ?? 0)}
                    />
                    <Detail
                      label="Offene Pipeline"
                      value={formatEUR(hoveredNode.perf?.pipeline ?? 0)}
                    />
                    {hoveredNode.stufe ? (
                      <Detail label="Stufe VV" value={`${hoveredNode.stufe} %`} />
                    ) : null}
                    {hoveredNode.immoAnteil ? (
                      <Detail
                        label="Provisionsanteil"
                        value={`${hoveredNode.immoAnteil} %`}
                      />
                    ) : null}
                  </>
                )}
              </div>
              {(hoveredNode.children.length > 0 || hoveredNode.href) && (
                <div className="mt-2.5 space-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
                  {hoveredNode.children.length > 0 && (
                    <div>
                      {hoveredNode.children.length} direkt darunter · Klick zum
                      Zoomen
                    </div>
                  )}
                  {hoveredNode.href && (
                    <div className="flex items-center gap-1 text-primary">
                      <ArrowUpRight className="h-3 w-3" />
                      Namen anklicken → Berater-Details
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PanelBadge({ kind }: { kind: TreeNode["kind"] }) {
  if (kind === "gf")
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Crown className="h-4 w-4" />
      </span>
    );
  if (kind === "tippgeber")
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground">
        <Handshake className="h-4 w-4" />
      </span>
    );
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-soft text-background">
      <User className="h-4 w-4" />
    </span>
  );
}

function NodeShape({ node, active }: { node: TreeNode; active: boolean }) {
  if (node.kind === "gf") {
    // Apex: tiefe Akzentfarbe (Struktur-Anker), Krone in Kontrastfarbe.
    return (
      <motion.div
        whileHover={{ scale: 1.06 }}
        className={cn(
          "grid h-14 w-14 rotate-45 place-items-center rounded-[14px] shadow-md ring-2 transition-shadow",
          "bg-primary text-primary-foreground",
          active ? "ring-accent-400 shadow-lg shadow-accent-500/30" : "ring-transparent",
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
            ? "border-accent-500 bg-accent-500/15 text-gold-contrast"
            : "border-border bg-surface text-muted-foreground",
        )}
      >
        <Handshake className="h-4 w-4" />
      </motion.div>
    );
  }
  // Berater: hellerer Akzentton — klar vom Apex unterschieden, gleiche Familie.
  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      className={cn(
        "grid h-14 w-14 place-items-center rounded-full shadow-md ring-2 transition-shadow",
        "bg-gold-soft text-background",
        active ? "ring-accent-500 shadow-lg shadow-accent-500/25" : "ring-transparent",
      )}
    >
      <User className="h-5 w-5" />
    </motion.div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
