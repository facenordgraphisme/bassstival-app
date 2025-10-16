import { FadeUp } from "@/components/FX";
import { listBookings, BOOKING_STATUS_LABEL, type Booking } from "@/lib/bookings";
import { listArtists, type Artist, type Stage } from "@/lib/artists";
import { STAGE_LABEL } from "@/lib/utils-booking";
import Link from "next/link";
import PrintButton from "@/components/PrintButton";

function startOfDayISO(d: Date) { const x=new Date(d); x.setHours(0,0,0,0); return x.toISOString(); }
function endOfDayISO(d: Date)   { const x=new Date(d); x.setHours(23,59,59,999); return x.toISOString(); }
function fmtTime(iso?: string | null) { return iso ? new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "—"; }
function euros(cents?: number|null) { return typeof cents==="number" ? (cents/100).toLocaleString("fr-FR", { style:"currency", currency:"EUR"}) : "—"; }

export default async function PrintPage({
  searchParams,
}: { searchParams?: { date?: string; stage?: Stage } }) {
  const day = searchParams?.date ? new Date(searchParams.date) : new Date();
  const from = startOfDayISO(day);
  const to   = endOfDayISO(day);
  const stage = searchParams?.stage;

  const [bookings, artists] = await Promise.all([
    listBookings({ from, to, stage }),
    listArtists(),
  ]);

  const artistById = new Map<string, Artist>();
  for (const a of artists) artistById.set(a.id, a);

  const byStage = new Map<string, Booking[]>();
  for (const b of bookings) {
    const s = b.stage ?? "main";
    if (!byStage.has(s)) byStage.set(s, []);
    byStage.get(s)!.push(b);
  }
  for (const arr of byStage.values()) arr.sort((a,b)=>+new Date(a.startAt)-+new Date(b.startAt));
  const groups = Array.from(byStage.entries()).sort((a,b)=>a[0].localeCompare(b[0]));

  const ymd = day.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });

  return (
    <FadeUp className="print-page space-y-6">
      {/* Barre d’actions (masquée à l’impression) */}
      <div className="no-print flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold title-underline" style={{ fontFamily: "var(--font-title)" }}>
            Planning des bookings — {ymd}
          </h1>
          <div className="opacity-70 text-sm mt-8">
            {stage ? `Scène : ${STAGE_LABEL[stage] ?? stage}` : "Toutes scènes"}
          </div>
        </div>
        <div className="flex gap-2">
          <Link className="btn-ghost" href="/bookings">Retour</Link>
          <PrintButton className="btn" />
        </div>
      </div>

      {/* Feuille imprimable */}
      <div className="space-y-10 print-sheet">
        {groups.length === 0 && <div className="text-sm opacity-70">Aucun booking pour cette journée.</div>}

        {groups.map(([stg, rows]) => (
          <section key={stg} className="space-y-3">
            <h2 className="text-xl font-bold">{STAGE_LABEL[stg] ?? stg}</h2>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{width:"100px"}}>Horaire</th>
                  <th style={{width:"220px"}}>Artiste</th>
                  <th style={{width:"110px"}}>Statut</th>
                  <th style={{width:"120px"}}>Pickup</th>
                  <th>Hospitality</th>
                  <th>Tech</th>
                  <th>Voyage</th>
                  <th style={{width:"100px"}}>Cachet</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const art = artistById.get(b.artistId);
                  const pickup = b.pickupAt || b.pickupLocation
                    ? `${fmtTime(b.pickupAt)} ${b.pickupLocation ? `• ${b.pickupLocation}` : ""}`.trim()
                    : "—";
                  return (
                    <tr key={b.id}>
                      <td>{fmtTime(b.startAt)} → {fmtTime(b.endAt)}</td>
                      <td>
                        <div className="font-semibold">{art?.name ?? "—"}</div>
                        {(art?.agency || art?.genre) && (
                          <div className="print-note">
                            {[art?.agency, art?.genre].filter(Boolean).join(" • ")}
                          </div>
                        )}
                      </td>
                      <td>{BOOKING_STATUS_LABEL[b.status]}</td>
                      <td>{pickup}</td>
                      <td><div className="print-note">{b.hospitalityNotes || "—"}</div></td>
                      <td><div className="print-note">{b.techRider || "—"}</div></td>
                      <td><div className="print-note">{b.travelNotes || "—"}</div></td>
                      <td>{euros(b.feeAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </FadeUp>
  );
}
