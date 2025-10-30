import { auth } from "@/auth";
import type { Session } from "next-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!; // ex: http://localhost:8080

// --- Types propres (pas de any)
type SessionWithTokens = Session & {
  apiToken?: string | null;
  accessToken?: string | null;
  user?: Session["user"] & {
    apiToken?: string | null;
    accessToken?: string | null;
  };
};

function getApiToken(session: Session | null): string | undefined {
  const s = session as SessionWithTokens | null;
  return (
    s?.apiToken ??
    s?.user?.apiToken ??
    s?.accessToken ??
    s?.user?.accessToken ??
    undefined
  );
}

function passthroughHeaders(req: Request, token?: string) {
  const out = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) out.set("content-type", ct);
  out.set("accept", "application/json");
  if (token) out.set("authorization", `Bearer ${token}`);
  return out;
}

async function forward(method: string, req: Request, path: string[]) {
  const session = await auth();
  const token = getApiToken(session);

  if (!token) {
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
respHeaders.delete("set-cookie");
respHeaders.delete("content-encoding"); // 👈 empêche double décompression
respHeaders.delete("transfer-encoding");

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
