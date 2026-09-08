import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  MapPin,
  Clock,
  CalendarCheck,
  Camera,
  NotebookPen,
  Loader2,
  AlertCircle,
  CheckCircle2,
  IdCard,
  Mail,
  UserCircle2,
} from "lucide-react";
import api from "../api/axios";

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || fallback;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [geoError, setGeoError] = useState("");
  const [loadingGeo, setLoadingGeo] = useState(false);

  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

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

  useEffect(() => {
    fetchTodayStatus();
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

  const handleClockIn = async () => {
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

    setClockLoading("in");
    try {
      const formData = new FormData();
      formData.append("latitude", String(pos.latitude));
      formData.append("longitude", String(pos.longitude));
      formData.append("foto", foto);

      const { data } = await api.post("/presensi/clock-in", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage({ type: "success", text: data.message });
      await fetchTodayStatus();
    } catch (err) {
      setMessage({
        type: "error",
        text: getErrorMessage(err, "Clock-In gagal."),
      });
    } finally {
      setClockLoading(null);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white">
              <Clock size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                Pusdiklat Digital
              </h1>
              <p className="text-xs text-gray-500">Dashboard Magang</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <UserCircle2 size={20} />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-gray-900">
                  {user.nama_lengkap}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium text-sm px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900">
            Halo, {user.nama_lengkap}! 👋
          </h2>
          <p className="text-gray-500 mt-1">
            Selamat datang kembali di dashboard presensi dan jurnal magang Anda.
          </p>
        </section>

        {/* User info chips */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IdCard size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Nama</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.nama_lengkap}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserCircle2 size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Role</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">
                {user.role}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Mail size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </section>

        {/* Global message */}
        {message && (
          <div
            className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-700"
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

        {/* Presensi card */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-md shadow-gray-200/50 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
              <CalendarCheck size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Presensi</h3>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Status ringkasan */}
          {loadingStatus ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-6">
              <Loader2 size={18} className="animate-spin" />
              Memuat status presensi...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div
                className={`rounded-2xl border p-4 text-center ${
                  status?.clock_in
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <p className="text-xs text-gray-500 font-medium">Clock In</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    status?.clock_in ? "text-emerald-600" : "text-gray-400"
                  }`}
                >
                  {clockInTime || "—"}
                </p>
              </div>
              <div
                className={`rounded-2xl border p-4 text-center ${
                  status?.clock_out
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <p className="text-xs text-gray-500 font-medium">Clock Out</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    status?.clock_out ? "text-emerald-600" : "text-gray-400"
                  }`}
                >
                  {clockOutTime || "—"}
                </p>
              </div>
            </div>
          )}

          {/* Foto bukti */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Foto Bukti Presensi
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium text-sm px-4 py-2.5 rounded-xl cursor-pointer transition-colors">
                <Camera size={16} />
                {foto ? "Ganti Foto" : "Pilih Foto"}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFoto(e.target.files[0] || null)}
                />
              </label>
              {foto && (
                <span className="text-sm text-gray-500 truncate">
                  {foto.name}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Wajib melampirkan foto untuk Clock-In dan Clock-Out.
            </p>
          </div>

          {/* Lokasi */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={16} className="text-indigo-500 shrink-0" />
              {coords.latitude && coords.longitude ? (
                <span>
                  {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                </span>
              ) : loadingGeo ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  Mengambil lokasi...
                </span>
              ) : (
                <span>Lokasi akan diambil saat presensi.</span>
              )}
            </div>
            {geoError && (
              <div className="flex items-center gap-1.5 text-red-600 text-sm mt-1.5">
                <AlertCircle size={14} />
                {geoError}
              </div>
            )}
          </div>

          {/* Tombol */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleClockIn}
              disabled={!canClockIn || clockLoading !== null}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {clockLoading === "in" ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Clock size={20} />
                  Clock In
                </>
              )}
            </button>
            <button
              onClick={handleClockOut}
              disabled={!canClockOut || clockLoading !== null}
              className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {clockLoading === "out" ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogOut size={20} />
                  Clock Out
                </>
              )}
            </button>
          </div>
        </section>

        {/* Jurnal card */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-md shadow-gray-200/50 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
              <NotebookPen size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Jurnal Harian</h3>
              <p className="text-sm text-gray-500">
                Catat kegiatan magang Anda untuk hari ini.
              </p>
            </div>
          </div>

          {jurnalMessage && (
            <div
              className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm mb-5 ${
                jurnalMessage.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-red-50 border border-red-200 text-red-700"
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

          <form onSubmit={handleSubmitJurnal} className="space-y-5">
            <div>
              <label
                htmlFor="judul"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Judul Kegiatan
              </label>
              <input
                id="judul"
                type="text"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Mempelajari React Router"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="kegiatan"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Kegiatan
              </label>
              <textarea
                id="kegiatan"
                value={kegiatan}
                onChange={(e) => setKegiatan(e.target.value)}
                rows={5}
                placeholder="Deskripsikan kegiatan yang Anda lakukan hari ini..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={jurnalLoading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {jurnalLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <NotebookPen size={20} />
                  Simpan Jurnal
                </>
              )}
            </button>
          </form>
        </section>

        <footer className="text-center text-gray-400 text-sm pb-6">
          &copy; {new Date().getFullYear()} Pusdiklat Digital
        </footer>
      </main>
    </div>
  );
}
