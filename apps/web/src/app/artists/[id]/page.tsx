// app/artists/[id]/page.tsx
import { FadeUp } from "@/components/FX";
import BackButton from "@/components/BackButton";
import ArtistDetailsClient from "./artist-details-client";

type Params = { id: string };

export default async function ArtistPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  // ✅ Do NOT SSR-fetch protected API here.

  return (
    <FadeUp className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
        <h1 className="text-3xl font-extrabold title-underline" style={{ fontFamily: "var(--font-title)" }}>
          Fiche artiste
        </h1>
      </div>

      <ArtistDetailsClient
        initialArtist={{
          id,
          name: "Chargement…",
          genre: "",
          agency: "",
          status: "prospect",
          contacts: [],
        }}
        initialBookings={[]}
      />
    </FadeUp>
  );
}
