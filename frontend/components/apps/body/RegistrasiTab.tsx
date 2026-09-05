import React, { useState } from "react";

interface RegistrasiTabProps {
  onAddStudent: (data: {
    name: string;
    age: string;
    parent: string;
    phone: string;
    class: string;
  }) => void;
  onAddCoach: (data: {
    name: string;
    spec: string;
    phone: string;
    email: string;
    class: string;
  }) => void;
}

export default function RegistrasiTab({
  onAddStudent,
  onAddCoach,
}: RegistrasiTabProps) {
  const [formSiswa, setFormSiswa] = useState({
    name: "",
    age: "",
    parent: "",
    phone: "",
    class: "Prestasi",
  });

  const [formPelatih, setFormPelatih] = useState({
    name: "",
    spec: "",
    phone: "",
    email: "",
    class: "Prestasi",
  });

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddStudent(formSiswa);
    setFormSiswa({ name: "", age: "", parent: "", phone: "", class: "Prestasi" });
  };

  const handleCoachSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCoach(formPelatih);
    setFormPelatih({ name: "", spec: "", phone: "", email: "", class: "Prestasi" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl mx-auto">
      {/* Student Registration Form */}
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3">
          Pendaftaran Siswa Baru
        </h3>

        <form onSubmit={handleStudentSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Siswa
            </label>
            <input
              type="text"
              value={formSiswa.name}
              onChange={(e) =>
                setFormSiswa((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Masukkan nama lengkap siswa"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-rose-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Orang Tua / Wali
            </label>
            <input
              type="text"
              value={formSiswa.parent}
              onChange={(e) =>
                setFormSiswa((prev) => ({ ...prev, parent: e.target.value }))
              }
              placeholder="Nama wali murid"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-rose-400 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Usia (Tahun)
              </label>
              <input
                type="number"
                value={formSiswa.age}
                onChange={(e) =>
                  setFormSiswa((prev) => ({ ...prev, age: e.target.value }))
                }
                placeholder="Usia"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-rose-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                WhatsApp Wali
              </label>
              <input
                type="text"
                value={formSiswa.phone}
                onChange={(e) =>
                  setFormSiswa((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="08123xxxx"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-rose-400 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilih Kelas Latihan
            </label>
            <select
              value={formSiswa.class}
              onChange={(e) =>
                setFormSiswa((prev) => ({ ...prev, class: e.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none transition focus:border-rose-400 focus:bg-white cursor-pointer"
            >
              <option value="Prestasi">Prestasi</option>
              <option value="Kids Swimming">Kids Swimming Class</option>
              <option value="Private Class">Private Class (1-on-1)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-3 text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            Daftarkan Siswa
          </button>
        </form>
      </div>

      {/* Coach Registration Form */}
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3">
          Pendaftaran Pelatih Baru
        </h3>

        <form onSubmit={handleCoachSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Instruktur
            </label>
            <input
              type="text"
              value={formPelatih.name}
              onChange={(e) =>
                setFormPelatih((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Nama lengkap instruktur"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-rose-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Spesialisasi Keterampilan
            </label>
            <input
              type="text"
              value={formPelatih.spec}
              onChange={(e) =>
                setFormPelatih((prev) => ({ ...prev, spec: e.target.value }))
              }
              placeholder="Contoh: Gaya Bebas / Gaya Kupu-kupu"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-rose-400 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                No. WhatsApp
              </label>
              <input
                type="text"
                value={formPelatih.phone}
                onChange={(e) =>
                  setFormPelatih((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="08123xxxx"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-rose-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Instruktur
              </label>
              <input
                type="email"
                value={formPelatih.email}
                onChange={(e) =>
                  setFormPelatih((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="coach@gimswimming.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-rose-400 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Alokasi Kelas Utama
            </label>
            <select
              value={formPelatih.class}
              onChange={(e) =>
                setFormPelatih((prev) => ({ ...prev, class: e.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none transition focus:border-rose-400 focus:bg-white cursor-pointer"
            >
              <option value="Prestasi">Prestasi</option>
              <option value="Kids Swimming">Kids Swimming Class</option>
              <option value="Private Class">Private Class (1-on-1)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-3 text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            Daftarkan Pelatih
          </button>
        </form>
      </div>
    </div>
  );
}
