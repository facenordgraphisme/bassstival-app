import { getLoan } from "@/lib/api";
import LoanClient from "./LoanClient";

export default async function LoanPage({ params }: { params: { id: string } }) {
  const { id } = params;                 // OK côté serveur
  const data = await getLoan(id);        // préfetch SSR

  return <LoanClient id={id} initial={data} />;
}