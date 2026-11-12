import { parsePackingSpecs } from "@/lib/packing-specs";

export function PackingSpecBadges({
  packingSpec,
  packSize,
  packUnit,
  unit = "kg",
}: {
  packingSpec?: string | null;
  packSize?: number | null;
  packUnit?: string | null;
  unit?: string;
}) {
  const specs = parsePackingSpecs(packingSpec, packSize, packUnit, unit);

  if (specs.length === 0) {
    return <span className="text-muted-foreground italic">—</span>;
  }

  if (specs.length === 1) {
    return (
      <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs inline-block">
        {specs[0].spec}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {specs.map((s, idx) => (
        <span
          key={idx}
          className="font-medium text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 whitespace-nowrap text-[11px]"
        >
          {s.spec}
        </span>
      ))}
    </div>
  );
}
