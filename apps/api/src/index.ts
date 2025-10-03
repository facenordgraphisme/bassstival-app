import "dotenv/config";
import express from "express";
import cors from "cors";
import loansRouter from "./routes/loans";

const app = express();

const allowed = [
  "http://localhost:3000",
  "https://*.vercel.app",
  "https://ton-domaine.fr" // (optionnel, quand tu l’auras)
];

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow curl/postman
    if (origin === "http://localhost:3000") return cb(null, true);
    if (/\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true);
    if (origin === "https://ton-domaine.fr") return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(express.json());
app.get("/health", (_, res) => res.json({ ok: true }));
app.use("/loans", loansRouter);

const port = Number(process.env.PORT) || 8000;
app.listen(port, "0.0.0.0", () => {
  console.log(`API on :${port}`);
});
