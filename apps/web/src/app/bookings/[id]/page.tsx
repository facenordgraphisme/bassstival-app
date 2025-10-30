// src/app/bookings/[id]/page.tsx
import { cookies } from "next/headers";
import BookingDetailsClient from "./booking-details-client";
import type { Booking, BookingCost } from "@/lib/bookings";
import type { ArtistWithContacts } from "@/lib/artists";

type InitialBooking = Booking & { costs: BookingCost[] };
type InitialArtist = ArtistWithContacts | null;

export default async function Page({ params }: { params: { id: string } }) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const ck = cookies().toString();

  // -- Booking
  const br = await fetch(`${base}/api/proxy/artists-api/bookings/${params.id}`, {
    cache: "no-store",
    headers: { cookie: ck },
  });

  if (!br.ok) {
    const body = await br.text().catch(() => "");
    console.error(
      `❌ Booking fetch failed: ${br.status} ${br.statusText}`,
      body.slice(0, 300)
    );
    throw new Error(`Failed to load booking ${params.id}`);
  }

  const initial = (await br.json()) as InitialBooking;

  // -- Artist (lié au booking)
  let initialArtist: InitialArtist = null;

  if (initial.artistId) {
    const ar = await fetch(
      `${base}/api/proxy/artists-api/artists/${initial.artistId}`,
      {
        cache: "no-store",
        headers: { cookie: ck },
      }
    );

    if (ar.ok) {
      initialArtist = (await ar.json()) as ArtistWithContacts;
    } else {
      const body = await ar.text().catch(() => "");
      console.warn(
        `⚠️ Artist fetch failed: ${ar.status} ${ar.statusText}`,
        body.slice(0, 300)
      );
    }
  }

  return <BookingDetailsClient initial={initial} initialArtist={initialArtist} />;
}
