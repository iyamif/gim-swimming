"use client";

import React, { useState, useEffect } from "react";
import { PoolVenue, ClassProgram } from "../types";
import {
  MapPin,
  Layers,
  Plus,
  Edit2,
  Trash2,
  X,
  Sliders,
  ExternalLink,
  DollarSign,
  Calendar,
  Compass,
  CheckCircle2,
  Search,
} from "lucide-react";
import {
  fetchPools,
  createPool,
  updatePool,
  deletePool,
  fetchClassPrograms,
  createClassProgram,
  updateClassProgram,
  deleteClassProgram,
} from "../../../lib/api";

interface GeneralTabProps {
  sessionUser?: string;
  sessionRole?: string;
  onRefresh?: () => Promise<void>;
}

const formatRupiah = (val: number | string): string => {
  if (val === "" || val === null || val === undefined) return "";
  const clean = String(val).replace(/\D/g, "");
  if (!clean) return "";
  const num = parseInt(clean, 10);
  return `Rp ${num.toLocaleString("id-ID")}`;
};

export default function GeneralTab({
  sessionUser = "",
  sessionRole = "admin",
  onRefresh,
}: GeneralTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"pools" | "programs">("pools");
  const [searchQuery, setSearchQuery] = useState("");

  // State: Pools
  const [pools, setPools] = useState<PoolVenue[]>([]);
  const [loadingPools, setLoadingPools] = useState(false);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [editingPool, setEditingPool] = useState<PoolVenue | null>(null);
  const [poolName, setPoolName] = useState("");
  const [poolAddress, setPoolAddress] = useState("");
  const [poolLat, setPoolLat] = useState<number>(-6.56563);
  const [poolLng, setPoolLng] = useState<number>(107.76104);
  const [poolRadius, setPoolRadius] = useState<number>(200);
  const [savingPool, setSavingPool] = useState(false);
  const [deletingPoolId, setDeletingPoolId] = useState<string | null>(null);

  // State: Class Programs
  const [programs, setPrograms] = useState<ClassProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ClassProgram | null>(null);
  const [progName, setProgName] = useState("");
  const [progDesc, setProgDesc] = useState("");
  const [progFee, setProgFee] = useState<number>(350000);
  const [progFeeDisplay, setProgFeeDisplay] = useState<string>("Rp 350.000");
  const [progSessions, setProgSessions] = useState<number>(2);
  const [savingProgram, setSavingProgram] = useState(false);
  const [deletingProgramId, setDeletingProgramId] = useState<string | null>(null);

  // Load Pools & Programs
  const loadData = async () => {
    try {
      setLoadingPools(true);
      setLoadingPrograms(true);
      const [poolData, progData] = await Promise.all([
        fetchPools(),
        fetchClassPrograms(),
      ]);
      setPools(poolData);
      setPrograms(progData);
    } catch (err) {
      console.error("Error loading master general data:", err);
    } finally {
      setLoadingPools(false);
      setLoadingPrograms(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Pool Modal (Create or Edit)
  const handleOpenPoolModal = (pool?: PoolVenue) => {
    if (pool) {
      setEditingPool(pool);
      setPoolName(pool.name);
      setPoolAddress(pool.address || "");
      setPoolLat(pool.latitude);
      setPoolLng(pool.longitude);
      setPoolRadius(pool.radius_meters || 200);
    } else {
      setEditingPool(null);
      setPoolName("");
      setPoolAddress("");
      setPoolLat(-6.56563);
      setPoolLng(107.76104);
      setPoolRadius(200);
    }
    setShowPoolModal(true);
  };

  // Submit Pool Form
  const handleSubmitPool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPool(true);
      if (editingPool) {
        await updatePool(editingPool.id, {
          name: poolName,
          address: poolAddress,
          latitude: poolLat,
          longitude: poolLng,
          radius_meters: poolRadius,
        });
      } else {
        await createPool({
          name: poolName,
          address: poolAddress,
          latitude: poolLat,
          longitude: poolLng,
          radius_meters: poolRadius,
        });
      }
      setShowPoolModal(false);
      await loadData();
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error("Error saving pool:", err);
    } finally {
      setSavingPool(false);
    }
  };

  // Delete Pool
  const handleDeletePool = async (id: string, name: string) => {
    try {
      setDeletingPoolId(id);
      await deletePool(id);
      await loadData();
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Error deleting pool:", err);
    } finally {
      setDeletingPoolId(null);
    }
  };

  // Open Program Modal (Create or Edit)
  const handleOpenProgramModal = (prog?: ClassProgram) => {
    if (prog) {
      setEditingProgram(prog);
      setProgName(prog.name);
      setProgDesc(prog.description || "");
      const fee = prog.monthly_fee || 0;
      setProgFee(fee);
      setProgFeeDisplay(fee > 0 ? formatRupiah(fee) : "");
      setProgSessions(prog.sessions_per_week || 2);
    } else {
      setEditingProgram(null);
      setProgName("");
      setProgDesc("");
      setProgFee(350000);
      setProgFeeDisplay("Rp 350.000");
      setProgSessions(2);
    }
    setShowProgramModal(true);
  };

  // Handle live fee currency typing
  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, "");
    if (!digitsOnly) {
      setProgFee(0);
      setProgFeeDisplay("");
      return;
    }
    const num = parseInt(digitsOnly, 10);
    setProgFee(num);
    setProgFeeDisplay(formatRupiah(num));
  };

  // Submit Program Form
  const handleSubmitProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progName.trim()) {
      return;
    }
    try {
      setSavingProgram(true);
      if (editingProgram) {
        await updateClassProgram(editingProgram.id, {
          name: progName.trim(),
          description: progDesc.trim(),
          monthly_fee: Number(progFee) || 0,
          sessions_per_week: Number(progSessions) || 1,
        });
      } else {
        await createClassProgram({
          name: progName.trim(),
          description: progDesc.trim(),
          monthly_fee: Number(progFee) || 0,
          sessions_per_week: Number(progSessions) || 1,
        });
      }
      setShowProgramModal(false);
      await loadData();
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error("Error saving class program:", err);
    } finally {
      setSavingProgram(false);
    }
  };

  // Delete Program
  const handleDeleteProgram = async (id: string, name: string) => {
    try {
      setDeletingProgramId(id);
      await deleteClassProgram(id);
      await loadData();
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Error deleting class program:", err);
    } finally {
      setDeletingProgramId(null);
    }
  };

  // Filtered lists
  const filteredPools = pools.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.address || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPrograms = programs.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-28 bg-[#f8fafc] min-h-full font-sans">
      {/* ==========================================
          1. TOP VIBRANT BLUE HEADER (MATCHING KEUANGAN)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-12 sm:pb-14 px-5 sm:px-8 shadow-xl shadow-blue-700/15 overflow-hidden rounded-none">
        {/* Subtle Concentric Decorative Rings */}
        <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20 pointer-events-none" />
        <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25 pointer-events-none" />

        {/* Ambient Depth Glow */}
        <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-cyan-200 text-xs font-bold uppercase tracking-wider mb-1">
              <Sliders size={14} />
              <span>Pengaturan Akademi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Master Data
            </h2>
            <p className="text-xs text-cyan-100 font-medium mt-1">
              Kelola Lokasi Kolam Renang, Koordinat GPS, dan Program Kelas
            </p>
          </div>

          {/* Top Quick Action Button */}
          <button
            onClick={() =>
              activeSubTab === "pools"
                ? handleOpenPoolModal()
                : handleOpenProgramModal()
            }
            className="flex items-center justify-center gap-2 bg-white hover:bg-cyan-50 text-blue-700 font-black text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-black/10 transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>
              {activeSubTab === "pools" ? "Tambah Kolam" : "Tambah Program"}
            </span>
          </button>
        </div>
      </div>

      {/* ==========================================
          2. FLOATING CONTENT CONTAINER
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-5 -mt-6 relative z-10">
        {/* Navigation Tabs Capsule */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-200/40 flex items-center gap-1.5">
          <button
            onClick={() => {
              setActiveSubTab("pools");
              setSearchQuery("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${activeSubTab === "pools"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
          >
            <MapPin size={16} />
            <span>Lokasi Kolam ({pools.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab("programs");
              setSearchQuery("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${activeSubTab === "programs"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
          >
            <Layers size={16} />
            <span>Program Kelas ({programs.length})</span>
          </button>
        </div>

        {/* Quick Search Bar */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder={
              activeSubTab === "pools"
                ? "Cari nama kolam renang atau alamat..."
                : "Cari nama program kelas..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs sm:text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ========================================================= */}
        {/* SUBTAB 1: LOKASI KOLAM RENANG */}
        {/* ========================================================= */}
        {activeSubTab === "pools" && (
          <div className="space-y-3.5">
            {filteredPools.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center font-bold">
                  <MapPin size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-800">
                    Tidak Ada Lokasi Kolam
                  </p>
                  <p className="text-xs text-slate-400">
                    {searchQuery
                      ? "Tidak ada lokasi kolam yang cocok dengan pencarian."
                      : "Belum ada master data kolam renang yang tersimpan."}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenPoolModal()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  <Plus size={14} />
                  <span>Tambah Kolam Pertama</span>
                </button>
              </div>
            ) : (
              filteredPools.map((pool) => (
                <div
                  key={pool.id}
                  className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shrink-0">
                        <MapPin size={20} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                          {pool.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          {pool.address || "Alamat belum diatur"}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center gap-1">
                      <Compass size={12} />
                      <span>Radius {pool.radius_meters || 200}m</span>
                    </span>
                  </div>

                  {/* Coordinates & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100/80">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <span>
                        Lat: <strong>{pool.latitude}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Long: <strong>{pool.longitude}</strong>
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${pool.latitude},${pool.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 ml-1 inline-flex items-center gap-0.5 font-sans font-bold"
                        title="Buka di Google Maps"
                      >
                        <ExternalLink size={11} />
                        <span>Maps</span>
                      </a>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenPoolModal(pool)}
                        className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeletePool(pool.id, pool.name)}
                        disabled={deletingPoolId === pool.id}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 size={13} className={deletingPoolId === pool.id ? "animate-spin" : ""} />
                        <span>{deletingPoolId === pool.id ? "Menghapus..." : "Hapus"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 2: PROGRAM KELAS RENANG */}
        {/* ========================================================= */}
        {activeSubTab === "programs" && (
          <div className="space-y-3.5">
            {filteredPrograms.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center font-bold">
                  <Layers size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-800">
                    Tidak Ada Program Kelas
                  </p>
                  <p className="text-xs text-slate-400">
                    {searchQuery
                      ? "Tidak ada program kelas yang cocok dengan pencarian."
                      : "Belum ada master data program kelas yang tersimpan."}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenProgramModal()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  <Plus size={14} />
                  <span>Tambah Program Pertama</span>
                </button>
              </div>
            ) : (
              filteredPrograms.map((prog) => (
                <div
                  key={prog.id}
                  className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0">
                        <Layers size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                            {prog.name}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {prog.sessions_per_week || 2}x / Minggu
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {prog.description || "Program kelas renang terstruktur"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Tarif SPP
                      </p>
                      <p className="text-sm sm:text-base font-black text-blue-600">
                        Rp {Math.round(prog.monthly_fee || 0).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100/80">
                    <button
                      onClick={() => handleOpenProgramModal(prog)}
                      className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProgram(prog.id, prog.name)}
                      disabled={deletingProgramId === prog.id}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 size={13} className={deletingProgramId === prog.id ? "animate-spin" : ""} />
                      <span>{deletingProgramId === prog.id ? "Menghapus..." : "Hapus"}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: TAMBAH / EDIT KOLAM RENANG */}
      {/* ========================================================= */}
      {showPoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <MapPin size={18} />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {editingPool ? "Edit Lokasi Kolam" : "Tambah Lokasi Kolam Baru"}
                </h3>
              </div>
              <button
                onClick={() => setShowPoolModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPool} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kolam Renang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hotel Nalendra Plaza Subang"
                  value={poolName}
                  onChange={(e) => setPoolName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alamat Lengkap
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jl. Mayjen Sutoyo No.7, Subang"
                  value={poolAddress}
                  onChange={(e) => setPoolAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Latitude <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-6.565630"
                    value={poolLat}
                    onChange={(e) => setPoolLat(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Longitude <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="107.761040"
                    value={poolLng}
                    onChange={(e) => setPoolLng(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Radius Validasi Presensi (Meter)
                </label>
                <input
                  type="number"
                  min={50}
                  max={2000}
                  value={poolRadius}
                  onChange={(e) => setPoolRadius(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Jarak maksimal perangkat pelatih/siswa dari kolam agar absensi diterima (Default: 200m).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPoolModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPool}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingPool ? "Menyimpan..." : "Simpan Lokasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TAMBAH / EDIT PROGRAM KELAS */}
      {/* ========================================================= */}
      {showProgramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Layers size={18} />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {editingProgram
                    ? "Edit Program Kelas"
                    : "Tambah Program Kelas Baru"}
                </h3>
              </div>
              <button
                onClick={() => setShowProgramModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProgram} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Program Kelas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prestasi / Reguler / Private"
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Program
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi kurikulum atau sasaran peserta kelas..."
                  value={progDesc}
                  onChange={(e) => setProgDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 resize-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    SPP Bulanan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. Rp 350.000"
                    value={progFeeDisplay}
                    onChange={handleFeeChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sesi / Minggu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={progSessions}
                    onChange={(e) => setProgSessions(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProgramModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingProgram}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {savingProgram ? "Menyimpan..." : "Simpan Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
