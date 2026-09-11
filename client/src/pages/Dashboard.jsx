import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  MapPin,
  Clock,
  Camera,
  NotebookPen,
  Loader2,
  AlertCircle,
  CheckCircle2,
  IdCard,
  Mail,
  UserCircle2,
  Home,
  CalendarCheck,
  ShieldCheck,
  Zap,
} from "lucide-react";
import api from "../api/axios";

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || fallback;
}

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "presensi", label: "Presensi", icon: CalendarCheck },
  { id: "jurnal", label: "Jurnal", icon: NotebookPen },
  { id: "profil", label: "Profil", icon: UserCircle2 },
];

const inputBase =
  "w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200";

const primaryBtn =
  "relative overflow-hidden w-full flex items-center justify-center gap-2 min-h-[56px] bg-orange-600 hover:bg-orange-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none text-white font-semibold rounded-2xl shadow-sm shadow-orange-600/20 hover:shadow-md hover:shadow-orange-600/25 transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed";

function initialsOf(name) {
  return (name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState("home");
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [geoError, setGeoError] = useState("");
  const [loadingGeo, setLoadingGeo] = useState(false);

  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [todayJurnal, setTodayJurnal] = useState(null);

  const [clockLoading, setClockLoading] = useState(null);
  const [message, setMessage] = useState(null);

  const [kegiatan, setKegiatan] = useState("");
  const [judul, setJudul] = useState("");
  const [jurnalLoading, setJurnalLoading] = useState(false);
  const [jurnalMessage, setJurnalMessage] = useState(null);

  const [foto, setFoto] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      navigate("/login");
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const fetchTodayStatus = async () => {
    try {
      const { data } = await api.get("/presensi/today");
      setStatus(data.data);
    } catch (err) {
      setMessage({
        type: "error",
        text: getErrorMessage(err, "Gagal mengambil status presensi."),
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchTodayJurnal = async () => {
    try {
      const { data } = await api.get("/jurnal/today");
      setTodayJurnal(data.data);
    } catch {
      setTodayJurnal(null);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
    fetchTodayJurnal();
  }, []);

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolokasi tidak didukung oleh browser ini."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });
  };

  const acquireCoords = async () => {
    setLoadingGeo(true);
    setGeoError("");
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude } = pos.coords;
      setCoords({ latitude, longitude });
      return { latitude, longitude };
    } catch (err) {
      const text =
        err.code === 1
          ? "Izin lokasi ditolak. Izinkan akses lokasi untuk presensi."
          : "Gagal mendapatkan lokasi. Pastikan GPS aktif.";
      setGeoError(text);
      throw new Error(text);
    } finally {
      setLoadingGeo(false);
    }
  };

  const handleClockOut = async () => {
    setMessage(null);
    let pos;
    try {
      pos = await acquireCoords();
    } catch {
      return;
    }

    if (!foto) {
      setMessage({
        type: "error",
        text: "Foto bukti presensi wajib dilampirkan.",
      });
      return;
    }

    setClockLoading("out");
    try {
      const formData = new FormData();
      formData.append("latitude", String(pos.latitude));
      formData.append("longitude", String(pos.longitude));
      formData.append("foto", foto);

      const { data } = await api.post("/presensi/clock-out", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage({ type: "success", text: data.message });
      await fetchTodayStatus();
    } catch (err) {
      setMessage({
        type: "error",
        text: getErrorMessage(err, "Clock-Out gagal."),
      });
    } finally {
      setClockLoading(null);
    }
  };

  const handleSubmitJurnal = async (e) => {
    e.preventDefault();
    setJurnalMessage(null);

    if (!judul.trim() || !kegiatan.trim()) {
      setJurnalMessage({
        type: "error",
        text: "Judul dan kegiatan wajib diisi.",
      });
      return;
    }

    setJurnalLoading(true);
    try {
      const { data } = await api.post("/jurnal", {
        judul_kegiatan: judul.trim(),
        deskripsi_kegiatan: kegiatan.trim(),
      });
      setJurnalMessage({ type: "success", text: data.message });
      setJudul("");
      setKegiatan("");
      fetchTodayJurnal();
    } catch (err) {
      setJurnalMessage({
        type: "error",
        text: getErrorMessage(err, "Gagal menyimpan jurnal."),
      });
    } finally {
      setJurnalLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  const canClockIn = status?.can_clock_in;
  const canClockOut = status?.can_clock_out;
  const clockInTime = status?.clock_in
    ? new Date(status.clock_in.waktu_presensi).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const clockOutTime = status?.clock_out
    ? new Date(status.clock_out.waktu_presensi).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const jurnalDone = !!todayJurnal;
  const clockedIn = !!status?.clock_in;
  const clockedOut = !!status?.clock_out;

  let statusMeta = {
    label: "Belum Clock-In",
    desc: "Segera lakukan Clock-In untuk memulai aktivitas.",
    icon: Clock,
  };
  if (clockedIn && !clockedOut) {
    statusMeta = {
      label: "Sudah Clock-In",
      desc: clockInTime
        ? `Masuk pukul ${clockInTime}. Jangan lupa Clock-Out nanti.`
        : "Selamat bekerja! Jangan lupa Clock-Out nanti.",
      icon: CheckCircle2,
    };
  }
  if (clockedOut) {
    statusMeta = {
      label: jurnalDone ? "Selesai — Clock-Out & Jurnal" : "Selesai — Clock-Out",
      desc: jurnalDone
        ? "Aktivitas hari ini lengkap. Sampai jumpa!"
        : "Clock-Out berhasil. Lengkapi jurnal harian Anda.",
      icon: CheckCircle2,
    };
  }

  const StatusIcon = statusMeta.icon;

  const renderHeader = () => (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-600 text-white shadow-sm shadow-orange-600/25 shrink-0">
            <Zap size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-bold text-slate-900 leading-tight truncate">
                Pusdiklat Digital
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-semibold shrink-0">
                <ShieldCheck size={10} />
                Peserta
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">Dashboard Magang</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <p className="text-xs font-semibold text-slate-800">{user.nama_lengkap}</p>
            <p className="text-[11px] text-slate-500">{user.email}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center text-xs font-bold">
            {initialsOf(user.nama_lengkap)}
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 bg-white transition-all duration-200 cursor-pointer"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );

  const renderHero = () => (
    <section className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-3xl shadow-lg shadow-orange-500/10 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute top-1/2 right-6 w-20 h-20 rounded-full border border-white/20 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-orange-100">Selamat Datang,</p>
            <h2 className="text-2xl font-bold text-white leading-tight mt-0.5 truncate">
              {user.nama_lengkap.split(" ")[0]}!
            </h2>
            <p className="text-[13px] text-orange-100 mt-1">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 border border-white/40 text-white flex items-center justify-center text-sm font-bold shrink-0 backdrop-blur-sm">
            {initialsOf(user.nama_lengkap)}
          </div>
        </div>

        {/* Status hari ini */}
        <div className="mt-6">
          {loadingStatus ? (
            <p className="inline-flex items-center gap-2 text-sm text-white/90">
              <Loader2 size={16} className="animate-spin" />
              Menyiapkan status...
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm shrink-0">
                  <StatusIcon size={22} />
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-[11px] font-semibold backdrop-blur-sm">
                    Status Hari Ini
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1 leading-tight">
                    {statusMeta.label}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-orange-50/95 mt-2">{statusMeta.desc}</p>
            </>
          )}
        </div>

        {/* Chips ringkasan */}
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/30 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
            <Clock size={13} />
            Masuk {clockInTime || "--:--"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/30 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
            <LogOut size={13} />
            Pulang {clockOutTime || "--:--"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/30 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
            <NotebookPen size={13} />
            {jurnalDone ? "Jurnal Selesai" : "Jurnal Belum Diisi"}
          </span>
        </div>
      </div>
    </section>
  );

  const renderQuickActions = () => (
    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4 self-start">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
          <Zap size={18} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Aksi Cepat</h3>
          <p className="text-xs text-slate-500">Clock In & Clock Out harian</p>
        </div>
      </div>

      <button
        onClick={() => navigate("/presensi/kamera")}
        disabled={!canClockIn}
        className="relative overflow-hidden w-full flex flex-col items-center justify-center gap-2 min-h-[88px] rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none text-white font-semibold shadow-sm shadow-orange-600/25 hover:shadow-md hover:shadow-orange-600/30 transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
      >
        <Camera size={26} />
        Clock In
      </button>
      <button
        onClick={() => setActiveView("presensi")}
        disabled={!canClockOut}
        className="relative overflow-hidden w-full flex flex-col items-center justify-center gap-2 min-h-[88px] rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none text-white font-semibold shadow-sm shadow-orange-600/25 hover:shadow-md hover:shadow-orange-600/30 transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
      >
        <LogOut size={26} />
        Clock Out
      </button>

      <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center shrink-0">
          <MapPin size={16} />
        </div>
        {coords.latitude && coords.longitude ? (
          <p className="text-xs font-medium text-slate-700 tabular-nums truncate">
            {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
          </p>
        ) : loadingGeo ? (
          <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
            <Loader2 size={13} className="animate-spin text-orange-500" />
            Mengambil lokasi...
          </p>
        ) : (
          <p className="text-xs text-slate-500">Lokasi diambil saat presensi.</p>
        )}
        {geoError && (
          <p className="text-[11px] text-red-500 ml-auto shrink-0 inline-flex items-center gap-1">
            <AlertCircle size={12} />
            {geoError}
          </p>
        )}
      </div>
    </div>
  );

  const renderTimeline = () => {
    const items = [
      {
        icon: CalendarCheck,
        title: "Clock In",
        detail: clockedIn ? `Masuk pukul ${clockInTime}` : "Belum melakukan Clock-In",
        done: clockedIn,
      },
      {
        icon: NotebookPen,
        title: "Jurnal Harian",
        detail: jurnalDone ? todayJurnal.judul_kegiatan : "Belum mengisi jurnal hari ini",
        done: jurnalDone,
        action: jurnalDone ? null : "Isi Sekarang",
      },
      {
        icon: LogOut,
        title: "Clock Out",
        detail: clockedOut ? `Pulang pukul ${clockOutTime}` : "Belum melakukan Clock-Out",
        done: clockedOut,
      },
    ];

    return (
      <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Aktivitas Hari Ini</h3>
            <p className="text-xs text-slate-500">Timeline kehadiran & jurnal</p>
          </div>
        </div>

        <ol>
          {items.map((t, i) => {
            const Icon = t.icon;
            const last = i === items.length - 1;
            return (
              <li key={t.title} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${
                      t.done
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                  >
                    <Icon size={17} />
                  </div>
                  {!last && <div className="w-px flex-1 bg-slate-200 my-1.5" />}
                </div>
                <div className={`min-w-0 ${last ? "pb-0" : "pb-5"}`}>
                  <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                  <p
                    className={`text-sm truncate ${
                      t.done ? "text-slate-700 font-medium" : "text-slate-400"
                    }`}
                  >
                    {t.detail}
                  </p>
                  {t.action && (
                    <button
                      onClick={() => setActiveView("jurnal")}
                      className="mt-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                    >
                      {t.action} →
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  };

  const renderActionCenter = () => (
    <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {renderQuickActions()}
      {renderTimeline()}
    </section>
  );

  const renderPresensiView = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm shadow-orange-600/25">
          <CalendarCheck size={22} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Presensi</h3>
          <p className="text-sm text-slate-500">Catat kehadiran Anda hari ini.</p>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm border ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-600"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`rounded-xl border p-4 text-center ${
              clockedIn ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
            }`}
          >
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Clock In</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${clockedIn ? "text-slate-900" : "text-slate-300"}`}>
              {clockInTime || "\u2014"}
            </p>
          </div>
          <div
            className={`rounded-xl border p-4 text-center ${
              clockedOut ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
            }`}
          >
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Clock Out</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${clockedOut ? "text-slate-900" : "text-slate-300"}`}>
              {clockOutTime || "\u2014"}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Foto Bukti Presensi <span className="text-slate-400">(untuk Clock-Out)</span>
          </label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium text-sm px-4 min-h-[46px] rounded-xl cursor-pointer transition-all duration-200 border border-orange-200">
              <Camera size={18} />
              {foto ? "Ganti Foto" : "Pilih Foto"}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFoto(e.target.files[0] || null)}
              />
            </label>
            {foto && <span className="text-sm text-slate-500 truncate">{foto.name}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => navigate("/presensi/kamera")}
            disabled={!canClockIn}
            className={primaryBtn}
          >
            <Camera size={22} />
            Clock In
          </button>
          <button
            onClick={handleClockOut}
            disabled={!canClockOut || clockLoading !== null}
            className={primaryBtn}
          >
            {clockLoading === "out" ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <LogOut size={22} />
                Clock Out
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );

  const renderJurnalView = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm shadow-orange-600/25">
          <NotebookPen size={22} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Jurnal Harian</h3>
          <p className="text-sm text-slate-500">Catat kegiatan magang Anda.</p>
        </div>
      </div>

      {jurnalMessage && (
        <div
          className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm border ${
            jurnalMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-600"
          }`}
        >
          {jurnalMessage.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          <span>{jurnalMessage.text}</span>
        </div>
      )}

      {jurnalDone ? (
        <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 size={22} className="text-emerald-600" />
            <h4 className="text-slate-900 font-semibold">Jurnal Hari Ini Sudah Diisi</h4>
          </div>
          <p className="text-sm text-emerald-700">
            Judul: {todayJurnal.judul_kegiatan}
          </p>
        </section>
      ) : (
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <form onSubmit={handleSubmitJurnal} className="space-y-5">
            <div>
              <label htmlFor="judul" className="block text-sm font-medium text-slate-700 mb-1.5">
                Judul Kegiatan
              </label>
              <input
                id="judul"
                type="text"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Mempelajari React Router"
                className={inputBase}
              />
            </div>

            <div>
              <label htmlFor="kegiatan" className="block text-sm font-medium text-slate-700 mb-1.5">
                Kegiatan
              </label>
              <textarea
                id="kegiatan"
                value={kegiatan}
                onChange={(e) => setKegiatan(e.target.value)}
                rows={5}
                placeholder="Deskripsikan kegiatan yang Anda lakukan hari ini..."
                className={`${inputBase} resize-none`}
              />
            </div>

            <button type="submit" disabled={jurnalLoading} className={primaryBtn}>
              {jurnalLoading ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <NotebookPen size={22} />
                  Simpan Jurnal
                </>
              )}
            </button>
          </form>
        </section>
      )}
    </div>
  );

  const renderProfilView = () => {
    const rows = [
      { icon: IdCard, label: "Nama", value: user.nama_lengkap },
      { icon: UserCircle2, label: "Role", value: user.role },
      { icon: Mail, label: "Email", value: user.email },
    ];
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm shadow-orange-600/25">
            <UserCircle2 size={22} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profil Saya</h3>
            <p className="text-sm text-slate-500">Informasi akun Anda.</p>
          </div>
        </div>

        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center text-lg font-bold shrink-0">
              {initialsOf(user.nama_lengkap)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user.nama_lengkap}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.label} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                  <Icon size={19} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{r.label}</p>
                  <p className="text-sm font-semibold text-slate-900 truncate capitalize">
                    {r.value}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 min-h-[52px] bg-white hover:bg-red-50 border border-red-200 text-red-600 font-semibold rounded-2xl transition-all duration-200 active:scale-[0.98] shadow-sm cursor-pointer"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      {renderHeader()}

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {activeView === "home" && (
          <>
            {renderHero()}
            {renderActionCenter()}
          </>
        )}
        {activeView === "presensi" && renderPresensiView()}
        {activeView === "jurnal" && renderJurnalView()}
        {activeView === "profil" && renderProfilView()}
      </main>

      {/* Floating rounded bottom navigation */}
      <nav className="fixed bottom-4 left-4 right-4 z-50 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-full shadow-2xl p-2 flex justify-around items-center max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                active ? "bg-orange-50 text-orange-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span className={`text-[10px] font-semibold ${active ? "text-orange-600" : "text-slate-400"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}