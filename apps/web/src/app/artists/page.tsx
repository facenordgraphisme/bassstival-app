import { FadeUp } from "@/components/FX";
import ArtistsClient from "./artists-client";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function ArtistsPage() {
  return (
    <FadeUp className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
        <h1 className="text-3xl font-extrabold title-underline" style={{ fontFamily: "var(--font-title)" }}>
          Artistes
        </h1>
      </div>
      <ArtistsClient />
    </FadeUp>
  );
}
