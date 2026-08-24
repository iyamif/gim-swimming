"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function Pendaftaran() {
  const [formData, setFormData] = useState({
    nama: "",
    usia: "",
    program: "Kids Swimming (Usia 4–12)",
    whatsapp: "",
    jadwal: "",
    catatan: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const programsList = [
    "Kids Swimming (Usia 4–12)",
    "Beginner (Pemula)",
    "Private Class (1-on-1)",
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const programParam = params.get("program");
      if (programParam) {
        // Pre-select program if parameter matches
        setFormData((prev) => ({ ...prev, program: programParam }));
      }
    }
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct WhatsApp message template
    const text = `Halo Admin GIM Swimming, saya ingin mendaftar kelas berenang baru:

*Nama Lengkap*: ${formData.nama}
*Usia*: ${formData.usia} tahun
*Pilihan Program*: ${formData.program}
*Nomor WhatsApp*: ${formData.whatsapp}
*Jadwal yang Diinginkan*: ${formData.jadwal || "-"}
*Catatan Tambahan*: ${formData.catatan || "-"}

Mohon informasi mengenai pendaftaran lebih lanjut. Terima kasih!`;

    // Encode text for URL
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/628123456789?text=${encodedText}`;

    // Open WhatsApp in a new window/tab
    window.open(whatsappUrl, "_blank");
    
    // Show success dialog
    setIsSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] py-16 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      {/* Back Link */}
      <div className="w-full max-w-lg mb-6 flex justify-start">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-cyan-500 transition-colors duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
            className="h-3.5 w-3.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Kembali ke Beranda
        </Link>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 p-8 sm:p-10 relative overflow-hidden">
        {/* Decorative top accent line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-cyan-400" />

        {/* Logo and Header */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo1.jpeg"
            alt="GIM Swimming Logo"
            className="h-14 w-auto mx-auto rounded-xl object-contain bg-white mb-4"
          />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Formulir Pendaftaran
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Lengkapi formulir singkat di bawah untuk memulai kelas berenang
          </p>
        </div>

        {/* Form or Success State */}
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nama Lengkap */}
            <div>
              <label htmlFor="nama" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Nama Lengkap Siswa <span className="text-cyan-500 font-black">*</span>
              </label>
              <input
                type="text"
                id="nama"
                name="nama"
                required
                value={formData.nama}
                onChange={handleChange}
                placeholder="Masukkan nama lengkap"
                className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-cyan-400/10 focus:border-cyan-400 focus:outline-none transition-all duration-300"
              />
            </div>

            {/* Usia & WhatsApp (Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="usia" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Usia Siswa (Tahun) <span className="text-cyan-500 font-black">*</span>
                </label>
                <input
                  type="number"
                  id="usia"
                  name="usia"
                  required
                  min={1}
                  max={100}
                  value={formData.usia}
                  onChange={handleChange}
                  placeholder="Contoh: 8"
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-cyan-400/10 focus:border-cyan-400 focus:outline-none transition-all duration-300"
                />
              </div>

              <div>
                <label htmlFor="whatsapp" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  No. WhatsApp <span className="text-cyan-500 font-black">*</span>
                </label>
                <input
                  type="tel"
                  id="whatsapp"
                  name="whatsapp"
                  required
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="Contoh: 08123456789"
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-cyan-400/10 focus:border-cyan-400 focus:outline-none transition-all duration-300"
                />
              </div>
            </div>

            {/* Pilihan Program */}
            <div>
              <label htmlFor="program" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Program Pilihan <span className="text-cyan-500 font-black">*</span>
              </label>
              <select
                id="program"
                name="program"
                required
                value={formData.program}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-sm text-slate-800 focus:bg-white focus:ring-4 focus:ring-cyan-400/10 focus:border-cyan-400 focus:outline-none transition-all duration-300"
              >
                {programsList.map((prog) => (
                  <option key={prog} value={prog}>
                    {prog}
                  </option>
                ))}
              </select>
            </div>

            {/* Jadwal Latihan */}
            <div>
              <label htmlFor="jadwal" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Jadwal yang Diharapkan
              </label>
              <input
                type="text"
                id="jadwal"
                name="jadwal"
                value={formData.jadwal}
                onChange={handleChange}
                placeholder="Contoh: Sabtu pagi / Senin sore"
                className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-cyan-400/10 focus:border-cyan-400 focus:outline-none transition-all duration-300"
              />
            </div>

            {/* Catatan */}
            <div>
              <label htmlFor="catatan" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Catatan Tambahan (Kondisi Kesehatan / Target)
              </label>
              <textarea
                id="catatan"
                name="catatan"
                rows={3}
                value={formData.catatan}
                onChange={handleChange}
                placeholder="Contoh: Belum berani menyelam / ingin belajar gaya punggung"
                className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-3 px-4 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-cyan-400/10 focus:border-cyan-400 focus:outline-none transition-all duration-300 resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full rounded-xl bg-cyan-400 py-3.5 text-sm font-bold text-white shadow-md hover:bg-cyan-300 hover:shadow-lg transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                Kirim Pendaftaran via WhatsApp 🚀
              </button>
            </div>
          </form>
        ) : (
          /* Success Message state */
          <div className="text-center py-8 space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="currentColor"
                className="h-8 w-8"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Pendaftaran Berhasil!
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
                Formulir telah berhasil diformat. Anda akan dialihkan secara otomatis untuk menghubungi WhatsApp Admin GIM Swimming.
              </p>
            </div>

            <div className="pt-6 flex flex-col gap-3">
              <button
                onClick={() => {
                  const text = `Halo Admin GIM Swimming, saya ingin mendaftar kelas berenang baru:\n\n*Nama Lengkap*: ${formData.nama}\n*Usia*: ${formData.usia} tahun\n*Pilihan Program*: ${formData.program}\n*Nomor WhatsApp*: ${formData.whatsapp}\n*Jadwal yang Diinginkan*: ${formData.jadwal || "-"}\n*Catatan Tambahan*: ${formData.catatan || "-"}\n\nMohon informasi mengenai pendaftaran lebih lanjut. Terima kasih!`;
                  window.open(`https://wa.me/628123456789?text=${encodeURIComponent(text)}`, "_blank");
                }}
                className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-md hover:bg-emerald-600 hover:shadow-lg transition-all duration-300 active:scale-[0.98] cursor-pointer"
              >
                Buka Ulang Chat WhatsApp 💬
              </button>
              <Link
                href="/"
                className="text-xs font-bold uppercase tracking-wider text-cyan-500 hover:text-cyan-600 transition"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
