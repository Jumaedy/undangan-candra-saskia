import { createFileRoute } from "@tanstack/react-router";
import { Invitation } from "@/components/invitation";
import { getSettings } from "@/lib/undangan.functions";
import { WEDDING } from "@/lib/wedding";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = typeof search.to === "string" ? search.to.trim() : "";
    const name = raw.replace(/~k$/, "").trim();
    return { to: name || "Tamu Undangan" };
  },
  loader: () => getSettings().catch(() => WEDDING),
  component: Home,
});

function Home() {
  const { to } = Route.useSearch();
  const settings = Route.useLoaderData();
  return <Invitation guest={to} settings={settings} />;
}
