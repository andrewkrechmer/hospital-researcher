"use client";
import { Drawer } from "@/components/ui/Drawer";
import { DetailError, ReadOnlyFields } from "@/components/drawers/ReadOnlyFields";
import { useReadDetail } from "@/hooks/useReadDetail";
import type { HospitalDetailResponse } from "@/lib/types";

interface HospitalDrawerProps {
  hospitalId: string | null;
  onClose: () => void;
}

export function HospitalDrawer({ hospitalId, onClose }: HospitalDrawerProps) {
  const { data, error, retry } = useReadDetail<HospitalDetailResponse>(
    hospitalId === null ? null : `/api/hospitals/${encodeURIComponent(hospitalId)}`,
  );
  const hospital = data?.hospital;
  return (
    <Drawer open={hospitalId !== null} onClose={onClose} title={hospital?.name ?? "Hospital details"}>
      <div className="space-y-6 p-5">
        {error ? <DetailError retry={retry} /> : !hospital ? <p role="status">Loading hospital…</p> : <>
          <ReadOnlyFields fields={[
            ["Health system", hospital.canonicalHealthSystemName ?? hospital.canonicalHealthSystemDomain ?? (hospital.isSingleSite ? "Single-site facility" : "Unassigned")],
            ["System domain", hospital.canonicalHealthSystemDomain],
            ["Single-site facility", hospital.isSingleSite == null ? null : hospital.isSingleSite ? "Yes" : "No"],
            ["CMS/CCN", hospital.cmsCcn],
            ["Beds", hospital.bedCount?.toLocaleString("en-US")],
            ["City", hospital.city], ["State", hospital.state], ["ZIP", hospital.zip],
            ["Telephone", hospital.telephone], ["Gross revenue", hospital.grossRevenueRaw],
            ["Discharges", hospital.discharges], ["Patient days", hospital.patientDays],
          ]} />
          {hospital.notes && <div><h3 className="text-xs font-medium text-ink-muted">Notes</h3><p className="mt-1 whitespace-pre-wrap text-sm text-ink">{hospital.notes}</p></div>}
        </>}
      </div>
    </Drawer>
  );
}
