import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EXHAUST_PRODUCTS,
  INTAKE_PRODUCTS,
  MECHANICAL_PRODUCTS,
  type VentProduct,
} from "@/lib/ventilation";
import { formatNfa } from "@/lib/utils";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useProjectStore } from "@/store";

const TABS = [
  { id: "intake", label: "Intake", products: INTAKE_PRODUCTS },
  { id: "exhaust", label: "Exhaust", products: EXHAUST_PRODUCTS },
  { id: "mechanical", label: "Fans", products: MECHANICAL_PRODUCTS },
] as const;

export function VentPlanner() {
  const project = useProjectStore((s) => s.project);
  const addVent = useProjectStore((s) => s.addVent);
  const setVent = useProjectStore((s) => s.setVent);
  const removeVent = useProjectStore((s) => s.removeVent);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("intake");
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <section className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl bg-surface p-5 shadow-card">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          2 · Vents
        </p>
        <h2 className="mt-1 font-display text-xl font-medium">What is on the roof</h2>
        <p className="mt-1 text-sm text-muted">
          NFA values are typical published ratings. Override any line with the number on the product label.
        </p>
      </header>

      <div className="flex rounded-lg bg-bg p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`h-10 flex-1 rounded-md text-sm font-medium transition-colors duration-150 ${
              tab === t.id ? "bg-surface text-fg shadow-sm" : "text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {active.products.map((p) => (
          <ProductRow key={p.id} product={p} onAdd={() => addVent(p.id, p.unit === "lf" ? 10 : 1)} />
        ))}
      </ul>

      {project.vents.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm font-medium">Installed / planned</p>
          {project.vents.map((line) => {
            const product =
              INTAKE_PRODUCTS.concat(EXHAUST_PRODUCTS, MECHANICAL_PRODUCTS).find(
                (p) => p.id === line.productId,
              );
            if (!product) return null;
            const nfa = line.nfaOverride ?? product.nfa;
            const cfm = line.cfmOverride ?? product.cfm ?? 0;
            return (
              <div
                key={line.id}
                className="flex flex-col gap-2 rounded-lg bg-bg p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted">
                    {formatNfa(nfa * line.quantity)} sq in
                    {product.role === "mechanical" ? ` · ${Math.round(cfm * line.quantity)} CFM` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-muted">
                    NFA
                    <Input
                      className="h-11 w-20"
                      type="number"
                      min={0}
                      value={nfa}
                      onChange={(e) =>
                        setVent(line.id, { nfaOverride: Number(e.target.value) })
                      }
                    />
                  </label>
                  {product.role === "mechanical" ? (
                    <label className="flex items-center gap-1 text-xs text-muted">
                      CFM
                      <Input
                        className="h-11 w-20"
                        type="number"
                        min={0}
                        value={cfm}
                        onChange={(e) =>
                          setVent(line.id, { cfmOverride: Number(e.target.value) })
                        }
                      />
                    </label>
                  ) : null}
                  <div className="flex items-center rounded-md bg-surface shadow-[0_0_0_1px_var(--color-border)]">
                    <button
                      type="button"
                      className="flex size-11 items-center justify-center"
                      onClick={() =>
                        setVent(line.id, { quantity: Math.max(0, line.quantity - (product.unit === "lf" ? 1 : 1)) })
                      }
                      aria-label="Decrease"
                    >
                      <Minus className="size-4" />
                    </button>
                    <Input
                      className="h-11 w-16 border-0 shadow-none text-center"
                      type="number"
                      min={0}
                      value={line.quantity}
                      onChange={(e) => setVent(line.id, { quantity: Number(e.target.value) })}
                    />
                    <span className="pr-1 text-xs text-muted">{product.unit === "lf" ? "lf" : "ea"}</span>
                    <button
                      type="button"
                      className="flex size-11 items-center justify-center"
                      onClick={() => setVent(line.id, { quantity: line.quantity + 1 })}
                      aria-label="Increase"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVent(line.id)}
                    aria-label={`Remove ${product.shortName}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">No vents yet. Add intake at the eaves and exhaust at the ridge.</p>
      )}
    </section>
  );
}

function ProductRow({ product, onAdd }: { product: VentProduct; onAdd: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-bg px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="truncate text-xs text-muted">{product.sizeNote}</p>
      </div>
      <Badge tone={product.role === "intake" ? "intake" : product.role === "exhaust" ? "exhaust" : "neutral"}>
        {product.role === "mechanical"
          ? `${product.cfm} CFM`
          : `${product.nfa} / ${product.unit === "lf" ? "lf" : "ea"}`}
      </Badge>
      <Button variant="secondary" size="sm" onClick={onAdd} className="shrink-0">
        Add
      </Button>
    </li>
  );
}
