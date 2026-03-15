"use client";

import dynamic from "next/dynamic";

const LoginForm = dynamic(() => import("./LoginForm"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Завантаження...</p>
    </div>
  ),
});

export default function LoginPage() {
  return <LoginForm />;
}
