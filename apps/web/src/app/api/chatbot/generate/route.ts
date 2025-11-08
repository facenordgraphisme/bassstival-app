import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";

/** Rate-limit ultra simple (mémoire volatile par user) */
const RL = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(userId: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const cur = RL.get(userId);
  if (!cur || now > cur.resetAt) {
    RL.set(userId, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (cur.count >= limit) return { ok: false, retryAfter: Math.ceil((cur.resetAt - now) / 1000) };
  cur.count++;
  return { ok: true };
}

const Body = z.object({
  brief: z.string().min(1),
  channel: z.enum([
    "instagram_post",
    "instagram_story",
    "facebook_post",
    "tiktok",
    "linkedin",
    "email",
  ]),
  ton: z.enum(["enjoué", "informatif", "urgent", "convivial", "professionnel"]).default("enjoué"),
  longueur: z.enum(["court", "moyen", "long"]).default("court"),
  temperature: z.number().min(0).max(1).default(0.5),
  n: z.number().int().min(1).max(5).default(1), // 🔥 variantes
});

const CONTEXTE_BASSSTIVAL = `
Le BASSS’tival est un festival artistique et musical porté par les associations Décibels05 et Le Labo Luisant.
Objectif : mettre en lumière l’art local des montagnes (musique, arts de la scène, art numérique, artisanat,
arts décoratifs et visuels) dans une ambiance festive, guinguette, underground et psychédélique.

• 1ère édition : 2019 – au bord du lac de Serre-Ponçon. Scène acoustique, scène numérique, chapiteau, stands,
  bière et produits locaux, soutenu par des partenaires de la vallée.
• Après pause sanitaire : retour avec édition plus immersive.
• Journée : concerts (progressive & jazz rock, hardcore & métal, hip-hop/rap, saxo techno, cumbia, etc.).
• Soir : DJ sets + shows lumineux + mapping vidéo → ambiance underground & psychédélique.
• Esprit : célébration de la culture locale et de la diversité artistique ; expérience unique et conviviale.
`.trim();

/** Contraintes canal (longueurs approx + style) */
const CANAL_RULES: Record<string, string> = {
  instagram_post:
    "- 120–220 mots max. Lignes brisées agréables à lire.\n- Emojis ok mais sans surcharger.\n- Hashtags 3–6 pertinents en fin.\n",
  instagram_story:
    "- 1–3 slides textuels courts (~10–30 mots/slide).\n- Style punchy, impératif, 1–2 emojis.\n- CTA clair (swipe/link).\n",
  facebook_post:
    "- 80–150 mots, 1–2 paragraphes.\n- Ton accessible, convivial.\n- Lien cliquable dans le texte.\n",
  tiktok:
    "- 1–2 phrases punchlines + hashtags.\n- Orienté vidéo, incite à regarder/liker/suivre.\n",
  linkedin:
    "- 60–120 mots pro. Accroche + valeur (contexte culturel/territorial).\n- Peu d’emojis. Hashtags 2–4 ciblés.\n",
  email:
    "- Objet concis (60 caractères max) + corps 80–150 mots.\n- Paragraphes courts, CTA explicite.\n",
};

const SYSTEM_PROMPT = `
Tu es « Bassstival Communication Assistant », expert en communication digitale pour festivals.
Utilise le CONTEXTE suivant comme vérité terrain :
${CONTEXTE_BASSSTIVAL}

Tu réponds TOUJOURS par un tableau JSON d'objets (même avec une seule variante), où chaque objet respecte ce schéma :
{
  "post": "string",
  "hashtags": ["#..."],   // 2–6
  "ctas": ["..."],        // 1–2 courts
  "emoji": "string",      // optionnel
  "notes": "string"       // ≤ 150 caractères (clarification si besoin)
}

Règles générales :
- Adapte le ton (FR) et la longueur demandés.
- Adapte au canal : formatage/longueur/émoticônes/hashtags (vois les règles par canal).
- Si le brief mentionne date/heure/lieu/tarif, réutilise tel quel (sans invention).
- En cas d’incertitude : N’INVENTE PAS, place une courte question dans "notes".
- Réponds STRICTEMENT en JSON (tableau), sans backticks ni texte autour.
`.trim();

function extractJsonArray(text: string) {
  try { const j = JSON.parse(text); return Array.isArray(j) ? j : null; } catch {}
  const match = text.match(/\[[\s\S]*\]/);
  if (match) { try { const j = JSON.parse(match[0]); return Array.isArray(j) ? j : null; } catch {} }
  return null;
}

function mapTon(ton: string) {
  const m: Record<string, string> = {
    enjoué: "enjoué (playful)",
    informatif: "informatif (informative)",
    urgent: "urgent",
    convivial: "convivial (friendly)",
    professionnel: "professionnel (professional)",
  };
  return m[ton] ?? ton;
}
function mapLongueur(len: string) {
  const m: Record<string, string> = { court: "court", moyen: "moyen", long: "long" };
  return m[len] ?? len;
}
function mapChannelForLLM(c: string) {
  if (c === "instagram_post") return "instagram";
  if (c === "instagram_story") return "instagram story";
  if (c === "facebook_post") return "facebook";
  return c.replace("_", " ");
}

/** Modération simple via OpenAI (empêche un brief clairement HS/toxique) */
async function moderate(input: string) {
  try {
    const r = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "omni-moderation-latest", input }),
    });
    if (!r.ok) return { allowed: true };
    const data = await r.json();
    const flagged = !!data?.results?.[0]?.flagged;
    return { allowed: !flagged };
  } catch {
    return { allowed: true }; // en cas d’erreur réseau, on laisse passer
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = String(session?.user?.id ?? "");
  const roles = (session?.user?.roles ?? []) as string[];
  const can = roles.includes("communication") || roles.includes("admin") || roles.includes("staff");
  if (!can) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { brief, channel, ton, longueur, temperature, n } = parsed.data;

  // rate-limit
  const rl = checkRateLimit(userId || "anon");
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Trop de requêtes, réessaie dans ${rl.retryAfter}s` },
      { status: 429 }
    );
    }

  // modération
  const mod = await moderate(brief);
  if (!mod.allowed) {
    return NextResponse.json({ error: "Brief refusé par la modération." }, { status: 400 });
  }

  const rules = CANAL_RULES[channel] ?? "";
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `Brief: ${brief}\n` +
        `Canal: ${mapChannelForLLM(channel)}\n` +
        `Ton: ${mapTon(ton)}\n` +
        `Longueur: ${mapLongueur(longueur)}\n` +
        `Règles canal:\n${rules}\n` +
        `Retourne STRICTEMENT un TABLEAU JSON d'objets au schéma indiqué.\n`,
    },
    // few-shots FR (stables, courts)
    {
      role: "system",
      content:
        "Exemple — Brief: « Aftermovie en ligne demain 18h, lien bio », Canal: instagram, Ton: enjoué, Longueur: court -> " +
        `[
          {"post":"🎬 L’aftermovie sort demain à 18h ! Revivez l’énergie du BASSS’tival… Lien en bio 😉",
           "hashtags":["#bassstival","#aftermovie","#festival"],"ctas":["Voir demain 18h"],"emoji":"🎬✨","notes":""}
        ]`,
    },
    {
      role: "system",
      content:
        "Exemple — Brief: « Annonce bénévole, besoin bar & billetterie, lien formulaire », Canal: facebook, Ton: convivial, Longueur: moyen -> " +
        `[
          {"post":"On recrute des bénévoles bar & billetterie pour la prochaine édition 🙌 Ambiance conviviale, équipe aux petits oignons. Le lien du formulaire est ci-dessous !",
           "hashtags":["#benevolat","#festival","#hautesalpes"],"ctas":["S’inscrire"],"emoji":"🙌","notes":""}
        ]`,
    },
  ];

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature,
        n: 1,               // on garde n=1 côté API chat, on demande un tableau de n variantes dans l'instruction
        messages: [
          ...messages,
          {
            role: "system",
            content: `IMPORTANT: génère exactement ${n} variantes distinctes dans le tableau JSON.`,
          },
        ],
      }),
    });

    if (!r.ok) {
      const err = await r.text().catch(() => "");
      return NextResponse.json({ error: err || `OpenAI ${r.status}` }, { status: 500 });
    }

    const data = await r.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const arr = extractJsonArray(text);
    if (!arr) return NextResponse.json({ error: "Réponse non-JSON du modèle" }, { status: 500 });

    return NextResponse.json(arr);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "LLM error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
