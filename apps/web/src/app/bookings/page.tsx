// src/app/bookings/page.tsx
import { FadeUp } from "@/components/FX";
import BookingsClient from "./bookings-client";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

type SearchParams = { artistId?: string };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>; // 👈 async
}) {
  const sp = await searchParams;       // 👈 on attend
  const initialArtistId = sp?.artistId ?? "";

  return (
    <FadeUp className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
        <h1
          className="text-3xl font-extrabold title-underline"
          style={{ fontFamily: "var(--font-title)" }}
        >
          Créneaux
        </h1>
      </div>
      <BookingsClient initialArtistId={initialArtistId} />
    </FadeUp>
  );
}
