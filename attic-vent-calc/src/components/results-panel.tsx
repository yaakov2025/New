import type { CalcResult } from "@/lib/ventilation";
import { Badge } from "@/components/ui/badge";
import { formatNfa } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

function Meter({
  label,
  provided,
  required,
  tone,
}: {
  label: string;
  provided: number;
  required: number;
  tone: "intake" | "exhaust";
}) {
  const pct = required > 0 ? Math.min(100, (provided / required) * 100) : 0;
  const ok = provided + 0.05 >= required && required > 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm tabular-nums text-muted">
          <span className={ok ? "text-ok" : provided > 0 ? "text-warn" : "text-fg"}>{formatNfa(provided)}</span>
          <span> / {formatNfa(required)} sq in</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            tone === "intake" ? "bg-intake" : "bg-exhaust",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ResultsPanel({ result }: { result: CalcResult }) {
  const status = !result.atticSqFt
    ? { tone: "neutral" as const, label: "Enter attic size" }
    : result.meetsTarget && result.balanced && !result.mix.competingExhaust
      ? { tone: "ok" as const, label: "Balanced and to target" }
      : result.meetsTarget
        ? { tone: "warn" as const, label: "NFA met — check balance" }
        : { tone: "fail" as const, label: "Short of required NFA" };

  return (
    <div className="flex min-w-0 flex-col gap-5 overflow-hidden rounded-2xl bg-surface p-5 shadow-card-lg sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Live result</p>
          <h2 className="mt-1 font-display text-3xl font-medium tracking-tight">
            {formatNfa(result.atticSqFt)} sq ft attic
          </h2>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat k="Code ratio" v={`1/${result.ratio}`} s={result.ratio === 300 ? "IRC exception" : "IRC R806.2"} />
        <Stat k="Required NFA" v={formatNfa(result.requiredTotalSqIn)} s="sq in total" />
      </div>

      <Meter
        label="Intake (low eave)"
        provided={result.providedIntakeSqIn}
        required={result.requiredIntakeSqIn}
        tone="intake"
      />
      <Meter
        label="Exhaust (ridge)"
        provided={result.providedExhaustSqIn}
        required={result.requiredExhaustSqIn}
        tone="exhaust"
      />

      {result.meetsTarget ? (
        <p className="flex items-start gap-2 text-sm text-ok">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          Totals meet or exceed the required NFA for a 1/{result.ratio} code ratio.
        </p>
      ) : result.atticSqFt > 0 ? (
        <p className="text-sm text-muted">
          Add intake and exhaust below. Target is {formatNfa(result.requiredIntakeSqIn)} sq in each at 1/{result.ratio}.
        </p>
      ) : null}
    </div>
  );
}

function Stat({ k, v, s }: { k: string; v: string; s: string }) {
  return (
    <div className="rounded-xl bg-bg px-4 py-3">
      <p className="text-xs text-muted">{k}</p>
      <p className="font-display text-2xl font-medium tracking-tight">{v}</p>
      <p className="text-xs text-subtle">{s}</p>
    </div>
  );
}
