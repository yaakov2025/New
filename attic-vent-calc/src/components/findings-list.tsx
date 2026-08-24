import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CalcResult, Finding } from "@/lib/ventilation";
import { useProjectStore } from "@/store";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

const ICONS = {
  ok: CheckCircle2,
  info: Info,
  warn: AlertTriangle,
  fail: XCircle,
};

const TONE = {
  ok: "ok" as const,
  info: "neutral" as const,
  warn: "warn" as const,
  fail: "fail" as const,
};

export function FindingsList({ result }: { result: CalcResult }) {
  const applyAdd = useProjectStore((s) => s.applyAdd);

  return (
    <section className="flex flex-col gap-4">
      {result.suggestions.length > 0 ? (
        <div className="rounded-2xl bg-surface p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Fill the shortfall
          </p>
          <h2 className="mt-1 font-display text-xl font-medium">Suggested vents</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {result.suggestions.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-lg bg-bg p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted">{s.detail}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => applyAdd(s.productId, s.quantity)}
                >
                  Add to job
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl bg-surface p-5 shadow-card">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          Code & manufacturer check
        </p>
        <h2 className="mt-1 font-display text-xl font-medium">Findings</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {result.findings.map((f) => (
            <FindingRow key={f.id} finding={f} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const Icon = ICONS[finding.severity];
  return (
    <li className="flex gap-3 rounded-lg bg-bg p-3">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{finding.title}</p>
          <Badge tone={TONE[finding.severity]}>{finding.severity}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{finding.detail}</p>
      </div>
    </li>
  );
}
