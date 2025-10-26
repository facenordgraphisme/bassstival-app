import { getLoan } from "@/lib/api";
import LoanClient from "./LoanClient";

export default async function LoanPage({
   params,
 }: {
   params: { id: string };
 }) {
   const { id } = params;

  // Prefetch server-side
  const data = await getLoan(id);

  return <LoanClient id={id} initial={data} />;
}
