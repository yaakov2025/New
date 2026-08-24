import { useState } from "react";

const SECTIONS = [
  {
    title: "IRC R806.2 — how much NFA",
    body: "The 2021 International Residential Code requires net free ventilating area equal to 1/150 of the attic floor. A 1/300 exception is allowed only when both: (1) in Climate Zones 6–8 a Class I or II vapor retarder is on the warm-in-winter side of the ceiling, and (2) 40–50% of the required NFA is in the upper attic, not more than 3 ft below the ridge, with the balance in the bottom third. Too much ridge vent can disqualify the exception.",
  },
  {
    title: "Manufacturer / ARMA 50/50",
    body: "Asphalt Roofing Manufacturers Association sizing: attic sq ft ÷ 2 = square inches of intake NFA and the same of exhaust NFA (the 1/150 path, split evenly). Shingle warranties often require this even when the building official accepts 1/300. If the two cannot match, install extra intake — never extra exhaust.",
  },
  {
    title: "Net free area, not hole size",
    body: "A 16×8 soffit is 128 sq in gross; screening and weather baffles typically leave about 56 sq in NFA. Ridge vents are rated per linear foot (commonly 12, 18, or 20). Always use the NFA printed on the carton. This calculator ships typical catalog values you can override.",
  },
  {
    title: "Do not mix exhaust types",
    body: "Ridge + gable, ridge + turbines, or a powered fan with any other exhaust lets air short-circuit and can pull rain or snow in through the unused openings. One exhaust strategy per attic volume. Soffit or drip-edge intake belongs with all of them. Powered fans are CFM devices — they are not IRC net free area unless the AHJ says so — and need 1 sq ft of intake NFA per 300 CFM.",
  },
  {
    title: "Intake that actually works",
    body: "Continuous soffit, individual 16×8 under-eave vents, round soffit inserts, and drip-edge / starter eave vents all count as low intake. Insulation must not bury the opening — use rafter baffles. Hip roofs with a short ridge usually need off-ridge or dome vents within 3 ft of the peak.",
  },
];

export function CodeNotes() {
  const [open, setOpen] = useState<string | null>(SECTIONS[0].title);
  return (
    <section className="print-break rounded-2xl bg-surface p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
        Reference
      </p>
      <h2 className="mt-1 font-display text-xl font-medium">Code & manufacturer rules</h2>
      <div className="mt-4 divide-y divide-border">
        {SECTIONS.map((s) => {
          const isOpen = open === s.title;
          return (
            <div key={s.title}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between py-3 text-left text-sm font-medium"
                onClick={() => setOpen(isOpen ? null : s.title)}
                aria-expanded={isOpen}
              >
                {s.title}
                <span className="text-muted">{isOpen ? "–" : "+"}</span>
              </button>
              {isOpen ? <p className="pb-3 text-sm text-muted">{s.body}</p> : null}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-subtle">
        Not a substitute for the adopted local code, the product installation instructions, or a licensed
        contractor. Confirm NFA on the actual vents and with the building official (AHJ). Unvented attics
        follow IRC R806.5 (air-impermeable insulation at the roof deck) and are outside this calculator.
      </p>
    </section>
  );
}
