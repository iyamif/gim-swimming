import React, { useState } from "react";
import { Student } from "../types";

interface DaftarHadirTabProps {
  students: Student[];
  sessionRole: string;
}

export default function DaftarHadirTab({
  students,
  sessionRole,
}: DaftarHadirTabProps) {
  const [selectedStudentLogs, setSelectedStudentLogs] = useState<Student | null>(null);

  if (sessionRole !== "admin" && sessionRole !== "pelatih") return null;

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm">
        <div className="mb-4">
          <h3 className="text-xs font-bold text-slate-900">
            Rangkuman Kehadiran Kelas Siswa GIM Swimming
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Klik nama siswa di bawah untuk melihat histori presensi rinci.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold">
                <th className="py-2.5 px-3">Nama Siswa</th>
                <th className="py-2.5 px-3">Kelas</th>
                <th className="py-2.5 px-3">Kehadiran</th>
                <th className="py-2.5 px-3">Wali Murid</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => setSelectedStudentLogs(student)}
                  className="hover:bg-slate-50/70 transition cursor-pointer"
                >
                  <td className="py-3.5 px-3 font-bold text-cyan-600 hover:underline">
                    {student.name}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">{student.class}</td>
                  <td className="py-3.5 px-3 font-bold text-slate-800">
                    {student.attendanceRate}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500">{student.parent}</td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student detail calendar overlay popup */}
      {selectedStudentLogs && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedStudentLogs(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-sm bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl my-auto">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Histori Presensi: {selectedStudentLogs.name}
            </h3>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {selectedStudentLogs.logs.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Belum ada catatan presensi.
                </p>
              ) : (
                selectedStudentLogs.logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <span className="font-bold text-slate-700">{log.date}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        log.status === "Hadir"
                          ? "bg-emerald-50 text-emerald-700"
                          : log.status === "Sakit"
                          ? "bg-blue-50 text-blue-700"
                          : log.status === "Izin"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedStudentLogs(null)}
              className="mt-6 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Tutup Histori
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
