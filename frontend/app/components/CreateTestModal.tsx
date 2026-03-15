"use client";

import { useState } from "react";
import { createExam } from "@/app/lib/api";
import { Test } from "@/app/types";

interface CreateTestModalProps {
  onClose: () => void;
  onCreate: (test: Test) => void;
}

interface QuestionForm {
  localId: string;
  question: string;
  reference_answer: string;
  max_score: number;
}

export default function CreateTestModal({ onClose, onCreate }: CreateTestModalProps) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [questions, setQuestions] = useState<QuestionForm[]>([
    { localId: crypto.randomUUID(), question: "", reference_answer: "", max_score: 5 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { localId: crypto.randomUUID(), question: "", reference_answer: "", max_score: 5 },
    ]);
  };

  const removeQuestion = (localId: string) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((q) => q.localId !== localId));
  };

  const updateQuestion = (localId: string, field: keyof QuestionForm, value: string | number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.localId === localId ? { ...q, [field]: value } : q))
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !subject.trim()) return;
    setLoading(true);
    setError("");

    try {
      const exam = await createExam({
        title: title.trim(),
        subject: subject.trim(),
        questions: questions
          .filter((q) => q.question.trim())
          .map((q, i) => ({
            id: i + 1,
            question: q.question.trim(),
            reference_answer: q.reference_answer.trim(),
            max_score: q.max_score,
          })),
      });

      onCreate({
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        questions: exam.questions_json,
        created_at: exam.created_at,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка створення тесту");
    } finally {
      setLoading(false);
    }
  };

  const isValid = title.trim().length > 0 && subject.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Новий тест</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Назва тесту <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Наприклад: Закони Ньютона"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Предмет <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Наприклад: Фізика"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Питання</label>
              <button
                onClick={addQuestion}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Додати питання
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.localId} className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Питання {index + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-500">
                        Макс. бал:
                        <input
                          type="number"
                          value={q.max_score}
                          onChange={(e) => updateQuestion(q.localId, "max_score", parseInt(e.target.value) || 5)}
                          min={1}
                          max={10}
                          className="ml-1 w-12 px-1.5 py-0.5 border border-gray-200 rounded text-sm text-center"
                        />
                      </label>
                      {questions.length > 1 && (
                        <button
                          onClick={() => removeQuestion(q.localId)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Видалити
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(q.localId, "question", e.target.value)}
                    placeholder="Введіть питання..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white resize-none"
                  />
                  <textarea
                    value={q.reference_answer}
                    onChange={(e) => updateQuestion(q.localId, "reference_answer", e.target.value)}
                    placeholder="Еталонна відповідь (для ШІ-екзаменатора)..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Скасувати
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || loading}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Збереження..." : "Створити"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
