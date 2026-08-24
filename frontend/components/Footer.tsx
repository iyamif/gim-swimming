export default function Footer() {
  return (
    <footer className="bg-slate-950 py-16 text-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:gap-16">
          {/* Brand & Logo Column */}
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo/logo1.png"
                alt="GIM Swimming Logo"
                className="h-12 w-auto object-contain"
              />
              <div>
                <p className="text-lg font-black tracking-tight leading-none text-white">
                  GIM <span className="text-cyan-400">SWIMMING</span>
                </p>
                <p className="text-[9px] font-bold tracking-[0.25em] text-slate-500 mt-1">
                  SWIM • LEARN • GROW
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Program pelatihan renang terbaik untuk segala usia. Kami berkomitmen untuk membantu Anda berenang dengan aman, menyenangkan, dan percaya diri.
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Navigasi
            </h3>
            <ul className="flex flex-col gap-3 text-sm text-slate-400">
              <li>
                <a href="#tentang" className="hover:text-cyan-400 transition-colors duration-200">
                  Tentang Kami
                </a>
              </li>
              <li>
                <a href="#program" className="hover:text-cyan-400 transition-colors duration-200">
                  Program Kelas
                </a>
              </li>
              <li>
                <a href="#keunggulan" className="hover:text-cyan-400 transition-colors duration-200">
                  Keunggulan
                </a>
              </li>
              <li>
                <a href="#testimoni" className="hover:text-cyan-400 transition-colors duration-200">
                  Testimoni
                </a>
              </li>
              <li>
                <a href="/pendaftaran" className="hover:text-cyan-400 transition-colors duration-200">
                  Formulir Pendaftaran
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Hubungi Kami
            </h3>
            <ul className="flex flex-col gap-4 text-sm text-slate-400">
              {/* Place / Location */}
              <li className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span>Hotel Nalendra Plaza Subang | Jl. Otto Iskandardinata No. 88, Karanganyar, Kec. Subang, Kabupaten Subang, Jawa Barat 41211</span>
              </li>

              {/* Phone */}
              <li className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 text-cyan-400 shrink-0"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.557-5.187-3.92-6.745-6.745l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <a href="tel:+628973180423" className="hover:text-cyan-400 transition-colors duration-200">
                  +62 897-3180-423
                </a>
              </li>

              {/* Email */}
              <li className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 text-cyan-400 shrink-0"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <a href="mailto:subangswimming@gmail.com" className="hover:text-cyan-400 transition-colors duration-200">
                  subangswimming@gmail.com
                </a>
              </li>

              {/* Instagram */}
              <li className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-cyan-400 shrink-0"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <a
                  href="https://instagram.com/gimswimming"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors duration-200"
                >
                  @gim_swimming
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright section */}
        <div className="mt-16 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} GIM Swimming. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-cyan-400 transition-colors">Kebijakan Privasi</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Syarat & Ketentuan</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
