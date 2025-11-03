import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      roles: string[];        // <-- non optionnel côté session (notre app suppose toujours présent)
    };
    apiToken?: string | null; // optionnel
  }

  interface User {
    id: string;
    name: string;
    email: string;
    roles?: string[];         // <-- optionnel côté User (vient de l’API login)
    token?: string | null;    // idem
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    roles?: string[];        // optionnel dans le token
    apiToken?: string | null;
  }
}
