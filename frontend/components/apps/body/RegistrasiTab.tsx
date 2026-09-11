import React, { useState, useEffect } from "react";
import {
  Lock,
  AlertCircle,
  Award,
  GraduationCap,
  ClipboardList,
  Users,
  Check,
} from "lucide-react";
import { Coach } from "../types";

interface RegistrasiTabProps {
  coaches?: Coach[];
  onAddStudent: (data: {
    name: string;
    age: string;
    parent: string;
    phone: string;
    class: string;
    coach_id?: string;
    coach_name?: string;
    email?: string;
    address?: string;
    gender?: string;
    notes?: string;
  }) => Promise<boolean | void> | boolean | void;
  onAddCoach: (data: {
    name: string;
    spec: string;
    phone: string;
    email: string;
    class: string;
    age?: string;
    address?: string;
    gender?: string;
    experience?: string;
    pay_per_session?: number;
  }) => Promise<boolean | void> | boolean | void;
  sessionRole?: string;
  setActiveTab?: (tab: string) => void;
}

export default function RegistrasiTab({
  coaches = [],
  onAddStudent,
  onAddCoach,
  sessionRole = "admin",
  setActiveTab,
}: RegistrasiTabProps) {
  // Role selector: "pelatih" | "siswa"
  const [selectedRole, setSelectedRole] = useState<"pelatih" | "siswa">("pelatih");

  // Common Basic Information
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"Laki-laki" | "Perempuan">("Laki-laki");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Pelatih (Coach) Specific Fields
  const [coachAge, setCoachAge] = useState("");
  const [coachSpec, setCoachSpec] = useState("");
  const [coachClass, setCoachClass] = useState("Prestasi");
  const [coachExperience, setCoachExperience] = useState("");
  const [coachPayPerSession, setCoachPayPerSession] = useState("100000");

  // Siswa (Student) Specific Fields
  const [studentParent, setStudentParent] = useState("");
  const [studentAge, setStudentAge] = useState("");
  const [studentClass, setStudentClass] = useState("Prestasi");
  const [studentCoachName, setStudentCoachName] = useState("");
  const [studentCoachId, setStudentCoachId] = useState("");
  const [studentNotes, setStudentNotes] = useState("");

  // Set default coach when coaches list loads
  useEffect(() => {
    if (coaches && coaches.length > 0 && !studentCoachName) {
      setStudentCoachName(coaches[0].name);
      setStudentCoachId(String(coaches[0].id));
    }
  }, [coaches, studentCoachName]);

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState<{
    show: boolean;
    role: "pelatih" | "siswa";
    name: string;
  }>({
    show: false,
    role: "pelatih",
    name: "",
  });

  const isCoachRole = sessionRole?.toLowerCase() === "pelatih";

  // Access restriction for non-admin
  if (isCoachRole) {
    return (
      <div className="space-y-4 pb-36 sm:pb-32 md:pb-16 bg-[#f8fafc] min-h-full">
        <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-12 sm:pb-14 px-5 sm:px-8 shadow-xl shadow-blue-700/15 overflow-hidden rounded-none">
          <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Registrasi
            </h2>
            <p className="text-xs text-cyan-100 font-medium mt-1">
              Pendaftaran Anggota &amp; Pelatih Baru
            </p>
          </div>
        </div>
        <div className="max-w-xl mx-auto px-4 -mt-8 relative z-20">
          <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-xl space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              !
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">Akses Terbatas</h3>
              <p className="text-xs text-slate-500">
                Menu registrasi anggota baru hanya dapat diakses oleh Administrator Akademi.
              </p>
            </div>
            {setActiveTab && (
              <button
                onClick={() => setActiveTab("dashboard")}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition"
              >
                Kembali ke Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setName("");
    setGender("Laki-laki");
    setEmail("");
    setPhone("");
    setAddress("");
    setCoachAge("");
    setCoachSpec("");
    setCoachClass("Prestasi");
    setCoachExperience("");
    setCoachPayPerSession("100000");
    setStudentParent("");
    setStudentAge("");
    setStudentClass("Prestasi");
    setStudentCoachName(coaches?.[0]?.name || "");
    setStudentCoachId(coaches?.[0]?.id ? String(coaches[0].id) : "");
    setStudentNotes("");
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Nama lengkap wajib diisi.");
      return;
    }
    if (!phone.trim()) {
      setErrorMessage("Nomor WhatsApp wajib diisi.");
      return;
    }

    if (selectedRole === "pelatih") {
      if (!email.trim()) {
        setErrorMessage("Email pelatih wajib diisi.");
        return;
      }
      setIsSubmitting(true);
      try {
        await onAddCoach({
          name: name.trim(),
          spec: coachSpec.trim() || "Instruktur Renang Umum",
          phone: phone.trim(),
          email: email.trim(),
          class: coachClass,
          age: coachAge.trim(),
          address: address.trim(),
          gender,
          experience: coachExperience.trim(),
          pay_per_session: Number(coachPayPerSession) || 100000,
        });

        const registeredName = name.trim();
        resetForm();
        setShowSuccessModal({
          show: true,
          role: "pelatih",
          name: registeredName,
        });
      } catch (err: any) {
        setErrorMessage(err?.message || "Gagal mendaftarkan pelatih baru.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!studentParent.trim()) {
        setErrorMessage("Nama Orang Tua / Wali wajib diisi.");
        return;
      }
      setIsSubmitting(true);
      try {
        const selectedCoachObj = coaches.find((c) => c.name === studentCoachName);
        const resolvedCoachId = studentCoachId || (selectedCoachObj ? String(selectedCoachObj.id) : "");
        const resolvedCoachName = studentCoachName || (selectedCoachObj ? selectedCoachObj.name : "");

        await onAddStudent({
          name: name.trim(),
          age: studentAge.trim() || "8",
          parent: studentParent.trim(),
          phone: phone.trim(),
          class: studentClass,
          coach_id: resolvedCoachId,
          coach_name: resolvedCoachName,
          email: email.trim(),
          address: address.trim(),
          gender,
          notes: studentNotes.trim(),
        });

        const registeredName = name.trim();
        resetForm();
        setShowSuccessModal({
          show: true,
          role: "siswa",
          name: registeredName,
        });
      } catch (err: any) {
        setErrorMessage(err?.message || "Gagal mendaftarkan siswa baru.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-4 pb-36 sm:pb-32 md:pb-16 bg-[#f8fafc] min-h-full">
      {/* ==========================================
          1. TOP VIBRANT BLUE HEADER (MATCHING DASHBOARD)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-12 sm:pb-14 px-5 sm:px-8 shadow-xl shadow-blue-700/15 rounded-none">
        {/* Subtle Decorative Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15" />
          <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20" />
          <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25" />
          <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl" />
          <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl" />
        </div>

        <div className="max-w-2xl mx-auto flex items-center justify-between relative z-30">
          <div>
            <p className="text-xs font-medium text-cyan-100 leading-tight">
              ADMINISTRATOR • GIM SWIMMING
            </p>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-snug">
              Registrasi Anggota Baru
            </h2>
          </div>
        </div>
      </div>

      {/* ==========================================
          2. FLOATING CLEAN WHITE CARD FORM
          ========================================== */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4 relative z-10 -mt-8">

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <AlertCircle size={14} className="shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Clean White Card */}
        <div className="rounded-3xl bg-white p-5 sm:p-7 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-5">
          {/* Simple Clean Role Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Pilih Role Pendaftaran
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("pelatih");
                  setErrorMessage("");
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  selectedRole === "pelatih"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Award size={15} />
                <span>Pelatih</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole("siswa");
                  setErrorMessage("");
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  selectedRole === "siswa"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <GraduationCap size={15} />
                <span>Siswa</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Section 1: Informasi Dasar */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <span className="text-blue-600">●</span> Informasi Dasar
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      selectedRole === "pelatih"
                        ? "Nama pelatih / instruktur"
                        : "Nama lengkap siswa"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white"
                  />
                </div>

                {/* Jenis Kelamin */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Jenis Kelamin <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "Laki-laki" | "Perempuan")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white cursor-pointer"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                {/* No. WhatsApp */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    No. WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123xxxx"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Email {selectedRole === "pelatih" ? <span className="text-rose-500">*</span> : "(Opsional)"}
                  </label>
                  <input
                    type="email"
                    required={selectedRole === "pelatih"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      selectedRole === "pelatih"
                        ? "coach@gimswimming.com"
                        : "email@contoh.com"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white"
                  />
                </div>

                {/* Alamat Domisili */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Alamat Domisili
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Kota / Alamat tempat tinggal"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Informasi Khusus */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <span className="text-blue-600">●</span>{" "}
                {selectedRole === "pelatih" ? "Detail Pelatih" : "Detail Siswa & Wali"}
              </h4>

              {selectedRole === "pelatih" ? (
                /* Detail Pelatih */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Usia Pelatih (Tahun)
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="80"
                      value={coachAge}
                      onChange={(e) => setCoachAge(e.target.value)}
                      placeholder="Contoh: 28"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Keahlian / Spesialisasi
                    </label>
                    <input
                      type="text"
                      value={coachSpec}
                      onChange={(e) => setCoachSpec(e.target.value)}
                      placeholder="Contoh: Gaya Bebas & Gaya Dada"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Alokasi Kelas Utama
                    </label>
                    <select
                      value={coachClass}
                      onChange={(e) => setCoachClass(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white cursor-pointer"
                    >
                      <option value="Prestasi">Prestasi</option>
                      <option value="Kids Swimming">Kids Swimming Class</option>
                      <option value="Private Class">Private Class (1-on-1)</option>
                      <option value="Adult Beginner">Adult Beginner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Pengalaman / Lisensi (Opsional)
                    </label>
                    <input
                      type="text"
                      value={coachExperience}
                      onChange={(e) => setCoachExperience(e.target.value)}
                      placeholder="Contoh: Lisensi Pelatih C"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Nominal Pay Per Sesi (Rp) <span className="text-blue-600 font-normal">(Acuan Salary)</span>
                    </label>
                    <input
                      type="number"
                      step="5000"
                      min="0"
                      value={coachPayPerSession}
                      onChange={(e) => setCoachPayPerSession(e.target.value)}
                      placeholder="Contoh: 100000"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 font-bold placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>
              ) : (
                /* Detail Siswa */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Nama Orang Tua / Wali <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={studentParent}
                      onChange={(e) => setStudentParent(e.target.value)}
                      placeholder="Nama ayah / ibu / wali"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Usia Siswa (Tahun)
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="60"
                      value={studentAge}
                      onChange={(e) => setStudentAge(e.target.value)}
                      placeholder="Contoh: 8"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Pilihan Kelas Renang
                    </label>
                    <select
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white cursor-pointer"
                    >
                      <option value="Prestasi">Prestasi</option>
                      <option value="Kids Swimming">Kids Swimming Class</option>
                      <option value="Private Class">Private Class (1-on-1)</option>
                      <option value="Adult Beginner">Adult Beginner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Pelatih Penanggung Jawab
                    </label>
                    <select
                      value={studentCoachName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudentCoachName(val);
                        const c = (coaches || []).find((coach) => coach.name === val);
                        setStudentCoachId(c ? String(c.id) : "");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white cursor-pointer"
                    >
                      {coaches && coaches.length > 0 ? (
                        coaches.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} {c.spec ? `(${c.spec})` : ""}
                          </option>
                        ))
                      ) : (
                        <option value="">Belum ada pelatih terdaftar</option>
                      )}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Catatan / Target (Opsional)
                    </label>
                    <input
                      type="text"
                      value={studentNotes}
                      onChange={(e) => setStudentNotes(e.target.value)}
                      placeholder="Contoh: Persiapan lomba O2SN"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="pt-3 flex items-center gap-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-sm active:scale-98 ${
                  isSubmitting ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting
                  ? "Menyimpan..."
                  : selectedRole === "pelatih"
                  ? "Daftarkan Pelatih"
                  : "Daftarkan Siswa"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ==========================================
          3. CENTERED MODAL: ANIMATED CHECKMARK & SUCCESS MESSAGE
          ========================================== */}
      {showSuccessModal.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop Blur */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowSuccessModal({ show: false, role: "pelatih", name: "" })}
          />

          {/* Centered Modal Card */}
          <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 text-center space-y-4 my-auto">
            {/* Animated Checkmark Circle Icon */}
            <div className="relative flex items-center justify-center mx-auto my-1">
              {/* Pulsing Aura */}
              <div className="absolute h-20 w-20 rounded-full bg-emerald-100 animate-ping opacity-75 pointer-events-none" />
              {/* Outer Soft Ring */}
              <div className="absolute h-24 w-24 rounded-full bg-emerald-50 border border-emerald-100 pointer-events-none" />

              {/* Main Green Check Badge */}
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/30">
                <Check size={36} className="text-white" strokeWidth={3.5} />
              </div>
            </div>

            {/* Dynamic Success Text */}
            <div className="space-y-1.5 pt-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {showSuccessModal.role === "siswa"
                  ? "Data Siswa Berhasil Didaftarkan"
                  : "Pelatih Berhasil Didaftarkan"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700 capitalize">
                  {showSuccessModal.role === "siswa" ? "Siswa" : "Pelatih"}
                </span>{" "}
                atas nama <strong className="text-slate-900">"{showSuccessModal.name}"</strong> telah
                berhasil ditambahkan ke sistem.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 space-y-2">
              {showSuccessModal.role === "siswa" ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal({ show: false, role: "siswa", name: "" });
                    if (setActiveTab) setActiveTab("daftar_hadir");
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <ClipboardList size={15} />
                  <span>Buka Daftar Siswa</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal({ show: false, role: "pelatih", name: "" });
                    if (setActiveTab) setActiveTab("pelatih");
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Users size={15} />
                  <span>Buka Daftar Pelatih</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSuccessModal({ show: false, role: "pelatih", name: "" })}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
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


