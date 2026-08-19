import { Dashboard } from "@/components/Dashboard";
import { getKpiSnapshot } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await getKpiSnapshot();
  return <Dashboard snapshot={snapshot} />;
}
