"use client";

import React, { useState, useEffect } from "react";
import { PoolVenue, ClassProgram } from "../types";
import {
  MapPin,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Compass,
  DollarSign,
  Calendar,
  AlertCircle,
  Sliders,
  Sparkles,
  Info,
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

export default function GeneralTab({
  sessionUser = "",
  sessionRole = "admin",
  onRefresh,
}: GeneralTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"pools" | "programs">("pools");

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

  // State: Class Programs
  const [programs, setPrograms] = useState<ClassProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ClassProgram | null>(null);
  const [progName, setProgName] = useState("");
  const [progDesc, setProgDesc] = useState("");
  const [progFee, setProgFee] = useState<number>(450000);
  const [progSessions, setProgSessions] = useState<number>(2);
  const [savingProgram, setSavingProgram] = useState(false);

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
      alert(err.message || "Gagal menyimpan data lokasi kolam");
    } finally {
      setSavingPool(false);
    }
  };

  // Delete Pool
  const handleDeletePool = async (id: string, name: string) => {
    if (!confirm(`Hapus lokasi kolam renang '${name}'?`)) return;
    try {
      await deletePool(id);
      await loadData();
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert("Gagal menghapus lokasi kolam");
    }
  };

  // Open Program Modal (Create or Edit)
  const handleOpenProgramModal = (prog?: ClassProgram) => {
    if (prog) {
      setEditingProgram(prog);
      setProgName(prog.name);
      setProgDesc(prog.description || "");
      setProgFee(prog.monthly_fee || 450000);
      setProgSessions(prog.sessions_per_week || 2);
    } else {
      setEditingProgram(null);
      setProgName("");
      setProgDesc("");
      setProgFee(450000);
      setProgSessions(2);
    }
    setShowProgramModal(true);
  };

  // Submit Program Form
  const handleSubmitProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProgram(true);
      if (editingProgram) {
        await updateClassProgram(editingProgram.id, {
          name: progName,
          description: progDesc,
          monthly_fee: progFee,
          sessions_per_week: progSessions,
        });
      } else {
        await createClassProgram({
          name: progName,
          description: progDesc,
          monthly_fee: progFee,
          sessions_per_week: progSessions,
        });
      }
      setShowProgramModal(false);
      await loadData();
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan program kelas");
    } finally {
      setSavingProgram(false);
    }
  };

  // Delete Program
  const handleDeleteProgram = async (id: string, name: string) => {
    if (!confirm(`Hapus program kelas renang '${name}'?`)) return;
    try {
      await deleteClassProgram(id);
      await loadData();
      if (onRefresh) await onRefresh();
    } catch (err) {
      alert("Gagal menghapus program kelas");
    }
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8 text-white shadow-xl shadow-blue-950/20">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-widest">
              <Sliders size={16} />
              <span>Pengaturan Master Data</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
              General Master Data
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Kelola daftar lokasi kolam renang (koordinat GPS & radius presensi)
              serta daftar program kelas renang (biaya SPP & kuota sesi).
            </p>
          </div>

          <div className="flex bg-black/30 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 shrink-0">
            <button
              onClick={() => setActiveSubTab("pools")}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeSubTab === "pools"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <MapPin size={16} />
              <span>Lokasi Kolam ({pools.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab("programs")}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeSubTab === "programs"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Layers size={16} />
              <span>Program Kelas ({programs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUBTAB 1: LOKASI KOLAM RENANG */}
      {/* ========================================================= */}
      {activeSubTab === "pools" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MapPin size={20} className="text-blue-600" />
                <span>Daftar Lokasi Kolam Renang</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Titik koordinat digunakan untuk memvalidasi radius presensi pelatih & siswa.
              </p>
            </div>

            <button
              onClick={() => handleOpenPoolModal()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm"
            >
              <Plus size={16} />
              <span>+ Tambah Lokasi Kolam</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {pools.map((pool) => (
              <div
                key={pool.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between space-y-4 hover:border-blue-300 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shrink-0">
                      <MapPin size={20} />
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-100">
                      Radius {pool.radius_meters || 200}m
                    </span>
                  </div>

                  <h4 className="text-base font-black text-slate-900 leading-snug">
                    {pool.name}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {pool.address || "Alamat belum diatur"}
                  </p>

                  <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] font-mono text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Lat:</span>
                      <span className="font-bold">{pool.latitude}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Long:</span>
                      <span className="font-bold">{pool.longitude}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenPoolModal(pool)}
                    className="flex items-center gap-1 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeletePool(pool.id, pool.name)}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
                  >
                    <Trash2 size={13} />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 2: PROGRAM KELAS RENANG */}
      {/* ========================================================= */}
      {activeSubTab === "programs" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers size={20} className="text-indigo-600" />
                <span>Daftar Program Kelas Renang</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kategori program latihan dan tarif SPP bulanan default untuk pendaftaran siswa.
              </p>
            </div>

            <button
              onClick={() => handleOpenProgramModal()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm"
            >
              <Plus size={16} />
              <span>+ Tambah Program Kelas</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {programs.map((prog) => (
              <div
                key={prog.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between space-y-4 hover:border-indigo-300 transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0">
                      <Layers size={20} />
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {prog.sessions_per_week || 2} Sesi / Mgg
                    </span>
                  </div>

                  <h4 className="text-base font-black text-slate-900">{prog.name}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed min-h-[40px]">
                    {prog.description || "Program pelatihan renang terstruktur"}
                  </p>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Biaya SPP Bulanan
                    </p>
                    <p className="text-lg font-black text-blue-700 mt-0.5">
                      Rp {prog.monthly_fee.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenProgramModal(prog)}
                    className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteProgram(prog.id, prog.name)}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
                  >
                    <Trash2 size={13} />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TAMBAH / EDIT KOLAM RENANG */}
      {/* ========================================================= */}
      {showPoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" />
                <span>{editingPool ? "Edit Lokasi Kolam" : "Tambah Lokasi Kolam Baru"}</span>
              </h3>
              <button
                onClick={() => setShowPoolModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  max={1000}
                  value={poolRadius}
                  onChange={(e) => setPoolRadius(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Jarak maksimal pengguna dari titik kolam agar presensi dianggap valid (Rekomendasi: 200m).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPoolModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPool}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-600/20 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers size={18} className="text-indigo-600" />
                <span>{editingProgram ? "Edit Program Kelas" : "Tambah Program Kelas Baru"}</span>
              </h3>
              <button
                onClick={() => setShowProgramModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Program
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat kurikulum atau target kelas..."
                  value={progDesc}
                  onChange={(e) => setProgDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Biaya SPP (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={progFee}
                    onChange={(e) => setProgFee(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProgramModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingProgram}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
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
