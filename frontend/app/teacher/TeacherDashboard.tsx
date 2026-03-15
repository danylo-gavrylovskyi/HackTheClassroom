"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Test } from "@/app/types";
import TestCard from "@/app/components/TestCard";
import CreateTestModal from "@/app/components/CreateTestModal";
import { getExams, getProfile, getToken, logout } from "@/app/lib/api";
import type { Exam } from "@/app/lib/api";

function examToTest(exam: Exam): Test {
  return {
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    questions: exam.questions_json,
    created_at: exam.created_at,
  };
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    Promise.all([getExams(), getProfile()])
      .then(([exams, profile]) => {
        setTests(exams.map(examToTest));
        setTeacher(profile);
      })
      .catch(() => {
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleCreateTest = (newTest: Test) => {
    setTests((prev) => [newTest, ...prev]);
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Завантаження...</p>
      </div>
    );
  }

  const initials = teacher?.name
    ? teacher.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/image.png" alt="Звірчик" width={36} height={36} className="rounded-xl" />
            <h1 className="text-2xl font-bold text-blue-600">Звірчик</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{teacher?.name}</p>
              <p className="text-xs text-gray-500">{teacher?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
              {initials}
            </div>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600 ml-2"
              title="Вийти"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Всього тестів</p>
            <p className="text-3xl font-bold text-gray-900">{tests.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Питань загалом</p>
            <p className="text-3xl font-bold text-indigo-600">
              {tests.reduce((sum, t) => sum + t.questions.length, 0)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Мої тести</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Створити тест
          </button>
        </div>

        {tests.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
            <p className="text-gray-400 text-sm">Тестів ще немає. Створіть перший!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {tests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                onDelete={(id) => setTests((prev) => prev.filter((t) => t.id !== id))}
              />
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <CreateTestModal
          onClose={() => setIsModalOpen(false)}
          onCreate={handleCreateTest}
        />
      )}
    </div>
  );
}
