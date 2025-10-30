import { auth } from "@/auth";
import type { Session } from "next-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!; // e.g. https://your-koyeb-api

function passthroughHeaders(req: Request, token?: string) {
  const out = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) out.set("content-type", ct);
  out.set("accept", "application/json");

  // forward browser cookies (helps auth libs that read cookies)
  const cookie = req.headers.get("cookie");
  if (cookie) out.set("cookie", cookie);

  if (token) out.set("authorization", `Bearer ${token}`);
  return out;
}

// Type utilitaire pour lire proprement des champs non-standards ajoutés à la session
type MaybeTokens = {
  apiToken?: string | null;
  user?: { apiToken?: string | null } | null;
  accessToken?: string | null; // au cas où tu l’ajoutes dans tes callbacks
} & Partial<Session>;

function extractApiToken(session: Session | null): string | undefined {
  const s = (session as unknown) as MaybeTokens | null;
  return (s?.apiToken ?? s?.user?.apiToken ?? s?.accessToken ?? undefined) || undefined;
}

async function forward(method: string, req: Request, path: string[]) {
  const session = await auth();
  const token = extractApiToken(session);

  if (!token) {
    console.warn("[proxy] Missing bearer token for", path.join("/"));
    return new Response(JSON.stringify({ error: "Missing bearer token" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const url = `${API_BASE}/${path.join("/")}`;
  const headers = passthroughHeaders(req, token);

  const hasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(url, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  const respHeaders = new Headers(upstream.headers);
  // ne propage pas d'éventuels cookies de l'upstream
  respHeaders.delete("set-cookie");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}

// Next 15: params est un Promise
export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward("GET", req, path);
}
export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward("POST", req, path);
}
export async function PATCH(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward("PATCH", req, path);
}
export async function DELETE(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward("DELETE", req, path);
}
