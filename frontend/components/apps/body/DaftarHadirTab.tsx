"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Student, Coach, ScheduleSession, AttendanceRecord } from "../types";
import { isImageAvatar, getAvatarImageUrl } from "../../../lib/api";

interface DaftarHadirTabProps {
  students: Student[];
  sessionRole: string;
  schedules?: ScheduleSession[];
  coaches?: Coach[];
  attendances?: AttendanceRecord[];
  onUpdateStudentStatus?: (studentId: string, status: string) => Promise<void> | void;
  onUpdateStudent?: (studentId: string, data: Partial<Student>) => Promise<void> | void;
  setActiveTab?: (tab: string) => void;
}

export default function DaftarHadirTab({
  students = [],
  sessionRole,
  schedules = [],
  coaches = [],
  attendances = [],
  onUpdateStudentStatus,
  onUpdateStudent,
  setActiveTab,
}: DaftarHadirTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  // Default: Hanya munculkan siswa yang aktif saja
  const [statusFilter, setStatusFilter] = useState<"Active" | "Inactive" | "ALL">("Active");
  const [sortBy, setSortBy] = useState<"name" | "attendance">("name");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Edit mode states in modal
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editParent, setEditParent] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [avatarTick, setAvatarTick] = useState(0);

  // Listen to avatar changes across app
  useEffect(() => {
    const handleAvatarUpdate = () => setAvatarTick((t) => t + 1);
    window.addEventListener("avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
  }, []);

  // Helper to check if a student is active
  const isStudentActive = (student: Student) => {
    const st = (student.status || "Active").toLowerCase().trim();
    return st === "active" || st === "aktif";
  };

  // Helper to get avatar for a student
  const getStudentAvatar = (student: Student) => {
    if (student.avatar) return student.avatar;
    if (typeof window !== "undefined") {
      const byName = localStorage.getItem(`gim_avatar_${student.name}`);
      if (byName) return byName;
      const byLower = localStorage.getItem(`gim_avatar_${student.name.toLowerCase()}`);
      if (byLower) return byLower;
      const byId = localStorage.getItem(`gim_avatar_${student.id}`);
      if (byId) return byId;
    }
    return "";
  };

  if (sessionRole !== "admin" && sessionRole !== "pelatih") return null;

  // Counts for status
  const activeCount = useMemo(() => {
    return students.filter((s) => isStudentActive(s)).length;
  }, [students]);

  const inactiveCount = useMemo(() => {
    return students.filter((s) => !isStudentActive(s)).length;
  }, [students]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    return students
      .filter((student) => {
        const matchesQuery =
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (student.class && student.class.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (student.parent && student.parent.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesClass =
          selectedClass === "ALL" ||
          student.class.toLowerCase().includes(selectedClass.toLowerCase());

        const active = isStudentActive(student);
        const matchesStatus =
          statusFilter === "ALL"
            ? true
            : statusFilter === "Active"
              ? active
              : !active;

        return matchesQuery && matchesClass && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        } else {
          const rateA = parseInt(a.attendanceRate) || 0;
          const rateB = parseInt(b.attendanceRate) || 0;
          return rateB - rateA;
        }
      });
  }, [students, searchQuery, selectedClass, statusFilter, sortBy]);

  // Featured student (first in the filtered list or first student)
  const featuredStudent = filteredStudents[0] || students[0];

  // Helper to find next upcoming class for a student
  const getNextClassForStudent = (studentName: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const upcoming = schedules
      .filter(
        (s) =>
          (!s.date || s.date >= todayStr) &&
          s.studentNames?.some(
            (name) => name.toLowerCase().trim() === studentName.toLowerCase().trim()
          )
      )
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    if (upcoming.length > 0) {
      const nextSession = upcoming[0];
      return `${nextSession.timeStart} WIB`;
    }
    return "Next Class";
  };

  // Open detail modal and initialize edit state
  const handleOpenStudentDetail = (student: Student) => {
    setSelectedStudent(student);
    setIsEditing(false);
    setEditName(student.name || "");
    setEditClass(student.class || "Prestasi");
    setEditParent(student.parent || "");
    setEditPhone(student.phone || "");
    setEditAge(student.age || "");
    setEditStatus(isStudentActive(student) ? "Active" : "Inactive");
    setFeedbackMsg(null);
  };

  // Start edit mode
  const handleStartEdit = () => {
    if (!selectedStudent) return;
    setEditName(selectedStudent.name || "");
    setEditClass(selectedStudent.class || "Prestasi");
    setEditParent(selectedStudent.parent || "");
    setEditPhone(selectedStudent.phone || "");
    setEditAge(selectedStudent.age || "");
    setEditStatus(isStudentActive(selectedStudent) ? "Active" : "Inactive");
    setIsEditing(true);
    setFeedbackMsg(null);
  };

  // Save updated student details (Admin)
  const handleSaveStudent = async () => {
    if (!selectedStudent) return;
    if (!editName.trim()) {
      setFeedbackMsg("Nama siswa tidak boleh kosong.");
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);

    const updatePayload: Partial<Student> = {
      name: editName.trim(),
      class: editClass.trim() || selectedStudent.class,
      parent: editParent.trim(),
      phone: editPhone.trim(),
      age: editAge.trim(),
      status: editStatus,
    };

    try {
      if (onUpdateStudent) {
        await onUpdateStudent(selectedStudent.id, updatePayload);
      } else if (onUpdateStudentStatus) {
        await onUpdateStudentStatus(selectedStudent.id, editStatus);
      }

      const updatedStudent: Student = {
        ...selectedStudent,
        ...updatePayload,
      };

      setSelectedStudent(updatedStudent);
      setIsEditing(false);
      setFeedbackMsg("Data siswa berhasil diperbarui!");
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      console.error("Gagal menyimpan data siswa:", err);
      setFeedbackMsg("Gagal menyimpan perubahan. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 bg-[#f8fafc] min-h-full font-sans">
      {/* ==========================================
          1. TOP VIBRANT BLUE HEADER (HERO SECTION)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-14 sm:pb-16 px-5 sm:px-8 shadow-xl shadow-blue-700/15 overflow-hidden rounded-none">
        {/* Subtle geometric circles */}
        <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20 pointer-events-none" />
        <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25 pointer-events-none" />

        {/* Ambient Depth Glow */}
        <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10 space-y-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Daftar Siswa
            </h2>
            <p className="text-xs text-cyan-100 font-medium mt-1">
              {statusFilter === "Active"
                ? `Menampilkan ${filteredStudents.length} Siswa Aktif`
                : statusFilter === "Inactive"
                  ? `Menampilkan ${filteredStudents.length} Siswa Tidak Aktif`
                  : `Total ${students.length} Siswa Terdaftar (${activeCount} Aktif, ${inactiveCount} Tidak Aktif)`}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-cyan-100/90 pt-1">
            <span>Profile Picture</span>
            <span>Membership</span>
          </div>
        </div>
      </div>

      {/* ==========================================
          2. MAIN CONTENT CONTAINER (FLOATING CARDS)
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-3.5 -mt-10 sm:-mt-12 relative z-20 animate-fadeIn">
        {/* Featured Top Student Card */}
        {featuredStudent && (
          <div
            onClick={() => handleOpenStudentDetail(featuredStudent)}
            className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between gap-3 cursor-pointer hover:border-cyan-300 hover:shadow-2xl transition group active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              {/* Circular Avatar */}
              {(() => {
                const avatar = getStudentAvatar(featuredStudent);
                const isImg = isImageAvatar(avatar);
                const active = isStudentActive(featuredStudent);
                return (
                  <div
                    className={`h-14 w-14 sm:h-16 sm:w-16 rounded-full ${active
                      ? "bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-500"
                      : "bg-slate-400"
                      } text-white font-black text-xl flex items-center justify-center border-2 border-white shadow-md shrink-0 overflow-hidden group-hover:scale-105 transition`}
                  >
                    {isImg && avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getAvatarImageUrl(avatar)}
                        alt={featuredStudent.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : avatar ? (
                      <span className="text-2xl">{avatar}</span>
                    ) : (
                      <span>{featuredStudent.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                );
              })()}

              {/* Info */}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-blue-600 transition capitalize">
                    {featuredStudent.name}
                  </h3>
                  {!isStudentActive(featuredStudent) && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-bold">
                      Tidak Aktif
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  Lev: {featuredStudent.class || "Prestasi"}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  Wali: {featuredStudent.parent || "Orang Tua"} • Hadir {featuredStudent.attendanceRate || "100%"}
                </p>
              </div>
            </div>

            {/* Badges on Right */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100 text-[10px] font-black">
                {getNextClassForStudent(featuredStudent.name)}
              </span>
              <span className="text-slate-400 text-xs font-bold group-hover:text-blue-600 transition">
                Detail ›
              </span>
            </div>
          </div>
        )}

        {/* Search Bar & Filter Button in Single Clean Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 rounded-2xl bg-white border border-slate-200/80 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs transition"
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-3.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilterDrawer((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-xs font-bold transition cursor-pointer border shadow-2xs shrink-0 ${showFilterDrawer || statusFilter !== "Active" || selectedClass !== "ALL"
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80"
              }`}
          >
            <span>⇅</span>
            <span>Filter</span>
            {statusFilter !== "Active" && (
              <span className="h-2 w-2 rounded-full bg-amber-300"></span>
            )}
          </button>
        </div>

        {/* Active Filter Indicator (Clean single pill if non-default filter is active) */}
        {(statusFilter !== "Active" || selectedClass !== "ALL") && (
          <div className="flex items-center gap-1.5 flex-wrap px-1 text-xs">
            <span className="text-slate-400 font-medium">Filter aktif:</span>
            {statusFilter !== "Active" && (
              <span className="px-2.5 py-1 rounded-xl bg-slate-200 text-slate-800 font-bold flex items-center gap-1">
                Status: {statusFilter === "Inactive" ? "Tidak Aktif" : "Semua"}
                <button
                  onClick={() => setStatusFilter("Active")}
                  className="hover:text-rose-600 font-bold ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedClass !== "ALL" && (
              <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center gap-1">
                Kelas: {selectedClass}
                <button
                  onClick={() => setSelectedClass("ALL")}
                  className="hover:text-rose-600 font-bold ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setStatusFilter("Active");
                setSelectedClass("ALL");
              }}
              className="text-blue-600 hover:underline font-bold text-[11px] ml-1 cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}

        {/* Filter Drawer / Options (When toggled) */}
        {showFilterDrawer && (
          <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5 animate-fadeIn">
            {/* Filter by Status */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Status Siswa:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setStatusFilter("Active")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${statusFilter === "Active"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                    }`}
                >
                  🟢 Siswa Aktif ({activeCount})
                </button>
                <button
                  onClick={() => setStatusFilter("Inactive")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${statusFilter === "Inactive"
                    ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                    }`}
                >
                  ⚪ Siswa Tidak Aktif ({inactiveCount})
                </button>
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${statusFilter === "ALL"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                    }`}
                >
                  Semua ({students.length})
                </button>
              </div>
            </div>

            {/* Filter by Class */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Program Kelas:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {["ALL", "Prestasi", "Kids Swimming", "Private Class"].map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${selectedClass === cls
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                      }`}
                  >
                    {cls === "ALL" ? "Semua Kelas" : cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort order */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Urutan:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSortBy("name")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${sortBy === "name"
                    ? "bg-cyan-50 text-cyan-700 border-cyan-300 font-black"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                    }`}
                >
                  Nama (A-Z)
                </button>
                <button
                  onClick={() => setSortBy("attendance")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${sortBy === "attendance"
                    ? "bg-cyan-50 text-cyan-700 border-cyan-300 font-black"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                    }`}
                >
                  Tingkat Kehadiran
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student List Cards */}
        <div className="space-y-2.5">
          {filteredStudents.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white border border-slate-100 text-center space-y-2 shadow-sm">

              <h4 className="text-sm font-bold text-slate-700">Siswa Tidak Ditemukan</h4>
              <p className="text-xs text-slate-400">
                {statusFilter === "Inactive"
                  ? "Tidak ada siswa dalam kategori Tidak Aktif."
                  : "Tidak ada siswa yang sesuai dengan filter atau kata kunci pencarian."}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedClass("ALL");
                  setStatusFilter("Active");
                }}
                className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Reset ke Siswa Aktif
              </button>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const nextClass = getNextClassForStudent(student.name);
              const active = isStudentActive(student);

              return (
                <div
                  key={student.id}
                  onClick={() => handleOpenStudentDetail(student)}
                  className={`p-3.5 sm:p-4 rounded-3xl bg-white hover:bg-slate-50/90 border ${active ? "border-slate-100" : "border-slate-200/80 bg-slate-50/50"
                    } shadow-xs hover:shadow-md hover:border-cyan-200 flex items-center justify-between gap-3 cursor-pointer transition active:scale-98 group`}
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3">
                    {(() => {
                      const avatar = getStudentAvatar(student);
                      const isImg = isImageAvatar(avatar);
                      return (
                        <div
                          className={`h-12 w-12 rounded-full ${active
                            ? "bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-500"
                            : "bg-slate-400"
                            } text-white font-black text-base flex items-center justify-center border-2 border-white shadow-xs shrink-0 overflow-hidden group-hover:scale-105 transition`}
                        >
                          {isImg && avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getAvatarImageUrl(avatar)}
                              alt={student.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : avatar ? (
                            <span className="text-xl">{avatar}</span>
                          ) : (
                            <span>{student.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                      );
                    })()}

                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-xs sm:text-sm font-black transition capitalize ${active ? "text-slate-900 group-hover:text-blue-600" : "text-slate-600"
                            }`}
                        >
                          {student.name}
                        </h4>
                        {!active && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-bold">
                            Tidak Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                        Lev: {student.class || "Prestasi"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Kehadiran: {student.attendanceRate} • {student.parent || "Wali Murid"}
                      </p>
                    </div>
                  </div>

                  {/* Right: Chevron & Next Class Badge */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-slate-400 group-hover:text-cyan-600 font-bold text-sm transition">
                      ›
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-black shadow-2xs">
                      {nextClass}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ==========================================
          STUDENT DETAIL / EDIT POPUP MODAL
          ========================================== */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setSelectedStudent(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                {(() => {
                  const avatar = getStudentAvatar(selectedStudent);
                  const isImg = isImageAvatar(avatar);
                  const active = isStudentActive(selectedStudent);
                  return (
                    <div
                      className={`h-12 w-12 rounded-full ${active
                        ? "bg-gradient-to-tr from-blue-600 to-cyan-500"
                        : "bg-slate-400"
                        } text-white font-black text-lg flex items-center justify-center border-2 border-white shadow-md overflow-hidden shrink-0`}
                    >
                      {isImg && avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getAvatarImageUrl(avatar)}
                          alt={selectedStudent.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : avatar ? (
                        <span className="text-xl">{avatar}</span>
                      ) : (
                        <span>{selectedStudent.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  );
                })()}
                <div>
                  <h3 className="text-base font-black text-slate-900 capitalize">
                    {selectedStudent.name}
                  </h3>
                  <p className="text-xs text-blue-600 font-bold">
                    {selectedStudent.class} Class
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {!isEditing && sessionRole === "admin" && (
                  <button
                    onClick={handleStartEdit}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-blue-200/70"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Status Feedback Toast */}
            {feedbackMsg && (
              <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold animate-fadeIn flex items-center gap-2">
                <span>✓</span>
                <span>{feedbackMsg}</span>
              </div>
            )}

            {/* ==========================================
                EDIT MODE: FULL STUDENT EDIT FORM
                ========================================== */}
            {isEditing && sessionRole === "admin" ? (
              <div className="space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">
                    Edit Data Siswa
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ID #{selectedStudent.id}
                  </span>
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Nama Lengkap Siswa:
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nama siswa..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Status & Kelas Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Status Siswa:
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as "Active" | "Inactive")}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Active">Aktif</option>
                      <option value="Inactive">Tidak Aktif</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Program Kelas:
                    </label>
                    <select
                      value={editClass}
                      onChange={(e) => setEditClass(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Prestasi">Prestasi</option>
                      <option value="Kids Swimming">Kids Swimming</option>
                      <option value="Private Class">Private Class</option>
                    </select>
                  </div>
                </div>

                {/* Orang Tua / Wali */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Nama Orang Tua / Wali:
                  </label>
                  <input
                    type="text"
                    value={editParent}
                    onChange={(e) => setEditParent(e.target.value)}
                    placeholder="Nama orang tua..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Grid Phone & Age */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      No. Telepon / WA:
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Usia / Umur:
                    </label>
                    <input
                      type="text"
                      value={editAge}
                      onChange={(e) => setEditAge(e.target.value)}
                      placeholder="Contoh: 8 thn"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Edit Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveStudent}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      <span>Menyimpan...</span>
                    ) : (
                      <>

                        <span>Simpan Perubahan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* ==========================================
                 VIEW MODE: STUDENT DETAIL SUMMARY
                 ========================================== */
              <>
                {/* Status Row */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Status Keanggotaan</span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {isStudentActive(selectedStudent) ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Aktif (Masih Mengikuti Kelas)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                          Tidak Aktif (Tidak Melanjutkan)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Student Details Grid */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Orang Tua / Wali</span>
                    <span className="font-bold text-slate-900">{selectedStudent.parent || "-"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Nomor Telepon</span>
                    <span className="font-bold text-slate-900">{selectedStudent.phone || "-"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Usia</span>
                    <span className="font-bold text-slate-900">{selectedStudent.age || "-"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Tingkat Kehadiran</span>
                    <span className="font-bold text-emerald-600">{selectedStudent.attendanceRate}</span>
                  </div>
                </div>

                {/* Attendance Logs */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Histori Presensi Terkini
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selectedStudent.logs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-3 bg-slate-50 rounded-2xl">
                        Belum ada catatan presensi.
                      </p>
                    ) : (
                      selectedStudent.logs.map((log, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-xs p-2.5 rounded-2xl bg-slate-50 border border-slate-100"
                        >
                          <span className="font-bold text-slate-700">{log.date}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${log.status === "Hadir"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : log.status === "Sakit"
                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                : log.status === "Izin"
                                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                                  : "bg-rose-50 text-rose-700 border border-rose-100"
                              }`}
                          >
                            {log.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <a
                    href={`https://wa.me/${(selectedStudent.phone || "6281234567890").replace(/\D/g, "")}?text=Halo%20Orang%20Tua%20dari%20${encodeURIComponent(selectedStudent.name)},%20konfirmasi%20dari%20Akademi%20GIM%20Swimming`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center justify-center gap-2 border border-emerald-200 cursor-pointer"
                  >
                    Hubungi Wali Murid (WhatsApp)
                  </a>

                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
