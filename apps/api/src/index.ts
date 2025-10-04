import "dotenv/config";
import express from "express";
import cors from "cors";
import loansRouter from "./routes/loans";
import volunteersRouter from "./routes/volunteers";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://bassstival-app.vercel.app", // remplace si custom domain
];
const origin =
  process.env.CORS_ORIGIN === "*"
    ? undefined // CORS libre
    : allowedOrigins;

app.use(
  cors(
    origin
      ? { origin, credentials: false }
      : undefined
  )
);
app.use(express.json());
app.get("/health", (_, res) => res.json({ ok: true }));
app.use("/loans", loansRouter);
app.use("/volunteers", volunteersRouter);

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, () => {
  console.log(`API on :${PORT}`);
});
