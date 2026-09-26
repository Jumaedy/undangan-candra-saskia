import { createFileRoute } from "@tanstack/react-router";
import { Invitation } from "@/components/invitation";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    to: typeof search.to === "string" && search.to.trim() ? search.to : "Tamu Undangan",
  }),
  component: Home,
});

function Home() {
  const { to } = Route.useSearch();
  return <Invitation guest={to} />;
}
