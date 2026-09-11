import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  MapPin,
  RefreshCw,
  VideoOff,
  ImagePlus,
  ScanFace,
} from "lucide-react";
import api from "../api/axios";

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || fallback;
}

export default function CameraPresensi() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [captured, setCaptured] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState("idle"); // idle | locating | ready
  const [geoError, setGeoError] = useState("");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      const text =
        err.name === "NotAllowedError"
          ? "Izin kamera ditolak. Izinkan akses kamera di browser."
          : err.name === "NotFoundError"
          ? "Kamera tidak ditemukan pada perangkat ini."
          : "Gagal mengakses kamera. Pastikan browser mendukung.";
      setCameraError(text);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const file = new File([blob], `presensi-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setCaptured(url);
        setCapturedFile(file);
        stopCamera();
      },
      "image/jpeg",
      0.85
    );
  }, [stopCamera]);

  const handleRetake = useCallback(() => {
    if (captured) URL.revokeObjectURL(captured);
    setCaptured(null);
    setCapturedFile(null);
    setMessage(null);
    startCamera();
  }, [captured, startCamera]);

  const getGeoPosition = useCallback(() => {
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
  }, []);

  const handleProbeGps = useCallback(async () => {
    setGeoError("");
    setGeoLoading(true);
    setGeoStatus("locating");
    try {
      await getGeoPosition();
      setGeoStatus("ready");
    } catch (err) {
      setGeoStatus("idle");
      setGeoError(
        err.code === 1
          ? "Izin lokasi ditolak."
          : "GPS tidak ditemukan. Pastikan lokasi aktif."
      );
    } finally {
      setGeoLoading(false);
    }
  }, [getGeoPosition]);

  const handleSubmit = useCallback(async () => {
    setMessage(null);
    setGeoError("");
    setGeoStatus("locating");
    setGeoLoading(true);

    let position;
    try {
      position = await getGeoPosition();
      setGeoStatus("ready");
    } catch (err) {
      const text =
        err.code === 1
          ? "Izin lokasi ditolak. Izinkan akses lokasi untuk presensi."
          : "Gagal mendapatkan lokasi. Pastikan GPS aktif.";
      setGeoError(text);
      setGeoStatus("idle");
      setGeoLoading(false);
      return;
    }

    const { latitude, longitude } = position.coords;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("latitude", String(latitude));
      formData.append("longitude", String(longitude));
      formData.append("foto", capturedFile);

      const { data } = await api.post("/presensi/clock-in", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage({ type: "success", text: data.message });
      setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
    } catch (err) {
      setMessage({
        type: "error",
        text: getErrorMessage(err, "Clock-In gagal. Silakan coba lagi."),
      });
    } finally {
      setLoading(false);
      setGeoLoading(false);
    }
  }, [capturedFile, getGeoPosition, navigate]);

  useEffect(() => {
    handleProbeGps();
  }, [handleProbeGps]);

  useEffect(() => {
    return () => {
      if (captured) URL.revokeObjectURL(captured);
    };
  }, [captured]);

  const handleBack = () => {
    stopCamera();
    navigate("/dashboard", { replace: true });
  };

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCaptured(url);
      setCapturedFile(file);
      stopCamera();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Floating toast */}
      {message && (
        <div className="fixed top-5 inset-x-4 z-50 mx-auto max-w-md">
          <div
            className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm border shadow-lg ${
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
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-3 min-h-[42px] rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm transition-all duration-200 cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline text-sm font-medium">Kembali</span>
        </button>

        <div className="text-center min-w-0">
          <h1 className="text-base font-bold text-slate-900">Clock In</h1>
          <p className="text-[11px] text-slate-500">
            {captured ? "Preview & Konfirmasi" : "Absensi Kamera Selfie"}
          </p>
        </div>

        {/* GPS status */}
        <button
          onClick={handleProbeGps}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-all duration-200 cursor-pointer"
          title="Cek GPS"
        >
          {geoStatus === "locating" ? (
            <Loader2 size={13} className="animate-spin text-orange-500" />
          ) : (
            <MapPin size={13} className={geoStatus === "ready" ? "text-emerald-600" : "text-amber-500"} />
          )}
          <span className="hidden min-[380px]:inline">
            {geoStatus === "ready" ? "GPS Siap" : geoStatus === "locating" ? "Mencari GPS" : "GPS Nonaktif"}
          </span>
        </button>
      </header>

      {/* Scanner viewport */}
      <main className="flex-1 p-4 sm:p-8 flex flex-col items-center">
        <div className="w-full max-w-sm">
          {/* Smartphone frame */}
          <div className="border-4 border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl relative aspect-[3/4] bg-slate-900">
            {cameraError && !captured ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
                  <VideoOff size={32} className="text-red-400" />
                </div>
                <p className="text-red-400 text-sm leading-relaxed">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 min-h-[44px] px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-lg shadow-orange-600/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <RefreshCw size={16} />
                  Coba Lagi
                </button>
              </div>
            ) : (
              <>
                {/* Video / preview */}
                {!captured ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={captured}
                    alt="Hasil foto"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                {/* Vignette + scanning area */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,6,23,0.45)_100%)]" />

                {/* Face oval guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[70%] h-[44%] rounded-[9999px] border-2 border-dashed border-white/70" />
                </div>

                {/* Corner brackets */}
                <div className="absolute inset-[10%] pointer-events-none">
                  <span className="absolute top-0 left-0 h-9 w-9 border-t-4 border-l-4 border-orange-400 rounded-tl-2xl" />
                  <span className="absolute top-0 right-0 h-9 w-9 border-t-4 border-r-4 border-orange-400 rounded-tr-2xl" />
                  <span className="absolute bottom-0 left-0 h-9 w-9 border-b-4 border-l-4 border-orange-400 rounded-bl-2xl" />
                  <span className="absolute bottom-0 right-0 h-9 w-9 border-b-4 border-r-4 border-orange-400 rounded-br-2xl" />
                </div>

                {/* Moving scan line */}
                {!captured && (
                  <div className="face-scan-line pointer-events-none absolute left-[10%] right-[10%] h-[3px] rounded-full bg-orange-400 shadow-[0_0_16px_4px_rgba(251,146,60,0.55)]" />
                )}

                {/* Camera boot loader */}
                {!cameraReady && !captured && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/60">
                    <Loader2 size={32} className="animate-spin text-orange-400" />
                    <p className="text-xs text-white/80">Mengaktifkan kamera...</p>
                  </div>
                )}

                {/* In-frame hints */}
                {!captured && !cameraError ? (
                  <div className="absolute inset-x-6 bottom-5 flex items-center justify-center gap-1.5 pointer-events-none">
                    <ScanFace size={15} className="text-white/90" />
                    <p className="text-xs font-medium text-white/90 text-center drop-shadow">
                      Posisikan wajah di dalam area
                    </p>
                  </div>
                ) : (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-lg">
                    <CheckCircle2 size={14} />
                    Foto Diambil
                  </div>
                )}
              </>
            )}
          </div>

          {!captured && !cameraError && (
            <p className="mt-4 text-center text-xs text-slate-500 leading-relaxed">
              Pastikan wajah dalam bingkai dan pencahayaan cukup.
              <br className="hidden sm:block" /> Koordinat GPS akan dilampirkan otomatis ke laporan.
            </p>
          )}
          {cameraError && !captured && (
            <p className="mt-4 text-center text-xs text-slate-500">
              Tidak dapat mengakses kamera — Anda tetap bisa mengunggah dari galeri di bawah.
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="mt-6 w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          {!captured ? (
            <>
              {geoError && (
                <p className="text-center text-xs text-red-500 mb-3 inline-flex items-center gap-1 w-full justify-center">
                  <AlertCircle size={13} />
                  {geoError}
                </p>
              )}

              {/* Shutter */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleCapture}
                  disabled={!cameraReady}
                  aria-label="Ambil Foto"
                  className="relative w-20 h-20 rounded-full bg-orange-600 ring-8 ring-orange-100 shadow-lg shadow-orange-600/30 flex items-center justify-center transition-all duration-200 active:scale-90 disabled:bg-slate-300 disabled:ring-slate-100 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="w-12 h-12 rounded-full border-4 border-white block" />
                </button>
                <p className="text-xs font-medium text-slate-500">
                  Ketuk tombol untuk mengambil foto presensi
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 min-h-[46px] bg-white hover:bg-orange-50 border border-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <ImagePlus size={17} />
                  Atau unggah dari galeri
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-emerald-600 mb-3 text-sm font-semibold">
                <CheckCircle2 size={18} />
                Foto berhasil diambil
              </div>

              {geoStatus === "locating" ? (
                <p className="text-center text-xs text-slate-500 mb-2 inline-flex items-center gap-1.5 justify-center">
                  <Loader2 size={13} className="animate-spin text-orange-500" />
                  Mengunci koordinat GPS...
                </p>
              ) : geoError ? (
                <p className="text-center text-xs text-red-500 mb-2 inline-flex items-center gap-1 justify-center">
                  <AlertCircle size={13} />
                  {geoError}
                </p>
              ) : (
                <p className="text-center text-xs text-slate-500 mb-2">
                  <MapPin size={13} className="inline-block mr-1 text-orange-500" />
                  GPS siap — lokasi akan dilampirkan
                </p>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={loading || geoLoading}
                  className="relative overflow-hidden w-full flex items-center justify-center gap-2 min-h-[56px] bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-2xl shadow-sm shadow-orange-600/25 hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={22} className="animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <MapPin size={22} />
                      Kirim Absen
                    </>
                  )}
                </button>
                <button
                  onClick={handleRetake}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 min-h-[52px] bg-white hover:bg-orange-50 border border-slate-200 text-slate-700 font-medium rounded-2xl transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={20} />
                  Foto Ulang
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Hidden DOM */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFilePick}
      />
    </div>
  );
}