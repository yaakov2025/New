import { DIAGRAM_OVERLAY, getHouseStyle } from "@/lib/ventilation";
import type { CalcResult, Project } from "@/lib/ventilation";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function AirStream({
  id,
  d,
  gradient,
  count,
  duration,
  opacity,
  reverse,
  reduced,
}: {
  id: string;
  d: string;
  gradient: string;
  count: number;
  duration: number;
  opacity: number;
  reverse?: boolean;
  reduced: boolean;
}) {
  return (
    <g opacity={opacity}>
      <path
        d={d}
        fill="none"
        stroke={`url(#${gradient})`}
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.16"
      />
      <path
        id={id}
        className={reduced ? undefined : "flow-stream"}
        d={d}
        fill="none"
        stroke={`url(#${gradient})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.9"
        markerEnd="url(#flow-head)"
      />
      {reduced
        ? null
        : Array.from({ length: count }, (_, i) => (
            <polygon
              key={`${id}-${i}`}
              points="-14,-8 18,0 -14,8 -6,0"
              fill={`url(#${gradient})`}
              stroke="rgb(247 245 239 / 0.65)"
              strokeWidth="1"
            >
              <animateMotion
                dur={`${duration}s`}
                begin={`${(-i * duration) / count}s`}
                repeatCount="indefinite"
                rotate={reverse ? "auto-reverse" : "auto"}
                keyPoints={reverse ? "1;0" : "0;1"}
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href={`#${id}`} />
              </animateMotion>
            </polygon>
          ))}
    </g>
  );
}

function Callout({
  title,
  value,
  tone,
  className,
}: {
  title: string;
  value: string;
  tone: "intake" | "exhaust";
  className: string;
}) {
  return (
    <div
      className={cn(
        "absolute max-w-[11.5rem] rounded-lg bg-surface px-3 py-2 shadow-card",
        className,
      )}
    >
      <p className={cn("text-xs font-medium", tone === "intake" ? "text-intake" : "text-exhaust")}>
        {title}
      </p>
      <p className="font-mono text-sm tabular-nums text-fg">{value}</p>
    </div>
  );
}

export function AtticDiagram({
  project,
  result,
}: {
  project: Project;
  result: CalcResult;
}) {
  const intakeOn = result.providedIntakeSqIn > 0;
  const exhaustOn = result.providedExhaustSqIn > 0;
  const starved = exhaustOn && result.providedIntakeSqIn < result.providedExhaustSqIn;
  const stalled = intakeOn && !exhaustOn;
  const flowOk = intakeOn && exhaustOn && !starved && !result.mix.hasFan;
  const reduced = usePrefersReducedMotion();
  const style = getHouseStyle(project.houseStyle);
  const flow = DIAGRAM_OVERLAY[style.id];
  const streamOpacity = flowOk ? 1 : starved ? 0.85 : stalled ? 0.5 : 0.7;

  const eaveEach =
    style.id === "shed" ? project.eaveLengthFt : Math.round(project.eaveLengthFt / 2);
  const exhaustLabel = style.id === "shed" ? "Exhaust (high side)" : "Exhaust (ridge)";
  const exhaustValue =
    style.id === "shed" ? `${project.eaveLengthFt} ft` : `${project.ridgeLengthFt} ft`;

  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl bg-diagram">
      <img
        src={style.hero}
        alt={`${style.name} attic diagram`}
        className="block h-auto w-full"
        crossOrigin="anonymous"
      />
      <svg
        viewBox="0 0 1600 900"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="heat-left" gradientUnits="userSpaceOnUse" x1="300" y1="450" x2="800" y2="120">
            <stop offset="0" stopColor="var(--color-intake)" />
            <stop offset="0.5" stopColor="var(--color-heat)" />
            <stop offset="1" stopColor="var(--color-exhaust)" />
          </linearGradient>
          <linearGradient id="heat-right" gradientUnits="userSpaceOnUse" x1="1300" y1="450" x2="800" y2="120">
            <stop offset="0" stopColor="var(--color-intake)" />
            <stop offset="0.5" stopColor="var(--color-heat)" />
            <stop offset="1" stopColor="var(--color-exhaust)" />
          </linearGradient>
          <linearGradient id="heat-exit" gradientUnits="userSpaceOnUse" x1="800" y1="200" x2="800" y2="40">
            <stop offset="0" stopColor="var(--color-heat)" />
            <stop offset="1" stopColor="var(--color-exhaust)" />
          </linearGradient>
          <marker id="flow-head" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M1 1 L11 6 L1 11 Z" fill="var(--color-exhaust)" />
          </marker>
        </defs>
        {flow.left ? (
          <AirStream
            id="flow-left"
            d={flow.left}
            gradient="heat-left"
            count={4}
            duration={3.4}
            opacity={streamOpacity}
            reverse={starved}
            reduced={reduced}
          />
        ) : null}
        {flow.right ? (
          <AirStream
            id="flow-right"
            d={flow.right}
            gradient="heat-right"
            count={4}
            duration={3.4}
            opacity={streamOpacity}
            reverse={starved}
            reduced={reduced}
          />
        ) : null}
        {flow.exit && !stalled ? (
          <AirStream
            id="flow-exit"
            d={flow.exit}
            gradient="heat-exit"
            count={3}
            duration={1.6}
            opacity={starved ? 0.9 : streamOpacity}
            reverse={starved}
            reduced={reduced}
          />
        ) : null}
      </svg>

      <span className={cn("absolute rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-primary-fg sm:text-sm", flow.chip)}>
        {style.name} ({style.chip})
      </span>

      <div className={cn("absolute hidden max-w-52 items-start gap-2 rounded-lg bg-surface px-3 py-2 text-xs leading-snug text-muted shadow-card md:flex", flow.tip)}>
        <Info className="mt-0.5 size-3.5 shrink-0 text-intake" />
        <span>{style.tip}</span>
      </div>

      {flow.intakeLeft ? (
        <Callout
          title="Intake (low eave)"
          value={`${eaveEach} ft`}
          tone="intake"
          className={cn("hidden sm:block", flow.intakeLeft)}
        />
      ) : null}
      {flow.intakeRight ? (
        <Callout
          title={style.id === "shed" ? "Intake (low eave)" : "Intake (low eave)"}
          value={`${eaveEach} ft`}
          tone="intake"
          className={cn("hidden sm:block", flow.intakeRight)}
        />
      ) : null}
      <Callout
        title={exhaustLabel}
        value={exhaustValue}
        tone="exhaust"
        className={cn("hidden sm:block", flow.exhaust)}
      />

      <div className="flex flex-wrap gap-2 border-t border-border bg-surface/90 px-3 py-2 text-xs sm:hidden">
        <span className="text-intake">Intake {eaveEach} ft</span>
        <span className="text-muted">·</span>
        <span className="text-exhaust">
          {exhaustLabel} {exhaustValue}
        </span>
      </div>
    </div>
  );
}
