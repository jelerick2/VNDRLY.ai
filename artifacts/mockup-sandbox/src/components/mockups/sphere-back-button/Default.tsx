import blankMask from "@assets/VNDRLYai-Button-blank_1777361718577.png";
import hoverGlossSphere from "@assets/download_1777663665476.png";
import backIcon from "@assets/Symbol_Arrow_Left_1777371273492.png";

/**
 * Inline copy of artifacts/vndrly/src/components/sphere-back-button.tsx so this
 * mockup can render the exact same three-layer stack without crossing
 * package boundaries. Layer order (bottom -> top):
 *   1. blank sphere mask, tinted #616161 — opacity 0 default, 100 on hover
 *   2. blank sphere mask, tinted var(--brand-primary) — opacity 100 default,
 *      0 on hover (cross-fades to reveal gray underneath)
 *   3. back-arrow + gloss PNG at 50% opacity, pointer-events-none
 */
function SphereBackButton({ size = 48 }: { size?: number }) {
  const maskCommon: React.CSSProperties = {
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
  };
  return (
    <span
      aria-hidden="true"
      className="relative inline-block shrink-0 align-middle"
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 opacity-100"
        style={{
          ...maskCommon,
          WebkitMaskImage: `url(${blankMask})`,
          maskImage: `url(${blankMask})`,
          backgroundColor: "var(--brand-primary)",
        }}
      />
      <img
        src={hoverGlossSphere}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      />
      <img
        src={backIcon}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{ mixBlendMode: "screen" }}
      />
    </span>
  );
}

interface BrandRowProps {
  label: string;
  brand: string;
}

function BrandRow({ label, brand }: BrandRowProps) {
  return (
    <div
      style={{ ["--brand-primary" as never]: brand }}
      className="flex items-center gap-6 py-4 px-6 border-b border-gray-200 last:border-b-0"
    >
      <div className="w-40 text-sm font-medium text-gray-700">{label}</div>
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center gap-1">
          {/* `group` lets the in-cell hover affordance be triggered just by
              hovering this rest sample (so the user sees the gray hover
              state without needing to mouse over the button). */}
          <div className="group">
            <SphereBackButton size={48} />
          </div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            rest
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          {/* Force-hover demo: wrap a `group` already in the hover state by
              setting it via a data-* selector pattern. Easiest: a sibling
              element with hover styles toggled via CSS class on a
              perma-hovered ancestor. We just inline the brand fade-out by
              rendering the gray-over variant directly. */}
          <span
            aria-hidden="true"
            className="relative inline-block shrink-0 align-middle"
            style={{ width: 48, height: 48 }}
          >
            <span
              className="absolute inset-0"
              style={{
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
                WebkitMaskImage: `url(${blankMask})`,
                maskImage: `url(${blankMask})`,
                backgroundColor: "var(--brand-primary)",
              }}
            />
            <img
              src={hoverGlossSphere}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-100"
            />
            <img
              src={backIcon}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full pointer-events-none select-none"
              style={{ mixBlendMode: "screen" }}
            />
          </span>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            hover
          </div>
        </div>
      </div>
      <div className="ml-auto font-mono text-xs text-gray-500">{brand}</div>
    </div>
  );
}

export default function SphereBackButtonDefault() {
  return (
    <div className="min-h-screen bg-white p-10 font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">
          Sphere back button — per-tenant brand color
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Same three-layer stack, same blank sphere PNG used as a CSS mask.
          Only the <code className="bg-gray-100 px-1 rounded">--brand-primary</code>
          {" "}CSS variable changes per tenant. Hover the “rest” sample to
          watch the brand layer fade to reveal the gray hover layer
          underneath.
        </p>
        <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
          <BrandRow label="VNDRLY (default)" brand="#F59E0B" />
          <BrandRow label="ExxonMobil" brand="#DA291C" />
          <BrandRow label="Generic Blue partner" brand="#1E3A8A" />
          <BrandRow label="Forest green partner" brand="#15803D" />
        </div>
      </div>
    </div>
  );
}
