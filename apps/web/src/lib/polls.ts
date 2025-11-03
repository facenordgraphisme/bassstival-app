const BASE = "/api/proxy";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await r.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) throw new Error((data as any)?.error || `API ${r.status}`);
  return data as T;
}

export type PollSurvey = {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

export type PollCandidate = {
  id: string;
  artist_name: string;
  genre: string;
  youtube_link: string;
  image_url: string | null;
  order: number;
  results: { yes: number; no: number; abstain: number };
  my_vote: "yes" | "no" | "abstain" | null;
};

export type PollSurveyDetail = PollSurvey & { candidates: PollCandidate[] };

export type PollVoters = {
  id: string; // survey id
  candidates: Array<{
    id: string;
    artist_name: string;
    voters: {
      yes: Array<{ id: string; name: string; email: string }>;
      no: Array<{ id: string; name: string; email: string }>;
      abstain: Array<{ id: string; name: string; email: string }>;
    };
  }>;
};

export const getSurveyVoters = (id: string) =>
  api<PollVoters>(`/polls/${id}/voters`, { method: "GET" });

/* Surveys */
export const listSurveys = () => api<PollSurvey[]>("/polls", { method: "GET" });
export const createSurvey = (p: { title: string; description?: string }) =>
  api<PollSurvey>("/polls", { method: "POST", body: JSON.stringify(p) });
export const getSurvey = (id: string) =>
  api<PollSurveyDetail>(`/polls/${id}`, { method: "GET" });

/* Candidates (owner only) */
export const addCandidate = (surveyId: string, p: {
  artist_name: string; genre: string; youtube_link: string; image_url?: string; order?: number;
}) => api<PollCandidate>(`/polls/${surveyId}/candidates`, {
  method: "POST", body: JSON.stringify(p),
});
export const patchCandidate = (surveyId: string, id: string, p: Partial<{
  artist_name: string; genre: string; youtube_link: string; image_url?: string; order?: number;
}>) => api<PollCandidate>(`/polls/${surveyId}/candidates/${id}`, {
  method: "PATCH", body: JSON.stringify(p),
});
export const removeCandidate = (surveyId: string, id: string) =>
  api<{ ok: true }>(`/polls/${surveyId}/candidates/${id}`, { method: "DELETE" });

/* Votes */
export const voteCandidate = (candidateId: string, choice: "yes"|"no"|"abstain") =>
  api<{ candidate_id: string; results: { yes: number; no: number; abstain: number } }>(
    `/polls/vote/${candidateId}`, { method: "POST", body: JSON.stringify({ choice }) }
  );

  export async function deleteSurvey(id: string): Promise<{ ok: true }> {
  return api<{ ok: true }>(`/polls/${id}`, { method: "DELETE" });
}