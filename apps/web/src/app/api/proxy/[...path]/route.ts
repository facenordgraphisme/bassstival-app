import { auth } from "@/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!; // http://localhost:8080

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

  // ✅ récupère le token quel que soit l’endroit où tu l’as mis
  const token =
    (session as any)?.apiToken ||
    (session as any)?.user?.apiToken ||
    (session as any)?.accessToken || // au cas où
    undefined;

  if (!token) {
    // Réponds clairement 401 JSON (pas de HTML ici)
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
