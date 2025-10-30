export function getApiUrl(path: string) {
  const base =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_API_URL // côté serveur → utilise le vrai backend
      : "/api/proxy"; // côté client → passe par proxy
  return `${base}${path}`;
}
