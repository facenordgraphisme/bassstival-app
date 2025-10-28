// apps/web/src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/../auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,                  // contient callbacks.authorized & pages.signIn
  session: { strategy: "jwt" },

  // ✅ Providers déclarés ici
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email || "");
        const password = String(creds?.password || "");
        if (!email || !password) return null;

        const base = process.env.NEXT_PUBLIC_API_URL!;
        const r = await fetch(`${base}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!r.ok) return null;
        const user = await r.json(); // { id, name, email, roles: string[], token?: string }
        if (!user?.id) return null;
        return user;
      },
    }),
  ],

  // ⚠️ On MERGE les callbacks pour ne pas écraser `authorized`
  callbacks: {
    ...authConfig.callbacks, // ← garde authorized()

    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.userId = u.id;
        token.name = u.name;
        token.email = u.email;
        token.roles = u.roles || [];
        token.apiToken = u.token || null;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = {
        id: String((token as any).userId || ""),
        name: String(token.name || ""),
        email: String(token.email || ""),
        roles: (token as any).roles || [],
      } as any;
      (session as any).apiToken = (token as any).apiToken || null;
      return session;
    },
  },

  pages: { signIn: "/login" },
});
