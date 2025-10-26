import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import loansRouter from "./routes/loans";
import volunteersRouter from "./routes/volunteers";
import artistsRouter from "./routes/artists";

const app = express();

/* ----- Trust proxy (Koyeb / reverse proxy) ----- */
app.set("trust proxy", 1);

/* ----- CORS: whitelist + previews Vercel + extras via env ----- */
const baseAllowlist = new Set<string>([
  "http://localhost:3000",
  "https://bassstival-app.vercel.app", // prod
]);

// Origins additionnels via env (séparés par des virgules)
if (process.env.CORS_EXTRA_ORIGINS) {
  for (const o of process.env.CORS_EXTRA_ORIGINS.split(",").map(s => s.trim()).filter(Boolean)) {
    baseAllowlist.add(o);
  }
}

const isAllowedOrigin = (origin?: string | null) => {
  if (!origin) return true; // ex: curl/health checks
  try {
    const u = new URL(origin);
    const host = u.hostname;

    // Whitelist explicite
    if (baseAllowlist.has(origin)) return true;

    // Préviews Vercel du projet "bassstival-app"
    // ex: https://bassstival-app-git-branch-user.vercel.app
    if (host.endsWith(".vercel.app") && host.startsWith("bassstival-app")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, cb) => {
      // Mode CORS libre si explicitement demandé
      if (process.env.CORS_ORIGIN === "*") return cb(null, true);

      const ok = isAllowedOrigin(origin);
      cb(null, ok);
    },
    credentials: false, // passe à true si tu utilises des cookies/sessions plus tard
  })
);

/* ----- Sécurité de base ----- */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

/* ----- Body parser avec limite de taille ----- */
app.use(express.json({ limit: "1mb" }));

/* ----- Healthcheck simple ----- */
app.get("/health", (_req, res) => res.json({ ok: true }));

/* ----- Routes ----- */
app.use("/loans", loansRouter);
app.use("/volunteers", volunteersRouter);
app.use("/artists-api", artistsRouter);

/* ----- Boot ----- */
const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, () => {
  console.log(`API on :${PORT}`);
});
