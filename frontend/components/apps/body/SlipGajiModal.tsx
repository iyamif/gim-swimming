"use client";

import React, { useRef } from "react";
import { Coach, AttendanceRecord } from "../types";
import {
  X,
  Printer,
  CheckCircle2,
  Clock,
  Waves,
  Calendar,
  User,
  ShieldCheck,
  FileText,
  Award,
  Sparkles,
} from "lucide-react";

interface SlipGajiModalProps {
  isOpen: boolean;
  onClose: () => void;
  coach: Coach | null;
  month: string;
  totalSessions: number;
  payPerSession: number;
  bonusAmount?: number;
  deductionAmount?: number;
  totalAmount: number;
  status: string;
  approvedAt?: string;
  notes?: string;
  sessionDetails?: Array<{
    date: string;
    time?: string;
    title?: string;
    poolArea?: string;
    class?: string;
    status?: string;
  }>;
}

export default function SlipGajiModal({
  isOpen,
  onClose,
  coach,
  month,
  totalSessions,
  payPerSession,
  bonusAmount = 0,
  deductionAmount = 0,
  totalAmount,
  status,
  approvedAt,
  notes,
  sessionDetails = [],
}: SlipGajiModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !coach) return null;

  const isApproved =
    status === "Approved" ||
    status === "Lunas" ||
    status === "Sudah Ditransfer";

  const baseHonor = totalSessions * payPerSession;
  const netAmount = totalAmount || baseHonor + bonusAmount - deductionAmount;

  // Slip Number Generator based on Month & Coach
  const cleanMonthNum = month.replace(/[^0-9]/g, "") || "2026";
  const slipNumber = `SLIP-GIM/${cleanMonthNum}/${coach.id ? String(coach.id).padStart(3, "0") : "001"}`;
  const printDate = approvedAt
    ? new Date(approvedAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static print:z-auto">
      {/* Container Modal */}
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 my-auto print:shadow-none print:border-none print:max-w-full print:rounded-none">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                Slip Honor Pelatih Renang
              </h3>
              <p className="text-[11px] text-slate-500">
                Periode: <strong className="text-blue-700">{month}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition shadow-sm cursor-pointer active:scale-95"
              title="Cetak atau Simpan PDF"
            >
              <Printer size={14} />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Slip Content */}
        <div
          ref={printRef}
          className="p-6 sm:p-8 space-y-6 text-slate-800 bg-white font-sans print:p-6"
        >
          {/* Header Lembaga */}
          <div className="flex items-start justify-between border-b-2 border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md print:border print:border-slate-300">
                <Waves size={28} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-blue-900">
                  GIM SWIMMING ACADEMY
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Klub Renang Profesional &amp; Pelatihan Prestasi
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Jl. Kolam Utama No. 8, Indonesia • support@gimswimming.com
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-100">
                SLIP HONOR RESMI
              </span>
              <p className="text-xs font-mono font-bold text-slate-600 mt-1">
                {slipNumber}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Tanggal: {printDate}
              </p>
            </div>
          </div>

          {/* Data Pelatih & Periode */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Penerima Honor (Pelatih)
              </span>
              <p className="text-sm font-black text-slate-900 mt-0.5 capitalize">
                {coach.name}
              </p>
              <p className="text-slate-600 mt-0.5">
                Spesialisasi: {coach.spec || "Instruktur Renang"}
              </p>
              <p className="text-slate-500">
                Kelas: {coach.class || "Prestasi"}
              </p>
              {coach.phone && (
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Telp: {coach.phone}
                </p>
              )}
            </div>

            <div className="text-right flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Periode Penggajian
                </span>
                <p className="text-sm font-black text-blue-800 mt-0.5">
                  {month}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Status Pencairan
                </span>
                <div className="mt-1 flex justify-end">
                  {isApproved ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-300">
                      <CheckCircle2 size={12} />
                      <span>Lunas / Telah Dicairkan</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black border border-amber-300">
                      <Clock size={12} />
                      <span>Menunggu Approval Admin</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rincian Komponen Perhitungan Gaji */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Rincian Perhitungan Honor Sesi Latihan
            </h4>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[320px]">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Deskripsi Komponen</th>
                    <th className="py-2.5 px-3 text-center">Volume / Sesi</th>
                    <th className="py-2.5 px-3 text-right">Tarif / Sesi</th>
                    <th className="py-2.5 px-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        Honor Kehadiran Sesi Melatih
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Dihitung berdasarkan jumlah kehadiran sesi latihan yang diselesaikan
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-slate-800">
                      {totalSessions} Sesi
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      Rp {payPerSession.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      Rp {baseHonor.toLocaleString("id-ID")}
                    </td>
                  </tr>

                  {bonusAmount > 0 && (
                    <tr>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-emerald-700">
                          Bonus / Insentif Kinerja
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Penyesuaian prestasi atau intensif khusus pelatih
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">-</td>
                      <td className="py-2.5 px-3 text-right">-</td>
                      <td className="py-2.5 px-4 text-right font-black text-emerald-700">
                        + Rp {bonusAmount.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  )}

                  {deductionAmount > 0 && (
                    <tr>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-rose-700">
                          Potongan
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">-</td>
                      <td className="py-2.5 px-3 text-right">-</td>
                      <td className="py-2.5 px-4 text-right font-black text-rose-700">
                        - Rp {deductionAmount.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Total Bersih Diterima Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-t-2 border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block">
                    TOTAL HONOR DITERIMA (NETTO)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {totalSessions} sesi × Rp {payPerSession.toLocaleString("id-ID")}
                    {bonusAmount > 0 ? ` + Bonus Rp ${bonusAmount.toLocaleString("id-ID")}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg sm:text-xl font-black text-blue-900">
                    Rp {netAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rincian Sesi Singkat Jika Ada */}
          {sessionDetails.length > 0 && (
            <div className="space-y-2 pt-1 print:break-inside-avoid">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Sesi Latihan Yang Diampu ({sessionDetails.length} sesi)
              </h4>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-2 text-[11px] space-y-1.5 print:max-h-none">
                {sessionDetails.slice(0, 10).map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-lg border border-slate-100 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {s.date}
                      </span>
                      {s.time && (
                        <span className="text-slate-400">({s.time})</span>
                      )}
                      <span className="text-slate-600 font-medium">
                        {s.title || s.class || "Sesi Renang"}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {s.status || "Hadir / Selesai"}
                    </span>
                  </div>
                ))}
                {sessionDetails.length > 10 && (
                  <p className="text-[10px] text-slate-400 text-center pt-1 italic">
                    + {sessionDetails.length - 10} sesi lainnya tercatat di sistem presensi.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notes Administrasi */}
          {notes && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
              <span className="font-bold">Catatan Administrasi: </span>
              {notes}
            </div>
          )}

          {/* Tanda Tangan / Footer Pengesahan */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs print:pt-6">
            <div>
              <p className="text-[11px] text-slate-500">Penerima (Pelatih)</p>
              <div className="h-16 flex items-end justify-center font-black text-slate-800 pb-1">
                ( {coach.name} )
              </div>
              <p className="text-[10px] text-slate-400">Tanda Tangan Pelatih</p>
            </div>

            <div>
              <p className="text-[11px] text-slate-500">Manajemen GIM Academy</p>
              <div className="h-16 flex items-end justify-center font-black text-blue-900 pb-1 flex-col items-center">
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <ShieldCheck size={12} />
                  <span>Verified &amp; Approved</span>
                </span>
                <span className="mt-1">( Bendahara / Finance )</span>
              </div>
              <p className="text-[10px] text-slate-400">GIM Swimming Official</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden on Print) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between print:hidden">
          <p className="text-[11px] text-slate-400">
            Perhitungan otomatis berdasarkan absensi mengajar pelatih
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
            >
              <Printer size={15} />
              <span>Cetak Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
