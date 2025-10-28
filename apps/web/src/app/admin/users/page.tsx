import { FadeUp } from "@/components/FX";
import AdminUsersClient from "./users-client";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  return (
    <FadeUp className="space-y-6">
      <h1 className="text-3xl font-extrabold title-underline" style={{ fontFamily: "var(--font-title)" }}>
        Admin • Utilisateurs
      </h1>
      <AdminUsersClient />
    </FadeUp>
  );
}
