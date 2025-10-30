import { auth } from "@/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!; // e.g. https://your-koyeb-api

function passthroughHeaders(req: Request, token?: string) {
  const out = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) out.set("content-type", ct);
  out.set("accept", "application/json");

  // forward browser cookies (helps auth lib that read cookies)
  const cookie = req.headers.get("cookie");
  if (cookie) out.set("cookie", cookie);

  if (token) out.set("authorization", `Bearer ${token}`);
  return out;
}

async function forward(method: string, req: Request, path: string[]) {
  const session = await auth();

 const token =
  (session as any)?.apiToken ||
  (session as any)?.user?.apiToken ||
  (session as any)?.accessToken ||
  undefined;

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
  respHeaders.delete("set-cookie"); // don’t leak upstream cookies

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
