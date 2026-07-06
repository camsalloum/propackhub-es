import { useEffect, useRef, useState } from "react";

// ---- Demo content: swap these for real project data / images ----
const CARDS = [
  { id: "01", title: "FRONTIER WITHIN", tag: "XR / AI", hue: "190 90% 55%" },
  { id: "02", title: "CHILE 20", tag: "INSTALLATION", hue: "350 85% 55%" },
  { id: "03", title: "MOONLIT SUITE", tag: "MULTIPLAYER", hue: "265 80% 60%" },
  { id: "04", title: "GHOST SIGNAL", tag: "WEBSITE", hue: "45 90% 55%" },
];

function useScrollProgress(containerRef, totalPanels) {
  const [progress, setProgress] = useState(0); // 0..totalPanels-1 (fractional)

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? el.scrollTop / max : 0;
      setProgress(p * (totalPanels - 1));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [containerRef, totalPanels]);

  return progress;
}

function GlitchCard({ card, delta, index }) {
  // delta: how far this card is from "active" position. 0 = centered/active.
  const abs = Math.abs(delta);
  const active = abs < 0.5;

  // Glitch intensity peaks as a card is transitioning in/out (delta near 0.5..1)
  const glitchZone = Math.max(0, 1 - Math.abs(abs - 0.5) * 2.2);
  const rot = delta * -18;
  const translateX = delta * 60;
  const translateZ = -abs * 260;
  const scale = 1 - abs * 0.22;
  const opacity = Math.max(0, 1 - abs * 0.85);

  const rgbShift = glitchZone * 10;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        margin: "auto",
        width: "min(72vw, 640px)",
        height: "min(72vw, 640px)",
        maxHeight: "62vh",
        transformStyle: "preserve-3d",
        transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rot}deg) scale(${scale})`,
        opacity,
        pointerEvents: active ? "auto" : "none",
        transition: "opacity 0.05s linear",
        zIndex: 100 - Math.round(abs * 10),
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 4,
          overflow: "hidden",
          border: `1px solid hsla(${card.hue} / ${0.35 + (active ? 0.4 : 0)})`,
          background: `
            radial-gradient(120% 140% at 20% 10%, hsla(${card.hue} / 0.35), transparent 60%),
            radial-gradient(140% 160% at 90% 90%, hsla(${card.hue} / 0.25), transparent 55%),
            #0a0a0d
          `,
          boxShadow: active
            ? `0 40px 100px -30px hsla(${card.hue} / 0.5), 0 0 0 1px hsla(${card.hue} / 0.15)`
            : "none",
        }}
      >
        {/* RGB-split glitch layers */}
        {glitchZone > 0.02 && (
          <>
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                mixBlendMode: "screen",
                background: `hsla(0, 90%, 55%, ${0.35 * glitchZone})`,
                transform: `translateX(${rgbShift}px)`,
                clipPath: `polygon(0 ${10 + glitchZone * 20}%, 100% ${
                  14 + glitchZone * 15
                }%, 100% ${40 + glitchZone * 10}%, 0 ${36 + glitchZone * 12}%)`,
              }}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                mixBlendMode: "screen",
                background: `hsla(190, 90%, 55%, ${0.35 * glitchZone})`,
                transform: `translateX(${-rgbShift}px)`,
                clipPath: `polygon(0 ${55 + glitchZone * 10}%, 100% ${
                  58 + glitchZone * 8
                }%, 100% ${80 + glitchZone * 10}%, 0 ${76 + glitchZone * 8}%)`,
              }}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: `repeating-linear-gradient(
                  0deg,
                  transparent 0px,
                  transparent 2px,
                  rgba(255,255,255,${0.06 * glitchZone}) 3px,
                  transparent 4px
                )`,
                transform: `translateY(${glitchZone * 6}px)`,
              }}
            />
          </>
        )}

        {/* Card content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "clamp(16px, 4vw, 36px)",
            filter: glitchZone > 0.02 ? `blur(${glitchZone * 0.6}px)` : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              letterSpacing: "0.12em",
              color: `hsl(${card.hue})`,
              textTransform: "uppercase",
            }}
          >
            <span>{card.id} / {String(CARDS.length).padStart(2, "0")}</span>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>{card.tag}</span>
          </div>

          <h2
            style={{
              margin: 0,
              fontFamily: "'Space Grotesk', 'Inter', sans-serif",
              fontWeight: 600,
              fontSize: "clamp(28px, 5.5vw, 52px)",
              lineHeight: 1.02,
              color: "#f2f2f5",
              letterSpacing: "-0.02em",
              transform: glitchZone > 0.15 ? `translateX(${rgbShift * 0.4}px)` : "none",
              textShadow:
                glitchZone > 0.15
                  ? `${rgbShift * 0.3}px 0 rgba(255,60,60,0.7), ${-rgbShift * 0.3}px 0 rgba(60,200,255,0.7)`
                  : "none",
            }}
          >
            {card.title}
          </h2>
        </div>
      </div>
    </div>
  );
}

export default function ScrollGlitchGallery() {
  const containerRef = useRef(null);
  const progress = useScrollProgress(containerRef, CARDS.length);
  const activeIndex = Math.round(progress);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#050506",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient grid backdrop */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />

      {/* Fixed UI chrome */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          padding: "20px clamp(16px,4vw,36px)",
          zIndex: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.55)",
          textTransform: "uppercase",
          pointerEvents: "none",
        }}
      >
        <span>Scroll Gallery — Demo</span>
        <span>{String(activeIndex + 1).padStart(2, "0")} / {String(CARDS.length).padStart(2, "0")}</span>
      </div>

      {/* 3D stage */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: "1400px",
          perspectiveOrigin: "50% 50%",
        }}
      >
        {CARDS.map((card, i) => (
          <GlitchCard key={card.id} card={card} index={i} delta={i - progress} />
        ))}
      </div>

      {/* Progress rail */}
      <div
        style={{
          position: "absolute",
          right: "clamp(16px, 4vw, 36px)",
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 10,
        }}
      >
        {CARDS.map((c, i) => (
          <div
            key={c.id}
            style={{
              width: i === activeIndex ? 8 : 6,
              height: i === activeIndex ? 8 : 6,
              borderRadius: "50%",
              background:
                i === activeIndex ? `hsl(${c.hue})` : "rgba(255,255,255,0.25)",
              transition: "all 0.25s ease",
            }}
          />
        ))}
      </div>

      {/* Scroll hint */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.16em",
          color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          zIndex: 10,
          opacity: activeIndex === 0 ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        ↓ scroll to move through cards
      </div>

      {/* The actual scrollable driver — its height creates scroll distance */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          overflowY: "scroll",
          scrollSnapType: "y proximity",
        }}
      >
        {CARDS.map((c) => (
          <div
            key={c.id}
            style={{ height: "100vh", scrollSnapAlign: "start" }}
          />
        ))}
      </div>
    </div>
  );
}
