import { auth } from "@/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!; // http://localhost:8080

function passthroughHeaders(req: Request, token?: string) {
  const out = new Headers();

  // forward content-type if any
  const ct = req.headers.get("content-type");
  if (ct) out.set("content-type", ct);

  // accept JSON by default
  out.set("accept", "application/json");

  if (token) out.set("authorization", `Bearer ${token}`);

  return out;
}

async function forward(method: string, req: Request, path: string[]) {
  const session = await auth();
  const token = (session as any)?.apiToken || undefined;

  const url = `${API_BASE}/${path.join("/")}`;
  const headers = passthroughHeaders(req, token);

  // Only read body for methods that have one
  const hasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(url, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  // Pass through response
  const respHeaders = new Headers(upstream.headers);
  // avoid set-cookie / hop-by-hop
  respHeaders.delete("set-cookie");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  return forward("GET", req, params.path);
}
export async function POST(req: Request, { params }: { params: { path: string[] } }) {
  return forward("POST", req, params.path);
}
export async function PATCH(req: Request, { params }: { params: { path: string[] } }) {
  return forward("PATCH", req, params.path);
}
export async function DELETE(req: Request, { params }: { params: { path: string[] } }) {
  return forward("DELETE", req, params.path);
}
