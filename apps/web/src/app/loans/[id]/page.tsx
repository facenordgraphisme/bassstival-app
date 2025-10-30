import LoanClient from "./LoanClient";

export default function LoanPage({ params }: { params: { id: string } }) {
  const { id } = params;
  return <LoanClient id={id} />;
}