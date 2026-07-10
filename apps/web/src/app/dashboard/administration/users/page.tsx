"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, Search, Trash2, Pencil } from "lucide-react";
import { apiClient } from "@/lib/api";

const ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Manager" },
  { value: "ADMIN", label: "Admin" },
  { value: "KASIR", label: "Kasir" },
  { value: "CS", label: "Customer Service" },
  { value: "SAMPLING", label: "Sampling" },
  { value: "ANALIS", label: "Analis" },
  { value: "DOKTER", label: "Dokter" },
  { value: "MARKETING", label: "Marketing" },
  { value: "KLINIK_PARTNER", label: "Klinik Partner" },
];

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  deletedAt: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ email: "", name: "", password: "", role: "KASIR" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getUsers({ limit: 100, search: search || undefined, role: roleFilter || undefined });
      const envelope = (res?.data ?? res) as any;
      const raw = Array.isArray(envelope) ? envelope : envelope?.data ?? [];
      setUsers(raw as User[]);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const t = setTimeout(loadUsers, 300);
    return () => clearTimeout(t);
  }, [loadUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (editingUser) {
        const payload: any = { name: formData.name, role: formData.role };
        if (formData.password) payload.password = formData.password;
        await apiClient.updateUser(editingUser.id, payload);
      } else {
        await apiClient.createUser({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          role: formData.role,
        });
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({ email: "", name: "", password: "", role: "KASIR" });
      loadUsers();
    } catch (err: any) {
      setFormError(err?.message || "Gagal menyimpan user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ email: user.email, name: user.name || "", password: "", role: user.role });
    setShowForm(true);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Hapus user ${user.name || user.email}?`)) return;
    try {
      await apiClient.delete(`/api/v1/users/${user.id}`);
      loadUsers();
    } catch {
      alert("Gagal menghapus user");
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setFormData({ email: "", name: "", password: "", role: "KASIR" });
    setFormError("");
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Kelola User
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tambah, edit, dan kelola akses pengguna sistem.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6B8E6B]/20 transition-all hover:bg-[#5A7D5A] hover:shadow-md active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" />
          Tambah User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari email atau nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="">Semua Role</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Nama</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Role</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 text-right font-medium text-slate-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Memuat...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Tidak ada user ditemukan</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{user.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-lg bg-[#6B8E6B]/10 px-2 py-0.5 text-xs font-medium text-[#6B8E6B]">
                      {ROLES.find((r) => r.value === user.role)?.label || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${user.deletedAt ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                      {user.deletedAt ? "Nonaktif" : "Aktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(user)} className="mr-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(user)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingUser ? "Edit User" : "Tambah User"}
            </h2>

            {formError && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password {editingUser ? "(kosongkan jika tidak diubah)" : "*"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#6B8E6B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A7D5A] disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
