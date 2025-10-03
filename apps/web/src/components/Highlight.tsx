"use client";
import React from "react";

/** Surligne `query` dans `text` (insensible aux accents/majuscules) */
export default function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  const raw = text;
  const nText = norm(text);
  const nQuery = norm(query);

  const parts: Array<{ str: string; match: boolean }> = [];
  let i = 0;
  while (true) {
    const idx = nText.indexOf(nQuery, i);
    if (idx === -1) {
      parts.push({ str: raw.slice(i), match: false });
      break;
    }
    if (idx > i) parts.push({ str: raw.slice(i, idx), match: false });
    parts.push({ str: raw.slice(idx, idx + nQuery.length), match: true });
    i = idx + nQuery.length;
  }

  return (
    <>
      {parts.map((p, k) =>
        p.match ? (
          <mark key={k} className="mark-neon">{p.str}</mark>
        ) : (
          <React.Fragment key={k}>{p.str}</React.Fragment>
        )
      )}
    </>
  );
}
