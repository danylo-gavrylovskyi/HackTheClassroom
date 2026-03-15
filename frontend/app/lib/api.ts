const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

let authToken: string | null = null;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string | null) {
  if (typeof document === "undefined") return;
  if (value) {
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${60 * 60 * 24 * 7}`;
  } else {
    document.cookie = `${name}=;path=/;max-age=0`;
  }
}

export function setToken(token: string | null) {
  authToken = token;
  setCookie("auth_token", token);
}

export function getToken(): string | null {
  if (authToken) return authToken;
  const stored = getCookie("auth_token");
  if (stored) authToken = stored;
  return authToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export async function login(email: string, password: string) {
  const data = await request<{ access_token: string; user: { id: string; email: string } }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) }
  );
  setToken(data.access_token);
  return data;
}

export async function register(email: string, password: string, name: string) {
  const data = await request<{ access_token: string; user: { id: string; email: string; name: string } }>(
    "/auth/register",
    { method: "POST", body: JSON.stringify({ email, password, name }) }
  );
  setToken(data.access_token);
  return data;
}

export async function getProfile() {
  return request<{ id: string; email: string; name: string }>("/auth/profile");
}

export function logout() {
  setToken(null);
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

// Exams
export interface ExamQuestion {
  id: number;
  question: string;
  reference_answer: string;
  max_score: number;
}

export interface Exam {
  id: string;
  teacher_id: string;
  title: string;
  subject: string;
  questions_json: ExamQuestion[];
  created_at: string;
}

export async function getExams() {
  return request<Exam[]>("/exams");
}

export async function getExam(id: string) {
  return request<Exam>(`/exams/${id}`);
}

export async function createExam(data: {
  title: string;
  subject: string;
  questions: ExamQuestion[];
}) {
  return request<Exam>("/exams", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteExam(id: string) {
  return request<{ deleted: boolean }>(`/exams/${id}`, { method: "DELETE" });
}

// Sessions
export interface ExamSession {
  id: string;
  student_name: string;
  status: "in_progress" | "completed";
  total_score: number | null;
  max_score: number | null;
  started_at: string;
  finished_at: string | null;
}

export interface ExamSessionDetails extends ExamSession {
  transcript_text: string | null;
  scores_json: Array<{
    question_id: number;
    score: number;
    hints_given: number;
    comment: string;
  }> | null;
  summary_text: string | null;
}

export async function getExamSessions(examId: string) {
  return request<ExamSession[]>(`/exams/${examId}/sessions`);
}

export async function getSessionDetails(sessionId: string) {
  return request<ExamSessionDetails>(`/sessions/${sessionId}`);
}

// Public (no auth) — for student
export interface PublicExam {
  id: string;
  title: string;
  subject: string;
  questions_json: ExamQuestion[];
}

export interface StartSessionResult {
  token: string;
  session_id: string;
  room_name: string;
}

export async function getPublicExam(examId: string): Promise<PublicExam> {
  const res = await fetch(`${API_URL}/exams/${examId}/start-session`, {
    method: "HEAD",
  }).catch(() => null);
  // Fallback: fetch exam info via a lightweight probe
  // The backend exposes exam data when starting a session, so we use startSession
  // For the entry screen we only need title/subject from what start-session returns
  // We'll fetch from a public endpoint if available, else use start-session result
  void res;
  // Simple approach — just return placeholder until session starts
  return request<PublicExam>(`/exams/${examId}/public`).catch(async () => {
    // If no public endpoint, return minimal info
    return { id: examId, title: "Аудіо-тест", subject: "", questions_json: [] };
  });
}

export async function startSession(
  examId: string,
  studentName: string
): Promise<StartSessionResult> {
  const res = await fetch(`${API_URL}/exams/${examId}/start-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_name: studentName }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Не вдалося почати тест");
  }
  return res.json();
}

