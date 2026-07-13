import { toast } from "sonner";

/**
 * Erfolgs-Moment beim Abschluss (V4.1 Kap. 9.2) — kurz & elegant, kein
 * Feuerwerk: ein Glückwunsch-Toast plus ein dezenter Konfetti-Regen.
 * Dependency-frei (Web Animations API), respektiert prefers-reduced-motion.
 */
export function celebrateWin(dealname: string) {
  toast.success(`🎉 Abgeschlossen — ${dealname}`, {
    description: "Glückwunsch zum Abschluss!",
  });

  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const farben = [
    "var(--gold, #c9a24a)",
    "#4ea1ff",
    "#3ecf8e",
    "#ffb020",
    "#ff6b6b",
  ];
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(container);

  const N = 90;
  for (let i = 0; i < N; i++) {
    const p = document.createElement("div");
    const size = 6 + Math.random() * 6;
    const links = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 160;
    const dauer = 1600 + Math.random() * 1400;
    const verzug = Math.random() * 250;
    const rund = Math.random() > 0.5;
    p.style.cssText = `position:absolute;top:-16px;left:${links}vw;width:${size}px;height:${size * (rund ? 1 : 0.4)}px;background:${farben[i % farben.length]};border-radius:${rund ? "50%" : "1px"};opacity:0.95`;
    container.appendChild(p);
    p.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${drift}px, 105vh) rotate(${Math.random() * 720}deg)`,
          opacity: 0.9,
        },
      ],
      { duration: dauer, delay: verzug, easing: "cubic-bezier(.2,.6,.4,1)" },
    );
  }

  window.setTimeout(() => container.remove(), 3400);
}
