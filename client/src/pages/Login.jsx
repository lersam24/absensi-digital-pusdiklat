import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  MapPin,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import api from "../api/axios";

export default function Login() {
  const [isStarted, setIsStarted] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    if (token && raw) {
      try {
        const user = JSON.parse(raw);
        if (user.role === "admin" || user.role === "pembimbing") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { identifier, password });
      const { token, user } = res.data.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "admin" || user.role === "pembimbing") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  /* ========== Halaman 1: Welcome Landing ========== */
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between p-6 relative font-sans antialiased selection:bg-orange-500 selection:text-white">
        {/* Background grid tipis */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

        {/* Top Brand Navigation */}
        <header className="flex items-center justify-center gap-3 py-4 border-b border-slate-200/60 w-full max-w-sm mx-auto relative z-10">
          <img
            src="/favicon.png"
            alt="Logo Pusdiklat"
            className="h-7 w-7 rounded-lg"
          />
          <span className="font-extrabold text-sm tracking-tight text-slate-900 font-sans">
            PUSDIKLAT <span className="text-orange-600">DIGITAL</span>
          </span>
        </header>

        {/* Main Hero Area */}
        <main className="my-auto max-w-sm w-full mx-auto space-y-6 text-center z-10">
          {/* Status Badge Native */}
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Sistem Presensi V2.0
            <span className="w-px h-3 bg-slate-300" />
          </span>

          {/* Hero Headline */}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Presensi Magang & Jurnal Harian.
          </h1>

          {/* Description */}
          <p className="text-sm text-slate-500 font-normal leading-relaxed px-2">
            Platform terpadu verifikasi kehadiran berbasis geofencing dan rekap
            rekapitulasi harian peserta.
          </p>

          {/* Interactive Quick Stats Row */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-left">
              <MapPin size={16} className="text-emerald-500 mb-2" />
              <p className="text-[10px] font-bold tracking-wider text-slate-400">
                GEOFENCING
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                Radius Valid
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-left">
              <ShieldCheck size={16} className="text-orange-600 mb-2" />
              <p className="text-[10px] font-bold tracking-wider text-slate-400">
                VERIFIKASI
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                Biometrik
              </p>
            </div>
          </div>
        </main>

        {/* Action CTA & Footer */}
        <footer className="relative z-10 w-full max-w-sm mx-auto">
          <button
            onClick={() => setIsStarted(true)}
            className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            Lanjut ke Login
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-center text-[11px] font-medium text-slate-400 tracking-wide uppercase pt-4">
            Badan Pusat Statistik © 2026
          </p>
        </footer>
      </div>
    );
  }

  /* ========== Halaman 2: Login Form ========== */
  return (
    <div className="min-h-screen bg-slate-50/80 backdrop-blur-3xl flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic ambient background */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-orange-500/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Back button */}
      <button
        onClick={() => setIsStarted(false)}
        className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/70 text-slate-600 hover:text-slate-900 px-3.5 py-2 text-sm font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_8px_24px_0_rgba(31,38,135,0.08)] transition-all duration-300 ease-out active:scale-95 cursor-pointer"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="w-full max-w-md relative z-10 animate-fade-up">
        <div className="text-center mb-8">
          {/* Liquid glass icon capsule */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_8px_24px_0_rgba(31,38,135,0.12)] mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30">
              <LogIn size={28} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Selamat Datang</h1>
          <p className="text-slate-500 mt-2">Masuk ke akun Pusdiklat Digital Anda</p>
        </div>

        <div className="w-full max-w-md bg-white/65 backdrop-blur-2xl border border-white/80 shadow-[0_20px_50px_rgba(8,112,184,0.07)] rounded-3xl p-8 relative z-10">
          {error && (
            <div className="flex items-center gap-2 bg-red-50/80 backdrop-blur-xl border border-red-200/70 text-red-600 rounded-2xl px-4 py-3 mb-6 text-sm shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="identifier"
                className="text-xs font-semibold text-slate-600 tracking-wider uppercase mb-1.5 block"
              >
                Email / NIP
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Masukkan email atau NIP"
                  required
                  className="w-full bg-white/50 border border-slate-200/80 focus:border-orange-500 focus:bg-white text-slate-900 rounded-2xl px-4 py-3.5 pl-11 transition-all duration-300 outline-none shadow-inner"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-xs font-semibold text-slate-600 tracking-wider uppercase mb-1.5 block"
              >
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  className="w-full bg-white/50 border border-slate-200/80 focus:border-orange-500 focus:bg-white text-slate-900 rounded-2xl px-4 py-3.5 pl-11 pr-11 transition-all duration-300 outline-none shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-bold rounded-2xl py-4 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Masuk
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <ShieldCheck size={13} />
            Aman & Terenkripsi
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm mt-6">
          &copy; {new Date().getFullYear()} Pusdiklat Digital
        </p>
      </div>
    </div>
  );
}