import { HOUSE_STYLES } from "@/lib/ventilation";
import type { HouseStyleId } from "@/lib/ventilation";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function HouseStylePicker({
  value,
  onChange,
}: {
  value: HouseStyleId;
  onChange: (id: HouseStyleId) => void;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl bg-surface p-4 shadow-card-lg sm:p-6">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">House style</p>
        <h2 className="mt-1 font-display text-2xl font-medium tracking-tight">What does the roof look like?</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Pick the style that matches this home. Typical ridge and eave lengths are shown below. You can still type exact runs.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {HOUSE_STYLES.map((style) => {
          const selected = style.id === value;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange(style.id)}
              aria-pressed={selected}
              className={cn(
                "relative flex min-h-11 min-w-0 flex-col overflow-hidden rounded-xl bg-bg text-left transition-[box-shadow,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5",
                selected
                  ? "shadow-[0_0_0_2px_var(--color-primary),0_10px_24px_-10px_rgb(47_93_86_/_0.5)]"
                  : "shadow-[0_0_0_1px_var(--color-border)] hover:shadow-[0_0_0_1px_var(--color-muted),0_10px_20px_-12px_rgb(28_25_21_/_0.3)]",
              )}
            >
              {selected ? (
                <span className="absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-primary text-primary-fg shadow-[0_2px_6px_rgb(47_93_86_/_0.5)]">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              ) : null}
              <img
                src={style.photo}
                alt=""
                className="aspect-[4/3] w-full object-cover"
                crossOrigin="anonymous"
              />
              <img
                src={style.drawing}
                alt=""
                className="mx-auto h-16 w-auto object-contain px-3 py-1.5 sm:h-[4.5rem]"
                crossOrigin="anonymous"
              />
              <span className="flex flex-1 flex-col px-3 pb-3 pt-0.5">
                <span className="block text-sm font-medium text-fg">{style.name}</span>
                <span className="mt-0.5 line-clamp-3 text-xs leading-snug text-muted">{style.blurb}</span>
                <span className="mt-auto pt-2 text-xs leading-snug text-subtle">
                  Typical runs
                  <br />
                  Ridge: {style.typicalRidge}
                  <br />
                  Eaves: {style.typicalEave}
                </span>
                {style.note ? (
                  <span className="mt-1 text-xs font-medium text-intake">{style.note}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
