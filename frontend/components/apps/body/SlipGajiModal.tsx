"use client";

import React, { useRef } from "react";
import { Coach } from "../types";
import { X, Printer, FileText } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:static print:z-auto">
      {/* Container Modal */}
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl overflow-hidden border border-slate-300 my-auto print:shadow-none print:border-none print:max-w-full print:rounded-none">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="px-5 py-3.5 bg-slate-100 border-b border-slate-300 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 leading-tight">
                Slip Honor Pelatih Renang
              </h3>
              <p className="text-[10px] text-slate-600">
                Periode: <strong>{month}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition cursor-pointer active:scale-95"
              title="Cetak atau Simpan PDF"
            >
              <Printer size={13} />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Slip Content - Black & White Minimalist Design */}
        <div
          ref={printRef}
          className="p-6 space-y-5 text-black bg-white font-sans print:p-4"
        >
          {/* Header Lembaga */}
          <div className="flex items-start justify-between border-b-2 border-black pb-4">
            <div>
              <h1 className="text-lg font-black tracking-wider uppercase text-black">
                GIM SWIMMING ACADEMY
              </h1>
              <p className="text-[11px] font-medium text-slate-700">
                Klub Renang &amp; Pelatihan Prestasi
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                Subang, Jawa Barat • Official Payment Receipt
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block text-[11px] font-black uppercase tracking-widest px-2 py-0.5 border border-black bg-slate-100 text-black">
                SLIP HONOR
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 mt-1">
                {slipNumber}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">
                Tanggal: {printDate}
              </p>
            </div>
          </div>

          {/* Data Pelatih & Periode */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3.5 text-xs bg-slate-50/50">
            <div>
              <span className="text-[9px] uppercase font-black text-slate-600 block tracking-wider">
                Penerima (Pelatih)
              </span>
              <p className="text-sm font-black text-black mt-0.5 capitalize">
                {coach.name}
              </p>
              {coach.phone && (
                <p className="text-slate-700 text-[10px] mt-0.5">
                  No. Telp: {coach.phone}
                </p>
              )}
            </div>

            <div className="text-right flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-black text-slate-600 block tracking-wider">
                  Periode Penggajian
                </span>
                <p className="text-xs font-black text-black mt-0.5">
                  {month}
                </p>
              </div>

              <div>
                <span className="text-[9px] uppercase font-black text-slate-600 block tracking-wider">
                  Status
                </span>
                <p className="text-xs font-bold text-black mt-0.5 uppercase">
                  {isApproved ? "[ LUNAS / DICAIKAN ]" : "[ MENUNGGU APPROVAL ]"}
                </p>
              </div>
            </div>
          </div>

          {/* Rincian Perhitungan Honor */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-black text-black uppercase tracking-wider">
              Rincian Perhitungan Honor
            </h4>

            <table className="w-full text-xs text-left border border-slate-300 border-collapse">
              <thead className="bg-slate-100 text-black font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-300">Deskripsi</th>
                  <th className="py-2 px-2 text-center border-r border-slate-300">Sesi</th>
                  <th className="py-2 px-2 text-right border-r border-slate-300">Tarif / Sesi</th>
                  <th className="py-2 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2 px-3 border-r border-slate-200">
                    <div className="font-bold text-black">Honor Kehadiran Melatih</div>
                    <div className="text-[10px] text-slate-600">Sesi yang telah diselesaikan</div>
                  </td>
                  <td className="py-2 px-2 text-center font-bold border-r border-slate-200">
                    {totalSessions}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-800 border-r border-slate-200">
                    Rp {payPerSession.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-black">
                    Rp {baseHonor.toLocaleString("id-ID")}
                  </td>
                </tr>

                {bonusAmount > 0 && (
                  <tr>
                    <td className="py-2 px-3 border-r border-slate-200 font-bold">
                      Bonus / Insentif
                    </td>
                    <td className="py-2 px-2 text-center border-r border-slate-200">-</td>
                    <td className="py-2 px-2 text-right border-r border-slate-200">-</td>
                    <td className="py-2 px-3 text-right font-bold text-black">
                      + Rp {bonusAmount.toLocaleString("id-ID")}
                    </td>
                  </tr>
                )}

                {deductionAmount > 0 && (
                  <tr>
                    <td className="py-2 px-3 border-r border-slate-200 font-bold">
                      Potongan
                    </td>
                    <td className="py-2 px-2 text-center border-r border-slate-200">-</td>
                    <td className="py-2 px-2 text-right border-r border-slate-200">-</td>
                    <td className="py-2 px-3 text-right font-bold text-black">
                      - Rp {deductionAmount.toLocaleString("id-ID")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Total Netto Banner */}
            <div className="border-2 border-black p-3 bg-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-black block">
                  TOTAL HONOR DITERIMA (NETTO)
                </span>
                <p className="text-[10px] text-slate-600">
                  {totalSessions} sesi × Rp {payPerSession.toLocaleString("id-ID")}
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-black">
                  Rp {netAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          {/* Rincian Sesi Latihan Singkat Jika Ada */}
          {sessionDetails.length > 0 && (
            <div className="space-y-1 pt-1 print:break-inside-avoid">
              <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Rincian Sesi ({sessionDetails.length} Sesi)
              </h4>
              <div className="border border-slate-300 bg-slate-50/50 p-2 text-[10px] space-y-1 max-h-36 overflow-y-auto print:max-h-none">
                {sessionDetails.slice(0, 10).map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border-b border-slate-200 pb-0.5 last:border-0"
                  >
                    <span className="font-bold text-black">
                      {s.date} {s.time ? `(${s.time})` : ""} - {s.title || s.class || "Sesi Renang"}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {s.status || "Hadir"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes Administrasi */}
          {notes && (
            <div className="p-2.5 border border-slate-300 bg-slate-50 text-[11px] text-black">
              <span className="font-bold">Catatan: </span>
              {notes}
            </div>
          )}

          {/* Tanda Tangan / Pengesahan */}
          <div className="pt-4 border-t border-slate-300 grid grid-cols-2 gap-6 text-center text-xs print:pt-6">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-600">Penerima (Pelatih)</p>
              <div className="h-14 flex items-end justify-center font-bold text-black pb-1">
                ( {coach.name} )
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold text-slate-600">GIM Swimming Official</p>
              <div className="h-14 flex items-end justify-center font-bold text-black pb-1">
                ( Bendahara / Admin )
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden on Print) */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-300 flex items-center justify-between print:hidden">
          <p className="text-[10px] text-slate-600">
            *Dokumen ini sah sebagai bukti slip honor resmi
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-200 transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-black transition shadow-xs cursor-pointer active:scale-95"
            >
              <Printer size={14} />
              <span>Cetak Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}