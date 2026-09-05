import React, { useState, useEffect } from "react";
import { Student } from "../types";

interface AbsensiTabProps {
  students: Student[];
  onSubmitAttendance: (
    className: string,
    attendanceMap: Record<string, "Hadir" | "Sakit" | "Izin" | "Alpa">
  ) => void;
}

export default function AbsensiTab({
  students,
  onSubmitAttendance,
}: AbsensiTabProps) {
  const [absensiClass, setAbsensiClass] = useState("Beginner");
  const [todayString, setTodayString] = useState("");
  const [formAbsensi, setFormAbsensi] = useState<
    Record<string, "Hadir" | "Sakit" | "Izin" | "Alpa">
  >({});

  useEffect(() => {
    setTodayString(
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  const filteredStudents = students.filter((s) => s.class === absensiClass);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitAttendance(absensiClass, formAbsensi);
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
        <div className="border-b border-slate-100 pb-3 mb-5">
          <h3 className="text-sm font-black text-slate-900">Input Absensi Kelas Harian</h3>
          <p className="text-[11px] text-slate-400">Pilih kelas dan tentukan kehadiran murid</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Pilih Kelas
              </label>
              <select
                value={absensiClass}
                onChange={(e) => {
                  setAbsensiClass(e.target.value);
                  setFormAbsensi({});
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none transition focus:border-rose-400 focus:bg-white cursor-pointer"
              >
                <option value="Beginner">Beginner Class</option>
                <option value="Kids Swimming">Kids Swimming Class</option>
                <option value="Private Class">Private Class (1-on-1)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Hari / Tanggal Absensi
              </label>
              <input
                type="text"
                disabled
                value={todayString || "Memuat tanggal..."}
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs text-slate-500 outline-none select-none"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-800">Catat Kehadiran Siswa:</h4>

            {filteredStudents.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                Tidak ada siswa terdaftar di kelas ini.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2.5"
                  >
                    <span className="text-xs font-bold text-slate-900">{student.name}</span>

                    <div className="flex gap-1.5 flex-wrap">
                      {(["Hadir", "Sakit", "Izin", "Alpa"] as const).map((status) => {
                        const currentStatus = formAbsensi[student.id] || "Hadir";
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() =>
                              setFormAbsensi((prev) => ({
                                ...prev,
                                [student.id]: status,
                              }))
                            }
                            className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition duration-200 cursor-pointer ${
                              currentStatus === status
                                ? status === "Hadir"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-250 shadow-sm"
                                  : status === "Sakit"
                                  ? "bg-blue-50 text-blue-700 border-blue-250 shadow-sm"
                                  : status === "Izin"
                                  ? "bg-amber-50 text-amber-700 border-amber-250 shadow-sm"
                                  : "bg-rose-50 text-rose-700 border-rose-250 shadow-sm"
                                : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                            }`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={filteredStudents.length === 0}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-3 text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Simpan Absensi Kelas
          </button>
        </form>
      </div>
    </div>
  );
}
