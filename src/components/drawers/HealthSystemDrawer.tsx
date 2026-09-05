"use client";
import { Drawer } from "@/components/ui/Drawer";
import { DetailError, ReadOnlyFields } from "@/components/drawers/ReadOnlyFields";
import { useReadDetail } from "@/hooks/useReadDetail";
import type { HealthSystemDetail } from "@/lib/types";

interface HealthSystemDrawerProps {
  healthSystemId: string | null;
  onClose: () => void;
  onHospitalClick: (id: string) => void;
}

export function HealthSystemDrawer({ healthSystemId, onClose, onHospitalClick }: HealthSystemDrawerProps) {
  const { data, error, retry } = useReadDetail<{ healthSystem: HealthSystemDetail }>(
    healthSystemId === null ? null : `/api/health-systems/${encodeURIComponent(healthSystemId)}`,
  );
  const system = data?.healthSystem;
  return (
    <Drawer open={healthSystemId !== null} onClose={onClose} title={system?.name ?? "Health system details"}>
      <div className="space-y-6 p-5">
        {error ? <DetailError retry={retry} /> : !system ? <p role="status">Loading health system…</p> : <>
          <ReadOnlyFields fields={[
            ["Domain", system.primaryDomain], ["Size tier", system.sizeTier],
            ["Hospitals", system.metrics.hospitalCount.toLocaleString("en-US")],
            ["Total beds", system.metrics.totalBeds.toLocaleString("en-US")],
            ["Average beds", system.metrics.averageBeds?.toLocaleString("en-US")],
            ["Median beds", system.metrics.medianBeds?.toLocaleString("en-US")],
            ["Largest hospital", system.metrics.largestHospitalName],
            ["Largest hospital beds", system.metrics.largestHospitalBeds?.toLocaleString("en-US")],
            ["States", system.metrics.states.join(", ")],
          ]} />
          <section aria-label="Hospitals in this system">
            <h3 className="mb-2 text-sm font-semibold text-ink">Hospitals</h3>
            <ul className="divide-y divide-line">{system.hospitals.map((hospital) => (
              <li key={hospital.id}><button type="button" onClick={() => onHospitalClick(hospital.id)} className="w-full rounded px-2 py-3 text-left hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent">
                <span className="block text-sm font-medium text-ink">{hospital.name}</span>
                <span className="text-xs text-ink-muted">{[hospital.city, hospital.state].filter(Boolean).join(", ")} · {hospital.bedCount === null ? "Beds not reported" : `${hospital.bedCount.toLocaleString("en-US")} beds`}</span>
              </button></li>
            ))}</ul>
          </section>
        </>}
      </div>
    </Drawer>
  );
}
