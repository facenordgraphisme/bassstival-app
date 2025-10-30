// apps/web/src/auth.ts
import NextAuth, { type Session, type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import authConfig from "@/../auth.config";

// --- Types locaux (alignés sur ta payload API / usages)
type APIUser = {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  token?: string | null; // bearer token backend
};

// JWT enrichi (on stocke userId, roles, apiToken)
type ExtendedJWT = JWT & {
  userId?: string;
  roles?: string[];
  apiToken?: string | null;
};

// Session enrichie au runtime (on garde la signature Session
// et on ajoute des champs via intersections pour ne PAS utiliser `any`)
type SessionUser = NonNullable<Session["user"]> & {
  id: string;
  roles: string[];
};
type ExtendedSession = Session & {
  user: SessionUser;
  apiToken: string | null;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig, // garde authorized()
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "");
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const base = process.env.NEXT_PUBLIC_API_URL!;
        const r = await fetch(`${base}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!r.ok) return null;

        // → payload attendu : { id, name, email, roles?: string[], token?: string }
        const user = (await r.json()) as APIUser | null;
        if (!user?.id) return null;
        return user as unknown as User; // compat NextAuth; pas de `any`
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user }) {
      // On cast localement le token vers notre type enrichi (pas de `any`)
      const t = token as ExtendedJWT;

      // Si un user vient d'être authentifié, on hydrate le JWT
      if (user) {
        const u = user as unknown as APIUser; // type précis de ta payload login
        t.userId = u.id;
        t.name = u.name;
        t.email = u.email;
        t.roles = u.roles ?? [];
        t.apiToken = u.token ?? null;
      }

      return t;
    },

    async session({ session, token }) {
      const t = token as ExtendedJWT;

      // On construit une session enrichie sans `any`
      const s: ExtendedSession = {
        ...session,
        user: {
          // on garde ce que NextAuth a déjà mis
          ...(session.user ?? { name: "", email: "" }),
          id: String(t.userId ?? ""),
          name: String(session.user?.name ?? t.name ?? ""),
          email: String(session.user?.email ?? t.email ?? ""),
          roles: t.roles ?? [],
        } as SessionUser,
        apiToken: t.apiToken ?? null,
      };

      return s;
    },
  },

  pages: { signIn: "/login" },
});
