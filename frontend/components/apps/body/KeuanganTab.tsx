import React from "react";
import { Invoice } from "../types";

interface KeuanganTabProps {
  invoices: Invoice[];
  sessionRole: string;
  onVerifyPayment: (invoiceId: string, confirm: boolean) => void;
}

export default function KeuanganTab({
  invoices,
  sessionRole,
  onVerifyPayment,
}: KeuanganTabProps) {
  if (sessionRole !== "admin") return null;

  const pendingInvoices = invoices.filter((i) => i.status === "Menunggu Konfirmasi");

  return (
    <div className="space-y-5">
      {/* Verification approvals panel */}
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm">
        <h3 className="text-xs font-bold text-slate-900 mb-4">
          Konfirmasi Bukti Transfer SPP Masuk
        </h3>

        {pendingInvoices.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-6 text-center">
            Semua pembayaran saat ini telah terverifikasi lunas.
          </p>
        ) : (
          <div className="space-y-2.5">
            {pendingInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-50/50 border border-amber-100 rounded-2xl gap-3"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Pembayaran SPP: {inv.name}
                  </p>
                  <p className="text-[10px] text-slate-455 mt-0.5 font-bold">
                    Transfer a.n {inv.name} • {inv.uploadReceipt}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="text-xs font-bold text-slate-700">
                    Rp {inv.amount.toLocaleString("id-ID")}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onVerifyPayment(inv.id, true)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition cursor-pointer"
                    >
                      Terima
                    </button>
                    <button
                      onClick={() => onVerifyPayment(inv.id, false)}
                      className="px-3 py-1.5 text-xs font-bold text-red-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* General invoices history */}
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <h3 className="text-xs font-bold text-slate-900 mb-4">
          Laporan Status Invoice SPP Siswa (Semua)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold">
                <th className="py-2.5 px-3">Nama Siswa</th>
                <th className="py-2.5 px-3">Tagihan</th>
                <th className="py-2.5 px-3">Nominal</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-3 font-bold text-slate-900">{inv.name}</td>
                  <td className="py-3 px-3 text-slate-500">{inv.desc}</td>
                  <td className="py-3 px-3 font-bold text-slate-700">
                    Rp {inv.amount.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        inv.status === "Lunas"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : inv.status === "Menunggu Konfirmasi"
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-rose-50 text-rose-700 border-rose-100"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
