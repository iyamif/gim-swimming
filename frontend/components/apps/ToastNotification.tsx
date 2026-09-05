import React from "react";

interface ToastNotificationProps {
  message: string;
  type: "success" | "error";
}

export default function ToastNotification({ message, type }: ToastNotificationProps) {
  if (!message) return null;

  return (
    <div
      className={`fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border animate-bounce ${
        type === "success"
          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
          : "bg-rose-50 border-rose-100 text-rose-700"
      }`}
    >
      <span className="text-lg">{type === "success" ? "✅" : "❌"}</span>
      <span className="text-xs font-bold">{message}</span>
    </div>
  );
}
