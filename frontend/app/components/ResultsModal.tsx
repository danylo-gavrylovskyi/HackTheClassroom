"use client";

import { useEffect, useState } from "react";
import { getExamSessions, getSessionDetails, ExamSession, ExamSessionDetails } from "@/app/lib/api";

interface ResultsModalProps {
  examId: string;
  examTitle: string;
  onClose: () => void;
}

export default function ResultsModal({ examId, examTitle, onClose }: ResultsModalProps) {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ExamSessionDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    getExamSessions(examId)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [examId]);

  const handleSelectSession = async (sessionId: string) => {
    setLoadingDetails(true);
    const details = await getSessionDetails(sessionId);
    setSelected(details);
    setLoadingDetails(false);
  };

  const completed = sessions.filter((s) => s.status === "completed");
  const inProgress = sessions.filter((s) => s.status === "in_progress");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Результати</h2>
            <p className="text-sm text-gray-400">{examTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: session list */}
          <div className="w-64 border-r border-gray-100 overflow-y-auto flex-shrink-0">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400">Завантаження...</div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 px-6 text-center">
                <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <p className="text-sm text-gray-400">Ще ніхто не проходив цей тест</p>
              </div>
            ) : (
              <div className="py-2">
                {completed.length > 0 && (
                  <>
                    <p className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Завершені</p>
                    {completed.map((s) => (
                      <SessionRow
                        key={s.id}
                        session={s}
                        active={selected?.id === s.id}
                        onClick={() => handleSelectSession(s.id)}
                      />
                    ))}
                  </>
                )}
                {inProgress.length > 0 && (
                  <>
                    <p className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">В процесі</p>
                    {inProgress.map((s) => (
                      <SessionRow
                        key={s.id}
                        session={s}
                        active={selected?.id === s.id}
                        onClick={() => handleSelectSession(s.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: details */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingDetails ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400">Завантаження...</div>
            ) : !selected ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
                <p className="text-sm text-gray-400">Оберіть студента щоб побачити деталі</p>
              </div>
            ) : (
              <SessionDetails details={selected} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionRow({ session, active, onClick }: { session: ExamSession; active: boolean; onClick: () => void }) {
  const scoreText = session.total_score !== null && session.max_score
    ? `${session.total_score}/${session.max_score}`
    : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-l-2 ${
        active ? "border-indigo-500 bg-indigo-50/50" : "border-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 truncate">{session.student_name}</p>
        {scoreText && (
          <span className="text-xs font-semibold text-indigo-600 shrink-0">{scoreText}</span>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{formatDate(session.started_at)}</p>
    </button>
  );
}

function SessionDetails({ details }: { details: ExamSessionDetails }) {
  const percent = details.total_score !== null && details.max_score
    ? Math.round((details.total_score / details.max_score) * 100)
    : null;

  const grade = percent !== null ? getGrade(percent) : null;

  return (
    <div className="space-y-5">
      {/* Score summary */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-indigo-600">
            {details.total_score ?? "—"}<span className="text-base font-normal text-gray-400">/{details.max_score ?? "—"}</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">балів</p>
        </div>
        {percent !== null && (
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{percent}%</p>
            <p className="text-xs text-gray-400 mt-0.5">результат</p>
          </div>
        )}
        {grade && (
          <div className={`ml-auto px-4 py-2 rounded-xl text-center ${grade.bg}`}>
            <p className={`text-2xl font-bold ${grade.color}`}>{grade.label}</p>
            <p className={`text-xs mt-0.5 ${grade.color} opacity-70`}>{grade.desc}</p>
          </div>
        )}
      </div>

      {/* AI summary */}
      {details.summary_text && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Висновок системи</p>
          <p className="text-sm text-gray-700 leading-relaxed bg-indigo-50 rounded-xl p-4">
            {details.summary_text}
          </p>
        </div>
      )}

      {/* Per-question scores */}
      {details.scores_json && details.scores_json.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Оцінки по питаннях</p>
          <div className="space-y-2">
            {details.scores_json.map((s) => (
              <div key={s.question_id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-indigo-600">{s.question_id}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{s.comment}</p>
                  {s.hints_given > 0 && (
                    <p className="text-xs text-amber-500 mt-0.5">Надано підказок: {s.hints_given}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-indigo-600 shrink-0">{s.score}/5</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {details.status === "in_progress" && (
        <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
          Тест ще не завершено
        </p>
      )}
    </div>
  );
}

function getGrade(percent: number) {
  if (percent >= 90) return { label: "5", desc: "Відмінно", color: "text-green-700", bg: "bg-green-50" };
  if (percent >= 75) return { label: "4", desc: "Добре", color: "text-blue-700", bg: "bg-blue-50" };
  if (percent >= 50) return { label: "3", desc: "Задовільно", color: "text-amber-700", bg: "bg-amber-50" };
  return { label: "2", desc: "Незадовільно", color: "text-red-700", bg: "bg-red-50" };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("uk-UA", { day: "numeric", month: "short", year: "numeric" });
}
