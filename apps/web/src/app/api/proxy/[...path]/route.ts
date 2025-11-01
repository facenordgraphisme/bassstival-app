import { auth } from "@/auth";
import type { Session } from "next-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

function passthroughHeaders(req: Request, token?: string) {
  const out = new Headers();
  out.set("accept", "application/json");
  out.set("accept-encoding", "identity");

  const ct = req.headers.get("content-type");
  if (ct) out.set("content-type", ct);

  const cookie = req.headers.get("cookie");
  if (cookie) out.set("cookie", cookie);

  if (token) out.set("authorization", `Bearer ${token}`);
  return out;
}

type MaybeTokens = {
  apiToken?: string | null;
  user?: { apiToken?: string | null } | null;
  accessToken?: string | null;
} & Partial<Session>;

function extractApiToken(session: Session | null): string | undefined {
  const s = session as MaybeTokens | null;
  return (
    s?.apiToken ||
    s?.user?.apiToken ||
    s?.accessToken ||
    undefined
  ) || undefined;
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
  respHeaders.delete("set-cookie");
  respHeaders.delete("content-encoding");
  respHeaders.delete("transfer-encoding");
  respHeaders.delete("content-length");

  if (!respHeaders.has("content-type")) {
    respHeaders.set("content-type", "application/json; charset=utf-8");
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}

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
