import { Home, type HomeView } from "@/components/mm/screens/Home";
import { listPlayers, perfRatedCount } from "@/lib/players";

export const dynamic = "force-dynamic";

export default async function Page() {
  const agg = await listPlayers({ limit: 1 });
  const rated = await perfRatedCount();
  const top = await listPlayers({ sort: "perf", limit: 1 });
  const t = top.rows[0];
  const view: HomeView = {
    total: agg.total,
    rated,
    dist: agg.bandCounts,
    top: t ? { id: t.id, name: t.name, perf: t.perf, band: t.latestNtrp } : null,
  };
  return <Home view={view} />;
}
