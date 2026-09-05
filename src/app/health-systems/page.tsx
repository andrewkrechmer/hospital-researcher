import { PageHeader } from "@/components/layout/PageHeader";
import { SizeTierBadge } from "@/components/ui/Badge";
import { getAllHealthSystems } from "@/lib/db/health-systems";


export const dynamic = "force-dynamic";

export default async function HealthSystemsPage() {
  let healthSystems: Awaited<ReturnType<typeof getAllHealthSystems>>;
  let loadError: string | null = null;

  try {
    healthSystems = await getAllHealthSystems();
  } catch {
    healthSystems = [];
    loadError = "Failed to load health systems. Please try again.";
  }

  return (
    <>
      <PageHeader
        title="Health Systems"
        description="Every health system with its derived hospital count, beds, and size tier."
      />

      {loadError ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md text-center">
            <p className="text-sm font-semibold text-red-700">
              Failed to load data
            </p>
            <p className="mt-2 text-sm text-ink-muted">{loadError}</p>
          </div>
        </div>
      ) : healthSystems.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md text-center">
            <p className="text-sm font-semibold text-ink">No health systems yet</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              No health systems are available in the connected database.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 border-b border-line bg-canvas/95 backdrop-blur">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Health System
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Domain
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Hospitals
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Total Beds
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Size Tier
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  States
                </th>

              </tr>
            </thead>
            <tbody>
              {healthSystems.map((system) => (
                <tr
                  key={system.id}
                  className="border-b border-line/60 transition-colors hover:bg-surface"
                >
                  <td className="px-4 py-2.5 font-medium text-ink">
                    {system.name}
                  </td>
                  <td className="px-4 py-2.5 text-ink-muted tabular">
                    {system.primaryDomain ?? (
                      <span className="text-ink-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular text-ink">
                    {system.metrics.hospitalCount}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular text-ink-muted">
                    {system.metrics.totalBeds.toLocaleString("en-US")}
                  </td>
                  <td className="px-4 py-2.5">
                    <SizeTierBadge tier={system.sizeTier} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-muted">
                    {system.metrics.states.length > 0
                      ? system.metrics.states.join(", ")
                      : "—"}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
