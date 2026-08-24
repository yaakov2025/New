import { NumberField, SelectField, ToggleRow } from "@/components/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLIMATE_ZONE_HINTS, getHouseStyle } from "@/lib/ventilation";
import type { ClimateZone, Project, RoofType, TargetMode } from "@/lib/ventilation";
import { atticAreaSqFt } from "@/lib/ventilation";
import { formatNumber } from "@/lib/utils";

export function AtticInputs({
  project,
  onChange,
}: {
  project: Project;
  onChange: (partial: Partial<Project>) => void;
}) {
  const area = atticAreaSqFt(project);
  const style = getHouseStyle(project.houseStyle);
  const eaveHint =
    style.id === "hip"
      ? "All four eaves combined, typical 2 × (length + width)"
      : style.id === "shed"
        ? "Low-side eave only on a mono-slope"
        : "Both eaves combined, typical 2 × length";
  const ridgeHint =
    style.id === "shed"
      ? "Shed roofs have no ridge — use high-side exhaust"
      : style.id === "cape"
        ? "Continuous ridge you can actually slot (dormers subtract)"
        : "Length you can actually cut a ridge slot";

  return (
    <section className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl bg-surface p-5 shadow-card">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          1 · Attic
        </p>
        <h2 className="mt-1 font-display text-xl font-medium">Floor area & roof</h2>
      </header>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="job-name">Job name</Label>
        <Input
          id="job-name"
          value={project.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <ToggleRow
        label="Enter total square footage"
        hint="Off = length × width of the attic floor"
        checked={project.useTotalArea}
        onChange={(v) => onChange({ useTotalArea: v })}
      />

      {project.useTotalArea ? (
        <NumberField
          label="Attic floor area"
          value={project.totalSqFt}
          onChange={(n) => onChange({ totalSqFt: n })}
          suffix="sf"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Length"
            value={project.lengthFt}
            onChange={(n) => onChange({ lengthFt: n })}
            suffix="ft"
          />
          <NumberField
            label="Width"
            value={project.widthFt}
            onChange={(n) => onChange({ widthFt: n })}
            suffix="ft"
          />
        </div>
      )}

      <p className="rounded-lg bg-bg px-3 py-2 font-mono text-sm tabular-nums">
        {formatNumber(area, 0)} sq ft attic floor
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Roof type"
          value={project.roofType}
          onChange={(v) => onChange({ roofType: v as RoofType })}
        >
          <option value="gable">Gable</option>
          <option value="hip">Hip</option>
          <option value="combination">Combination</option>
          <option value="shed">Shed / mono-slope</option>
        </SelectField>
        <SelectField
          label="Climate zone"
          value={String(project.climateZone)}
          onChange={(v) => onChange({ climateZone: Number(v) as ClimateZone })}
        >
          {([1, 2, 3, 4, 5, 6, 7, 8] as const).map((z) => (
            <option key={z} value={z}>
              Zone {z} — {CLIMATE_ZONE_HINTS[z]}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Ridge available"
          value={project.ridgeLengthFt}
          onChange={(n) => onChange({ ridgeLengthFt: n })}
          suffix="lf"
          hint={ridgeHint}
        />
        <NumberField
          label="Eave / soffit run"
          value={project.eaveLengthFt}
          onChange={(n) => onChange({ eaveLengthFt: n })}
          suffix="lf"
          hint={eaveHint}
        />
      </div>

      <ToggleRow
        label="Class I or II vapor retarder at ceiling"
        hint="Kraft-faced batts or poly on the warm-in-winter side. Required for 1/300 in zones 6–8."
        checked={project.hasVaporRetarder}
        onChange={(v) => onChange({ hasVaporRetarder: v })}
      />
      <ToggleRow
        label="Rafter baffles keep soffits open"
        hint="Blocked soffits do not count."
        checked={project.bafflesInstalled}
        onChange={(v) => onChange({ bafflesInstalled: v })}
      />
      <ToggleRow
        label="Dark shingles or steep roof"
        hint="Raises powered-fan CFM target by 15% (HVI)."
        checked={project.darkOrSteepRoof}
        onChange={(v) => onChange({ darkOrSteepRoof: v })}
      />

      <SelectField
        label="Sizing target"
        value={project.targetMode}
        onChange={(v) => onChange({ targetMode: v as TargetMode })}
      >
        <option value="warranty">Warranty 1/150 at 50/50</option>
        <option value="code-150">IRC minimum 1/150</option>
        <option value="code-300">IRC exception 1/300</option>
      </SelectField>
    </section>
  );
}
