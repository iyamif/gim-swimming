import React, { useState, useRef, useEffect } from "react";
import { ScheduleSession, Student, Coach } from "../types";

const MONTH_NAMES_INDO = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES_INDO = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

interface JadwalTabProps {
  schedules: ScheduleSession[];
  students: Student[];
  coaches: Coach[];
  onAddSchedule: (newSchedule: Omit<ScheduleSession, "id">) => void;
  onUpdateSchedule?: (id: string, updatedSchedule: Partial<ScheduleSession>) => void;
  onDeleteSchedule: (id: string) => void;
  setActiveTab?: (tab: string) => void;
}

export default function JadwalTab({
  schedules,
  students,
  coaches,
  onAddSchedule,
  onUpdateSchedule,
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

  // Helper to add days to ISO date string (YYYY-MM-DD)
  const addDaysToDate = (baseDateStr: string, days: number) => {
    if (!baseDateStr) return "";
    try {
      const d = new Date(baseDateStr + "T00:00:00");
      d.setDate(d.getDate() + days);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return baseDateStr;
    }
  };

  const formatShortDateIndo = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const formatFullDateIndo = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const todayStr = getTodayString();

  // ==========================================
  // CREATE SCHEDULE STATE
  // ==========================================
  const [selectedDates, setSelectedDates] = useState<string[]>([todayStr]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth()); // 0-11
  const calendarRef = useRef<HTMLDivElement>(null);

  const [formTimeStart, setFormTimeStart] = useState("15:00");
  const [formTimeEnd, setFormTimeEnd] = useState("17:00");
  const [formClass, setFormClass] = useState("Private Class");
  const [formPoolArea, setFormPoolArea] = useState("Nalendra");
  const [formCoachId, setFormCoachId] = useState(coaches[0]?.id || "custom");
  const [formCoachName, setFormCoachName] = useState(coaches[0]?.name || "Coach Rendi");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTitle, setFormTitle] = useState("");

  // ==========================================
  // EDIT SCHEDULE STATE
  // ==========================================
  const [editingSchedule, setEditingSchedule] = useState<ScheduleSession | null>(null);
  const [editDate, setEditDate] = useState("");
  const [isEditCalendarOpen, setIsEditCalendarOpen] = useState(false);
  const [editCalYear, setEditCalYear] = useState(() => new Date().getFullYear());
  const [editCalMonth, setEditCalMonth] = useState(() => new Date().getMonth());
  const editCalendarRef = useRef<HTMLDivElement>(null);

  const [editTimeStart, setEditTimeStart] = useState("15:00");
  const [editTimeEnd, setEditTimeEnd] = useState("17:00");
  const [editClass, setEditClass] = useState("Private Class");
  const [editPoolArea, setEditPoolArea] = useState("Nalendra");
  const [editCoachId, setEditCoachId] = useState("");
  const [editCoachName, setEditCoachName] = useState("");
  const [editSelectedStudentIds, setEditSelectedStudentIds] = useState<string[]>([]);
  const [editStudentSearchQuery, setEditStudentSearchQuery] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState<"Active" | "Completed" | "Cancelled">("Active");

  // Close calendar popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
      if (
        editCalendarRef.current &&
        !editCalendarRef.current.contains(event.target as Node)
      ) {
        setIsEditCalendarOpen(false);
      }
    };

    if (isCalendarOpen || isEditCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isCalendarOpen, isEditCalendarOpen]);

  // Calendar month navigation for Create Modal
  const handlePrevCalMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextCalMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  // Calendar month navigation for Edit Modal
  const handlePrevEditCalMonth = () => {
    if (editCalMonth === 0) {
      setEditCalMonth(11);
      setEditCalYear((y) => y - 1);
    } else {
      setEditCalMonth((m) => m - 1);
    }
  };

  const handleNextEditCalMonth = () => {
    if (editCalMonth === 11) {
      setEditCalMonth(0);
      setEditCalYear((y) => y + 1);
    } else {
      setEditCalMonth((m) => m + 1);
    }
  };

  // Toggle or add date in create calendar (up to 4 dates max)
  const handleToggleDate = (dateStr: string) => {
    if (dateStr < todayStr) return; // Disallow past dates

    if (selectedDates.includes(dateStr)) {
      if (selectedDates.length === 1) {
        setSelectedDates([]);
      } else {
        setSelectedDates((prev) => prev.filter((d) => d !== dateStr));
      }
    } else {
      if (selectedDates.length >= 4) {
        alert(
          "Maksimal 4 tanggal latihan telah dipilih! Silakan klik pada tanggal yang aktif untuk membatalkan sebelum memilih tanggal baru."
        );
        return;
      }
      setSelectedDates((prev) => [...prev, dateStr].sort());
    }
  };

  // Quick Auto-Add 4 Weekly Meetings (+7 days each)
  const handleAutoAdd4Weekly = () => {
    const base = selectedDates[0] || todayStr;
    setSelectedDates([
      base,
      addDaysToDate(base, 7),
      addDaysToDate(base, 14),
      addDaysToDate(base, 21),
    ].sort());
  };

  const handleRemoveDate = (index: number) => {
    setSelectedDates((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick time preset buttons
  const timePresets = [
    { label: "Pagi (08:00 - 10:00)", start: "08:00", end: "10:00" },
    { label: "Siang (10:00 - 11:30)", start: "10:00", end: "11:30" },
    { label: "Sore A (15:00 - 17:00)", start: "15:00", end: "17:00" },
    { label: "Sore B (16:00 - 17:30)", start: "16:00", end: "17:30" },
  ];

  // Class Change in Create Modal
  const handleClassChange = (newClass: string) => {
    setFormClass(newClass);
    if (newClass === "Private Class" || newClass === "Kids Swimming") {
      setFormPoolArea("Nalendra");
    } else if (newClass === "Prestasi") {
      setFormPoolArea("312 Wera");
    }
    if (newClass === "Private Class") {
      setSelectedStudentIds((prev) => (prev.length > 1 ? [prev[0]] : prev));
    }
  };

  // Class Change in Edit Modal
  const handleEditClassChange = (newClass: string) => {
    setEditClass(newClass);
    if (newClass === "Private Class" || newClass === "Kids Swimming") {
      setEditPoolArea("Nalendra");
    } else if (newClass === "Prestasi") {
      setEditPoolArea("312 Wera");
    }
    if (newClass === "Private Class") {
      setEditSelectedStudentIds((prev) => (prev.length > 1 ? [prev[0]] : prev));
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

  const handleEditCoachChange = (val: string) => {
    setEditCoachId(val);
    if (val === "custom") {
      setEditCoachName("");
    } else {
      const found = coaches.find((c) => c.id === val);
      if (found) setEditCoachName(found.name);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    if (formClass === "Private Class") {
      if (selectedStudentIds.includes(studentId)) {
        setSelectedStudentIds([]);
      } else {
        setSelectedStudentIds([studentId]);
      }
    } else {
      setSelectedStudentIds((prev) =>
        prev.includes(studentId)
          ? prev.filter((id) => id !== studentId)
          : [...prev, studentId]
      );
    }
  };

  const toggleEditStudentSelection = (studentId: string) => {
    if (editClass === "Private Class") {
      if (editSelectedStudentIds.includes(studentId)) {
        setEditSelectedStudentIds([]);
      } else {
        setEditSelectedStudentIds([studentId]);
      }
    } else {
      setEditSelectedStudentIds((prev) =>
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

  // Real-time detection of coach conflict for Create Modal
  const conflictingSchedules = (() => {
    if (!formCoachName.trim() || !formTimeStart || !formTimeEnd) return [];
    const targetClean = cleanName(formCoachName);

    const list: { date: string; session: ScheduleSession; index: number }[] = [];

    selectedDates.forEach((d, idx) => {
      if (!d) return;
      const match = schedules.find((s) => {
        if (s.date !== d) return false;

        const sClean = cleanName(s.coachName);
        const isSameCoach =
          (formCoachId && s.coachId && formCoachId !== "custom" && s.coachId === formCoachId) ||
          (targetClean && sClean === targetClean);

        if (!isSameCoach) return false;

        return isTimeOverlap(formTimeStart, formTimeEnd, s.timeStart, s.timeEnd);
      });

      if (match) {
        list.push({ date: d, session: match, index: idx });
      }
    });

    return list;
  })();

  // Real-time detection of coach conflict for Edit Modal
  const editConflictingSchedule = (() => {
    if (!editingSchedule || !editCoachName.trim() || !editTimeStart || !editTimeEnd || !editDate) {
      return null;
    }
    const targetClean = cleanName(editCoachName);

    return schedules.find((s) => {
      // Exclude the schedule currently being edited
      if (s.id === editingSchedule.id) return false;
      if (s.date !== editDate) return false;

      const sClean = cleanName(s.coachName);
      const isSameCoach =
        (editCoachId && s.coachId && editCoachId !== "custom" && s.coachId === editCoachId) ||
        (targetClean && sClean === targetClean);

      if (!isSameCoach) return false;

      return isTimeOverlap(editTimeStart, editTimeEnd, s.timeStart, s.timeEnd);
    });
  })();

  // Open Edit Modal for a Schedule
  const handleOpenEditModal = (sch: ScheduleSession) => {
    setEditingSchedule(sch);
    setEditDate(sch.date || todayStr);
    setEditTimeStart(sch.timeStart || "15:00");
    setEditTimeEnd(sch.timeEnd || "17:00");
    setEditClass(sch.class || "Private Class");
    setEditPoolArea(sch.poolArea || "Nalendra");

    const matchedCoach = coaches.find(
      (c) => c.id === sch.coachId || c.name.toLowerCase() === sch.coachName.toLowerCase()
    );
    setEditCoachId(matchedCoach ? matchedCoach.id : "custom");
    setEditCoachName(sch.coachName || "");

    // Map student IDs
    if (sch.studentIds && sch.studentIds.length > 0) {
      setEditSelectedStudentIds(sch.studentIds);
    } else if (sch.studentNames && sch.studentNames.length > 0) {
      const ids = students
        .filter((st) => sch.studentNames.includes(st.name))
        .map((st) => st.id);
      setEditSelectedStudentIds(ids);
    } else {
      setEditSelectedStudentIds([]);
    }

    setEditStudentSearchQuery("");
    setEditNotes(sch.notes || "");
    setEditTitle(sch.title || "");
    setEditStatus(sch.status || "Active");

    if (sch.date) {
      try {
        const d = new Date(sch.date + "T00:00:00");
        setEditCalYear(d.getFullYear());
        setEditCalMonth(d.getMonth());
      } catch {}
    }
  };

  // Submit Create Schedule Form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate past date
    const hasPastDate = selectedDates.some((d) => !d || d < todayStr);
    if (hasPastDate) {
      alert("Ada tanggal pertemuan yang sudah lewat atau belum diisi! Silakan periksa kembali tanggal latihan.");
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

    // 4. Validate coach schedule conflict
    if (conflictingSchedules.length > 0) {
      const conflictDetails = conflictingSchedules
        .map(
          (c) =>
            `• Pertemuan ${c.index + 1} (${formatDateIndo(c.date)}): Bentrok dengan sesi "${c.session.title}" (${c.session.timeStart} - ${c.session.timeEnd} WIB di ${c.session.poolArea})`
        )
        .join("\n");

      alert(
        `⚠️ BENTROK JADWAL PELATIH!\n\nPelatih "${formCoachName}" memiliki jadwal bentrok pada tanggal berikut:\n\n${conflictDetails}\n\nSilakan sesuaikan jam atau ganti tanggal/pelatih.`
      );
      return;
    }

    // 5. Collect student names
    const matchedNames = students
      .filter((s) => selectedStudentIds.includes(s.id))
      .map((s) => s.name);

    if (matchedNames.length === 0) {
      alert("Silakan pilih minimal 1 siswa untuk sesi jadwal ini.");
      return;
    }

    // 6. Validate single student for Private Class (1-on-1)
    if (formClass === "Private Class" && matchedNames.length > 1) {
      alert("Program Private Class (1-on-1) hanya boleh untuk 1 orang siswa. Silakan pilih 1 siswa.");
      return;
    }

    const selectedCoach = coaches.find((c) => c.id === formCoachId);

    // 7. Save sessions individually one-by-one into database
    selectedDates.forEach((d, idx) => {
      const sessionSuffix = selectedDates.length > 1 ? ` (P-${idx + 1})` : "";
      const baseTitle =
        formTitle.trim() ||
        `${formClass} (${matchedNames.slice(0, 2).join(", ")}${
          matchedNames.length > 2 ? ` +${matchedNames.length - 2}` : ""
        })`;

      const title = `${baseTitle}${sessionSuffix}`;

      onAddSchedule({
        title,
        class: formClass,
        date: d,
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
    });

    // Reset & Close Modal
    setShowAddModal(false);
    setSelectedDates([todayStr]);
    setIsCalendarOpen(false);
    setSelectedStudentIds([]);
    setStudentSearchQuery("");
    setFormNotes("");
    setFormTitle("");
  };

  // Submit Edit Schedule Form (With Full Validation)
  const handleEditFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;

    // 1. Validate past date
    if (!editDate || editDate < todayStr) {
      alert("Tanggal latihan tidak boleh tanggal yang sudah lewat! Silakan pilih tanggal hari ini atau yang akan datang.");
      return;
    }

    // 2. Validate time duration
    if (timeToMinutes(editTimeStart) >= timeToMinutes(editTimeEnd)) {
      alert("Jam selesai harus lebih besar dari jam mulai!");
      return;
    }

    // 3. Validate coach name
    if (!editCoachName.trim()) {
      alert("Silakan tentukan nama instruktur/pelatih.");
      return;
    }

    // 4. Validate coach schedule conflict
    if (editConflictingSchedule) {
      alert(
        `⚠️ BENTROK JADWAL PELATIH!\n\nPelatih "${editCoachName}" sudah memiliki sesi lain pada tanggal ${formatDateIndo(editDate)} pukul ${editConflictingSchedule.timeStart} - ${editConflictingSchedule.timeEnd} WIB ("${editConflictingSchedule.title}").\n\nSilakan sesuaikan jam atau ganti pelatih/tanggal.`
      );
      return;
    }

    // 5. Collect student names
    const matchedNames = students
      .filter((s) => editSelectedStudentIds.includes(s.id))
      .map((s) => s.name);

    if (matchedNames.length === 0) {
      alert("Silakan pilih minimal 1 siswa untuk sesi jadwal ini.");
      return;
    }

    // 6. Validate single student for Private Class (1-on-1)
    if (editClass === "Private Class" && matchedNames.length > 1) {
      alert("Program Private Class (1-on-1) hanya boleh untuk 1 orang siswa. Silakan pilih 1 siswa.");
      return;
    }

    const selectedCoach = coaches.find((c) => c.id === editCoachId);

    const updatedData: Partial<ScheduleSession> = {
      title:
        editTitle.trim() ||
        `${editClass} (${matchedNames.slice(0, 2).join(", ")}${
          matchedNames.length > 2 ? ` +${matchedNames.length - 2}` : ""
        })`,
      class: editClass,
      date: editDate,
      timeStart: editTimeStart,
      timeEnd: editTimeEnd,
      poolArea: editPoolArea,
      coachId: editCoachId,
      coachName: editCoachName.trim(),
      coachPhone: selectedCoach?.phone || editingSchedule.coachPhone || "08123456780",
      studentIds: editSelectedStudentIds,
      studentNames: matchedNames,
      notes: editNotes,
      status: editStatus,
    };

    if (onUpdateSchedule) {
      onUpdateSchedule(editingSchedule.id, updatedData);
    }

    setEditingSchedule(null);
  };

  const filteredSchedules = schedules.filter((sch) => {
    // Hanya memunculkan mulai dari hari ini sampai selanjutnya (jadwal yang sudah lewat tidak dimunculkan)
    if (sch.date && sch.date < todayStr) {
      return false;
    }

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
            Klik pada kartu jadwal untuk mengubah tanggal, jam, atau pelatih
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
          {["Semua", "Prestasi", "Private Class", "Kids"].map((cls) => (
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
          SCHEDULE LIST CARDS (CLICKABLE FOR EDIT)
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
              onClick={() => handleOpenEditModal(sch)}
              className="p-5 rounded-3xl bg-white border border-slate-100 hover:border-blue-300 shadow-sm hover:shadow-md transition space-y-3.5 relative overflow-hidden group cursor-pointer active:scale-[0.99]"
              title="Klik untuk mengedit jadwal ini"
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
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
                    <span>{sch.title}</span>
                    <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition text-xs font-bold">
                      ✏️
                    </span>
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
                    onClick={(e) => e.stopPropagation()}
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSchedule(sch.id);
                    }}
                    className="px-2.5 py-1 rounded-xl text-red-500 hover:bg-red-50 text-[11px] font-bold transition cursor-pointer"
                  >
                    🗑️ Hapus
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(sch);
                    }}
                    className="px-2.5 py-1 rounded-xl text-blue-600 hover:bg-blue-50 text-[11px] font-bold transition cursor-pointer"
                  >
                    ✏️ Edit
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
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
          MODAL: EDIT JADWAL (WITH FULL VALIDATOR)
          ========================================== */}
      {editingSchedule && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div
            onClick={() => setEditingSchedule(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  Ubah Jadwal Sesi Renang
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Edit: {editingSchedule.title}
                </h3>
              </div>
              <button
                onClick={() => setEditingSchedule(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditFormSubmit} className="space-y-4">
              {/* Real-time Coach Conflict Warning Banner */}
              {editConflictingSchedule && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-2 font-black text-rose-700">
                    <span className="text-sm">⚠️</span>
                    <span>BENTROK JADWAL PELATIH TERDETEKSI!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-700">
                    Pelatih <strong>{editCoachName}</strong> sudah memiliki jadwal lain pada tanggal{" "}
                    <strong>{formatShortDateIndo(editDate)}</strong>:
                  </p>
                  <p className="text-[11px] font-bold text-rose-900 bg-white/70 p-2 rounded-xl border border-rose-200">
                    {editConflictingSchedule.title} ({editConflictingSchedule.timeStart} - {editConflictingSchedule.timeEnd} WIB di {editConflictingSchedule.poolArea})
                  </p>
                  <p className="text-[10px] text-rose-600">
                    Silakan ganti jam latihan atau pilih pelatih/tanggal lain agar jadwal tidak bertabrakan.
                  </p>
                </div>
              )}

              {/* 1. Program Kelas & Kolam */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full items-start">
                <div className="w-full min-w-0">
                  <div className="flex items-center justify-between mb-1.5 h-6">
                    <label className="block text-xs font-bold text-slate-700">
                      Program Kelas
                    </label>
                    {editClass === "Private Class" ? (
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
                    value={editClass}
                    onChange={(e) => handleEditClassChange(e.target.value)}
                    className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 font-bold outline-none focus:border-cyan-500 focus:bg-white cursor-pointer transition"
                  >
                    <option value="Private Class">Private Class (1-on-1)</option>
                    <option value="Prestasi">Prestasi</option>
                    <option value="Kids Swimming">Kids</option>
                  </select>
                </div>

                <div className="w-full min-w-0">
                  <div className="flex items-center justify-between mb-1.5 h-6">
                    <label className="block text-xs font-bold text-slate-700 truncate">
                      Lokasi Kolam
                    </label>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
                      📍 Area
                    </span>
                  </div>
                  <select
                    value={editPoolArea}
                    onChange={(e) => setEditPoolArea(e.target.value)}
                    className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 font-bold outline-none focus:border-cyan-500 focus:bg-white cursor-pointer transition"
                  >
                    <option value="Nalendra">Nalendra</option>
                    <option value="312 Wera">312 Wera</option>
                  </select>
                </div>
              </div>

              {/* 2. Coach Selection */}
              <div className="w-full">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pelatih / Instruktur
                </label>
                <select
                  value={editCoachId}
                  onChange={(e) => handleEditCoachChange(e.target.value)}
                  className="w-full block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-900 outline-none focus:border-cyan-500 focus:bg-white cursor-pointer mb-1.5 min-h-[46px]"
                >
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.spec})
                    </option>
                  ))}
                  <option value="custom">✏️ Masukkan Pelatih Lainnya / Custom...</option>
                </select>

                {editCoachId === "custom" && (
                  <input
                    type="text"
                    required
                    value={editCoachName}
                    onChange={(e) => setEditCoachName(e.target.value)}
                    placeholder="Ketik nama pelatih"
                    className="w-full block box-border rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none focus:border-cyan-500 focus:bg-white transition mt-1.5 min-h-[46px]"
                  />
                )}
              </div>

              {/* 3. Tanggal Latihan (Single Date Selector with Calendar) */}
              <div className="w-full space-y-2 relative" ref={editCalendarRef}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Tanggal Latihan
                  </label>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                    {formatFullDateIndo(editDate) || "Pilih Tanggal"}
                  </span>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsEditCalendarOpen((prev) => !prev)}
                  className={`w-full block box-border rounded-2xl border transition min-h-[48px] px-3.5 py-2.5 text-left cursor-pointer select-none ${
                    isEditCalendarOpen
                      ? "border-blue-500 bg-white ring-2 ring-blue-100 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">
                      📅 {editDate ? formatFullDateIndo(editDate) : "Pilih Tanggal Latihan"}
                    </span>
                    <span className="text-[11px] font-bold text-blue-600">
                      {isEditCalendarOpen ? "▲ Tutup" : "▼ Ubah Tanggal"}
                    </span>
                  </div>
                </div>

                {/* Edit Calendar Popover */}
                {isEditCalendarOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-2 p-4 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900">
                        {MONTH_NAMES_INDO[editCalMonth]} {editCalYear}
                      </h4>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handlePrevEditCalMonth}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          onClick={handleNextEditCalMonth}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          ›
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {DAY_NAMES_INDO.map((day, idx) => (
                        <span
                          key={day}
                          className={`text-[10px] font-bold ${
                            idx === 0 || idx === 6 ? "text-cyan-600" : "text-slate-400"
                          }`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const firstDayOfMonth = new Date(editCalYear, editCalMonth, 1).getDay();
                        const daysInMonth = new Date(editCalYear, editCalMonth + 1, 0).getDate();
                        const cells = [];

                        for (let i = 0; i < firstDayOfMonth; i++) {
                          cells.push(<div key={`empty-${i}`} className="h-8" />);
                        }

                        for (let day = 1; day <= daysInMonth; day++) {
                          const mStr = String(editCalMonth + 1).padStart(2, "0");
                          const dStr = String(day).padStart(2, "0");
                          const fullDateStr = `${editCalYear}-${mStr}-${dStr}`;

                          const isSelected = editDate === fullDateStr;
                          const isPast = fullDateStr < todayStr;
                          const isToday = fullDateStr === todayStr;

                          cells.push(
                            <button
                              key={fullDateStr}
                              type="button"
                              disabled={isPast}
                              onClick={() => {
                                setEditDate(fullDateStr);
                                setIsEditCalendarOpen(false);
                              }}
                              className={`h-8 rounded-xl text-xs font-bold transition flex items-center justify-center relative cursor-pointer ${
                                isPast
                                  ? "text-slate-300 cursor-not-allowed bg-slate-50/50"
                                  : isSelected
                                  ? "bg-blue-600 text-white font-black shadow-sm"
                                  : isToday
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "hover:bg-slate-100 text-slate-700"
                              }`}
                            >
                              {day}
                            </button>
                          );
                        }

                        return cells;
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Jam Latihan & Preset */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Jam Sesi Latihan (WIB)
                  </label>
                  {timeToMinutes(editTimeStart) >= timeToMinutes(editTimeEnd) && (
                    <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">
                      ⚠️ Jam selesai harus &gt; mulai
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">
                      Jam Mulai
                    </span>
                    <input
                      type="time"
                      required
                      value={editTimeStart}
                      onChange={(e) => setEditTimeStart(e.target.value)}
                      className="w-full h-11 block rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">
                      Jam Selesai
                    </span>
                    <input
                      type="time"
                      required
                      value={editTimeEnd}
                      onChange={(e) => setEditTimeEnd(e.target.value)}
                      className="w-full h-11 block rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 font-bold outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold text-slate-400 mr-1">Preset:</span>
                  {timePresets.map((tp) => (
                    <button
                      key={tp.label}
                      type="button"
                      onClick={() => {
                        setEditTimeStart(tp.start);
                        setEditTimeEnd(tp.end);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[10px] font-bold transition cursor-pointer"
                    >
                      {tp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Student Selection */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Pilih Siswa yang Mengikuti
                  </label>
                  <span className="text-[10px] text-blue-600 font-bold">
                    {editSelectedStudentIds.length} Siswa Terpilih
                  </span>
                </div>

                <input
                  type="text"
                  value={editStudentSearchQuery}
                  onChange={(e) => setEditStudentSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white"
                />

                <div className="max-h-36 overflow-y-auto rounded-2xl border border-slate-200 p-2 space-y-1 bg-slate-50/50">
                  {students
                    .filter((student) => {
                      const q = editStudentSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        student.name.toLowerCase().includes(q) ||
                        student.class.toLowerCase().includes(q)
                      );
                    })
                    .map((student) => {
                      const isChecked = editSelectedStudentIds.includes(student.id);
                      return (
                        <label
                          key={student.id}
                          className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer text-xs ${
                            isChecked
                              ? "bg-blue-50 border border-blue-300 text-blue-950 font-bold shadow-2xs"
                              : "hover:bg-white border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type={editClass === "Private Class" ? "radio" : "checkbox"}
                              name={editClass === "Private Class" ? "editPrivateRadio" : undefined}
                              checked={isChecked}
                              onChange={() => toggleEditStudentSelection(student.id)}
                              className="text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer shrink-0"
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
              </div>

              {/* 6. Notes & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Sesi
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as "Active" | "Completed" | "Cancelled")
                    }
                    className="w-full h-11 block rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 font-bold outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="Active">🟢 Aktif (Active)</option>
                    <option value="Completed">🔵 Selesai (Completed)</option>
                    <option value="Cancelled">🔴 Dibatalkan (Cancelled)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Sesi
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Catatan instruktur..."
                    className="w-full h-11 block rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={
                    Boolean(editConflictingSchedule) ||
                    editSelectedStudentIds.length === 0 ||
                    !editDate ||
                    timeToMinutes(editTimeStart) >= timeToMinutes(editTimeEnd)
                  }
                  className={`flex-1 py-3 rounded-2xl text-white font-bold text-xs shadow-lg transition cursor-pointer ${
                    Boolean(editConflictingSchedule) ||
                    editSelectedStudentIds.length === 0 ||
                    !editDate ||
                    timeToMinutes(editTimeStart) >= timeToMinutes(editTimeEnd)
                      ? "bg-slate-400 cursor-not-allowed opacity-75"
                      : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-blue-500/25 active:scale-95"
                  }`}
                >
                  {editConflictingSchedule
                    ? "⚠️ Jadwal Pelatih Bentrok (Sesuaikan Waktu)"
                    : "Simpan Perubahan Jadwal"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
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
              {conflictingSchedules.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-2 font-black text-rose-700">
                    <span className="text-sm">⚠️</span>
                    <span>BENTROK JADWAL PELATIH ({conflictingSchedules.length} Sesi Terdeteksi)!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-700">
                    Pelatih <strong>{formCoachName}</strong> sudah memiliki jadwal di waktu yang sama:
                  </p>
                  <ul className="text-[11px] space-y-1 pl-2 list-disc list-inside text-rose-800 font-medium">
                    {conflictingSchedules.map((c, i) => (
                      <li key={i}>
                        <strong>Pertemuan {c.index + 1} ({formatShortDateIndo(c.date)})</strong>: {c.session.title} ({c.session.timeStart} - {c.session.timeEnd} WIB di {c.session.poolArea})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 1. Program Kelas & Kolam */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full items-start">
                <div className="w-full min-w-0">
                  <div className="flex items-center justify-between mb-1.5 h-6">
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
                    className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 font-bold outline-none focus:border-cyan-500 focus:bg-white cursor-pointer transition"
                  >
                    <option value="Private Class">Private Class (1-on-1)</option>
                    <option value="Prestasi">Prestasi</option>
                    <option value="Kids Swimming">Kids</option>
                  </select>
                </div>

                <div className="w-full min-w-0">
                  <div className="flex items-center justify-between mb-1.5 h-6">
                    <label className="block text-xs font-bold text-slate-700 truncate">
                      Lokasi Kolam
                    </label>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
                      📍 Area
                    </span>
                  </div>
                  <select
                    value={formPoolArea}
                    onChange={(e) => setFormPoolArea(e.target.value)}
                    className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 font-bold outline-none focus:border-cyan-500 focus:bg-white cursor-pointer transition"
                  >
                    <option value="Nalendra">Nalendra</option>
                    <option value="312 Wera">312 Wera</option>
                  </select>
                </div>
              </div>

              {/* 2. Coach Selection */}
              <div className="w-full">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Pelatih / Instruktur
                </label>
                <select
                  value={formCoachId}
                  onChange={(e) => handleCoachChange(e.target.value)}
                  className="w-full block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-900 outline-none focus:border-cyan-500 focus:bg-white cursor-pointer mb-1.5 min-h-[46px]"
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
                    className="w-full block box-border rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none focus:border-cyan-500 focus:bg-white transition mt-1.5 min-h-[46px]"
                  />
                )}
              </div>

              {/* 3. Interactive Multi-Date Picker Calendar Section */}
              <div className="w-full space-y-2 relative" ref={calendarRef}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Tanggal Latihan
                  </label>
                  <span className="text-[10px] text-cyan-600 font-bold bg-cyan-50 px-2 py-0.5 rounded">
                    {selectedDates.length === 0
                      ? "Pilih 1 s/d 4 Tanggal"
                      : `${selectedDates.length} Tanggal Terpilih (Maks. 4)`}
                  </span>
                </div>

                {/* Clickable Input Trigger Button */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsCalendarOpen((prev) => !prev)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsCalendarOpen((prev) => !prev);
                    }
                  }}
                  className={`w-full block box-border rounded-2xl border transition min-h-[48px] px-3.5 py-2.5 text-left cursor-pointer select-none ${
                    isCalendarOpen
                      ? "border-cyan-500 bg-white ring-2 ring-cyan-100 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100/70"
                  }`}
                >
                  {selectedDates.length === 0 ? (
                    <span className="text-xs text-slate-400">
                      Klik di sini untuk membuka kalender dan memilih tanggal...
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {selectedDates.map((dateStr, idx) => (
                        <span
                          key={dateStr}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[11px] font-bold shadow-2xs"
                        >
                          <span>P-{idx + 1}:</span>
                          <span>{formatShortDateIndo(dateStr)}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveDate(idx);
                            }}
                            className="ml-0.5 hover:bg-white/20 rounded-full h-3.5 w-3.5 flex items-center justify-center text-[10px] cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dropdown Calendar Popover */}
                {isCalendarOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-2 p-4 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handlePrevCalMonth}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          ‹
                        </button>
                        <h4 className="text-xs font-black text-slate-900 px-1">
                          {MONTH_NAMES_INDO[calMonth]} {calYear}
                        </h4>
                        <button
                          type="button"
                          onClick={handleNextCalMonth}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          ›
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAutoAdd4Weekly}
                        className="px-2.5 py-1 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-[10px] font-black border border-cyan-200 transition cursor-pointer"
                      >
                        ⚡ Paket 4 Pekan Rutin
                      </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {DAY_NAMES_INDO.map((day, idx) => (
                        <span
                          key={day}
                          className={`text-[10px] font-bold ${
                            idx === 0 || idx === 6 ? "text-cyan-600" : "text-slate-400"
                          }`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>

                    {/* Month Matrix Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
                        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                        const cells = [];

                        for (let i = 0; i < firstDayOfMonth; i++) {
                          cells.push(<div key={`empty-${i}`} className="h-8" />);
                        }

                        for (let day = 1; day <= daysInMonth; day++) {
                          const mStr = String(calMonth + 1).padStart(2, "0");
                          const dStr = String(day).padStart(2, "0");
                          const fullDateStr = `${calYear}-${mStr}-${dStr}`;

                          const isSelected = selectedDates.includes(fullDateStr);
                          const isPast = fullDateStr < todayStr;
                          const isToday = fullDateStr === todayStr;
                          const selectedIdx = selectedDates.indexOf(fullDateStr);

                          cells.push(
                            <button
                              key={fullDateStr}
                              type="button"
                              disabled={isPast}
                              onClick={() => handleToggleDate(fullDateStr)}
                              className={`h-8 rounded-xl text-xs font-bold transition flex items-center justify-center relative cursor-pointer ${
                                isPast
                                  ? "text-slate-300 cursor-not-allowed bg-slate-50/50"
                                  : isSelected
                                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black shadow-sm"
                                  : isToday
                                  ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                  : "hover:bg-slate-100 text-slate-700"
                              }`}
                            >
                              <span>{day}</span>
                              {isSelected && (
                                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-amber-400 text-slate-900 rounded-full text-[8px] font-black flex items-center justify-center ring-1 ring-white">
                                  {selectedIdx + 1}
                                </span>
                              )}
                            </button>
                          );
                        }

                        return cells;
                      })()}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                      <span>Pilih 1 s/d 4 tanggal latihan</span>
                      <button
                        type="button"
                        onClick={() => setIsCalendarOpen(false)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                      >
                        Selesai
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Jam Latihan & Preset */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Jam Sesi Latihan (WIB)
                  </label>
                  {timeToMinutes(formTimeStart) >= timeToMinutes(formTimeEnd) && (
                    <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">
                      ⚠️ Jam selesai harus &gt; mulai
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">
                      Jam Mulai
                    </span>
                    <input
                      type="time"
                      required
                      value={formTimeStart}
                      onChange={(e) => setFormTimeStart(e.target.value)}
                      className="w-full h-11 block rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 font-bold outline-none focus:border-cyan-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">
                      Jam Selesai
                    </span>
                    <input
                      type="time"
                      required
                      value={formTimeEnd}
                      onChange={(e) => setFormTimeEnd(e.target.value)}
                      className="w-full h-11 block rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 font-bold outline-none focus:border-cyan-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold text-slate-400 mr-1">Preset:</span>
                  {timePresets.map((tp) => (
                    <button
                      key={tp.label}
                      type="button"
                      onClick={() => {
                        setFormTimeStart(tp.start);
                        setFormTimeEnd(tp.end);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 text-[10px] font-bold transition cursor-pointer"
                    >
                      {tp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Student Selection */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Pilih Siswa yang Mengikuti
                  </label>
                  <span className="text-[10px] text-cyan-600 font-bold">
                    {selectedStudentIds.length} Siswa Terpilih
                  </span>
                </div>

                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-cyan-500 focus:bg-white"
                />

                <div className="max-h-36 overflow-y-auto rounded-2xl border border-slate-200 p-2 space-y-1 bg-slate-50/50">
                  {students
                    .filter((student) => {
                      const q = studentSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        student.name.toLowerCase().includes(q) ||
                        student.class.toLowerCase().includes(q)
                      );
                    })
                    .map((student) => {
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
              </div>

              {/* 6. Notes */}
              <div className="w-full">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan Sesi (Opsional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Fokus evaluasi teknik meluncur & gaya dada"
                  className="w-full block box-border rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-cyan-500 focus:bg-white transition min-h-[46px]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={conflictingSchedules.length > 0 || selectedDates.length === 0}
                  className={`flex-1 py-3 rounded-2xl text-white font-bold text-xs shadow-lg transition cursor-pointer ${
                    conflictingSchedules.length > 0 || selectedDates.length === 0
                      ? "bg-slate-400 cursor-not-allowed opacity-75"
                      : "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-cyan-500/25 active:scale-95"
                  }`}
                >
                  {conflictingSchedules.length > 0
                    ? `⚠️ ${conflictingSchedules.length} Jadwal Bentrok (Perbaiki Waktu)`
                    : selectedDates.length === 0
                    ? "Pilih Tanggal Pertemuan Terlebih Dahulu"
                    : selectedDates.length > 1
                    ? `Simpan & Tambahkan ${selectedDates.length} Jadwal Sekaligus`
                    : "Simpan & Tambahkan Jadwal"}
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
