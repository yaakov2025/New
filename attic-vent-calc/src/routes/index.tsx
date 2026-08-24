import { AtticDiagram } from "@/components/attic-diagram";
import { AtticInputs } from "@/components/attic-inputs";
import { CodeNotes } from "@/components/code-notes";
import { FindingsList } from "@/components/findings-list";
import { HouseStylePicker } from "@/components/house-style-picker";
import { ResultsPanel } from "@/components/results-panel";
import { Button } from "@/components/ui/button";
import { VentPlanner } from "@/components/vent-planner";
import { calculate, getHouseStyle } from "@/lib/ventilation";
import { formatNfa } from "@/lib/utils";
import { useProjectStore } from "@/store";
import { createFileRoute } from "@tanstack/react-router";
import { Fan, Printer, RotateCcw } from "lucide-react";
import { useEffect, useMemo } from "react";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  const project = useProjectStore((s) => s.project);
  const patch = useProjectStore((s) => s.patch);
  const reset = useProjectStore((s) => s.reset);
  const setHydrated = useProjectStore((s) => s.setHydrated);

  useEffect(() => {
    const result = useProjectStore.persist.rehydrate();
    void Promise.resolve(result).then(() => setHydrated(true));
  }, [setHydrated]);

  const result = useMemo(() => calculate(project), [project]);

  return (
    <div className="min-h-dvh overflow-x-clip bg-bg">
      <header className="no-print sticky top-0 z-20 border-b border-border/80 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-fg shadow-[0_8px_20px_-8px_rgb(47_93_86_/_0.6)]">
              <Fan className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-3xl font-medium tracking-tight">Attic Vent Calc</p>
              <p className="text-sm text-muted">
                IRC R806 attic ventilation — intake, exhaust, and manufacturer NFA
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => reset()}>
              <RotateCcw />
              Reset example
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer />
              Print
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="animate-fade-up">
          <HouseStylePicker
            value={getHouseStyle(project.houseStyle).id}
            onChange={(houseStyle) => patch({ houseStyle })}
          />
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
          <AtticDiagram project={project} result={result} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <ResultsPanel result={result} />
        </div>

        <section className="grid min-w-0 animate-fade-up gap-4 lg:grid-cols-2" style={{ animationDelay: "140ms" }}>
          <AtticInputs project={project} onChange={patch} />
          <VentPlanner />
        </section>

        <FindingsList result={result} />

        <section className="print-break rounded-2xl bg-surface p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Job card
          </p>
          <h2 className="mt-1 font-display text-xl font-medium">{project.name}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Item k="House" v={getHouseStyle(project.houseStyle).name} />
            <Item k="Attic floor" v={`${formatNfa(result.atticSqFt)} sq ft`} />
            <Item k="Target" v={`1/${result.ratio}`} />
            <Item k="Intake NFA" v={`${formatNfa(result.providedIntakeSqIn)} / ${formatNfa(result.requiredIntakeSqIn)}`} />
            <Item k="Exhaust NFA" v={`${formatNfa(result.providedExhaustSqIn)} / ${formatNfa(result.requiredExhaustSqIn)}`} />
          </dl>
          {result.lines.length > 0 ? (
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 font-medium">Vent</th>
                  <th className="py-2 font-medium">Qty</th>
                  <th className="py-2 font-medium">NFA each</th>
                  <th className="py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.map((row) => (
                  <tr key={row.line.id} className="border-t border-border">
                    <td className="py-2">{row.product.name}</td>
                    <td className="py-2 font-mono tabular-nums">
                      {row.line.quantity} {row.product.unit === "lf" ? "lf" : "ea"}
                    </td>
                    <td className="py-2 font-mono tabular-nums">{formatNfa(row.nfaEach)}</td>
                    <td className="py-2 font-mono tabular-nums">
                      {formatNfa(row.nfaTotal)}
                      {row.cfmTotal ? ` · ${row.cfmTotal} CFM` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>

        <CodeNotes />
      </main>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="font-mono tabular-nums">{v}</dd>
    </div>
  );
}
