import { useEffect, useState } from "react";
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
  CalendarDays,
  ShieldCheck,
  Zap,
  History,
  Filter,
  Printer,
  LogIn,
  CalendarOff,
} from "lucide-react";
import api from "../api/axios";

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || err.message || fallback;
}

const JAM_MASUK_STANDAR = "07:30:00";

function formatWaktu(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isTerlambat(value) {
  if (!value) return false;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}` > JAM_MASUK_STANDAR;
}

// 0 = Minggu, 6 = Sabtu
function getHari(tanggal) {
  const parts = String(tanggal || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return -1;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d).getDay();
}

function isWeekendDay(tanggal) {
  const day = getHari(tanggal);
  return day === 0 || day === 6;
}

function formatTanggalSingkat(tanggal) {
  const parts = String(tanggal || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return String(tanggal || "").toUpperCase();
  const [y, m, d] = parts;
  return new Date(y, m - 1, d)
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase()
    .replace(/\./g, "");
}

function todayLabel() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [todayJurnal, setTodayJurnal] = useState(null);

  const [kegiatan, setKegiatan] = useState("");
  const [judul, setJudul] = useState("");
  const [jurnalLoading, setJurnalLoading] = useState(false);
  const [jurnalMessage, setJurnalMessage] = useState(null);

  // Riwayat Presensi
  const [histori, setHistori] = useState([]);
  const [historiLoading, setHistoriLoading] = useState(true);
  const [historiError, setHistoriError] = useState("");
  const [dariTanggal, setDariTanggal] = useState("");
  const [sampaiTanggal, setSampaiTanggal] = useState("");
  const [appliedDari, setAppliedDari] = useState("");
  const [appliedSampai, setAppliedSampai] = useState("");

  const inputTanggal =
    "w-full px-3.5 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200";

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
    } catch {
      // Status gagal dimuat: biarkan kosong
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

  const fetchHistori = async () => {
    setHistoriLoading(true);
    setHistoriError("");
    try {
      const { data } = await api.get("/presensi/histori");
      const rows = data.data || [];
      setHistori(rows);
    } catch (err) {
      setHistoriError(getErrorMessage(err, "Gagal memuat riwayat presensi."));
    } finally {
      setHistoriLoading(false);
    }
  };

  const handleSaring = () => {
    let d = dariTanggal.trim();
    let s = sampaiTanggal.trim();
    if (d && s && d > s) {
      const t = d;
      d = s;
      s = t;
    }
    setAppliedDari(d);
    setAppliedSampai(s);
  };

  useEffect(() => {
    fetchHistori();
  }, []);

  useEffect(() => {
    if (!historiLoading && histori.length && !appliedDari) {
      const dates = histori.map((r) => r.tanggal).filter(Boolean).sort();
      if (dates.length) {
        setDariTanggal(dates[0]);
        setSampaiTanggal(todayLabel());
        setAppliedDari(dates[0]);
        setAppliedSampai(todayLabel());
      }
    }
  }, [histori, historiLoading, appliedDari]);

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

  // 0 = Minggu, 6 = Sabtu
  const todayDay = new Date().getDay();
  const isWeekendToday = todayDay === 0 || todayDay === 6;

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

  const renderHero = () => {
    if (isWeekendToday) {
      return (
        <section className="bg-gradient-to-r from-slate-200 via-slate-100 to-blue-200 p-6 rounded-3xl shadow-lg shadow-slate-200/60 relative overflow-hidden border border-slate-200">
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/40 pointer-events-none" />
          <div className="absolute top-1/2 right-6 w-20 h-20 rounded-full border border-white/50 pointer-events-none" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">Selamat Datang,</p>
                <h2 className="text-2xl font-bold text-slate-800 leading-tight mt-0.5 truncate">
                  {user.nama_lengkap.split(" ")[0]}!
                </h2>
                <p className="text-[13px] text-slate-500 mt-1">
                  {new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/50 border border-white/70 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0">
                {initialsOf(user.nama_lengkap)}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/60 border border-blue-100 flex items-center justify-center shrink-0 text-slate-500">
                <CalendarDays size={22} />
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-200 border border-slate-300 text-[11px] font-semibold text-slate-600">
                  Status Hari Ini
                </span>
                <h3 className="text-xl font-bold text-slate-800 mt-1 leading-tight">
                  Hari Libur Akhir Pekan (Sabtu/Minggu)
                </h3>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Bebas Tugas Absensi — Tidak ada kewajiban Clock-In / Clock-Out hari ini.
            </p>
          </div>
        </section>
      );
    }

    return (
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
  };

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
        disabled={!canClockIn || isWeekendToday}
        className="relative overflow-hidden w-full flex flex-col items-center justify-center gap-2 min-h-[88px] rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none text-white font-semibold shadow-sm shadow-orange-600/25 hover:shadow-md hover:shadow-orange-600/30 transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
      >
        <Camera size={26} />
        Clock In
      </button>
      <button
        onClick={() => navigate("/presensi/kamera?tipe=pulang")}
        disabled={!canClockOut || isWeekendToday}
        className="relative overflow-hidden w-full flex flex-col items-center justify-center gap-2 min-h-[88px] rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none text-white font-semibold shadow-sm shadow-orange-600/25 hover:shadow-md hover:shadow-orange-600/30 transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
      >
        <LogOut size={26} />
        Clock Out
      </button>

      <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center shrink-0">
          <MapPin size={16} />
        </div>
        <p className="text-xs text-slate-500">Lokasi GPS diambil otomatis di halaman kamera.</p>
      </div>

      {isWeekendToday && (
        <div className="pt-1 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
            <CalendarDays size={16} />
          </div>
          <p className="text-xs font-medium text-slate-500">
            Hari libur akhir pekan — tombol Clock In / Clock Out dinonaktifkan.
          </p>
        </div>
      )}
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

  const renderPresensiView = () => {
    const renderLogCard = (log, idx) => {
      const masuk = log.tipe_presensi === "masuk";
      return (
        <article
          key={`log-${log.id || log.tanggal || idx}`}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-3 transition-all duration-200 active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                masuk ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
              }`}
            >
              {masuk ? <LogIn size={20} /> : <LogOut size={20} />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                {formatTanggalSingkat(log.tanggal)}
              </p>
              <h4 className="text-[15px] font-bold text-slate-900 truncate">
                {masuk ? "Absen Masuk" : "Absen Pulang"}
              </h4>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-slate-800 tracking-tight tabular-nums leading-none">
              {formatWaktu(log.waktu_presensi)}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              WIB
            </p>
          </div>
        </article>
      );
    };

    const renderWeekendCard = (tg) => (
      <article
          key={`weekend-${tg}`}
          className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3 transition-all duration-200 active:scale-[0.99]"
        >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
            <CalendarOff size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              {formatTanggalSingkat(tg)}
            </p>
            <h4 className="text-[15px] font-bold text-slate-500 truncate">
              Weekend / Libur Akhir Pekan
            </h4>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
          Libur
        </span>
      </article>
    );

    const records = [...histori].sort((a, b) => {
      const key = (r) => `${r.tanggal}_${r.waktu_presensi}`;
      return key(a).localeCompare(key(b));
    });

    const byDate = {};
    for (const r of records) {
      if (!byDate[r.tanggal]) byDate[r.tanggal] = [];
      byDate[r.tanggal].push(r);
    }

    const list = [];
    const dtFrom = appliedDari;
    const dtTo = appliedSampai;

    if (dtFrom && dtTo) {
      const [fy, fm, fd] = dtFrom.split("-").map(Number);
      const [ty, tm, td] = dtTo.split("-").map(Number);
      if (!isNaN(fy) && !isNaN(fm) && !isNaN(fd) && !isNaN(ty) && !isNaN(tm) && !isNaN(td)) {
        const cur = new Date(fy, fm - 1, fd);
        const end = new Date(ty, tm - 1, td);
        while (cur <= end) {
          const tg = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
          if (isWeekendDay(tg)) list.push({ type: "weekend", tanggal: tg });
          for (const r of byDate[tg] || []) {
            list.push({ type: "log", log: r });
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    } else {
      for (const r of records) {
        list.push({ type: "log", log: r });
      }
    }

    const totalCatatan = list.filter((e) => e.type === "log").length;
    let totalTerlambat = 0;
    for (const e of list) {
      if (
        e.type === "log" &&
        e.log.tipe_presensi === "masuk" &&
        isTerlambat(e.log.waktu_presensi)
      ) {
        totalTerlambat += 1;
      }
    }

    return (
      <div className="-mx-4 -mt-5 pb-32">
        {/* Banner seamless dengan top bar menyatu */}
        <div className="relative">
          <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400 rounded-b-[2.5rem] shadow-lg shadow-orange-500/20 pt-4 pb-16">
            <div className="px-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 border border-white/30 text-white shrink-0">
                  <Zap size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-white leading-tight truncate">
                    Pusdiklat Digital
                  </p>
                  <p className="text-[11px] text-orange-100 truncate">Dashboard Magang</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center text-xs font-bold">
                  {initialsOf(user.nama_lengkap)}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-white/15 border border-white/30 text-white hover:bg-white/25 transition-all duration-200 cursor-pointer"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="relative -mt-9 px-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-bold tracking-[0.16em] uppercase">
                    <History size={12} />
                    Log Digital
                  </span>
                  <h3 className="mt-2.5 text-xl font-bold text-slate-900 tracking-tight leading-tight">
                    RIWAYAT ABSENSI
                  </h3>
                  <p className="mt-1 text-xs font-normal text-slate-500">
                    Seluruh catatan kehadiran Anda selama PKL
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-sm shadow-orange-100">
                  <CalendarDays size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">
          {/* Filter rentang tanggal */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Dari Tanggal
                </span>
                <input
                  type="date"
                  value={dariTanggal}
                  onChange={(e) => setDariTanggal(e.target.value)}
                  className={inputTanggal}
                />
              </label>
              <label className="block min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Sampai Tanggal
                </span>
                <input
                  type="date"
                  value={sampaiTanggal}
                  onChange={(e) => setSampaiTanggal(e.target.value)}
                  className={inputTanggal}
                />
              </label>
            </div>
            <button
              onClick={handleSaring}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold tracking-wide py-3 transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              <Filter size={16} />
              Saring Data
            </button>
          </section>

          {/* Tombol cetak + ringkasan */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              <Printer size={14} />
              Cetak Laporan PDF
            </button>
            <div className="flex items-center gap-5 shrink-0">
              <div className="text-right">
                <p className="text-lg font-bold text-slate-800 tabular-nums leading-none">
                  {totalCatatan}
                </p>
                <p className="mt-1 text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                  Catatan
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-lg font-bold tabular-nums leading-none ${
                    totalTerlambat ? "text-slate-800" : "text-slate-300"
                  }`}
                >
                  {totalTerlambat}
                </p>
                <p className="mt-1 text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                  Terlambat
                </p>
              </div>
            </div>
          </div>

          {/* Daftar riwayat */}
          {historiLoading ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center py-14 text-slate-500">
              <Loader2 size={24} className="animate-spin mr-2 text-orange-500" />
              Memuat riwayat...
            </div>
          ) : historiError ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-14 gap-3 text-center px-6">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-slate-600 font-medium">{historiError}</p>
              <button
                onClick={fetchHistori}
                className="mt-1 text-xs font-semibold text-orange-600 hover:text-orange-700 underline cursor-pointer"
              >
                Coba lagi
              </button>
            </div>
          ) : list.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-14 gap-3 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 text-orange-400 flex items-center justify-center">
                <CalendarDays size={32} />
              </div>
              <p className="text-slate-600 font-medium">
                Belum ada catatan pada rentang tanggal ini.
              </p>
              <p className="text-xs text-slate-400">
                Sesuaikan rentang tanggal atau lakukan Clock-In dari halaman Home.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {list.map((item, idx) =>
                item.type === "weekend"
                  ? renderWeekendCard(item.tanggal)
                  : renderLogCard(item.log, idx)
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

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
      {activeView !== "presensi" && renderHeader()}

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