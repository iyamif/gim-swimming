import React, { useState } from "react";
import { ScheduleSession, Student, Coach } from "../types";

interface JadwalTabProps {
  schedules: ScheduleSession[];
  students: Student[];
  coaches: Coach[];
  onAddSchedule: (newSchedule: Omit<ScheduleSession, "id">) => void;
  onDeleteSchedule: (id: string) => void;
  setActiveTab?: (tab: string) => void;
}

export default function JadwalTab({
  schedules,
  students,
  coaches,
  onAddSchedule,
  onDeleteSchedule,
  setActiveTab,
}: JadwalTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterClass, setFilterClass] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Helper for today's local date string (YYYY-MM-DD)
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayString();

  // Form State
  const [formDate, setFormDate] = useState(todayStr);
  const [formTimeStart, setFormTimeStart] = useState("15:00");
  const [formTimeEnd, setFormTimeEnd] = useState("17:00");
  const [formClass, setFormClass] = useState("Prestasi");
  const [formPoolArea, setFormPoolArea] = useState("312 Wera");
  const [formCoachId, setFormCoachId] = useState(coaches[0]?.id || "custom");
  const [formCoachName, setFormCoachName] = useState(coaches[0]?.name || "Coach Rendi");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [customStudentInput, setCustomStudentInput] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTitle, setFormTitle] = useState("");

  // Quick time preset buttons
  const timePresets = [
    { label: "Pagi (08:00 - 10:00)", start: "08:00", end: "10:00" },
    { label: "Siang (10:00 - 11:30)", start: "10:00", end: "11:30" },
    { label: "Sore A (15:00 - 17:00)", start: "15:00", end: "17:00" },
    { label: "Sore B (16:00 - 17:30)", start: "16:00", end: "17:30" },
  ];

  // Handler: Change program class and set default pool location & student selection rule
  const handleClassChange = (newClass: string) => {
    setFormClass(newClass);

    // Rule: Private or Kids -> Default Nalendra; Prestasi -> Default 312 Wera
    if (newClass === "Private Class" || newClass === "Kids Swimming") {
      setFormPoolArea("Nalendra");
    } else if (newClass === "Prestasi") {
      setFormPoolArea("312 Wera");
    }

    // Rule: Private Class is strictly 1-on-1 (single student)
    if (newClass === "Private Class") {
      setSelectedStudentIds((prev) => (prev.length > 1 ? [prev[0]] : prev));
    }
  };

  const handleCoachChange = (val: string) => {
    setFormCoachId(val);
    if (val === "custom") {
      setFormCoachName("");
    } else {
      const found = coaches.find((c) => c.id === val);
      if (found) setFormCoachName(found.name);
    }
  };

  // Rule: If Private Class -> 1 student max (radio-like selection); If Prestasi/Kids -> multiple students allowed
  const toggleStudentSelection = (studentId: string) => {
    if (formClass === "Private Class") {
      if (selectedStudentIds.includes(studentId)) {
        setSelectedStudentIds([]);
      } else {
        setSelectedStudentIds([studentId]);
        setCustomStudentInput("");
      }
    } else {
      setSelectedStudentIds((prev) =>
        prev.includes(studentId)
          ? prev.filter((id) => id !== studentId)
          : [...prev, studentId]
      );
    }
  };

  // Helpers for time conflict validation
  const timeToMinutes = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const isTimeOverlap = (startA: string, endA: string, startB: string, endB: string) => {
    const sA = timeToMinutes(startA);
    const eA = timeToMinutes(endA);
    const sB = timeToMinutes(startB);
    const eB = timeToMinutes(endB);
    return sA < eB && eA > sB;
  };

  const cleanName = (name: string) =>
    (name || "").toLowerCase().replace(/^coach\s+/i, "").trim();

  // Real-time detection of coach time conflict on the selected date and time range
  const conflictingSchedule = (() => {
    if (!formCoachName.trim() || !formDate || !formTimeStart || !formTimeEnd) return null;
    const targetClean = cleanName(formCoachName);

    return schedules.find((s) => {
      if (s.date !== formDate) return false;

      const sClean = cleanName(s.coachName);
      const isSameCoach =
        (formCoachId && s.coachId && formCoachId !== "custom" && s.coachId === formCoachId) ||
        (targetClean && sClean === targetClean);

      if (!isSameCoach) return false;

      return isTimeOverlap(formTimeStart, formTimeEnd, s.timeStart, s.timeEnd);
    });
  })();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate past date
    if (formDate < todayStr) {
      alert("Tanggal latihan tidak boleh memilih tanggal yang sudah lewat!");
      return;
    }

    // 2. Validate time duration
    if (timeToMinutes(formTimeStart) >= timeToMinutes(formTimeEnd)) {
      alert("Jam selesai harus lebih besar dari jam mulai!");
      return;
    }

    // 3. Validate coach name
    if (!formCoachName.trim()) {
      alert("Silakan tentukan nama instruktur/pelatih.");
      return;
    }

    // 4. Validate coach schedule conflict (1 pelatih tidak bisa melatih 2 murid/sesi berbeda di jam dan hari yang sama)
    if (conflictingSchedule) {
      alert(
        `⚠️ BENTROK JADWAL PELATIH!\n\nPelatih "${formCoachName}" sudah memiliki jadwal sesi "${conflictingSchedule.title}" pada tanggal ${formatDateIndo(
          formDate
        )} jam ${conflictingSchedule.timeStart} - ${conflictingSchedule.timeEnd} WIB di ${conflictingSchedule.poolArea}.\n\nPelatih tidak dapat melatih sesi lain di waktu yang bersamaan. Silakan sesuaikan jam atau pilih pelatih lain.`
      );
      return;
    }

    // 5. Collect student names
    const matchedNames = students
      .filter((s) => selectedStudentIds.includes(s.id))
      .map((s) => s.name);

    // If custom student typed, include it
    if (customStudentInput.trim()) {
      matchedNames.push(customStudentInput.trim());
    }

    if (matchedNames.length === 0) {
      alert("Silakan pilih atau tambahkan minimal 1 siswa untuk sesi jadwal ini.");
      return;
    }

    // 6. Validate single student for Private Class (1-on-1)
    if (formClass === "Private Class" && matchedNames.length > 1) {
      alert("Program Private Class (1-on-1) hanya boleh untuk 1 orang siswa. Silakan pilih 1 siswa.");
      return;
    }

    const selectedCoach = coaches.find((c) => c.id === formCoachId);

    const title =
      formTitle.trim() ||
      `${formClass} (${matchedNames.slice(0, 2).join(", ")}${
        matchedNames.length > 2 ? ` +${matchedNames.length - 2}` : ""
      })`;

    onAddSchedule({
      title,
      class: formClass,
      date: formDate,
      timeStart: formTimeStart,
      timeEnd: formTimeEnd,
      poolArea: formPoolArea,
      coachId: formCoachId,
      coachName: formCoachName.trim(),
      coachPhone: selectedCoach?.phone || "08123456780",
      studentIds: selectedStudentIds,
      studentNames: matchedNames,
      notes: formNotes,
      status: "Active",
    });

    // Reset & Close Modal
    setShowAddModal(false);
    setSelectedStudentIds([]);
    setCustomStudentInput("");
    setFormNotes("");
    setFormTitle("");
  };

  const filteredSchedules = schedules.filter((sch) => {
    const matchClass = filterClass === "Semua" || sch.class === filterClass;
    const matchSearch =
      sch.coachName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sch.studentNames.some((name) =>
        name.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      sch.poolArea.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sch.date.includes(searchQuery);

    return matchClass && matchSearch;
  });

  const formatDateIndo = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* ==========================================
          HEADER & ACTION BAR
          ========================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              Manajemen Jadwal Les Renang
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Atur dan jadwalkan sesi latihan renang untuk siswa dan pelatih
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <span>➕</span>
          <span>Buat Jadwal Baru</span>
        </button>
      </div>

      {/* ==========================================
          FILTERS BAR
          ========================================== */}
      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari siswa, pelatih, atau tanggal..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-cyan-500 focus:bg-white transition"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
        </div>

        {/* Filter by class */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["Semua", "Prestasi", "Private Class", "Kids Swimming"].map((cls) => (
            <button
              key={cls}
              onClick={() => setFilterClass(cls)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0 ${
                filterClass === cls
                  ? "bg-cyan-500 text-white shadow-xs"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100"
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================
          SCHEDULE LIST CARDS
          ========================================== */}
      {filteredSchedules.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <span className="text-4xl">🏊‍♂️</span>
          <h3 className="text-sm font-bold text-slate-700">Belum Ada Jadwal Sesi</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Tidak ditemukan jadwal renang yang cocok. Klik tombol di bawah untuk membuat jadwal sesi baru.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-2 px-4 py-2 rounded-xl bg-cyan-50 text-cyan-700 text-xs font-bold hover:bg-cyan-100 transition cursor-pointer"
          >
            + Tambah Jadwal Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSchedules.map((sch) => (
            <div
              key={sch.id}
              className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition space-y-3.5 relative overflow-hidden group"
            >
              {/* Header card */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-100">
                      {sch.class}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      📍 {sch.poolArea}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 mt-1">
                    {sch.title}
                  </h4>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-blue-600 block">
                    ⏰ {sch.timeStart} - {sch.timeEnd} WIB
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {formatDateIndo(sch.date)}
                  </span>
                </div>
              </div>

              {/* Coach Row */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-xs">
                    🏊‍♂️
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Pelatih / Instruktur</p>
                    <p className="font-bold text-slate-800">{sch.coachName}</p>
                  </div>
                </div>

                {sch.coachPhone && (
                  <a
                    href={`https://wa.me/${sch.coachPhone}?text=Halo%20${sch.coachName},%20konfirmasi%20jadwal%20latihan%20renang`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>💬</span> Hubungi
                  </a>
                )}
              </div>

              {/* Students Enrolled Row */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Siswa Terjadwal ({sch.studentNames.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sch.studentNames.map((name, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 text-[11px] font-semibold"
                    >
                      <span>👤</span>
                      <span>{name}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes if any */}
              {sch.notes && (
                <div className="p-2.5 bg-cyan-50/40 rounded-xl border border-cyan-100/50 text-[11px] text-slate-600">
                  <span className="font-bold text-cyan-800">Catatan: </span>
                  {sch.notes}
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  onClick={() => onDeleteSchedule(sch.id)}
                  className="px-3 py-1.5 rounded-xl text-red-500 hover:bg-red-50 text-[11px] font-bold transition cursor-pointer"
                >
                  🗑️ Hapus
                </button>

                <button
                  onClick={() => {
                    if (setActiveTab) setActiveTab("absensi");
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <span>⏱️</span>
                  <span>Mulai Presensi</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==========================================
          MODAL: FORM BUAT JADWAL BARU
          ========================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div
            onClick={() => setShowAddModal(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Buat Jadwal Sesi Renang Baru
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tentukan tanggal, jam les, pelatih, serta siswa yang bertugas
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Real-time Coach Conflict Warning Banner */}
              {conflictingSchedule && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs space-y-1 animate-fadeIn">
                  <div className="flex items-center gap-2 font-black text-rose-700">
                    <span className="text-sm">⚠️</span>
                    <span>BENTROK JADWAL PELATIH!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-700">
                    Pelatih <strong>{formCoachName}</strong> sudah memiliki jadwal <strong>{conflictingSchedule.title}</strong> pada jam{" "}
                    <strong>{conflictingSchedule.timeStart} - {conflictingSchedule.timeEnd} WIB</strong> di{" "}
                    <strong>{conflictingSchedule.poolArea}</strong>. Pelatih tidak dapat melatih sesi lain di waktu bersamaan.
                  </p>
                </div>
              )}

              {/* 1. Date Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Tanggal Latihan
                  </label>
                  <span className="text-[10px] text-cyan-600 font-bold bg-cyan-50 px-2 py-0.5 rounded">
                    Minimal Hari Ini
                  </span>
                </div>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none focus:border-cyan-500 focus:bg-white transition"
                />
              </div>

              {/* 2. Time Start & Time End Range (Side-by-Side 2 Columns) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Jam / Waktu Sesi (WIB)
                  </label>
                  <span className="text-[10px] font-bold text-cyan-600">
                    Durasi: {(() => {
                      const diff = timeToMinutes(formTimeEnd) - timeToMinutes(formTimeStart);
                      if (diff <= 0) return "Waktu tidak valid";
                      const h = Math.floor(diff / 60);
                      const m = diff % 60;
                      return `${h > 0 ? `${h} Jam ` : ""}${m > 0 ? `${m} Menit` : ""}`.trim();
                    })()}
                  </span>
                </div>

                {/* Sampingan 2 Kolom di Semua Ukuran Layar */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200/80 focus-within:border-cyan-500 focus-within:bg-white transition min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      🕒 Jam Mulai
                    </span>
                    <input
                      type="time"
                      required
                      value={formTimeStart}
                      onChange={(e) => setFormTimeStart(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-black text-slate-900 outline-none cursor-pointer"
                    />
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200/80 focus-within:border-cyan-500 focus-within:bg-white transition min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      🏁 Jam Selesai
                    </span>
                    <input
                      type="time"
                      required
                      value={formTimeEnd}
                      onChange={(e) => setFormTimeEnd(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-black text-slate-900 outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {timePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormTimeStart(preset.start);
                        setFormTimeEnd(preset.end);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-[10px] font-semibold text-slate-600 transition cursor-pointer active:scale-95"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Program Kelas & Kolam (Side-by-Side 2 Kolom) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Program Kelas
                    </label>
                    {formClass === "Private Class" ? (
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100">
                        1 Siswa
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                        Multi
                      </span>
                    )}
                  </div>
                  <select
                    value={formClass}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-900 font-bold outline-none focus:border-cyan-500 focus:bg-white cursor-pointer transition"
                  >
                    <option value="Prestasi">Prestasi</option>
                    <option value="Private Class">Private Class (1-on-1)</option>
                    <option value="Kids Swimming">Kids Swimming Class</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 truncate">
                      Lokasi Kolam
                    </label>
                    <span className="text-[9px] font-medium text-slate-400">
                      Default: {formClass === "Prestasi" ? "312 Wera" : "Nalendra"}
                    </span>
                  </div>
                  <select
                    value={formPoolArea}
                    onChange={(e) => setFormPoolArea(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-900 font-bold outline-none focus:border-cyan-500 focus:bg-white cursor-pointer transition"
                  >
                    <option value="Nalendra">Nalendra</option>
                    <option value="312 Wera">312 Wera</option>
                  </select>
                </div>
              </div>

              {/* 4. Coach Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Pelatih / Instruktur
                </label>
                <select
                  value={formCoachId}
                  onChange={(e) => handleCoachChange(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-900 outline-none focus:border-cyan-500 focus:bg-white cursor-pointer mb-1.5"
                >
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.spec})
                    </option>
                  ))}
                  <option value="custom">✏️ Masukkan Pelatih Lainnya / Custom...</option>
                </select>

                {formCoachId === "custom" && (
                  <input
                    type="text"
                    required
                    value={formCoachName}
                    onChange={(e) => setFormCoachName(e.target.value)}
                    placeholder="Ketik nama pelatih (misal: Coach Rendi)"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none focus:border-cyan-500 focus:bg-white transition mt-1.5"
                  />
                )}
              </div>

              {/* 5. Student Assignment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Pilih Siswa yang Mengikuti Sesi
                  </label>
                  <span className="text-[10px] font-bold text-cyan-600">
                    {formClass === "Private Class"
                      ? selectedStudentIds.length > 0
                        ? "1 Siswa Terpilih (1-on-1)"
                        : "Pilih 1 Siswa Privat"
                      : `${selectedStudentIds.length} Siswa Terpilih`}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 max-h-36 overflow-y-auto space-y-1.5">
                  {students.map((student) => {
                    const isChecked = selectedStudentIds.includes(student.id);
                    return (
                      <label
                        key={student.id}
                        className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer text-xs ${
                          isChecked
                            ? "bg-cyan-50 border border-cyan-300 text-cyan-950 font-bold shadow-2xs"
                            : "hover:bg-white border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type={formClass === "Private Class" ? "radio" : "checkbox"}
                            name={formClass === "Private Class" ? "privateStudentRadio" : undefined}
                            checked={isChecked}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="text-cyan-600 focus:ring-cyan-500 h-4 w-4 cursor-pointer shrink-0"
                          />
                          <span className="truncate">{student.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                          {student.class}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Optional Custom Student Name */}
                <div>
                  <input
                    type="text"
                    value={customStudentInput}
                    onChange={(e) => {
                      setCustomStudentInput(e.target.value);
                      if (formClass === "Private Class" && e.target.value.trim()) {
                        setSelectedStudentIds([]);
                      }
                    }}
                    placeholder={
                      formClass === "Private Class"
                        ? "Atau ketik 1 nama siswa privat baru..."
                        : "Atau ketik nama siswa baru (misal: Andre)..."
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-cyan-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* 6. Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan Sesi (Opsional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Fokus evaluasi teknik meluncur & gaya dada"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-cyan-500 focus:bg-white transition"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={Boolean(conflictingSchedule)}
                  className={`flex-1 py-3 rounded-2xl text-white font-bold text-xs shadow-lg transition cursor-pointer ${
                    conflictingSchedule
                      ? "bg-slate-400 cursor-not-allowed opacity-75"
                      : "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-cyan-500/25 active:scale-95"
                  }`}
                >
                  {conflictingSchedule ? "⚠️ Jadwal Bentrok (Perbaiki Waktu)" : "Simpan & Tambahkan Jadwal"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
