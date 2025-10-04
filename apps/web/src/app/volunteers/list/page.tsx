import { FadeUp } from "@/components/FX";
import VolunteersClient from "./volunteers-client";

export default function VolunteersListPage() {
  return (
    <FadeUp className="space-y-6">
      <VolunteersClient />
    </FadeUp>
  );
}
