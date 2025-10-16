// src/app/bookings/[id]/page.tsx
import { FadeUp } from "@/components/FX";
import BackButton from "@/components/BackButton";
import { getBooking } from "@/lib/bookings";
import { getArtist } from "@/lib/artists";
import BookingDetailsClient from "./booking-details-client";

type Params = { id: string };

export default async function BookingDetailsPage({
  params,
}: {
  params: Promise<Params>; // 👈 async
}) {
  const { id } = await params; // 👈 on attend params

  let initial: any = null;
  let artistName: string | null = null;

  try {
    initial = await getBooking(id);

    // Si le booking existe, on récupère le nom de l'artiste lié
    if (initial?.artistId) {
      try {
        const artist = await getArtist(initial.artistId);
        artistName = artist?.name ?? null;
      } catch {
        artistName = null;
      }
    }
  } catch {
    initial = null;
  }

  return (
    <FadeUp className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
        <h1
          className="text-3xl font-extrabold title-underline flex flex-wrap items-center gap-2"
          style={{ fontFamily: "var(--font-title)" }}
        >
          Détail booking
          {artistName && (
            <span className="text-xl font-normal opacity-80">
              – {artistName}
            </span>
          )}
        </h1>
      </div>

      {!initial ? (
        <div className="text-sm opacity-70">Booking introuvable.</div>
      ) : (
        <BookingDetailsClient initial={initial} />
      )}
    </FadeUp>
  );
}
