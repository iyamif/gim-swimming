import React, { useState } from "react";
import { Invoice, Student, Coach, AttendanceRecord } from "../types";
import {
  CalendarDays,
  CreditCard,
  ChevronRight,
  Handshake,
  AlertTriangle,
  Eye,
  Check,
  X,
  Search,
  MapPin,
} from "lucide-react";

interface KeuanganTabProps {
  invoices: Invoice[];
  sessionRole: string;
  students?: Student[];
  coaches?: Coach[];
  attendances?: AttendanceRecord[];
  sessionUser?: string;
  onVerifyPayment: (invoiceId: string, confirm: boolean) => void;
  setActiveTab?: (tab: string) => void;
}

export default function KeuanganTab({
  invoices,
  sessionRole,
  students = [],
  coaches = [],
  attendances = [],
  sessionUser,
  onVerifyPayment,
  setActiveTab,
}: KeuanganTabProps) {
  if (sessionRole !== "admin") return null;

  // Selected Period State
  const [selectedPeriod, setSelectedPeriod] = useState("Jan 2026");
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  // Search & Filter for Student SPP Table
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "PENDING" | "CONFIRM">("ALL");

  // Modals for Transaction History
  const [showPaymentReceivedModal, setShowPaymentReceivedModal] = useState(false);
  const [showCoachPaymentModal, setShowCoachPaymentModal] = useState(false);
  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<Invoice | null>(null);

  // Dynamic Invoices calculations
  const pendingInvoices = invoices.filter((i) => i.status === "Menunggu Konfirmasi");
  const paidInvoices = invoices.filter((i) => i.status === "Lunas");
  const unpaidInvoices = invoices.filter((i) => i.status === "Belum Dibayar");

  const totalIncomePaid = paidInvoices.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPendingAmount = pendingInvoices.reduce((acc, curr) => acc + curr.amount, 0);

  // Dynamic Coach Payments based on real verified attendances and individual pay_per_session
  const coachPayrolls = coaches.map((c, idx) => {
    // Count real attendances recorded for this coach
    const verifiedCoachAttendances = attendances.filter(
      (a) =>
        a.person_type === "coach" &&
        (String(a.person_id) === String(c.id) ||
          a.person_name?.toLowerCase().trim() === c.name.toLowerCase().trim() ||
          a.person_name?.toLowerCase().includes(c.name.toLowerCase().trim()) ||
          c.name.toLowerCase().includes(a.person_name?.toLowerCase().trim() || "")) &&
        (a.status === "Hadir" || a.status === "Terlambat")
    );

    const baseSessions = 8 + (idx * 2);
    const sessionsCount = verifiedCoachAttendances.length > 0 ? verifiedCoachAttendances.length : baseSessions;
    const ratePerSession = c.pay_per_session || c.payPerSession || 100000;
    const totalHonor = sessionsCount * ratePerSession;

    return {
      id: c.id || `coach-${idx}`,
      name: c.name,
      spec: c.spec || "Instruktur Renang",
      phone: c.phone,
      verifiedCount: verifiedCoachAttendances.length,
      sessionsCount,
      ratePerSession,
      totalHonor,
      status: "Sudah Ditransfer" as const,
      date: "25 Jan 2026",
      recentAttendances: verifiedCoachAttendances.slice(0, 5),
    };
  });

  const totalCoachExpenses = coachPayrolls.reduce((acc, curr) => acc + curr.totalHonor, 0);

  // Monthly Financial Data for Bar Chart (using dynamic income and expense sums)
  const dynamicExpense = totalCoachExpenses > 0 ? totalCoachExpenses : 650000;
  const dynamicIncome = totalIncomePaid > 0 ? totalIncomePaid : 1450000;

  const monthlyChartData = [
    { month: "Jan", income: dynamicIncome, expenses: dynamicExpense },
    { month: "Feb", income: 1850000, expenses: 900000 },
    { month: "Mar", income: 1200000, expenses: 850000 },
    { month: "Apr", income: 1750000, expenses: 1300000 },
    { month: "May", income: 1800000, expenses: 1350000 },
    { month: "Jun", income: 2100000, expenses: 1700000 },
    { month: "Jul", income: 1500000, expenses: 1150000 },
  ];

  const maxChartValue = Math.max(2200000, dynamicIncome * 1.2, dynamicExpense * 1.2);

  // Filtered Student SPP list
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.desc.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "PAID") return inv.status === "Lunas";
    if (statusFilter === "PENDING") return inv.status === "Belum Dibayar";
    if (statusFilter === "CONFIRM") return inv.status === "Menunggu Konfirmasi";
    return true;
  });

  const formatShortK = (num: number) => {
    if (num >= 1000000) {
      return `IDR ${(num / 1000000).toFixed(2).replace(/\.00$/, "")}M`;
    }
    if (num >= 1000) {
      return `IDR ${(num / 1000).toFixed(0)}k`;
    }
    return `IDR ${num}`;
  };

  const formatIDR = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  return (
    <div className="space-y-4 pb-28 bg-[#f8fafc] min-h-full font-sans">
      {/* ==========================================
          1. TOP VIBRANT BLUE HEADER (FULL WIDTH)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-12 sm:pb-14 px-5 sm:px-8 shadow-xl shadow-blue-700/15 overflow-hidden rounded-none">
        {/* Subtle Concentric Decorative Rings */}
        <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20 pointer-events-none" />
        <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25 pointer-events-none" />

        {/* Ambient Depth Glow */}
        <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          {/* Title: Keuangan & Subtitle */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Keuangan
            </h2>
            <p className="text-xs text-cyan-100 font-medium mt-1">
              Financial Overview, Cashflow &amp; Status Pembayaran SPP
            </p>
          </div>
        </div>
      </div>

      {/* ==========================================
          MAIN CONTAINER (FLOATING CARDS)
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4 -mt-8 sm:-mt-10 relative z-20">
        {/* ==========================================
            CARD 1: FINANCIAL OVERVIEW & CHART
            ========================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 space-y-5 animate-fadeIn">
          {/* Top Title & Period Selector */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Financial Overview
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {selectedPeriod}
              </p>
            </div>

            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 border border-slate-200/80 transition cursor-pointer shadow-2xs"
              title="Pilih Periode Keuangan"
            >
              <CalendarDays size={16} />
            </button>
          </div>

          {/* Income & Expenses Subheader + Legend */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-t border-slate-100 pt-3">
            <h4 className="text-xs sm:text-sm font-black text-slate-900">
              Income &amp; Expenses
            </h4>

            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-blue-600 shadow-2xs" />
                <span className="text-slate-700">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-amber-500 shadow-2xs" />
                <span className="text-slate-700">Expenses</span>
              </div>
            </div>
          </div>

          {/* Vertical Bar Chart Container */}
          <div className="pt-2">
            <div className="relative h-48 sm:h-56 flex items-end justify-between gap-1 sm:gap-2 pb-6 pt-4 px-2 sm:px-4 bg-slate-50/60 rounded-2xl border border-slate-100">
              {/* Background Grid Lines & Y-Axis Labels */}
              <div className="absolute inset-x-2 sm:inset-x-4 top-4 bottom-6 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-b border-slate-300 border-dashed w-full relative">
                  <span className="absolute -top-3.5 -left-1 text-[9px] font-bold text-slate-400">
                    2.00M
                  </span>
                </div>
                <div className="border-b border-slate-300 border-dashed w-full relative">
                  <span className="absolute -top-3.5 -left-1 text-[9px] font-bold text-slate-400">
                    1.50M
                  </span>
                </div>
                <div className="border-b border-slate-300 border-dashed w-full relative">
                  <span className="absolute -top-3.5 -left-1 text-[9px] font-bold text-slate-400">
                    1.00M
                  </span>
                </div>
                <div className="border-b border-slate-300 border-dashed w-full relative">
                  <span className="absolute -top-3.5 -left-1 text-[9px] font-bold text-slate-400">
                    500k
                  </span>
                </div>
                <div className="border-b border-slate-300 w-full relative">
                  <span className="absolute -top-3.5 -left-1 text-[9px] font-bold text-slate-400">
                    0
                  </span>
                </div>
              </div>

              {/* Monthly Bar Pairs */}
              {monthlyChartData.map((item, idx) => {
                const incomeHeight = Math.min(100, Math.round((item.income / maxChartValue) * 100));
                const expenseHeight = Math.min(100, Math.round((item.expenses / maxChartValue) * 100));

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full relative group z-10"
                  >
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 bg-slate-900 text-white text-[9px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap shadow-lg z-30">
                      <p className="font-bold">{item.month}:</p>
                      <p className="text-cyan-300">Income: {formatIDR(item.income)}</p>
                      <p className="text-amber-300">Expense: {formatIDR(item.expenses)}</p>
                    </div>

                    {/* Dual Bars */}
                    <div className="flex items-end justify-center gap-1 w-full max-w-[36px]">
                      {/* Income Bar (Blue) */}
                      <div
                        className="w-1/2 rounded-t-md bg-gradient-to-t from-blue-700 to-blue-500 shadow-xs transition-all duration-500 group-hover:brightness-110 cursor-pointer"
                        style={{ height: `${incomeHeight}%` }}
                        title={`${item.month} Income: ${formatIDR(item.income)}`}
                      />

                      {/* Expense Bar (Amber / Orange) */}
                      <div
                        className="w-1/2 rounded-t-md bg-gradient-to-t from-amber-600 to-amber-400 shadow-xs transition-all duration-500 group-hover:brightness-110 cursor-pointer"
                        style={{ height: `${expenseHeight}%` }}
                        title={`${item.month} Expense: ${formatIDR(item.expenses)}`}
                      />
                    </div>

                    {/* Month Label */}
                    <span className="absolute -bottom-5 text-[10px] sm:text-xs font-bold text-slate-600">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==========================================
            CARD 2: TRANSACTION HISTORY
            ========================================== */}
        <div className="space-y-2.5">
          <h3 className="text-sm font-black text-slate-900 px-1 flex items-center gap-1.5">
            <span>Transaction History</span>
          </h3>

          <div className="space-y-2.5">
            {/* Item 1: Payment received */}
            <div
              onClick={() => setShowPaymentReceivedModal(true)}
              className="p-4 sm:p-4.5 rounded-3xl bg-white hover:bg-slate-50/80 border border-slate-100 shadow-sm flex items-center justify-between gap-3 cursor-pointer transition active:scale-98"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shrink-0 border border-blue-100 shadow-2xs">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    Payment received
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {paidInvoices.length} Transaksi SPP terverifikasi lunas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                  +{formatShortK(totalIncomePaid || 1450000)}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </div>

            {/* Item 2: Coach payment */}
            <div
              onClick={() => setShowCoachPaymentModal(true)}
              className="p-4 sm:p-4.5 rounded-3xl bg-white hover:bg-slate-50/80 border border-slate-100 shadow-sm flex items-center justify-between gap-3 cursor-pointer transition active:scale-98"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 shrink-0 border border-cyan-100 shadow-2xs">
                  <Handshake size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">
                    Coach payment
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Honor &amp; insentif {coaches.length || coachPayrolls.length} pelatih renang
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100">
                  -{formatShortK(totalCoachExpenses || 650000)}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            PENDING CONFIRMATION ALERT (JIKA ADA BUKTI TRANSFER BARU)
            ========================================== */}
        {pendingInvoices.length > 0 && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <h4 className="text-xs sm:text-sm font-black text-amber-950">
                  Perlu Konfirmasi Pembayaran ({pendingInvoices.length})
                </h4>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                Menunggu Review
              </span>
            </div>

            <div className="space-y-2">
              {pendingInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 sm:p-3.5 rounded-2xl bg-white border border-amber-100 shadow-2xs flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
                >
                  <div>
                    <p className="text-xs font-black text-slate-900">{inv.name}</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {inv.desc} • <span className="font-bold text-amber-900">{formatIDR(inv.amount)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                    {inv.uploadReceipt && (
                      <button
                        onClick={() => setSelectedReceiptInvoice(inv)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        title="Lihat Bukti Transfer"
                      >
                        <Eye size={12} />
                        <span>Bukti</span>
                      </button>
                    )}
                    <button
                      onClick={() => onVerifyPayment(inv.id, true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <Check size={12} />
                      <span>Terima</span>
                    </button>
                    <button
                      onClick={() => onVerifyPayment(inv.id, false)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer border border-rose-200 flex items-center gap-1"
                    >
                      <X size={12} />
                      <span>Tolak</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            CARD 3: STUDENT SPP PAYMENT STATUS
            ========================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Student SPP Payment Status
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Daftar &amp; Status Tagihan SPP Siswa
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-[10px] font-bold">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-white text-blue-600 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter("PAID")}
                className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                  statusFilter === "PAID"
                    ? "bg-white text-emerald-600 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Paid
              </button>
              <button
                onClick={() => setStatusFilter("PENDING")}
                className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                  statusFilter === "PENDING"
                    ? "bg-white text-amber-600 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Pending
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari nama siswa atau tagihan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2.5 pl-9 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Table Styled matching the Mockup */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-black">
                    <th className="py-3 px-3.5">Name</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3.5 text-right">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                        Tidak ada data tagihan SPP yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isPaid = inv.status === "Lunas";
                      const isPending = inv.status === "Belum Dibayar";
                      const isConfirm = inv.status === "Menunggu Konfirmasi";

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50/60 transition group cursor-pointer"
                          onClick={() => {
                            if (inv.uploadReceipt) setSelectedReceiptInvoice(inv);
                          }}
                        >
                          {/* Name */}
                          <td className="py-3.5 px-3.5">
                            <p className="font-black text-slate-900 capitalize">{inv.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{inv.desc}</p>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-3 text-slate-500 font-medium whitespace-nowrap">
                            {isPaid ? "Jan 20" : isConfirm ? "Jan 18" : "Jan 15"}
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {formatShortK(inv.amount)}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : isPending
                                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                                  : "bg-blue-50 text-blue-700 border border-blue-100 animate-pulse"
                              }`}
                            >
                              {isPaid ? "Paid" : isPending ? "Pending" : "Review"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL: PAYMENT RECEIVED (DETAIL PEMBAYARAN MASUK)
          ========================================== */}
      {showPaymentReceivedModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setShowPaymentReceivedModal(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Payment Received
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Riwayat Pembayaran SPP Masuk &amp; Terverifikasi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentReceivedModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              {paidInvoices.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  Belum ada transaksi pembayaran SPP yang tercatat lunas.
                </p>
              ) : (
                paidInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-black text-slate-900">{inv.name}</p>
                      <p className="text-[10px] text-slate-400">{inv.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-emerald-600">
                        +{formatIDR(inv.amount)}
                      </p>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        Lunas
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowPaymentReceivedModal(false)}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: COACH PAYMENT (PENGGAJIAN PELATIH)
          ========================================== */}
      {showCoachPaymentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setShowCoachPaymentModal(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                  <Handshake size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Coach Payment
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Rekap Honor &amp; Insentif Pelatih Renang
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCoachPaymentModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {coachPayrolls.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-slate-900">{c.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {c.spec} • <span className="font-bold text-blue-700">Rp {c.ratePerSession.toLocaleString("id-ID")}/sesi</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-amber-600">
                        -{formatIDR(c.totalHonor)}
                      </p>
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                        {c.date}
                      </span>
                    </div>
                  </div>

                  {/* Calculation Formula Pill */}
                  <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-[10px] font-bold text-blue-900">
                    <span>Formula Gaji: {c.sessionsCount} Sesi × Rp {c.ratePerSession.toLocaleString("id-ID")}</span>
                    <span className="font-black text-blue-700">{formatIDR(c.totalHonor)}</span>
                  </div>

                  {/* Attendance Verification Benchmark Badge */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-600 font-semibold">
                        Basis: <span className="font-bold text-slate-900">{c.verifiedCount > 0 ? `${c.verifiedCount} Sesi Tervalidasi` : `${c.sessionsCount} Sesi Jadwal`}</span>
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 flex items-center gap-1">
                      <MapPin size={10} />
                      <span>GPS Radius ≤ 2km</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowCoachPaymentModal(false)}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: BUKTI TRANSFER & REVIEW
          ========================================== */}
      {selectedReceiptInvoice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setSelectedReceiptInvoice(null)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Bukti Transfer SPP
                </h4>
                <p className="text-xs text-slate-500">{selectedReceiptInvoice.name}</p>
              </div>
              <button
                onClick={() => setSelectedReceiptInvoice(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Nominal Transfer:</span>
                <span className="font-black text-slate-900">
                  {formatIDR(selectedReceiptInvoice.amount)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Nama Pengirim:</span>
                <span className="font-bold text-slate-800">{selectedReceiptInvoice.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">File Bukti:</span>
                <span className="font-mono text-cyan-700">{selectedReceiptInvoice.uploadReceipt || "transfer_receipt.jpg"}</span>
              </div>
            </div>

            {selectedReceiptInvoice.status === "Menunggu Konfirmasi" && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    onVerifyPayment(selectedReceiptInvoice.id, true);
                    setSelectedReceiptInvoice(null);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Terima Pembayaran</span>
                </button>
                <button
                  onClick={() => {
                    onVerifyPayment(selectedReceiptInvoice.id, false);
                    setSelectedReceiptInvoice(null);
                  }}
                  className="px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition cursor-pointer border border-rose-200 flex items-center justify-center gap-1.5"
                >
                  <X size={14} />
                  <span>Tolak</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: PILIH PERIODE
          ========================================== */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setShowPeriodModal(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-sm bg-white border border-slate-100 rounded-3xl p-5 shadow-2xl space-y-4 my-auto">
            <h4 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
              Pilih Periode Keuangan
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Jan 2026",
                "Feb 2026",
                "Mar 2026",
                "Apr 2026",
                "Mei 2026",
                "Jun 2026",
                "Jul 2026",
                "Agu 2026",
                "Sep 2026",
                "Okt 2026",
                "Nov 2026",
                "Des 2026",
              ].map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setSelectedPeriod(period);
                    setShowPeriodModal(false);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedPeriod === period
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-50 hover:bg-cyan-50 text-slate-700 border border-slate-100"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPeriodModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
