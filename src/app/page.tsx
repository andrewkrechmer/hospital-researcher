import { PageHeader } from "@/components/layout/PageHeader";
import { HealthSystemView } from "@/components/table/HealthSystemView";

export default function HospitalsPage() {
  return (
    <>
      <PageHeader
        title="Hospitals"
        description="Browse every hospital and its health-system relationships. Toggle between a hierarchical Health System View and a flat Hospital View."
      />
      <HealthSystemView />
    </>
  );
}
