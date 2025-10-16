"use client";

export default function PrintButton({ className }: { className?: string }) {
  return (
    <button className={className ?? "btn"} onClick={() => window.print()}>
      Imprimer
    </button>
  );
}
