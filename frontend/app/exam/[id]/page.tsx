"use client";

import dynamic from "next/dynamic";

const ExamSession = dynamic(() => import("./ExamSession"), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <p className="text-gray-400">Завантаження...</p>
        </div>
    ),
});

export default function ExamPage() {
    return <ExamSession />;
}
