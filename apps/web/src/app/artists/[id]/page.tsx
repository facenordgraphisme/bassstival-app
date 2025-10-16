import { FadeUp } from "@/components/FX";
import { getArtist } from "@/lib/artists";
import { listBookings } from "@/lib/bookings";
import ArtistDetailsClient from "./artist-details-client";
import BackButton from "@/components/BackButton";

type Params = { id: string };

export default async function ArtistPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;

  const [artist, bookings] = await Promise.all([
    getArtist(id),
    listBookings({ artistId: id }),
  ]);

  return (
    <FadeUp className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
        <h1
          className="text-3xl font-extrabold title-underline"
          style={{ fontFamily: "var(--font-title)" }}
        >
          {artist.name}
        </h1>
      </div>

      <ArtistDetailsClient initialArtist={artist} initialBookings={bookings} />
    </FadeUp>
  );
}
