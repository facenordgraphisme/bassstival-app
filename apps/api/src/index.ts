// apps/api/src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import loansRouter from "./routes/loans";
import volunteersRouter from "./routes/volunteers";
import artistsRouter from "./routes/artists";
import authRouter, { requireAuth, requireRoles } from "./routes/auth";
import usersRouter from "./routes/users";
import pollsRouter from "./routes/polls";
import warmupRouter from "./routes/warmup";
import communicationRouter from "./routes/communication";

const app = express();

app.set("trust proxy", 1);
app.use(cors({ origin: (o, cb) => cb(null, true), credentials: false }));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/warmup", warmupRouter);

app.use("/loans", requireAuth, requireRoles("admin", "staff", "tools"), loansRouter);
app.use("/volunteers", requireAuth, requireRoles("admin", "staff", "volunteers"), volunteersRouter);
app.use("/artists-api", requireAuth, requireRoles("admin", "staff", "lineup"), artistsRouter);
app.use("/polls", requireAuth, requireRoles("polls", "admin"), pollsRouter);
app.use("/communication", requireAuth, requireRoles("admin", "staff", "communication"), communicationRouter);

// ✅ protéger /users-api (profil)
app.use("/users-api", requireAuth, usersRouter);

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => console.log(`✅ API on :${PORT}`));
