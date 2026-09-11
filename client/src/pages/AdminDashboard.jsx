import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Users,
  BookOpen,
  Camera,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  X,
  MapPin,
  Search,
  Filter,
  Printer,
  Shield,
  Eye,
  RefreshCw,
  Menu,
  ChevronRight,
  Home,
  Zap,
} from "lucide-react";
import api from "../api/axios";

const TABS = [
  { id: "users", label: "Management User", icon: Users },
  { id: "jurnal", label: "Verifikasi Jurnal", icon: BookOpen },
  { id: "monitoring", label: "Monitoring Absensi", icon: Camera },
  { id: "rekap", label: "Rekap & Laporan", icon: FileText },
];

const ROLES = ["peserta", "admin", "pembimbing"];

const API_BASE_URL = "http://localhost:5000";

const btnPrimary =
  "relative overflow-hidden inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-medium text-sm px-4 min-h-[42px] rounded-xl shadow-sm shadow-orange-600/20 hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed";

const inputCls =
  "w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200";

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || fallback;
}

function getImageUrl(path, folder) {
  if (!path) return "https://via.placeholder.com/300x225?text=No+Image";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  let cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (folder && !cleanPath.startsWith(`/${folder}/`)) {
    cleanPath = `/${folder}${cleanPath}`;
  }

  if (!cleanPath.includes("uploads")) {
    cleanPath = `/uploads${cleanPath}`;
  }

  return `${API_BASE_URL}${cleanPath}`;
}

function handleImageError(e) {
  e.target.onerror = null;
  e.target.src = "https://via.placeholder.com/300x225?text=Gambar+Tidak+Tersedia";
}

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors duration-200 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm border ${
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
  );
}

function InputField({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        {...props}
        className={`${inputCls} ${props.className || ""}`}
      />
    </div>
  );
}

function SelectField({ label, options, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <select {...props} className={`${inputCls} appearance-none ${props.className || ""}`}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ==================== MANAGEMENT USER TAB ====================

function UsersTab({ searchKeyword = "" }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    nisn_nim: "",
    nama_lengkap: "",
    email: "",
    password: "",
    role: "peserta",
    status_akun: "aktif",
    asal_instansi: "",
  });

  useEffect(() => {
    if (searchKeyword) setSearch(searchKeyword);
  }, [searchKeyword]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.data);
    } catch (err) {
      setToast({ type: "error", text: getErrorMessage(err, "Gagal memuat data user.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm({
      nisn_nim: "",
      nama_lengkap: "",
      email: "",
      password: "",
      role: "peserta",
      status_akun: "aktif",
      asal_instansi: "",
    });
    setShowForm(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      nisn_nim: user.nisn_nim || "",
      nama_lengkap: user.nama_lengkap || "",
      email: user.email || "",
      password: "",
      role: user.role || "peserta",
      status_akun: user.status_akun || "aktif",
      asal_instansi: user.asal_instansi || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToast(null);
    try {
      const payload = { ...form };
      if (!payload.password.trim() && editingUser) {
        delete payload.password;
      }

      if (editingUser) {
        await api.put(`/admin/users/${editingUser.user_id}`, payload);
        setToast({ type: "success", text: "User berhasil diperbarui." });
      } else {
        await api.post("/admin/users", payload);
        setToast({ type: "success", text: "User berhasil dibuat." });
      }
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setToast({ type: "error", text: getErrorMessage(err, "Gagal menyimpan user.") });
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Hapus user "${user.nama_lengkap}"?`)) return;
    setToast(null);
    try {
      await api.delete(`/admin/users/${user.user_id}`);
      setToast({ type: "success", text: "User berhasil dihapus." });
      fetchUsers();
    } catch (err) {
      setToast({ type: "error", text: getErrorMessage(err, "Gagal menghapus user.") });
    }
  };

  const filtered = users.filter(
    (u) =>
      u.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.nisn_nim?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Toast message={toast} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, email, NISN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-10`}
          />
        </div>
        <button onClick={openCreate} className={btnPrimary}>
          <Plus size={16} />
          Tambah User
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 size={24} className="animate-spin mr-2 text-orange-500" />
          Memuat data...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">NISN/NIM</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Instansi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                      Tidak ada data user.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u, idx) => (
                    <tr key={u.user_id} className="hover:bg-orange-50/40 transition-colors duration-150">
                      <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.nisn_nim}</td>
                      <td className="px-4 py-3 text-slate-900 font-semibold">{u.nama_lengkap}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === "admin"
                            ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                            : u.role === "pembimbing"
                            ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                            : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                        }`}>
                          {u.role === "admin" && <Shield size={10} />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.status_akun === "aktif"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}>
                          {u.status_akun}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{u.asal_instansi || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200 cursor-pointer"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingUser ? "Edit User" : "Tambah User"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="NISN/NIM"
            type="text"
            value={form.nisn_nim}
            onChange={(e) => setForm({ ...form, nisn_nim: e.target.value })}
            placeholder="Masukkan NISN atau NIM"
            required
          />
          <InputField
            label="Nama Lengkap"
            type="text"
            value={form.nama_lengkap}
            onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
            placeholder="Masukkan nama lengkap"
            required
          />
          <InputField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Masukkan email"
            required
          />
          <InputField
            label={editingUser ? "Password (kosongkan jika tidak diubah)" : "Password"}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editingUser ? "Kosongkan jika tidak diubah" : "Masukkan password"}
            required={!editingUser}
          />
          <SelectField
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={ROLES.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
          />
          <SelectField
            label="Status Akun"
            value={form.status_akun}
            onChange={(e) => setForm({ ...form, status_akun: e.target.value })}
            options={[
              { value: "aktif", label: "Aktif" },
              { value: "non-aktif", label: "Non-Aktif" },
            ]}
          />
          <InputField
            label="Asal Instansi"
            type="text"
            value={form.asal_instansi}
            onChange={(e) => setForm({ ...form, asal_instansi: e.target.value })}
            placeholder="Masukkan asal instansi"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-all duration-200 cursor-pointer"
            >
              Batal
            </button>
            <button type="submit" className={btnPrimary}>
              {editingUser ? "Simpan Perubahan" : "Buat User"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ==================== VERIFIKASI JURNAL TAB ====================

function JurnalTab() {
  const [jurnals, setJurnals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterTanggal, setFilterTanggal] = useState("");
  const [allUsers, setAllUsers] = useState([]);

  const [verifModal, setVerifModal] = useState(null);
  const [verifStatus, setVerifStatus] = useState("disetujui");
  const [catatan, setCatatan] = useState("");
  const [verifLoading, setVerifLoading] = useState(false);

  const fetchJurnals = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status_submit = filterStatus;
      if (filterUser) params.user_id = filterUser;
      if (filterTanggal) params.tanggal = filterTanggal;
      const { data } = await api.get("/admin/jurnal", { params });
      setJurnals(data.data);
    } catch (err) {
      setToast({ type: "error", text: getErrorMessage(err, "Gagal memuat jurnal.") });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/admin/users");
      setAllUsers(data.data);
    } catch {}
  };

  useEffect(() => {
    fetchJurnals();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchJurnals();
  }, [filterStatus, filterUser, filterTanggal]);

  const openVerif = (jurnal) => {
    setVerifModal(jurnal);
    setVerifStatus("disetujui");
    setCatatan(jurnal.catatan_pembimbing || "");
  };

  const handleVerif = async () => {
    setVerifLoading(true);
    try {
      await api.put(`/admin/jurnal/${verifModal.jurnal_id}/verifikasi`, {
        status_verifikasi: verifStatus,
        catatan_pembimbing: catatan.trim() || undefined,
      });
      setToast({ type: "success", text: "Verifikasi berhasil." });
      setVerifModal(null);
      fetchJurnals();
    } catch (err) {
      setToast({ type: "error", text: getErrorMessage(err, "Gagal verifikasi jurnal.") });
    } finally {
      setVerifLoading(false);
    }
  };

  const pesertaUsers = allUsers.filter((u) => u.role === "peserta");

  const statusBadge = (s) =>
    s === "diverifikasi"
      ? "bg-emerald-600 text-white"
      : "bg-amber-500 text-white";

  return (
    <div className="space-y-4">
      <Toast message={toast} />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className={`${inputCls} pl-10 appearance-none`}
            >
              <option value="">Semua Peserta</option>
              {pesertaUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.nama_lengkap}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`${inputCls} w-auto appearance-none`}
            >
              <option value="">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="diverifikasi">Diverifikasi</option>
            </select>
          </div>
          <input
            type="date"
            value={filterTanggal}
            onChange={(e) => setFilterTanggal(e.target.value)}
            className={`${inputCls} w-auto`}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 size={24} className="animate-spin mr-2 text-orange-500" />
          Memuat data...
        </div>
      ) : (
        <>
          {jurnals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-10 text-center text-slate-400">
              Tidak ada data jurnal.
            </div>
          ) : (
            <div className="md:hidden space-y-3">
              {jurnals.map((j) => (
                <div key={j.jurnal_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{j.nama_lengkap}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{j.tanggal}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge(j.status_submit)}`}>
                      {j.status_submit}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-900 font-medium break-words">{j.judul_kegiatan}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {j.deskripsi_kegiatan || "-"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-500 min-w-0 truncate">
                      <span className="text-slate-400">Catatan: </span>
                      {j.catatan_pembimbing || "-"}
                    </p>
                    <button
                      onClick={() => openVerif(j)}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer px-3 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 transition-all duration-200"
                    >
                      <Eye size={14} />
                      Verifikasi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Peserta</th>
                    <th className="px-4 py-3">Judul Kegiatan</th>
                    <th className="px-4 py-3">Deskripsi</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Catatan</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jurnals.map((j, idx) => (
                    <tr key={j.jurnal_id} className="hover:bg-orange-50/40 transition-colors duration-150">
                      <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{j.tanggal}</td>
                      <td className="px-4 py-3 text-slate-900 font-semibold">{j.nama_lengkap}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{j.judul_kegiatan}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[250px] truncate text-xs">{j.deskripsi_kegiatan}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(j.status_submit)}`}>
                          {j.status_submit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate text-xs">
                        {j.catatan_pembimbing || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openVerif(j)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 transition-all duration-200"
                        >
                          <Eye size={14} />
                          Verifikasi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal isOpen={!!verifModal} onClose={() => setVerifModal(null)} title="Verifikasi Jurnal">
        {verifModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Peserta</span>
                <span className="text-slate-900 font-semibold">{verifModal.nama_lengkap}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tanggal</span>
                <span className="text-slate-900">{verifModal.tanggal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Judul</span>
                <span className="text-slate-900 font-semibold">{verifModal.judul_kegiatan}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Deskripsi Kegiatan</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 max-h-32 overflow-y-auto">
                {verifModal.deskripsi_kegiatan}
              </div>
            </div>

            <SelectField
              label="Status Verifikasi"
              value={verifStatus}
              onChange={(e) => setVerifStatus(e.target.value)}
              options={[
                { value: "disetujui", label: "Disetujui" },
                { value: "revisi", label: "Revisi / Ditolak" },
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan Pembimbing</label>
              <textarea
                rows={3}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Tulis catatan atau feedback untuk peserta..."
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setVerifModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-all duration-200 cursor-pointer"
              >
                Batal
              </button>
              <button onClick={handleVerif} disabled={verifLoading} className={btnPrimary}>
                {verifLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Simpan Verifikasi
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ==================== MONITORING ABSENSI TAB ====================

function MonitoringTab({ searchKeyword = "" }) {
  const [presensi, setPresensi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [filterTanggal, setFilterTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [filterTipe, setFilterTipe] = useState("semua");
  const [filterNama, setFilterNama] = useState(searchKeyword || "");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (searchKeyword) setFilterNama(searchKeyword);
  }, [searchKeyword]);

  const fetchPresensi = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/presensi", {
        params: { tanggal: filterTanggal || "all" },
      });
      setPresensi(data.data);
    } catch (err) {
      setToast({ type: "error", text: getErrorMessage(err, "Gagal memuat data presensi.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresensi();
  }, [filterTanggal]);

  const filtered = presensi
    .filter((p) => filterTipe === "semua" || p.tipe_presensi === filterTipe)
    .filter((p) => {
      if (!filterNama.trim()) return true;
      const q = filterNama.toLowerCase();
      return (
        p.nama_lengkap?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
      );
    });

  const photos = filtered.filter((p) => p.foto_url);
  const nonPhotos = filtered.filter((p) => !p.foto_url);

  const resetFilters = () => {
    setFilterTipe("semua");
    setFilterNama("");
  };

  const tipeBadge = (t) =>
    t === "masuk"
      ? "bg-emerald-600 text-white"
      : "bg-orange-600 text-white";

  const kpis = [
    {
      label: "Total Presensi",
      value: filtered.length,
      icon: Camera,
      tone: "bg-orange-50 text-orange-600 border-orange-100",
    },
    {
      label: "Clock In",
      value: filtered.filter((p) => p.tipe_presensi === "masuk").length,
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
    {
      label: "Clock Out",
      value: filtered.filter((p) => p.tipe_presensi === "pulang").length,
      icon: LogOut,
      tone: "bg-amber-50 text-amber-600 border-amber-100",
    },
    {
      label: "Tanpa Foto",
      value: nonPhotos.length,
      icon: AlertCircle,
      tone: "bg-slate-100 text-slate-500 border-slate-200",
    },
  ];

  return (
    <div className="space-y-4">
      <Toast message={toast} />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <label className="text-sm text-slate-600">Tanggal:</label>
          </div>
          <input
            type="date"
            value={filterTanggal}
            onChange={(e) => setFilterTanggal(e.target.value)}
            className={inputCls}
          />
          <button
            onClick={() => setFilterTanggal(new Date().toISOString().split("T")[0])}
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline cursor-pointer"
          >
            Hari ini
          </button>
          <span className="text-sm text-slate-500 sm:ml-auto">
            {filtered.length} dari {presensi.length} presensi
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:border-t sm:border-slate-100 sm:pt-3">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {[
              { value: "semua", label: "Semua" },
              { value: "masuk", label: "Clock In" },
              { value: "pulang", label: "Clock Out" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterTipe(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  filterTipe === opt.value
                    ? "bg-orange-600 text-white shadow-sm shadow-orange-600/25"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama peserta / email..."
              value={filterNama}
              onChange={(e) => setFilterNama(e.target.value)}
              className={`${inputCls} pl-10`}
            />
          </div>

          {(filterNama || filterTipe !== "semua") && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors duration-200 cursor-pointer"
            >
              <X size={14} />
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Bento summary status cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-3 hover:shadow-md transition-all duration-200"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">
                  {k.label}
                </p>
                <p className="text-3xl font-bold tabular-nums text-slate-900 mt-1">{k.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${k.tone}`}>
                <Icon size={19} />
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 size={24} className="animate-spin mr-2 text-orange-500" />
          Memuat data...
        </div>
      ) : presensi.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-12 gap-2 text-center">
          <Filter size={32} className="text-slate-300" />
          <p className="text-slate-500">Tidak ada data presensi untuk tanggal ini.</p>
        </div>
      ) : photos.length === 0 && nonPhotos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-12 gap-3 text-center">
          <Search size={32} className="text-slate-300" />
          <p className="text-slate-500">Tidak ada data presensi yang sesuai filter.</p>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
          >
            <RefreshCw size={14} />
            Reset Filter
          </button>
        </div>
      ) : (
        <>
          {photos.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                Foto Bukti Presensi
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {photos.map((p) => (
                  <div
                    key={p.presensi_id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                    onClick={() => setPreview(p)}
                  >
                    <div className="relative aspect-[4/3] bg-slate-100">
                      <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                        <Camera size={28} />
                      </div>
                      <img
                        src={getImageUrl(p.foto_url, "presensi")}
                        alt={`Presensi ${p.nama_lengkap}`}
                        className="relative z-[1] w-full h-full object-cover"
                        loading="lazy"
                        onError={handleImageError}
                      />
                      <span
                        className={`absolute top-2.5 right-2.5 z-[2] inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white shadow-sm ${tipeBadge(p.tipe_presensi)}`}
                      >
                        {p.tipe_presensi === "masuk" ? "Clock In" : "Clock Out"}
                      </span>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 z-[1]">
                        <Eye size={24} className="text-white" />
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="mb-2.5">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                          Peserta
                        </p>
                        <p className="text-sm font-bold text-slate-900 truncate">{p.nama_lengkap}</p>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                            Waktu
                          </p>
                          <p className="text-2xl font-bold tabular-nums text-slate-900 tracking-tight leading-none mt-1">
                            {new Date(p.waktu_presensi).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {p.jarak_meter !== null && p.jarak_meter !== undefined && (
                          <span className="text-xs font-semibold text-slate-500 shrink-0">
                            {p.jarak_meter}m
                          </span>
                        )}
                      </div>
                      {p.latitude && p.longitude && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin size={12} className="text-orange-500 shrink-0" />
                          <span className="truncate">
                            {Number(p.latitude).toFixed(6)}, {Number(p.longitude).toFixed(6)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nonPhotos.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                Data Presensi (Tanpa Foto)
              </h4>

              <div className="md:hidden space-y-3">
                {nonPhotos.map((p) => (
                  <div key={p.presensi_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 min-w-0 truncate">
                        {p.nama_lengkap}
                      </p>
                      <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${tipeBadge(p.tipe_presensi)}`}>
                        {p.tipe_presensi === "masuk" ? "Clock In" : "Clock Out"}
                      </span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
                      {new Date(p.waktu_presensi).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={12} className="text-orange-500 shrink-0" />
                      <span className="min-w-0 truncate">
                        {p.latitude && p.longitude
                          ? `${Number(p.latitude).toFixed(6)}, ${Number(p.longitude).toFixed(6)}`
                          : "-"}
                      </span>
                      {p.jarak_meter !== null && p.jarak_meter !== undefined && (
                        <span className="ml-auto shrink-0 text-slate-400">{p.jarak_meter}m</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Nama</th>
                        <th className="px-4 py-3">Tipe</th>
                        <th className="px-4 py-3">Waktu</th>
                        <th className="px-4 py-3">Lokasi</th>
                        <th className="px-4 py-3">Jarak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {nonPhotos.map((p) => (
                        <tr key={p.presensi_id} className="hover:bg-orange-50/40 transition-colors duration-150">
                          <td className="px-4 py-3 text-slate-900 font-semibold">{p.nama_lengkap}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${tipeBadge(p.tipe_presensi)}`}>
                              {p.tipe_presensi}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xl font-bold tabular-nums text-slate-900">
                            {new Date(p.waktu_presensi).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {p.latitude && p.longitude
                              ? `${Number(p.latitude).toFixed(6)}, ${Number(p.longitude).toFixed(6)}`
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {p.jarak_meter !== null ? `${p.jarak_meter}m` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title={`Foto Presensi - ${preview?.nama_lengkap || ""}`}>
        {preview && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-slate-100">
              <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                <Camera size={32} />
              </div>
              <img
                src={getImageUrl(preview.foto_url, "presensi")}
                alt="Foto bukti"
                className="relative z-[1] w-full rounded-xl"
                onError={handleImageError}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Peserta:</span>
                <p className="text-slate-900 font-semibold">{preview.nama_lengkap}</p>
              </div>
              <div>
                <span className="text-slate-500">Tipe:</span>
                <p className="text-slate-900 font-semibold capitalize">{preview.tipe_presensi}</p>
              </div>
              <div>
                <span className="text-slate-500">Waktu:</span>
                <p className="text-slate-900 font-semibold tabular-nums">
                  {new Date(preview.waktu_presensi).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Jarak:</span>
                <p className="text-slate-900 font-semibold">
                  {preview.jarak_meter !== null ? `${preview.jarak_meter}m` : "-"}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ==================== REKAP & LAPORAN TAB ====================

function RekapTab() {
  const [jurnals, setJurnals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [filterTanggalAwal, setFilterTanggalAwal] = useState("");
  const [filterTanggalAkhir, setFilterTanggalAkhir] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [allUsers, setAllUsers] = useState([]);

  const fetchJurnals = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterTanggalAwal) params.tanggal = filterTanggalAwal;
      if (filterUser) params.user_id = filterUser;
      const { data } = await api.get("/admin/jurnal", { params });
      let result = data.data;
      if (filterTanggalAkhir) {
        result = result.filter((j) => j.tanggal <= filterTanggalAkhir);
      }
      setJurnals(result);
    } catch (err) {
      setToast({ type: "error", text: getErrorMessage(err, "Gagal memuat rekap.") });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/admin/users");
      setAllUsers(data.data);
    } catch {}
  };

  useEffect(() => {
    fetchJurnals();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchJurnals();
  }, [filterTanggalAwal, filterTanggalAkhir, filterUser]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <Toast message={toast} />

      <div className="no-print bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Dari:</span>
            <input
              type="date"
              value={filterTanggalAwal}
              onChange={(e) => setFilterTanggalAwal(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Sampai:</span>
            <input
              type="date"
              value={filterTanggalAkhir}
              onChange={(e) => setFilterTanggalAkhir(e.target.value)}
              className={inputCls}
            />
          </div>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className={`${inputCls} appearance-none`}
          >
            <option value="">Semua Peserta</option>
            {allUsers
              .filter((u) => u.role === "peserta")
              .map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.nama_lengkap}
                </option>
              ))}
          </select>
          <button onClick={handlePrint} className={`${btnPrimary} ml-auto`}>
            <Printer size={16} />
            Cetak Laporan
          </button>
        </div>
      </div>

      <div className="print-area bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="print-header hidden print:block mb-6 text-center p-6">
          <h2 className="text-xl font-bold text-slate-900">Rekap Laporan Jurnal Harian Peserta Magang</h2>
          <p className="text-sm text-slate-500">
            {filterTanggalAwal && filterTanggalAkhir
              ? `${filterTanggalAwal} s/d ${filterTanggalAkhir}`
              : filterTanggalAwal
              ? `Mulai ${filterTanggalAwal}`
              : "Semua Data"}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 size={24} className="animate-spin mr-2 text-orange-500" />
            Memuat data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Peserta</th>
                  <th className="px-4 py-3">Instansi</th>
                  <th className="px-4 py-3">Judul Kegiatan</th>
                  <th className="px-4 py-3">Deskripsi</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Catatan Pembimbing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jurnals.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                      Tidak ada data jurnal.
                    </td>
                  </tr>
                ) : (
                  jurnals.map((j, idx) => (
                    <tr key={j.jurnal_id} className="hover:bg-orange-50/40 transition-colors duration-150">
                      <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{j.tanggal}</td>
                      <td className="px-4 py-3 text-slate-900 font-semibold">{j.nama_lengkap}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{j.asal_instansi || "-"}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{j.judul_kegiatan}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[250px] truncate text-xs">{j.deskripsi_kegiatan}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          j.status_submit === "diverifikasi"
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 text-white"
                        }`}>
                          {j.status_submit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate text-xs">
                        {j.catatan_pembimbing || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {jurnals.length > 0 && (
          <div className="mt-4 text-right text-sm text-slate-500 p-4">
            Total: {jurnals.length} jurnal
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-area { padding: 0 !important; }
          .print-area table { border-collapse: collapse; }
          .print-area th, .print-area td { border: 1px solid #ccc !important; color: black !important; background: white !important; }
        }
      `}</style>
    </div>
  );
}

// ==================== MAIN ADMIN DASHBOARD ====================

function initialsOf(name) {
  return (name || "A")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function NavItem({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-2.5 border-r-4 text-sm transition-all duration-200 cursor-pointer ${
        active
          ? "bg-orange-50 text-orange-600 font-semibold border-orange-600"
          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-transparent"
      }`}
    >
      <Icon size={17} className="shrink-0" />
      {tab.label}
    </button>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("users");
  const [menuOpen, setMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      navigate("/login");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setUser(parsed);
      if (parsed.role !== "admin" && parsed.role !== "pembimbing") {
        navigate("/dashboard");
      }
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  const selectTab = (id) => {
    setActiveTab(id);
    setMenuOpen(false);
  };

  const renderTab = () => {
    switch (activeTab) {
      case "users":
        return <UsersTab searchKeyword={globalSearch} />;
      case "jurnal":
        return <JurnalTab />;
      case "monitoring":
        return <MonitoringTab searchKeyword={globalSearch} />;
      case "rekap":
        return <RekapTab />;
      default:
        return <UsersTab searchKeyword={globalSearch} />;
    }
  };

  const activeLabel = TABS.find((t) => t.id === activeTab)?.label || "Dashboard";

  const sidebarInner = (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200 shrink-0">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-600 text-white shadow-sm shadow-orange-600/25">
          <Zap size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">Pusdiklat Digital</p>
          <p className="text-xs text-slate-500">Panel Admin</p>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <p className="px-5 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Menu Utama
        </p>
        <div className="px-3 space-y-1">
          {TABS.map((tab) => (
            <NavItem
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onClick={() => selectTab(tab.id)}
            />
          ))}
        </div>
      </nav>

      <div className="p-3 border-t border-slate-200 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center text-xs font-bold">
            {initialsOf(user.nama_lengkap)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.nama_lengkap}</p>
            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 min-h-[42px] bg-white hover:bg-red-50 border border-slate-200 text-red-600 font-medium text-sm rounded-xl transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[260px] flex-col bg-white border-r border-slate-200 z-30">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] max-w-[85vw] bg-white border-r border-slate-200 flex-col transition-transform duration-200 ease-out lg:hidden ${
          menuOpen ? "flex translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMenuOpen(false)}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
          aria-label="Tutup menu"
        >
          <X size={18} />
        </button>
        {sidebarInner}
      </aside>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="lg:pl-[260px]">
        <main className="bg-slate-50/50 p-4 sm:p-8 min-h-screen">
          <div className="max-w-[1400px] mx-auto">
            {/* Horizontal header: breadcrumb + global search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMenuOpen(true)}
                  className="lg:hidden p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm transition-colors duration-200 cursor-pointer"
                  aria-label="Buka menu"
                >
                  <Menu size={20} />
                </button>
                <nav
                  className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0"
                  aria-label="Breadcrumb"
                >
                  <Home size={13} className="text-slate-400 shrink-0" />
                  <span className="whitespace-nowrap">Dashboard</span>
                  <ChevronRight size={13} className="text-slate-300 shrink-0" />
                  <span className="font-semibold text-slate-800 whitespace-nowrap truncate">
                    {activeLabel}
                  </span>
                </nav>
              </div>

              <div className="relative w-full lg:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari di seluruh modul..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>

            {renderTab()}

            <footer className="pt-10 pb-4 text-center text-slate-400 text-sm print:hidden">
              &copy; {new Date().getFullYear()} Pusdiklat Digital
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}