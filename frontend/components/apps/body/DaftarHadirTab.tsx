"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  X, 
  Filter, 
  SlidersHorizontal, 
  ChevronRight, 
  Pencil, 
  Save, 
  CheckCircle2, 
  MessageCircle, 
  AlertCircle, 
  Users, 
  Clock, 
  Calendar,
  Trash2,
} from "lucide-react";
import { Student, Coach, ScheduleSession, AttendanceRecord } from "../types";
import { isImageAvatar, getAvatarImageUrl } from "../../../lib/api";
import SwipeableRow from "../SwipeableRow";

interface DaftarHadirTabProps {
  students: Student[];
  sessionRole: string;
  schedules?: ScheduleSession[];
  coaches?: Coach[];
  attendances?: AttendanceRecord[];
  onUpdateStudentStatus?: (studentId: string, status: string) => Promise<void> | void;
  onUpdateStudent?: (studentId: string, data: Partial<Student>) => Promise<void> | void;
  onDeleteStudent?: (studentId: string) => Promise<void> | void;
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
  onDeleteStudent,
  setActiveTab,
}: DaftarHadirTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  // Default: Hanya munculkan siswa yang aktif saja
  const [statusFilter, setStatusFilter] = useState<"Active" | "Inactive" | "ALL">("Active");
  const [sortBy, setSortBy] = useState<"name" | "attendance">("name");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [swipedStudentId, setSwipedStudentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit mode states in modal
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editParent, setEditParent] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editCoachName, setEditCoachName] = useState("");
  const [editCoachId, setEditCoachId] = useState("");
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

  // Format ISO date "YYYY-MM-DD" or raw string to "DD MMM YYYY" (e.g. "09 Sep 2026")
  const formatIndonesianDate = (dateStr: string) => {
    if (!dateStr) return "-";
    if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
    return dateStr;
  };

  // Helper to compute student attendance history from real schedules & attendances
  const getStudentHistoryFromSchedules = (student: Student) => {
    const todayISO = new Date().toISOString().split("T")[0];
    const sName = student.name.toLowerCase().trim();
    const sId = String(student.id);

    // 1. Filter schedules where this student is scheduled
    const matchedSchedules = schedules.filter((s) => {
      if (s.studentIds && s.studentIds.map(String).includes(sId)) return true;
      if (
        s.studentNames &&
        s.studentNames.some((name) => {
          const n = name.toLowerCase().trim();
          return n === sName || n.includes(sName) || sName.includes(n);
        })
      ) {
        return true;
      }
      // Fallback match by class only if no explicit student is assigned in schedule
      if (
        (!s.studentNames || s.studentNames.length === 0) &&
        (!s.studentIds || s.studentIds.length === 0)
      ) {
        return s.class?.toLowerCase().trim() === student.class?.toLowerCase().trim();
      }
      return false;
    });

    // 2. Map matched schedules to history items
    const scheduleItems = matchedSchedules.map((sch) => {
      const att = attendances.find((a) => {
        const isStudentMatch =
          a.person_type === "student" &&
          (String(a.person_id) === sId ||
            a.person_name?.toLowerCase().trim() === sName ||
            a.person_name?.toLowerCase().includes(sName) ||
            sName.includes(a.person_name?.toLowerCase().trim() || ""));

        const isScheduleMatch =
          (a.schedule_id && String(a.schedule_id) === String(sch.id)) ||
          (a.date && sch.date && a.date === sch.date);

        return isStudentMatch && isScheduleMatch;
      });

      const isUpcoming = (sch.date || "") > todayISO;
      let status = "Hadir";
      if (att) {
        status = att.status || (att.is_late ? "Terlambat" : "Hadir");
      } else if (isUpcoming) {
        status = "Terjadwal";
      }

      return {
        id: sch.id,
        date: formatIndonesianDate(sch.date),
        rawDate: sch.date || "",
        title: sch.title || `${sch.class} Class`,
        time: sch.timeStart ? `${sch.timeStart} - ${sch.timeEnd} WIB` : "",
        poolArea: sch.poolArea || "Kolam Renang",
        coachName: sch.coachName || "Coach",
        status: status,
        isLate: att?.is_late || status === "Terlambat",
        lateReason: att?.late_reason || "",
        isUpcoming: isUpcoming,
      };
    });

    // 3. Standalone attendances not in matchedSchedules
    const standaloneAttendances = attendances
      .filter((a) => {
        if (a.person_type !== "student") return false;
        const isStudentMatch =
          String(a.person_id) === sId ||
          a.person_name?.toLowerCase().trim() === sName ||
          a.person_name?.toLowerCase().includes(sName) ||
          sName.includes(a.person_name?.toLowerCase().trim() || "");
        if (!isStudentMatch) return false;
        return !matchedSchedules.some(
          (sch) => String(sch.id) === String(a.schedule_id) || sch.date === a.date
        );
      })
      .map((att) => ({
        id: `att-${att.id}`,
        date: formatIndonesianDate(att.date),
        rawDate: att.date || "",
        title: att.schedule_title || att.class || `${student.class} Class`,
        time: att.time_start ? `${att.time_start} - ${att.time_end} WIB` : "",
        poolArea: att.pool_area || "Kolam Renang",
        coachName: "Coach",
        status: att.status || (att.is_late ? "Terlambat" : "Hadir"),
        isLate: att.is_late || att.status === "Terlambat",
        lateReason: att.late_reason || "",
        isUpcoming: false,
      }));

    return [...scheduleItems, ...standaloneAttendances].sort((a, b) =>
      b.rawDate.localeCompare(a.rawDate)
    );
  };

  // Helper to compute student attendance rate dynamically
  const getStudentAttendanceRate = (student: Student) => {
    const history = getStudentHistoryFromSchedules(student);
    const todayISO = new Date().toISOString().split("T")[0];
    const completedSessions = history.filter((h) => h.rawDate <= todayISO);
    if (completedSessions.length === 0) return "100%";
    const presentCount = completedSessions.filter(
      (h) => h.status === "Hadir" || h.status === "Terlambat" || h.status === "Selesai"
    ).length;
    return `${Math.round((presentCount / completedSessions.length) * 100)}%`;
  };

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
          const rateA = parseInt(getStudentAttendanceRate(a)) || 0;
          const rateB = parseInt(getStudentAttendanceRate(b)) || 0;
          return rateB - rateA;
        }
      });
  }, [students, searchQuery, selectedClass, statusFilter, sortBy, schedules, attendances]);

  // Featured student (first in the filtered list or first student)
  const featuredStudent = filteredStudents[0] || students[0];

  // Helper to find next upcoming class for a student
  const getNextClassForStudent = (studentName: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const sName = studentName.toLowerCase().trim();
    const upcoming = schedules
      .filter(
        (s) =>
          (!s.date || s.date >= todayStr) &&
          s.studentNames?.some((name) => {
            const n = name.toLowerCase().trim();
            return n === sName || n.includes(sName) || sName.includes(n);
          })
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
    setEditCoachName(student.coach_name || student.coachName || (coaches?.[0]?.name || ""));
    setEditCoachId(student.coach_id || student.coachId || (coaches?.[0]?.id ? String(coaches[0].id) : ""));
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
    setEditCoachName(selectedStudent.coach_name || selectedStudent.coachName || (coaches?.[0]?.name || ""));
    setEditCoachId(selectedStudent.coach_id || selectedStudent.coachId || (coaches?.[0]?.id ? String(coaches[0].id) : ""));
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

    const selectedCoachObj = (coaches || []).find((c) => c.name === editCoachName);
    const resolvedCoachId = editCoachId || (selectedCoachObj ? String(selectedCoachObj.id) : "");
    const resolvedCoachName = editCoachName || (selectedCoachObj ? selectedCoachObj.name : "");

    const updatePayload: Partial<Student> = {
      name: editName.trim(),
      class: editClass.trim() || selectedStudent.class,
      parent: editParent.trim(),
      phone: editPhone.trim(),
      age: editAge.trim(),
      coach_id: resolvedCoachId,
      coach_name: resolvedCoachName,
      coachId: resolvedCoachId,
      coachName: resolvedCoachName,
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

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeleting(true);
      if (onDeleteStudent) {
        await onDeleteStudent(String(studentToDelete.id));
      }
      if (selectedStudent && String(selectedStudent.id) === String(studentToDelete.id)) {
        setSelectedStudent(null);
      }
      setStudentToDelete(null);
    } catch (err: any) {
      console.error("Gagal menghapus siswa:", err);
      alert(err?.message || "Gagal menghapus data siswa");
    } finally {
      setIsDeleting(false);
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
          <SwipeableRow
            id={`featured-${featuredStudent.id}`}
            isOpen={swipedStudentId === `featured-${featuredStudent.id}`}
            onOpen={(id) => setSwipedStudentId(id)}
            onClose={() => setSwipedStudentId(null)}
            onDelete={() => setStudentToDelete(featuredStudent)}
            onClick={() => handleOpenStudentDetail(featuredStudent)}
            canSwipe={sessionRole === "admin"}
            deleteLabel="Hapus"
          >
            <div
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
                    Wali: {featuredStudent.parent || "Orang Tua"} • Hadir {getStudentAttendanceRate(featuredStudent)}
                  </p>
                </div>
              </div>

              {/* Badges on Right */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100 text-[10px] font-black">
                  {getNextClassForStudent(featuredStudent.name)}
                </span>
                <span className="text-slate-400 text-xs font-bold group-hover:text-blue-600 transition flex items-center gap-0.5">
                  Detail <ChevronRight size={13} />
                </span>
              </div>
            </div>
          </SwipeableRow>
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
            <span className="absolute left-3.5 top-3.5 text-slate-400 flex items-center justify-center">
              <Search size={16} />
            </span>

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
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
            <SlidersHorizontal size={14} />
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
                  className="hover:text-rose-600 font-bold ml-1 cursor-pointer flex items-center"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedClass !== "ALL" && (
              <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center gap-1">
                Kelas: {selectedClass}
                <button
                  onClick={() => setSelectedClass("ALL")}
                  className="hover:text-rose-600 font-bold ml-1 cursor-pointer flex items-center"
                >
                  <X size={12} />
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${statusFilter === "Active"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                    }`}
                >
                  <span className={`h-2 w-2 rounded-full ${statusFilter === "Active" ? "bg-white" : "bg-emerald-500"}`} />
                  <span>Siswa Aktif ({activeCount})</span>
                </button>
                <button
                  onClick={() => setStatusFilter("Inactive")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${statusFilter === "Inactive"
                    ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                    }`}
                >
                  <span className={`h-2 w-2 rounded-full ${statusFilter === "Inactive" ? "bg-white" : "bg-slate-400"}`} />
                  <span>Siswa Tidak Aktif ({inactiveCount})</span>
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
              <Users size={36} className="text-slate-300 mx-auto" />
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
                <SwipeableRow
                  key={student.id}
                  id={String(student.id)}
                  isOpen={swipedStudentId === String(student.id)}
                  onOpen={(id) => setSwipedStudentId(id)}
                  onClose={() => setSwipedStudentId(null)}
                  onDelete={() => setStudentToDelete(student)}
                  onClick={() => handleOpenStudentDetail(student)}
                  canSwipe={sessionRole === "admin"}
                  deleteLabel="Hapus"
                >
                  <div
                    className={`p-3.5 sm:p-4 rounded-3xl bg-white hover:bg-slate-50 border ${active ? "border-slate-100" : "border-slate-200/80 bg-slate-50"
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
                          {(student.coach_name || student.coachName) && (
                            <span className="text-blue-600 font-bold"> • Coach {student.coach_name || student.coachName}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Kehadiran: {getStudentAttendanceRate(student)} • {student.parent || "Wali Murid"}
                        </p>
                      </div>
                    </div>

                    {/* Right: Chevron & Next Class Badge */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-cyan-600 transition" />
                      <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-black shadow-2xs">
                        {nextClass}
                      </span>
                    </div>
                  </div>
                </SwipeableRow>
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
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-blue-200/70"
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Status Feedback Toast */}
            {feedbackMsg && (
              <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold animate-fadeIn flex items-center gap-2">
                <CheckCircle2 size={16} className="text-cyan-600 shrink-0" />
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

                {/* Pelatih Penanggung Jawab */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Pelatih Penanggung Jawab:
                  </label>
                  <select
                    value={editCoachName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditCoachName(val);
                      const c = (coaches || []).find((coach) => coach.name === val);
                      setEditCoachId(c ? String(c.id) : "");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  >
                    {coaches && coaches.length > 0 ? (
                      coaches.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} {c.spec ? `(${c.spec})` : ""}
                        </option>
                      ))
                    ) : (
                      <option value="">Belum ada data pelatih</option>
                    )}
                  </select>
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
                        <Save size={13} />
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
                    <span className="text-slate-500">Pelatih Penanggung Jawab</span>
                    <span className="font-bold text-blue-600">{selectedStudent.coach_name || selectedStudent.coachName || "-"}</span>
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
                    <span className="font-bold text-emerald-600">{getStudentAttendanceRate(selectedStudent)}</span>
                  </div>
                </div>

                {/* Attendance Logs Derived from Real Admin Schedules */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Histori Presensi Terkini
                    </h4>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Dari Jadwal &amp; Presensi Admin
                    </span>
                  </div>
                  
                  {(() => {
                    const studentHistory = getStudentHistoryFromSchedules(selectedStudent);
                    if (studentHistory.length === 0) {
                      return (
                        <div className="py-5 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                          <p className="text-xs font-bold text-slate-600">
                            Belum ada riwayat presensi
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Jadwal yang dibuat Admin di menu Jadwal akan otomatis muncul di sini.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {studentHistory.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1"
                          >
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-800">{item.date}</span>
                                {item.time && (
                                  <span className="text-[10px] text-slate-400 font-semibold">
                                    • {item.time}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  item.status === "Hadir"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : item.status === "Terlambat"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : item.status === "Terjadwal"
                                    ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                    : item.status === "Sakit"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : item.status === "Izin"
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                              <span className="font-semibold text-slate-700">{item.title}</span>
                              <span className="text-[10px] text-slate-400">
                                {item.coachName} • {item.poolArea}
                              </span>
                            </div>
                            {item.lateReason && (
                              <p className="text-[10px] text-amber-700 font-medium italic mt-0.5 flex items-center gap-1">
                                <AlertCircle size={12} className="inline text-amber-600 shrink-0" />
                                <span>Alasan Keterlambatan: &quot;{item.lateReason}&quot;</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <a
                    href={`https://wa.me/${(selectedStudent.phone || "6281234567890").replace(/\D/g, "")}?text=Halo%20Orang%20Tua%20dari%20${encodeURIComponent(selectedStudent.name)},%20konfirmasi%20dari%20Akademi%20GIM%20Swimming`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center justify-center gap-2 border border-emerald-200 cursor-pointer"
                  >
                    <MessageCircle size={15} />
                    <span>Hubungi Wali Murid (WhatsApp)</span>
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

      {/* ==========================================
          DELETE CONFIRMATION MODAL
          ========================================== */}
      {studentToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div
            onClick={() => !isDeleting && setStudentToDelete(null)}
            className="absolute inset-0"
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <Trash2 size={24} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                Konfirmasi Hapus Siswa
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah anda yakin menghapus <span className="font-bold text-slate-900">&quot;{studentToDelete.name}&quot;</span>?
              </p>
              <p className="text-[11px] text-slate-400">
                Data siswa dan riwayat absensi terkait akan dihapus secara permanen.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setStudentToDelete(null)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? "Menghapus..." : "Ya"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
