import React, { useState } from "react";
import { Student, Coach, Invoice } from "../types";

interface ParentBodyProps {
  student: Student;
  coach: Coach;
  invoice?: Invoice;
  onUploadReceipt: (invoiceId: string) => void;
}

export default function ParentBody({
  student,
  coach,
  invoice,
  onUploadReceipt,
}: ParentBodyProps) {
  const [showHistory, setShowHistory] = useState(false);
  const lastSession = student.logs[0] || { date: "-", status: "-" };

  return (
    <div className="flex-1 max-w-xl mx-auto w-full px-4 py-5 space-y-4">
      {/* PROFILE SUMMARY BAR */}
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-cyan-50 flex items-center justify-center text-2xl text-cyan-500 shrink-0 border border-cyan-100/50">
          👶
        </div>
        <div>
          <h2 className="text-base font-black text-slate-900">{student.name}</h2>
          <p className="text-xs text-slate-500">
            Program: <span className="font-bold text-cyan-600">{student.class} Class</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black border border-emerald-100/50 uppercase tracking-wider">
              Status: {student.status}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black border border-blue-100/50">
              Kehadiran: {student.attendanceRate}
            </span>
          </div>
        </div>
      </div>

      {/* ACTIVE INVOICE & TUITION ACTION PANEL */}
      {invoice && (
        <div
          className={`p-5 rounded-3xl border shadow-sm space-y-4 ${
            invoice.status === "Lunas"
              ? "bg-emerald-50/40 border-emerald-100"
              : invoice.status === "Menunggu Konfirmasi"
              ? "bg-amber-50/40 border-amber-100"
              : "bg-rose-50/40 border-rose-100"
          }`}
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Invoice Administrasi SPP
              </span>
              <h3 className="text-xs font-bold text-slate-800 mt-0.5">{invoice.desc}</h3>
            </div>
            <span
              className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase border ${
                invoice.status === "Lunas"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : invoice.status === "Menunggu Konfirmasi"
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-rose-100 text-rose-700 border-rose-200"
              }`}
            >
              {invoice.status}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Nominal Tagihan:</span>
            <span className="text-sm font-black text-slate-800">
              Rp {invoice.amount.toLocaleString("id-ID")}
            </span>
          </div>

          {invoice.status === "Belum Dibayar" && (
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-white/70 border border-slate-100 rounded-2xl text-[10px] text-slate-600 leading-relaxed space-y-1.5 shadow-sm">
                <p className="font-bold text-slate-700">Bank Transfer BCA:</p>
                <p className="text-xs font-black text-slate-900 select-all tracking-wider">
                  88921-2291
                </p>
                <p className="text-[9px] text-slate-400 font-bold">a.n Yayasan GIM Swimming</p>
              </div>
              <button
                onClick={() => onUploadReceipt(invoice.id)}
                className="w-full rounded-2xl bg-cyan-400 hover:bg-cyan-500 text-white font-bold py-3 text-xs shadow-lg shadow-cyan-400/10 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📤</span> Bayar & Unggah Bukti Pembayaran
              </button>
            </div>
          )}

          {invoice.status === "Menunggu Konfirmasi" && (
            <div className="p-3 bg-white/60 rounded-2xl border border-amber-100 text-center">
              <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                Bukti transfer (`{invoice.uploadReceipt}`) telah diunggah. Admin sedang memverifikasi transaksi pembayaran Anda.
              </p>
            </div>
          )}

          {invoice.status === "Lunas" && (
            <div className="p-3 bg-white/60 rounded-2xl border border-emerald-100 text-center">
              <p className="text-[10px] text-emerald-700 font-bold">
                Pembayaran SPP terverifikasi lunas. Terima kasih atas kerja sama Anda!
              </p>
            </div>
          )}
        </div>
      )}

      {/* NEXT SESSION SCHEDULE & CONTACT COACH */}
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-slate-950 flex items-center gap-2">
          <span>🏊‍♂️</span> Jadwal Renang & Informasi Instruktur
        </h4>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sesi Berikutnya</p>
              <p className="text-xs font-black text-slate-800 mt-0.5">Sabtu, 15:00 - 17:00 WIB</p>
              <p className="text-[10px] text-slate-500 font-medium">Kolam Nalendra</p>
            </div>
            <span className="text-xl">⏱️</span>
          </div>

          <div className="border-t border-slate-100/80 pt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Pelatih {student.name}</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">{coach.name}</p>
            </div>

            {/* Direct WhatsApp API link */}
            <a
              href={`https://wa.me/${coach.phone}?text=Halo%20${coach.name},%20saya%20orang%20tua%20dari%20${student.name}%20ingin%20bertanya%20mengenai%20kelas%20renang`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100/50 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>💬</span> Hubungi Pelatih
            </a>
          </div>
        </div>
      </div>

      {/* ATTENDANCE TIMELINE */}
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-950 flex items-center gap-2">
            <span>📋</span> Status Presensi Latihan Siswa
          </h4>

          <span
            className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${
              lastSession.status === "Hadir"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : lastSession.status === "Sakit"
                ? "bg-blue-50 text-blue-700 border-blue-100"
                : lastSession.status === "Izin"
                ? "bg-amber-50 text-amber-700 border-amber-100"
                : "bg-rose-50 text-rose-700 border-rose-100"
            }`}
          >
            Sesi Terakhir: {lastSession.status}
          </span>
        </div>

        {student.logs.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            Belum ada histori latihan.
          </p>
        ) : (
          <div className="space-y-2">
            {/* Accordion trigger */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full py-2.5 bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition rounded-xl text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{showHistory ? "🔼 Tutup" : "🔽 Lihat"} Histori 5 Latihan Terakhir</span>
            </button>

            {/* Collapsible log entries list */}
            {showHistory && (
              <div className="space-y-1.5 pt-2 animate-fadeIn">
                {student.logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-50/50 border border-slate-100/60"
                  >
                    <span className="font-semibold text-slate-600">{log.date}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black ${
                        log.status === "Hadir"
                          ? "bg-emerald-50 text-emerald-700"
                          : log.status === "Sakit"
                          ? "bg-blue-50 text-blue-700"
                          : log.status === "Izin"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* EVALUATION PROGRESS CHART */}
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-slate-950 flex items-center gap-2">
          <span>📈</span> Grafik Evaluasi Kemampuan Anak
        </h4>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
              <span>Meluncur & Pernapasan</span>
              <span>90%</span>
            </div>
            <div className="bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full w-[90%]" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
              <span>Renang Gaya Dada</span>
              <span>75%</span>
            </div>
            <div className="bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full w-[75%]" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
              <span>Renang Gaya Bebas</span>
              <span>60%</span>
            </div>
            <div className="bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full w-[60%]" />
            </div>
          </div>
        </div>
      </div>

      {/* ANNOUNCEMENT BOARD */}
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
        <h4 className="text-xs font-bold text-slate-950">📢 Pengumuman Akademik</h4>

        <div className="space-y-2 text-xs">
          <div className="p-3 bg-cyan-50/40 border border-cyan-100/50 rounded-2xl">
            <p className="font-bold text-slate-800">Ujian Naik Tingkatan Renang</p>
            <p className="text-slate-500 mt-1 leading-relaxed text-[10px]">
              Dilaksanakan pada tanggal 14 September 2026. Mohon untuk memantau kesiapan stamina anak dan instruksi pakaian renang ujian dari pelatih.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
