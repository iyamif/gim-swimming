import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Calendar,
  CalendarDays,
  Plus,
  Search,
  MapPin,
  Clock,
  User,
  Trash2,
  Pencil,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Zap,
  Check,
  X,
  Award,
  RotateCcw,
  MessageCircle,
  CheckCircle2,
  Send,
  Info,
} from "lucide-react";
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
  sessionUser?: string;
  sessionRole?: string;
  onAddSchedule: (newSchedule: Omit<ScheduleSession, "id">) => void;
  onUpdateSchedule?: (id: string, updatedSchedule: Partial<ScheduleSession>) => void;
  onDeleteSchedule: (id: string) => void;
  setActiveTab?: (tab: string) => void;
}

export default function JadwalTab({
  schedules,
  students,
  coaches,
  sessionUser = "",
  sessionRole = "admin",
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  setActiveTab,
}: JadwalTabProps) {
  const isCoachRole = sessionRole === "pelatih";
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterClass, setFilterClass] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  // ==========================================
  // RESCHEDULE REQUEST STATE (FOR COACH ROLE)
  // ==========================================
  const [rescheduleSchedule, setRescheduleSchedule] = useState<ScheduleSession | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [isRescheduleCalendarOpen, setIsRescheduleCalendarOpen] = useState(false);
  const [rescheduleCalYear, setRescheduleCalYear] = useState(() => new Date().getFullYear());
  const [rescheduleCalMonth, setRescheduleCalMonth] = useState(() => new Date().getMonth());
  const rescheduleCalendarRef = useRef<HTMLDivElement>(null);

  const [rescheduleTimeStart, setRescheduleTimeStart] = useState("15:00");
  const [rescheduleTimeEnd, setRescheduleTimeEnd] = useState("16:00");
  const [reschedulePoolArea, setReschedulePoolArea] = useState("Nalendra");
  const [rescheduleReason, setRescheduleReason] = useState("Ada keperluan mendesak");
  const [rescheduleCustomReason, setRescheduleCustomReason] = useState("");
  const [rescheduleSuccessModal, setRescheduleSuccessModal] = useState<{
    isOpen: boolean;
    waUrl: string;
    scheduleTitle: string;
    newDateTime: string;
    coachName: string;
  }>({
    isOpen: false,
    waUrl: "",
    scheduleTitle: "",
    newDateTime: "",
    coachName: "",
  });

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
  const [formTimeEnd, setFormTimeEnd] = useState("16:00");
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
  const [editTimeEnd, setEditTimeEnd] = useState("16:00");
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
      if (
        rescheduleCalendarRef.current &&
        !rescheduleCalendarRef.current.contains(event.target as Node)
      ) {
        setIsRescheduleCalendarOpen(false);
      }
    };

    if (isCalendarOpen || isEditCalendarOpen || isRescheduleCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isCalendarOpen, isEditCalendarOpen, isRescheduleCalendarOpen]);

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

  // Calendar month navigation for Reschedule Modal
  const handlePrevRescheduleCalMonth = () => {
    if (rescheduleCalMonth === 0) {
      setRescheduleCalMonth(11);
      setRescheduleCalYear((y) => y - 1);
    } else {
      setRescheduleCalMonth((m) => m - 1);
    }
  };

  const handleNextRescheduleCalMonth = () => {
    if (rescheduleCalMonth === 11) {
      setRescheduleCalMonth(0);
      setRescheduleCalYear((y) => y + 1);
    } else {
      setRescheduleCalMonth((m) => m + 1);
    }
  };

  // Helper to determine max dates allowed per class program
  const getMaxDatesForClass = (cls: string): number => {
    const c = (cls || "").toLowerCase();
    if (c.includes("prestasi")) {
      return 12; // 12x pertemuan per bulan
    }
    return 4; // 4 pertemuan default
  };

  // Toggle or add date in create calendar (up to 12 for Prestasi, 4 for others)
  const handleToggleDate = (dateStr: string) => {
    if (dateStr < todayStr) return; // Disallow past dates

    const maxAllowed = getMaxDatesForClass(formClass);

    if (selectedDates.includes(dateStr)) {
      if (selectedDates.length === 1) {
        setSelectedDates([]);
      } else {
        setSelectedDates((prev) => prev.filter((d) => d !== dateStr));
      }
    } else {
      if (selectedDates.length >= maxAllowed) {
        alert(
          `Maksimal ${maxAllowed} tanggal latihan telah dipilih untuk program ${formClass}! Silakan klik pada tanggal yang aktif untuk membatalkan sebelum memilih tanggal baru.`
        );
        return;
      }
      setSelectedDates((prev) => [...prev, dateStr].sort());
    }
  };

  // Quick Auto-Add 12 Meetings for Prestasi (Senin, Rabu, Jumat)
  const handleAutoAdd12Prestasi = () => {
    const base = selectedDates[0] || todayStr;
    const results: string[] = [];
    const [y, m, d] = base.split("-").map(Number);
    let curr = new Date(y, m - 1, d);

    // Collect next 12 occurrences of Mon (1), Wed (3), Fri (5)
    while (results.length < 12) {
      const dayOfWeek = curr.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        const cy = curr.getFullYear();
        const cm = String(curr.getMonth() + 1).padStart(2, "0");
        const cd = String(curr.getDate()).padStart(2, "0");
        results.push(`${cy}-${cm}-${cd}`);
      }
      curr.setDate(curr.getDate() + 1);
    }
    setSelectedDates(results.sort());
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

  // ==========================================
  // PROGRAM DURATION & TIME HELPERS
  // ==========================================
  const getRequiredDurationMinutes = (cls: string): number => {
    const c = (cls || "").toLowerCase();
    if (c.includes("kid") || c.includes("baby")) {
      return 30; // 30 mins
    }
    if (c.includes("prestasi")) {
      return 150; // 2 hours 30 mins
    }
    if (c.includes("private")) {
      return 60; // 60 mins (1 hour)
    }
    return 60;
  };

  const getRequiredDurationBadge = (cls: string) => {
    const c = (cls || "").toLowerCase();
    if (c.includes("kid") || c.includes("baby")) {
      return {
        text: "30 Menit (Kids / Baby)",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        desc: "Durasi otomatis 30 menit",
      };
    }
    if (c.includes("prestasi")) {
      return {
        text: "2 Jam 30 Menit (15:00 - 17:30 WIB)",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
        desc: "Jadwal resmi Prestasi: 15.00 s/d 17.30 WIB",
      };
    }
    return {
      text: "60 Menit (Private Class)",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      desc: "Durasi otomatis 60 menit (1 Jam)",
    };
  };

  const calculateEndTimeForClass = (startTime: string, cls: string): string => {
    if (!startTime) return "16:00";
    const c = (cls || "").toLowerCase();
    if (c.includes("prestasi") && (!startTime || startTime === "15:00")) {
      return "17:30";
    }
    const duration = getRequiredDurationMinutes(cls);
    const [hStr, mStr] = startTime.split(":");
    const h = parseInt(hStr || "0", 10);
    const m = parseInt(mStr || "0", 10);
    const totalMins = h * 60 + m + duration;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };


  const validateDurationForClass = (cls: string, start: string, end: string): string | null => {
    if (!start || !end) return "Jam mulai dan jam selesai wajib diisi!";
    const sMins = timeToMinutes(start);
    const eMins = timeToMinutes(end);
    const diff = eMins - sMins;

    if (diff <= 0) {
      return "Jam selesai latihan harus lebih besar daripada jam mulai!";
    }

    const c = (cls || "").toLowerCase();
    if (c.includes("kid") || c.includes("baby")) {
      if (diff !== 30) {
        return `Durasi latihan untuk program Kids / Baby harus tepat 30 menit (saat ini ${diff} menit). Contoh: 15:00 - 15:30 WIB.`;
      }
    } else if (c.includes("prestasi")) {
      if (diff !== 150) {
        return `Durasi latihan untuk program Prestasi harus tepat 2 jam 30 menit / 150 menit (saat ini ${diff} menit). Jadwal resmi: 15:00 - 17:30 WIB.`;
      }
    } else if (c.includes("private")) {
      if (diff !== 60) {
        return `Durasi latihan untuk program Private Class harus tepat 60 menit / 1 jam (saat ini ${diff} menit). Contoh: 15:00 - 16:00 WIB.`;
      }
    }
    return null;
  };

  // Helper to determine if a class is 1-on-1 (1 pelatih, 1 murid)
  const isSingleStudentClass = (cls: string): boolean => {
    const c = (cls || "").toLowerCase();
    return c.includes("private") || c.includes("kid") || c.includes("baby");
  };

  // Class Change in Create Modal
  const handleClassChange = (newClass: string) => {
    setFormClass(newClass);
    if (isSingleStudentClass(newClass)) {
      setFormPoolArea("Nalendra");
      setFormTimeEnd(calculateEndTimeForClass(formTimeStart, newClass));
      setSelectedStudentIds((prev) => (prev.length > 1 ? [prev[0]] : prev));
      if (selectedDates.length > 4) {
        setSelectedDates((prev) => prev.slice(0, 4));
      }
    } else if (newClass === "Prestasi") {
      setFormPoolArea("312 Wera");
      setFormTimeStart("15:00");
      setFormTimeEnd("17:30");
      // Auto-generate 12 dates for Senin, Rabu, Jumat starting from base date
      const base = selectedDates[0] || todayStr;
      const results: string[] = [];
      const [y, m, d] = base.split("-").map(Number);
      let curr = new Date(y, m - 1, d);
      while (results.length < 12) {
        const dayOfWeek = curr.getDay();
        if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
          const cy = curr.getFullYear();
          const cm = String(curr.getMonth() + 1).padStart(2, "0");
          const cd = String(curr.getDate()).padStart(2, "0");
          results.push(`${cy}-${cm}-${cd}`);
        }
        curr.setDate(curr.getDate() + 1);
      }
      setSelectedDates(results.sort());
    }
  };

  // Time Start Change in Create Modal
  const handleFormTimeStartChange = (newStart: string) => {
    setFormTimeStart(newStart);
    setFormTimeEnd(calculateEndTimeForClass(newStart, formClass));
  };

  // Class Change in Edit Modal
  const handleEditClassChange = (newClass: string) => {
    setEditClass(newClass);
    if (isSingleStudentClass(newClass)) {
      setEditPoolArea("Nalendra");
      setEditTimeEnd(calculateEndTimeForClass(editTimeStart, newClass));
      setEditSelectedStudentIds((prev) => (prev.length > 1 ? [prev[0]] : prev));
    } else if (newClass === "Prestasi") {
      setEditPoolArea("312 Wera");
      setEditTimeStart("15:00");
      setEditTimeEnd("17:30");
    }
  };

  // Time Start Change in Edit Modal
  const handleEditTimeStartChange = (newStart: string) => {
    setEditTimeStart(newStart);
    setEditTimeEnd(calculateEndTimeForClass(newStart, editClass));
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
    if (isSingleStudentClass(formClass)) {
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
    if (isSingleStudentClass(editClass)) {
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
    const cls = sch.class || "Private Class";
    setEditClass(cls);
    const start = sch.timeStart || (cls === "Prestasi" ? "15:00" : "15:00");
    setEditTimeStart(start);
    setEditTimeEnd(sch.timeEnd || calculateEndTimeForClass(start, cls));
    setEditPoolArea(sch.poolArea || (cls === "Prestasi" ? "312 Wera" : "Nalendra"));

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
      } catch { }
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

    // 2. Validate time duration per class
    const durationErr = validateDurationForClass(formClass, formTimeStart, formTimeEnd);
    if (durationErr) {
      alert(`⚠️ VALIDASI DURASI JADWAL:\n\n${durationErr}`);
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

    // 6. Validate single student for 1-on-1 classes (Private Class and Kids / Baby)
    if (isSingleStudentClass(formClass) && matchedNames.length > 1) {
      const label = formClass === "Kids Swimming" ? "Kids / Baby" : formClass;
      alert(`Program ${label} adalah sesi 1-on-1 (1 pelatih hanya 1 murid). Silakan pilih 1 orang siswa.`);
      return;
    }

    const selectedCoach = coaches.find((c) => c.id === formCoachId);

    // 7. Save sessions individually one-by-one into database
    selectedDates.forEach((d, idx) => {
      const sessionSuffix = selectedDates.length > 1 ? ` (P-${idx + 1})` : "";
      const baseTitle =
        formTitle.trim() ||
        `${formClass} (${matchedNames.slice(0, 2).join(", ")}${matchedNames.length > 2 ? ` +${matchedNames.length - 2}` : ""
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

    // 2. Validate time duration per class
    const durationErr = validateDurationForClass(editClass, editTimeStart, editTimeEnd);
    if (durationErr) {
      alert(`⚠️ VALIDASI DURASI JADWAL:\n\n${durationErr}`);
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

    // 6. Validate single student for 1-on-1 classes (Private Class and Kids / Baby)
    if (isSingleStudentClass(editClass) && matchedNames.length > 1) {
      const label = editClass === "Kids Swimming" ? "Kids / Baby" : editClass;
      alert(`Program ${label} adalah sesi 1-on-1 (1 pelatih hanya 1 murid). Silakan pilih 1 orang siswa.`);
      return;
    }

    const selectedCoach = coaches.find((c) => c.id === editCoachId);

    const updatedData: Partial<ScheduleSession> = {
      title:
        editTitle.trim() ||
        `${editClass} (${matchedNames.slice(0, 2).join(", ")}${matchedNames.length > 2 ? ` +${matchedNames.length - 2}` : ""
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

  // Open Reschedule Request Modal for Coach
  const handleOpenRescheduleModal = (sch: ScheduleSession) => {
    setRescheduleSchedule(sch);
    setRescheduleDate(sch.date || todayStr);
    const cls = sch.class || "Private Class";
    const start = sch.timeStart || "15:00";
    setRescheduleTimeStart(start);
    setRescheduleTimeEnd(sch.timeEnd || calculateEndTimeForClass(start, cls));
    setReschedulePoolArea(sch.poolArea || (cls === "Prestasi" ? "312 Wera" : "Nalendra"));
    setRescheduleReason("Ada keperluan mendesak");
    setRescheduleCustomReason("");

    if (sch.date) {
      try {
        const d = new Date(sch.date + "T00:00:00");
        setRescheduleCalYear(d.getFullYear());
        setRescheduleCalMonth(d.getMonth());
      } catch {}
    }
  };

  // Handle Submit Reschedule Request
  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleSchedule) return;

    if (!rescheduleDate || rescheduleDate < todayStr) {
      alert("Tanggal reschedule yang diajukan tidak boleh tanggal yang sudah lewat!");
      return;
    }

    const durationErr = validateDurationForClass(
      rescheduleSchedule.class,
      rescheduleTimeStart,
      rescheduleTimeEnd
    );
    if (durationErr) {
      alert(`⚠️ VALIDASI DURASI RESCHEDULE:\n\n${durationErr}`);
      return;
    }

    const finalReason =
      rescheduleReason === "Lainnya"
        ? rescheduleCustomReason.trim() || "Keperluan mendesak"
        : rescheduleReason;

    const rescheduleTag = `[REQ RESCHEDULE: Diajukan ke ${formatDateIndo(rescheduleDate)} ${rescheduleTimeStart}-${rescheduleTimeEnd} WIB (${reschedulePoolArea}) | Alasan: ${finalReason}]`;

    // Clean old reschedule tag if already present
    const cleanOldNotes = (rescheduleSchedule.notes || "")
      .replace(/\[REQ RESCHEDULE:[^\]]*\]/g, "")
      .trim();
    const newNotes = cleanOldNotes
      ? `${cleanOldNotes} | ${rescheduleTag}`
      : rescheduleTag;

    if (onUpdateSchedule) {
      onUpdateSchedule(rescheduleSchedule.id, {
        notes: newNotes,
      });
    }

    // Format WhatsApp message to Admin
    const studentsText =
      rescheduleSchedule.studentNames && rescheduleSchedule.studentNames.length > 0
        ? rescheduleSchedule.studentNames.join(", ")
        : "Siswa";

    const waMessage =
      `*Halo Admin GIM Swimming, Pengajuan Reschedule Jadwal*\n\n` +
      `Pelatih: *${rescheduleSchedule.coachName}*\n` +
      `Sesi / Kelas: *${rescheduleSchedule.title}* (${rescheduleSchedule.class})\n` +
      `Siswa Terjadwal: *${studentsText}*\n\n` +
      `• *Jadwal Semula:* ${formatDateIndo(rescheduleSchedule.date)} (${rescheduleSchedule.timeStart} - ${rescheduleSchedule.timeEnd} WIB di ${rescheduleSchedule.poolArea})\n` +
      `• *Jadwal Baru Diajukan:* ${formatDateIndo(rescheduleDate)} (${rescheduleTimeStart} - ${rescheduleTimeEnd} WIB di ${reschedulePoolArea})\n` +
      `• *Alasan Pengajuan:* ${finalReason}\n\n` +
      `Mohon dibantu konfirmasi perubahan jadwal ke siswa & update di sistem. Terima kasih! 🙏`;

    const adminPhone = "6281234567800";
    const waUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(waMessage)}`;

    const savedTitle = rescheduleSchedule.title;
    const savedCoach = rescheduleSchedule.coachName;
    const newDateTimeStr = `${formatShortDateIndo(rescheduleDate)}, ${rescheduleTimeStart} - ${rescheduleTimeEnd} WIB (${reschedulePoolArea})`;

    setRescheduleSchedule(null);
    setRescheduleSuccessModal({
      isOpen: true,
      waUrl,
      scheduleTitle: savedTitle,
      newDateTime: newDateTimeStr,
      coachName: savedCoach,
    });
  };

  // Filter schedules strictly for coach if sessionRole === "pelatih"
  const relevantSchedules = useMemo(() => {
    if (isCoachRole) {
      const coachUser = (sessionUser || "").toLowerCase().trim();
      const coachClean = coachUser.replace(/^coach\s+/i, "").trim();
      const matched = schedules.filter((s) => {
        const sCoach = (s.coachName || "").toLowerCase().trim();
        const sCoachClean = sCoach.replace(/^coach\s+/i, "").trim();
        return (
          (s.coachId && coaches.some((c) => String(c.id) === String(s.coachId) && (c.name.toLowerCase().includes(coachClean) || coachClean.includes(c.name.toLowerCase())))) ||
          (sCoachClean && (sCoachClean === coachClean || sCoachClean.includes(coachClean) || coachClean.includes(sCoachClean))) ||
          (s.coachPhone && s.coachPhone.includes(coachUser))
        );
      });
      return matched;
    }
    return schedules;
  }, [schedules, isCoachRole, sessionUser, coaches]);

  const filteredSchedules = relevantSchedules.filter((sch) => {
    const matchClass = filterClass === "Semua" || sch.class === filterClass;
    const matchSearch =
      (sch.coachName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sch.studentNames || []).some((name) =>
        name.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      (sch.poolArea || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sch.date || "").includes(searchQuery) ||
      (sch.title || "").toLowerCase().includes(searchQuery.toLowerCase());

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
            <Calendar size={20} className="text-blue-600" />
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              {isCoachRole ? "Jadwal Mengajar Saya" : "Manajemen Jadwal Les Renang"}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isCoachRole
              ? "Daftar sesi mengajar Anda. Klik tombol 'Req Reschedule' bila berhalangan atau ingin mengajukan perubahan waktu."
              : "Klik pada kartu jadwal untuk mengubah tanggal, jam, atau pelatih"}
          </p>
        </div>

        {!isCoachRole && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus size={15} />
            <span>Buat Jadwal Baru</span>
          </button>
        )}
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
          <span className="absolute left-3 top-2.5 text-slate-400 flex items-center">
            <Search size={14} />
          </span>
        </div>

        {/* Filter by class */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["Semua", "Prestasi", "Private Class", "Kids"].map((cls) => (
            <button
              key={cls}
              onClick={() => setFilterClass(cls)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0 ${filterClass === cls
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
          SCHEDULE LIST CARDS (CLICKABLE FOR EDIT / RESCHEDULE)
          ========================================== */}
      {filteredSchedules.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <CalendarDays size={40} className="text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">
            {isCoachRole ? "Belum Ada Jadwal Mengajar" : "Belum Ada Jadwal Sesi"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {isCoachRole
              ? "Tidak ditemukan jadwal sesi mengajar untuk Anda saat ini. Hubungi admin jika membutuhkan konfirmasi jadwal."
              : "Tidak ditemukan jadwal renang yang cocok. Klik tombol di bawah untuk membuat jadwal sesi baru."}
          </p>
          {!isCoachRole && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-cyan-50 text-cyan-700 text-xs font-bold hover:bg-cyan-100 transition cursor-pointer flex items-center gap-1.5 mx-auto"
            >
              <Plus size={13} />
              <span>Tambah Jadwal Sekarang</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSchedules.map((sch) => {
            const hasRescheduleReq = (sch.notes || "").includes("[REQ RESCHEDULE:");
            const rescheduleMatch = (sch.notes || "").match(/\[REQ RESCHEDULE:\s*([^\]]+)\]/);
            const rescheduleDetails = rescheduleMatch ? rescheduleMatch[1] : null;

            return (
              <div
                key={sch.id}
                onClick={() => {
                  if (isCoachRole) {
                    handleOpenRescheduleModal(sch);
                  } else {
                    handleOpenEditModal(sch);
                  }
                }}
                className="p-5 rounded-3xl bg-white border border-slate-100 hover:border-blue-300 shadow-sm hover:shadow-md transition space-y-3.5 relative overflow-hidden group cursor-pointer active:scale-[0.99]"
                title={isCoachRole ? "Klik untuk mengajukan request reschedule" : "Klik untuk mengedit jadwal ini"}
              >
                {/* Header card */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-100">
                        {sch.class}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                        <MapPin size={11} className="text-slate-400" />
                        <span>{sch.poolArea}</span>
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
                      <span>{sch.title}</span>
                      {isCoachRole ? (
                        <RotateCcw size={12} className="text-amber-500 opacity-0 group-hover:opacity-100 transition" />
                      ) : (
                        <Pencil size={12} className="text-blue-500 opacity-0 group-hover:opacity-100 transition" />
                      )}
                    </h4>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-blue-600 block flex items-center gap-1 justify-end">
                      <Clock size={12} className="text-blue-600" />
                      <span>{sch.timeStart} - {sch.timeEnd} WIB</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {formatDateIndo(sch.date)}
                    </span>
                  </div>
                </div>

                {/* Reschedule Banner if pending */}
                {hasRescheduleReq && rescheduleDetails && (
                  <div className="p-2.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-black text-amber-800">
                      <RotateCcw size={12} className="text-amber-600 shrink-0" />
                      <span>Permintaan Reschedule Diajukan</span>
                    </div>
                    <p className="text-[10px] text-amber-700 leading-snug">
                      {rescheduleDetails}
                    </p>
                  </div>
                )}

                {/* Coach Row */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-xs">
                      <Award size={16} />
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
                      Hubungi
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
                        <User size={11} className="text-slate-400" />
                        <span>{name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Notes if any */}
                {sch.notes && !hasRescheduleReq && (
                  <div className="p-2.5 bg-cyan-50/40 rounded-xl border border-cyan-100/50 text-[11px] text-slate-600">
                    <span className="font-bold text-cyan-800">Catatan: </span>
                    {sch.notes}
                  </div>
                )}

                {/* Action Buttons Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  {isCoachRole ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRescheduleModal(sch);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                      >
                        <RotateCcw size={12} className="text-amber-600" />
                        <span>Req Reschedule</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSchedule(sch.id);
                        }}
                        className="px-2.5 py-1 rounded-xl text-red-500 hover:bg-red-50 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        <span>Hapus</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(sch);
                        }}
                        className="px-2.5 py-1 rounded-xl text-blue-600 hover:bg-blue-50 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <Pencil size={12} />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (setActiveTab) setActiveTab("absensi");
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <Clock size={12} />
                    <span>Mulai Presensi</span>
                  </button>
                </div>
              </div>
            );
          })}
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
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditFormSubmit} className="space-y-4">
              {/* Real-time Coach Conflict Warning Banner */}
              {editConflictingSchedule && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-2 font-black text-rose-700">
                    <AlertTriangle size={15} className="text-rose-600 shrink-0" />
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
                    {isSingleStudentClass(editClass) ? (
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100">

                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                        Multi Siswa
                      </span>
                    )}
                  </div>
                  <select
                    value={editClass}
                    onChange={(e) => handleEditClassChange(e.target.value)}
                    className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 font-bold outline-none focus:border-cyan-500 focus:bg-white cursor-pointer transition"
                  >
                    <option value="Private Class">Private Class (1-on-1 • 60 Menit)</option>
                    <option value="Kids Swimming">Kids / Baby (1-on-1 • 30 Menit)</option>
                    <option value="Prestasi">Prestasi (12x Pertemuan • Sen, Rab, Jum • 15:00 - 17:30 WIB)</option>
                  </select>
                </div>

                <div className="w-full min-w-0">
                  <div className="flex items-center justify-between mb-1.5 h-6">
                    <label className="block text-xs font-bold text-slate-700 truncate">
                      Lokasi Kolam
                    </label>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-0.5">
                      <MapPin size={9} /> Area
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
                  <option value="custom">Masukkan Pelatih Lainnya / Custom...</option>
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
                  className={`w-full block box-border rounded-2xl border transition min-h-[48px] px-3.5 py-2.5 text-left cursor-pointer select-none ${isEditCalendarOpen
                    ? "border-blue-500 bg-white ring-2 ring-blue-100 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100/70"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Calendar size={14} className="text-blue-600" />
                      <span>{editDate ? formatFullDateIndo(editDate) : "Pilih Tanggal Latihan"}</span>
                    </span>
                    <span className="text-[11px] font-bold text-blue-600 flex items-center gap-0.5">
                      {isEditCalendarOpen ? (
                        <>
                          <ChevronUp size={13} />
                          <span>Tutup</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={13} />
                          <span>Ubah Tanggal</span>
                        </>
                      )}
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
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextEditCalMonth}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {DAY_NAMES_INDO.map((day, idx) => (
                        <span
                          key={day}
                          className={`text-[10px] font-bold ${idx === 0 || idx === 6 ? "text-cyan-600" : "text-slate-400"
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
                              className={`h-8 rounded-xl text-xs font-bold transition flex items-center justify-center relative cursor-pointer ${isPast
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

              {/* 4. Jam Latihan */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Jam Sesi Latihan (WIB)
                  </label>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${getRequiredDurationBadge(editClass).badgeClass
                      }`}
                  >
                    <Clock size={11} />
                    <span>{getRequiredDurationBadge(editClass).text}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="w-full min-w-0">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">
                      Jam Masuk
                    </span>
                    <input
                      type="time"
                      required
                      value={editTimeStart}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker?.();
                        } catch {}
                      }}
                      onChange={(e) => handleEditTimeStartChange(e.target.value)}
                      className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 font-bold outline-none focus:border-blue-500 focus:bg-white min-w-0 cursor-pointer transition shadow-2xs"
                    />
                  </div>
                  <div className="w-full min-w-0">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">
                      Jam Keluar
                    </span>
                    <input
                      type="time"
                      required
                      value={editTimeEnd}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker?.();
                        } catch {}
                      }}
                      onChange={(e) => setEditTimeEnd(e.target.value)}
                      className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 font-bold outline-none focus:border-blue-500 focus:bg-white min-w-0 cursor-pointer transition shadow-2xs"
                    />
                  </div>
                </div>

                {/* Validation message if duration mismatch */}
                {validateDurationForClass(editClass, editTimeStart, editTimeEnd) && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-start gap-1.5 animate-fadeIn">
                    <AlertTriangle size={13} className="shrink-0 text-rose-600 mt-0.5" />
                    <span>{validateDurationForClass(editClass, editTimeStart, editTimeEnd)}</span>
                  </div>
                )}
              </div>

              {/* 5. Student Selection */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Pilih Siswa yang Mengikuti
                  </label>
                  <div className="flex items-center gap-2">
                    {editClass === "Prestasi" && (
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = students.filter((s) => {
                            const q = editStudentSearchQuery.toLowerCase().trim();
                            if (!q) return true;
                            return (
                              s.name.toLowerCase().includes(q) ||
                              s.class.toLowerCase().includes(q)
                            );
                          });
                          const allIds = filtered.map((s) => s.id);
                          const allSelected =
                            allIds.length > 0 &&
                            allIds.every((id) => editSelectedStudentIds.includes(id));
                          if (allSelected) {
                            setEditSelectedStudentIds([]);
                          } else {
                            setEditSelectedStudentIds(allIds);
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-black border border-blue-200 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Check size={12} />
                        <span>
                          {(() => {
                            const filtered = students.filter((s) => {
                              const q = editStudentSearchQuery.toLowerCase().trim();
                              if (!q) return true;
                              return (
                                s.name.toLowerCase().includes(q) ||
                                s.class.toLowerCase().includes(q)
                              );
                            });
                            const allIds = filtered.map((s) => s.id);
                            const allSelected =
                              allIds.length > 0 &&
                              allIds.every((id) => editSelectedStudentIds.includes(id));
                            return allSelected ? "Batal" : "Pilih Semua (Select All)";
                          })()}
                        </span>
                      </button>
                    )}
                    <span className="text-[10px] text-blue-600 font-bold">
                      {editSelectedStudentIds.length} Siswa Terpilih
                    </span>
                  </div>
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
                          className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer text-xs ${isChecked
                            ? "bg-blue-50 border border-blue-300 text-blue-950 font-bold shadow-2xs"
                            : "hover:bg-white border border-transparent"
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type={isSingleStudentClass(editClass) ? "radio" : "checkbox"}
                              name={isSingleStudentClass(editClass) ? "editSingleStudentRadio" : undefined}
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
                    <option value="Active">Aktif </option>
                    <option value="Completed">Selesai </option>
                    <option value="Cancelled">Dibatalkan</option>
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
                  className={`flex-1 py-3 rounded-2xl text-white font-bold text-xs shadow-lg transition cursor-pointer ${Boolean(editConflictingSchedule) ||
                    editSelectedStudentIds.length === 0 ||
                    !editDate ||
                    timeToMinutes(editTimeStart) >= timeToMinutes(editTimeEnd)
                    ? "bg-slate-400 cursor-not-allowed opacity-75"
                    : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-blue-500/25 active:scale-95"
                    }`}
                >
                  {editConflictingSchedule
                    ? "Jadwal Pelatih Bentrok (Sesuaikan Waktu)"
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
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Real-time Coach Conflict Warning Banner */}
              {conflictingSchedules.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-2 font-black text-rose-700">
                    <AlertTriangle size={15} className="text-rose-600 shrink-0" />
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
                    {isSingleStudentClass(formClass) ? (
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100">
                        -
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                        Multi Siswa
                      </span>
                    )}
                  </div>
                  <select
                    value={formClass}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 font-bold outline-none focus:border-cyan-500 focus:bg-white cursor-pointer transition"
                  >
                    <option value="Private Class">Private Class (1-on-1 • 60 Menit)</option>
                    <option value="Kids Swimming">Kids / Baby (1-on-1 • 30 Menit)</option>
                    <option value="Prestasi">Prestasi (12x Pertemuan • Sen, Rab, Jum • 15:00 - 17:30 WIB)</option>
                  </select>
                </div>

                <div className="w-full min-w-0">
                  <div className="flex items-center justify-between mb-1.5 h-6">
                    <label className="block text-xs font-bold text-slate-700 truncate">
                      Lokasi Kolam
                    </label>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-0.5">
                      <MapPin size={9} /> Area
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
                  <option value="custom">Masukkan Pelatih Lainnya / Custom...</option>
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
                      ? formClass === "Prestasi"
                        ? "Pilih 1 s/d 12 Tanggal (Sen, Rab, Jum)"
                        : "Pilih 1 s/d 4 Tanggal"
                      : `${selectedDates.length} Tanggal Terpilih (Maks. ${getMaxDatesForClass(formClass)})`}
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
                  className={`w-full block box-border rounded-2xl border transition min-h-[48px] px-3.5 py-2.5 text-left cursor-pointer select-none ${isCalendarOpen
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
                            <X size={10} />
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
                          <ChevronLeft size={14} />
                        </button>
                        <h4 className="text-xs font-black text-slate-900 px-1">
                          {MONTH_NAMES_INDO[calMonth]} {calYear}
                        </h4>
                        <button
                          type="button"
                          onClick={handleNextCalMonth}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {formClass === "Prestasi" ? (
                        <button
                          type="button"
                          onClick={handleAutoAdd12Prestasi}
                          className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-black border border-blue-200 transition cursor-pointer flex items-center gap-1"
                        >
                          <Zap size={10} />
                          <span>12x (Sen, Rab, Jum)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAutoAdd4Weekly}
                          className="px-2.5 py-1 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-[10px] font-black border border-cyan-200 transition cursor-pointer flex items-center gap-1"
                        >
                          <Zap size={10} />
                          <span>Paket 4 Pekan Rutin</span>
                        </button>
                      )}
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {DAY_NAMES_INDO.map((day, idx) => {
                        const isPrestasiHeader = formClass === "Prestasi" && (idx === 1 || idx === 3 || idx === 5);
                        return (
                          <span
                            key={day}
                            className={`text-[10px] font-bold ${isPrestasiHeader
                              ? "text-blue-700 font-black underline decoration-blue-400"
                              : idx === 0 || idx === 6
                                ? "text-cyan-600"
                                : "text-slate-400"
                              }`}
                          >
                            {day}
                          </span>
                        );
                      })}
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

                          const dateObj = new Date(calYear, calMonth, day);
                          const dayOfWeek = dateObj.getDay();
                          const isPrestasiDay = formClass === "Prestasi" && (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5);

                          cells.push(
                            <button
                              key={fullDateStr}
                              type="button"
                              disabled={isPast}
                              onClick={() => handleToggleDate(fullDateStr)}
                              className={`h-8 rounded-xl text-xs font-bold transition flex items-center justify-center relative cursor-pointer ${isPast
                                ? "text-slate-300 cursor-not-allowed bg-slate-50/50"
                                : isSelected
                                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black shadow-sm"
                                  : isToday
                                    ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                    : isPrestasiDay
                                      ? "bg-blue-50/70 hover:bg-blue-100 text-blue-800 border border-blue-200/80 font-black"
                                      : "hover:bg-slate-100 text-slate-700"
                                }`}
                            >
                              <span>{day}</span>
                              {isSelected && (
                                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-amber-400 text-slate-900 rounded-full text-[8px] font-black flex items-center justify-center ring-1 ring-white">
                                  {selectedIdx + 1}
                                </span>
                              )}
                              {!isSelected && isPrestasiDay && !isPast && (
                                <span className="absolute bottom-0.5 h-1 w-1 bg-blue-500 rounded-full" />
                              )}
                            </button>
                          );
                        }

                        return cells;
                      })()}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                      <span>
                        {formClass === "Prestasi"
                          ? "Pilih 1 s/d 12 tanggal (Senin, Rabu, Jumat)"
                          : "Pilih 1 s/d 4 tanggal latihan"}
                      </span>
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

              {/* 4. Jam Latihan */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Jam Sesi Latihan (WIB)
                  </label>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${getRequiredDurationBadge(formClass).badgeClass
                      }`}
                  >
                    <Clock size={11} />
                    <span>{getRequiredDurationBadge(formClass).text}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="w-full min-w-0">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">
                      Jam Masuk
                    </span>
                    <input
                      type="time"
                      required
                      value={formTimeStart}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker?.();
                        } catch {}
                      }}
                      onChange={(e) => handleFormTimeStartChange(e.target.value)}
                      className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 font-bold outline-none focus:border-cyan-500 focus:bg-white min-w-0 cursor-pointer transition shadow-2xs"
                    />
                  </div>
                  <div className="w-full min-w-0">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">
                      Jam Keluar
                    </span>
                    <input
                      type="time"
                      required
                      value={formTimeEnd}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker?.();
                        } catch {}
                      }}
                      onChange={(e) => setFormTimeEnd(e.target.value)}
                      className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 font-bold outline-none focus:border-cyan-500 focus:bg-white min-w-0 cursor-pointer transition shadow-2xs"
                    />
                  </div>
                </div>

                {/* Validation message if duration mismatch */}
                {validateDurationForClass(formClass, formTimeStart, formTimeEnd) && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-start gap-1.5 animate-fadeIn">
                    <AlertTriangle size={13} className="shrink-0 text-rose-600 mt-0.5" />
                    <span>{validateDurationForClass(formClass, formTimeStart, formTimeEnd)}</span>
                  </div>
                )}
              </div>

              {/* 5. Student Selection */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Pilih Siswa yang Mengikuti
                  </label>
                  <div className="flex items-center gap-2">
                    {formClass === "Prestasi" && (
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = students.filter((s) => {
                            const q = studentSearchQuery.toLowerCase().trim();
                            if (!q) return true;
                            return (
                              s.name.toLowerCase().includes(q) ||
                              s.class.toLowerCase().includes(q)
                            );
                          });
                          const allIds = filtered.map((s) => s.id);
                          const allSelected =
                            allIds.length > 0 &&
                            allIds.every((id) => selectedStudentIds.includes(id));
                          if (allSelected) {
                            setSelectedStudentIds([]);
                          } else {
                            setSelectedStudentIds(allIds);
                          }
                        }}
                        className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-black border border-blue-200 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Check size={11} />
                        <span>
                          {(() => {
                            const filtered = students.filter((s) => {
                              const q = studentSearchQuery.toLowerCase().trim();
                              if (!q) return true;
                              return (
                                s.name.toLowerCase().includes(q) ||
                                s.class.toLowerCase().includes(q)
                              );
                            });
                            const allIds = filtered.map((s) => s.id);
                            const allSelected =
                              allIds.length > 0 &&
                              allIds.every((id) => selectedStudentIds.includes(id));
                            return allSelected ? "Batal Pilih Semua" : "Pilih Semua (Select All)";
                          })()}
                        </span>
                      </button>
                    )}
                    <span className="text-[10px] text-cyan-600 font-bold">
                      {selectedStudentIds.length} Siswa Terpilih
                    </span>
                  </div>
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
                          className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer text-xs ${isChecked
                            ? "bg-cyan-50 border border-cyan-300 text-cyan-950 font-bold shadow-2xs"
                            : "hover:bg-white border border-transparent"
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type={isSingleStudentClass(formClass) ? "radio" : "checkbox"}
                              name={isSingleStudentClass(formClass) ? "singleStudentRadio" : undefined}
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
                  className={`flex-1 py-3 rounded-2xl text-white font-bold text-xs shadow-lg transition cursor-pointer ${conflictingSchedules.length > 0 || selectedDates.length === 0
                    ? "bg-slate-400 cursor-not-allowed opacity-75"
                    : "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-cyan-500/25 active:scale-95"
                    }`}
                >
                  {conflictingSchedules.length > 0 ? (
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{conflictingSchedules.length} Jadwal Bentrok (Perbaiki Waktu)</span>
                    </span>
                  ) : selectedDates.length === 0 ? (
                    "Pilih Tanggal Pertemuan Terlebih Dahulu"
                  ) : selectedDates.length > 1 ? (
                    `Simpan`
                  ) : (
                    "Simpan & Tambahkan Jadwal"
                  )}
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

      {/* ==========================================
          MODAL: REQUEST RESCHEDULE (FOR COACH ROLE)
          ========================================== */}
      {rescheduleSchedule && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div
            onClick={() => setRescheduleSchedule(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                  <RotateCcw size={12} /> Pengajuan Reschedule Jadwal
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {rescheduleSchedule.title}
                </h3>
              </div>
              <button
                onClick={() => setRescheduleSchedule(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Schedule Info Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Informasi Jadwal Semula:
              </p>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px]">Hari & Tanggal:</span>
                  <span className="font-bold">{formatDateIndo(rescheduleSchedule.date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Waktu Sesi:</span>
                  <span className="font-bold text-blue-600">{rescheduleSchedule.timeStart} - {rescheduleSchedule.timeEnd} WIB</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Lokasi Kolam:</span>
                  <span className="font-bold">{rescheduleSchedule.poolArea}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Siswa:</span>
                  <span className="font-bold truncate block">{rescheduleSchedule.studentNames?.join(", ") || "-"}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              {/* 1. Tanggal Baru yang Diajukan (with Calendar) */}
              <div className="w-full space-y-2 relative" ref={rescheduleCalendarRef}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Tanggal Pengganti / Baru (Wajib)
                  </label>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {formatFullDateIndo(rescheduleDate) || "Pilih Tanggal"}
                  </span>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsRescheduleCalendarOpen((prev) => !prev)}
                  className={`w-full block box-border rounded-2xl border transition min-h-[48px] px-3.5 py-2.5 text-left cursor-pointer select-none ${isRescheduleCalendarOpen
                    ? "border-amber-500 bg-white ring-2 ring-amber-100 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100/70"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Calendar size={14} className="text-amber-600" />
                      <span>{rescheduleDate ? formatFullDateIndo(rescheduleDate) : "Pilih Tanggal Baru"}</span>
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 flex items-center gap-0.5">
                      {isRescheduleCalendarOpen ? (
                        <>
                          <ChevronUp size={13} />
                          <span>Tutup</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={13} />
                          <span>Pilih Tanggal</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Reschedule Calendar Popover */}
                {isRescheduleCalendarOpen && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-2 p-4 bg-white rounded-3xl border border-slate-200 shadow-2xl space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900">
                        {MONTH_NAMES_INDO[rescheduleCalMonth]} {rescheduleCalYear}
                      </h4>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handlePrevRescheduleCalMonth}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextRescheduleCalMonth}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {DAY_NAMES_INDO.map((day, idx) => (
                        <span
                          key={day}
                          className={`text-[10px] font-bold ${idx === 0 || idx === 6 ? "text-amber-600" : "text-slate-400"
                            }`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const firstDayOfMonth = new Date(rescheduleCalYear, rescheduleCalMonth, 1).getDay();
                        const daysInMonth = new Date(rescheduleCalYear, rescheduleCalMonth + 1, 0).getDate();
                        const cells = [];

                        for (let i = 0; i < firstDayOfMonth; i++) {
                          cells.push(<div key={`empty-${i}`} className="h-8" />);
                        }

                        for (let day = 1; day <= daysInMonth; day++) {
                          const mStr = String(rescheduleCalMonth + 1).padStart(2, "0");
                          const dStr = String(day).padStart(2, "0");
                          const fullDateStr = `${rescheduleCalYear}-${mStr}-${dStr}`;

                          const isSelected = rescheduleDate === fullDateStr;
                          const isPast = fullDateStr < todayStr;
                          const isToday = fullDateStr === todayStr;

                          cells.push(
                            <button
                              key={fullDateStr}
                              type="button"
                              disabled={isPast}
                              onClick={() => {
                                setRescheduleDate(fullDateStr);
                                setIsRescheduleCalendarOpen(false);
                              }}
                              className={`h-8 rounded-xl text-xs font-bold transition flex items-center justify-center relative cursor-pointer ${isPast
                                ? "text-slate-300 cursor-not-allowed bg-slate-50/50"
                                : isSelected
                                  ? "bg-amber-500 text-white font-black shadow-sm"
                                  : isToday
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
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

              {/* 2. Jam Latihan Diajukan */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Jam Sesi Diajukan (WIB)
                  </label>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${getRequiredDurationBadge(rescheduleSchedule.class).badgeClass
                      }`}
                  >
                    <Clock size={11} />
                    <span>{getRequiredDurationBadge(rescheduleSchedule.class).text}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="w-full min-w-0">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">
                      Jam Masuk
                    </span>
                    <input
                      type="time"
                      required
                      value={rescheduleTimeStart}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker?.();
                        } catch {}
                      }}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setRescheduleTimeStart(newStart);
                        setRescheduleTimeEnd(calculateEndTimeForClass(newStart, rescheduleSchedule.class));
                      }}
                      className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 font-bold outline-none focus:border-amber-500 focus:bg-white min-w-0 cursor-pointer transition shadow-2xs"
                    />
                  </div>
                  <div className="w-full min-w-0">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">
                      Jam Keluar
                    </span>
                    <input
                      type="time"
                      required
                      value={rescheduleTimeEnd}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker?.();
                        } catch {}
                      }}
                      onChange={(e) => setRescheduleTimeEnd(e.target.value)}
                      className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 font-bold outline-none focus:border-amber-500 focus:bg-white min-w-0 cursor-pointer transition shadow-2xs"
                    />
                  </div>
                </div>

                {/* Validation message if duration mismatch */}
                {validateDurationForClass(rescheduleSchedule.class, rescheduleTimeStart, rescheduleTimeEnd) && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-start gap-1.5 animate-fadeIn">
                    <AlertTriangle size={13} className="shrink-0 text-rose-600 mt-0.5" />
                    <span>{validateDurationForClass(rescheduleSchedule.class, rescheduleTimeStart, rescheduleTimeEnd)}</span>
                  </div>
                )}
              </div>

              {/* 3. Lokasi Kolam */}
              <div className="w-full">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lokasi Kolam Diajukan
                </label>
                <select
                  value={reschedulePoolArea}
                  onChange={(e) => setReschedulePoolArea(e.target.value)}
                  className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 font-bold outline-none focus:border-amber-500 focus:bg-white cursor-pointer transition"
                >
                  <option value="Nalendra">Nalendra</option>
                  <option value="312 Wera">312 Wera</option>
                </select>
              </div>

              {/* 4. Alasan Pengajuan */}
              <div className="w-full space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Alasan Permintaan Reschedule
                </label>
                <select
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full h-12 block box-border rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 font-bold outline-none focus:border-amber-500 focus:bg-white cursor-pointer transition"
                >
                  <option value="Ada keperluan mendesak">Ada keperluan mendesak / acara keluarga</option>
                  <option value="Siswa berhalangan hadir">Siswa berhalangan hadir / izin sakit</option>
                  <option value="Kondisi kesehatan pelatih kurang fit">Kondisi kesehatan pelatih kurang fit / sakit</option>
                  <option value="Cuaca ekstrem / hujan lebat & petir">Cuaca ekstrem / hujan lebat & petir</option>
                  <option value="Kolam renang sedang maintenance">Kolam renang sedang pembersihan / maintenance</option>
                  <option value="Lainnya">Alasan Lainnya (Ketik sendiri)</option>
                </select>

                {rescheduleReason === "Lainnya" && (
                  <textarea
                    required
                    rows={2}
                    value={rescheduleCustomReason}
                    onChange={(e) => setRescheduleCustomReason(e.target.value)}
                    placeholder="Tuliskan alasan pengajuan reschedule secara rinci..."
                    className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={
                    !rescheduleDate ||
                    timeToMinutes(rescheduleTimeStart) >= timeToMinutes(rescheduleTimeEnd)
                  }
                  className={`flex-1 py-3 rounded-2xl text-white font-bold text-xs shadow-lg transition cursor-pointer ${!rescheduleDate || timeToMinutes(rescheduleTimeStart) >= timeToMinutes(rescheduleTimeEnd)
                    ? "bg-slate-400 cursor-not-allowed opacity-75"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25 active:scale-95"
                    }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Send size={14} />
                    <span>Ajukan Request Reschedule</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduleSchedule(null)}
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
          MODAL: RESCHEDULE SUCCESS & WA NOTIFICATION
          ========================================== */}
      {rescheduleSuccessModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setRescheduleSuccessModal((prev) => ({ ...prev, isOpen: false }))}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mx-auto ring-8 ring-emerald-50/50">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Pengajuan Reschedule Terkirim!
              </h3>
              <p className="text-xs text-slate-500">
                Data perubahan jadwal telah dicatat pada sistem dan menunggu persetujuan admin.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-left text-xs space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Sesi:</p>
              <p className="font-black text-slate-800">{rescheduleSuccessModal.scheduleTitle}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Jadwal Baru Diajukan:</p>
              <p className="font-bold text-emerald-700">{rescheduleSuccessModal.newDateTime}</p>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={rescheduleSuccessModal.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setRescheduleSuccessModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle size={16} />
                <span>Kirim Notifikasi ke Admin via WA</span>
              </a>

              <button
                type="button"
                onClick={() => setRescheduleSuccessModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
