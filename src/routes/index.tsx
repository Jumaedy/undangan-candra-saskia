import { createFileRoute } from "@tanstack/react-router";
import { Invitation } from "@/components/invitation";
import { getSettings } from "@/lib/undangan.functions";
import { WEDDING } from "@/lib/wedding";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    to: typeof search.to === "string" && search.to.trim() ? search.to : "Tamu Undangan",
  }),
  loader: () => getSettings().catch(() => WEDDING),
  component: Home,
});

function Home() {
  const { to } = Route.useSearch();
  const settings = Route.useLoaderData();
  return <Invitation guest={to} settings={settings} />;
}