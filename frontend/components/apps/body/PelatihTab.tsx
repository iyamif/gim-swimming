"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, X, Filter, ChevronDown, ChevronRight, MessageCircle, Users, Award, Calendar, CheckCircle } from "lucide-react";
import { Coach, ScheduleSession, Student, AttendanceRecord } from "../types";
import { isImageAvatar, getAvatarImageUrl } from "../../../lib/api";

interface PelatihTabProps {
  coaches: Coach[];
  sessionRole: string;
  schedules?: ScheduleSession[];
  students?: Student[];
  attendances?: AttendanceRecord[];
  setActiveTab?: (tab: string) => void;
}

export default function PelatihTab({
  coaches = [],
  sessionRole,
  schedules = [],
  students = [],
  attendances = [],
  setActiveTab,
}: PelatihTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState<string>("ALL");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [avatarTick, setAvatarTick] = useState(0);

  // Listen to avatar changes across app
  useEffect(() => {
    const handleAvatarUpdate = () => setAvatarTick((t) => t + 1);
    window.addEventListener("avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
  }, []);

  // Helper to get avatar for a coach
  const getCoachAvatar = (coach: Coach) => {
    if (coach.avatar) return coach.avatar;
    if (typeof window !== "undefined") {
      const byName = localStorage.getItem(`gim_avatar_${coach.name}`);
      if (byName) return byName;
      const byLower = localStorage.getItem(`gim_avatar_${coach.name.toLowerCase()}`);
      if (byLower) return byLower;
      const byId = localStorage.getItem(`gim_avatar_${coach.id}`);
      if (byId) return byId;
    }
    return "";
  };

  if (sessionRole !== "admin" && sessionRole !== "pelatih") return null;

  // Filter coaches based on search query & expertise
  const filteredCoaches = useMemo(() => {
    return coaches.filter((coach) => {
      const matchesQuery =
        coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (coach.spec && coach.spec.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (coach.phone && coach.phone.includes(searchQuery)) ||
        (coach.email && coach.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesExpertise =
        selectedExpertise === "ALL" ||
        (coach.spec && coach.spec.toLowerCase().includes(selectedExpertise.toLowerCase())) ||
        (coach.class && coach.class.toLowerCase().includes(selectedExpertise.toLowerCase()));

      return matchesQuery && matchesExpertise;
    });
  }, [coaches, searchQuery, selectedExpertise]);

  // Featured Coach (first coach or top coach in the list)
  const featuredCoach = filteredCoaches[0] || coaches[0];

  // Helper to count active schedules for a coach
  const getCoachSchedules = (coachId: string, coachName: string) => {
    return schedules.filter(
      (s) =>
        (s.coachId && s.coachId === coachId) ||
        (s.coachName && s.coachName.toLowerCase().trim() === coachName.toLowerCase().trim())
    );
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
          {/* Header Title & Subtitle */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Pelatih
            </h2>
            <p className="text-xs text-cyan-100 font-medium mt-1">
              Total {coaches.length} Instruktur Renang Terdaftar • Jadwal Sesi &amp; Keahlian
            </p>
          </div>

          {/* Column labels matching mockup */}
          <div className="grid grid-cols-3 text-xs font-bold text-cyan-100/90 pt-1">
            <span className="text-left">Foto</span>
            <span className="text-center sm:text-left">Specialties</span>
            <span className="text-right">Status</span>
          </div>
        </div>
      </div>

      {/* ==========================================
          2. MAIN CONTENT CONTAINER (FLOATING CARDS)
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4 -mt-10 sm:-mt-12 relative z-20 animate-fadeIn">
        {/* ==========================================
            FEATURED / TOP COACH CARD (MATCHING MOCKUP)
            ========================================== */}
        {featuredCoach && (
          <div
            onClick={() => setSelectedCoach(featuredCoach)}
            className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between gap-3 cursor-pointer hover:border-cyan-300 hover:shadow-2xl transition group active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              {(() => {
                const avatar = getCoachAvatar(featuredCoach);
                const isImg = isImageAvatar(avatar);
                return (
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-500 text-white font-black text-xl flex items-center justify-center border-2 border-white shadow-md shrink-0 overflow-hidden group-hover:scale-105 transition">
                    {isImg && avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getAvatarImageUrl(avatar)}
                        alt={featuredCoach.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : avatar ? (
                      <span className="text-2xl">{avatar}</span>
                    ) : (
                      <span>{featuredCoach.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                );
              })()}

              {/* Info */}
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-blue-600 transition capitalize">
                  {featuredCoach.name.toLowerCase().startsWith("coach") ? featuredCoach.name : `Coach ${featuredCoach.name}`}
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  {featuredCoach.spec || "Lvl 3 FINA"}
                </p>

                {/* Specialty tags matching mockup */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black">
                    Kids
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-100 text-[10px] font-black">
                    Competitive
                  </span>
                </div>
              </div>
            </div>

            {/* Badges on Right */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black">
                Available
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-black shadow-2xs">
                In Class
              </span>
            </div>
          </div>
        )}

        {/* ==========================================
            SEARCH BAR (MATCHING MOCKUP)
            ========================================== */}
        <div className="relative">
          <input
            type="text"
            placeholder="Find coach name or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 pr-10 rounded-2xl bg-white border border-slate-200/80 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
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

        {/* ==========================================
            EXPERTISES HEADER & FILTER
            ========================================== */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">
            Expertises
          </span>

          <button
            onClick={() => setShowFilterDropdown((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${showFilterDropdown || selectedExpertise !== "ALL"
                ? "bg-cyan-50 text-cyan-700 border-cyan-300 ring-2 ring-cyan-400/20"
                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80 shadow-2xs"
              }`}
          >
            <Filter size={13} />
            <span>Filter Spesialisasi</span>
            <ChevronDown size={12} className={`transition-transform duration-200 ${showFilterDropdown ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Specialty Filter Dropdown (When toggled) */}
        {showFilterDropdown && (
          <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-2.5 animate-fadeIn">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pilih Bidang Pelatihan:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {["ALL", "Kids Swimming", "Private Class", "Prestasi", "FINA"].map((exp) => (
                <button
                  key={exp}
                  onClick={() => setSelectedExpertise(exp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${selectedExpertise === exp
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                    }`}
                >
                  {exp === "ALL" ? "Semua Bidang" : exp}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            COACH LIST CARDS (MATCHING MOCKUP)
            ========================================== */}
        <div className="space-y-2.5">
          {filteredCoaches.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white border border-slate-100 text-center space-y-2 shadow-sm">
              <Users size={36} className="text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Pelatih Tidak Ditemukan</h4>
              <p className="text-xs text-slate-400">
                Tidak ada data instruktur/pelatih yang sesuai dengan pencarian &quot;{searchQuery}&quot;.
              </p>
            </div>
          ) : (
            filteredCoaches.map((coach) => {
              return (
                <div
                  key={coach.id}
                  onClick={() => setSelectedCoach(coach)}
                  className="p-3.5 sm:p-4 rounded-3xl bg-white hover:bg-slate-50/90 border border-slate-100 shadow-sm hover:shadow-md hover:border-cyan-200 flex items-center justify-between gap-3 cursor-pointer transition active:scale-98 group"
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3">
                    {(() => {
                      const avatar = getCoachAvatar(coach);
                      const isImg = isImageAvatar(avatar);
                      return (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-500 text-white font-black text-base flex items-center justify-center border-2 border-white shadow-xs shrink-0 overflow-hidden group-hover:scale-105 transition">
                          {isImg && avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getAvatarImageUrl(avatar)}
                              alt={coach.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : avatar ? (
                            <span className="text-xl">{avatar}</span>
                          ) : (
                            <span>{coach.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                      );
                    })()}

                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-blue-600 transition capitalize">
                        {coach.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                        {coach.spec || "Lvl 3 FINA"}
                      </p>

                      {/* Small Status Pill under name (matching mockup) */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="px-2 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black">
                          Available
                        </span>
                        <span className="px-2 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 text-[9px] font-black">
                          In Class
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-cyan-600 transition" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ==========================================
          COACH DETAIL POPUP MODAL
          ========================================== */}
      {selectedCoach && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setSelectedCoach(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                {(() => {
                  const avatar = getCoachAvatar(selectedCoach);
                  const isImg = isImageAvatar(avatar);
                  return (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-lg flex items-center justify-center border-2 border-white shadow-md overflow-hidden shrink-0">
                      {isImg && avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getAvatarImageUrl(avatar)}
                          alt={selectedCoach.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : avatar ? (
                        <span className="text-xl">{avatar}</span>
                      ) : (
                        <span>{selectedCoach.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  );
                })()}
                <div>
                  <h3 className="text-base font-black text-slate-900 capitalize">
                    {selectedCoach.name}
                  </h3>
                  <p className="text-xs text-blue-600 font-bold">
                    {selectedCoach.spec || "Instruktur Renang Bersertifikasi"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCoach(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Coach Details Grid */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Nomor Telepon / WA</span>
                <span className="font-bold text-slate-900">{selectedCoach.phone || "-"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Email Resmi</span>
                <span className="font-bold text-slate-900">{selectedCoach.email || "-"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Program Kelas Utama</span>
                <span className="font-bold text-cyan-600">{selectedCoach.class || "Semua Kelas"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Status Ketersediaan</span>
                <span className="font-bold text-emerald-600">Available (Aktif Melatih)</span>
              </div>
            </div>

            {/* Assigned Sessions */}
            {(() => {
              const assigned = getCoachSchedules(selectedCoach.id, selectedCoach.name);
              return (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Sesi Latihan Ditugaskan ({assigned.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {assigned.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-3 bg-slate-50 rounded-2xl">
                        Belum ada jadwal sesi yang ditugaskan.
                      </p>
                    ) : (
                      assigned.map((sch) => (
                        <div
                          key={sch.id}
                          className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-black text-slate-800">{sch.title}</p>
                            <p className="text-[10px] text-slate-400">
                              {sch.date} • {sch.timeStart} - {sch.timeEnd} WIB
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                            {sch.poolArea}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              {selectedCoach.phone && (
                <a
                  href={`https://wa.me/${selectedCoach.phone.replace(/[^0-9]/g, "")}?text=Halo%20Coach%20${selectedCoach.name},%20konfirmasi%20dari%20Akademi%20GIM%20Swimming`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center justify-center gap-2 border border-emerald-200 cursor-pointer"
                >
                  <MessageCircle size={15} /> Hubungi via WhatsApp
                </a>
              )}

              <button
                onClick={() => setSelectedCoach(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer"
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
