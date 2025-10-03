import { getLoan } from "@/lib/api";
import LoanClient from "./LoanClient";

export default async function LoanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ⬇️ params is a Promise now
  const { id } = await params;

  // Prefetch server-side
  const data = await getLoan(id);

  return <LoanClient id={id} initial={data} />;
}
