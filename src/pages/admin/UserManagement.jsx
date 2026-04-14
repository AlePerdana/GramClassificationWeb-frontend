import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';
import { userService } from '../../service/userService';
import { 
  Plus, 
  Filter, 
  Edit, 
  Trash2, 
  Shield,       // Ikon Admin
  Stethoscope,  // Ikon Dokter
  Microscope,   // Ikon Analis
  CheckCircle,
  XCircle,
} from 'lucide-react';

const api = new userService();

const normalizeRoleForUi = (role) => {
  const v = String(role || '').toLowerCase();
  if (v === 'admin') return 'Admin';
  if (v === 'dokter' || v === 'doctor') return 'Dokter';
  if (v === 'analis' || v === 'analyst') return 'Analis';
  return role || '';
};

const normalizeRoleForApi = (role) => {
  const v = String(role || '').toLowerCase();
  if (v === 'admin') return 'admin';
  if (v === 'dokter' || v === 'doctor') return 'dokter';
  if (v === 'analis' || v === 'analyst') return 'analis';
  return v || role;
};

const UserManagement = () => {
  // State
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [filterRole, setFilterRole] = useState('Semua'); // Filter Role

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'Dokter', status: 'Aktif' });
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await api.getUserList({ search: '' });
      const list = Array.isArray(res?.data) ? res.data : [];
      const mapped = list.map((u) => ({
        id: u.id,
        name: u.full_name,
        username: u.username,
        role: normalizeRoleForUi(u.role),
        status: u.is_active ? 'Aktif' : 'Non-Aktif',
      }));
      setUsers(mapped);
    } catch (err) {
      setErrorMessage(err?.message || 'Gagal memuat data pengguna');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter Logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = filterRole === 'Semua' || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, filterRole]);

  // Komponen Badge Role (Visualisasi Pembeda)
  const RoleBadge = ({ role }) => {
    switch (role) {
      case 'Admin':
        return <span className="flex items-center gap-1 text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded"><Shield size={12} /> Admin</span>;
      case 'Dokter':
        return <span className="flex items-center gap-1 text-xs font-bold bg-teal-100 text-teal-700 px-2 py-1 rounded"><Stethoscope size={12} /> Dokter</span>;
      case 'Analis':
        return <span className="flex items-center gap-1 text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded"><Microscope size={12} /> Analis</span>;
      default:
        return <span>{role}</span>;
    }
  };

  const handleEditClick = (user) => {
    setFormData({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
      status: user.status,
    });
    setIsEditing(true);
    setCurrentId(user.id);
    setShowModal(true);
  };

  const handleAddClick = () => {
    setFormData({ name: '', username: '', password: '', role: 'Dokter', status: 'Aktif' });
    setIsEditing(false);
    setCurrentId(null);
    setShowModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const payload = {
      full_name: formData.name,
      username: formData.username,
      role: normalizeRoleForApi(formData.role),
      is_active: formData.status === 'Aktif',
      ...(formData.password ? { password: formData.password } : {}),
    };

    try {
      if (isEditing) {
        await api.updateUser(currentId, payload);
      } else {
        await api.createUser(payload);
      }
      setShowModal(false);
      setIsEditing(false);
      setCurrentId(null);
      setFormData({ name: '', username: '', password: '', role: 'Dokter', status: 'Aktif' });
      await fetchUsers();
    } catch (err) {
      setErrorMessage(err?.message || 'Gagal menyimpan data pengguna');
    }
  };

  const handleDeleteClick = async (user) => {
    const ok = window.confirm(`Hapus pengguna "${user.name}"?`);
    if (!ok) return;

    setErrorMessage('');
    try {
      await api.deleteUser(user.id);
      await fetchUsers();
    } catch (err) {
      setErrorMessage(err?.message || 'Gagal menghapus pengguna');
    }
  };

  return (
    <div className="space-y-6 bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER */}
      <PageHeader
        title="Manajemen Pengguna"
        subtitle="Kelola akun akses untuk Dokter, Analis, dan Admin"
        actions={(
          <button
            onClick={handleAddClick}
            className="bg-primary hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={20} /> Tambah Pengguna
          </button>
        )}
      />

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center gap-4">
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama atau username..."
          />
          
          {/* Filter Dropdown (selaras dengan layout tren) */}
          <div className="flex gap-2 relative">
            <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              {['Semua', 'Admin', 'Dokter', 'Analis'].map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-center border-collapse whitespace-nowrap min-w-[850px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wide text-center">
                <th className="p-5 text-center">Nama Pengguna</th>
                <th className="p-5 text-center">Username</th>
                <th className="p-5 text-center">Role</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-gray-500">
                    Memuat data...
                  </td>
                </tr>
              ) : errorMessage ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-red-600 font-medium">
                    {errorMessage}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-gray-500">
                    Data tidak ditemukan
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-5 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div>
                        <p className="font-bold text-gray-800">{user.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-center text-sm font-mono text-gray-600">{user.username}</td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center"><RoleBadge role={user.role} /></div>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center justify-center gap-1 w-fit mx-auto ${
                      user.status === 'Aktif' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {user.status === 'Aktif' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                      {user.status}
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleEditClick(user)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg tooltip" 
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(user)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg tooltip" 
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination (Static) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
          <span>Menampilkan {filteredUsers.length} dari {users.length} data</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-200 rounded bg-white disabled:opacity-50" disabled>Sebelumnya</button>
            <button className="px-3 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50">Berikutnya</button>
          </div>
        </div>
      </div>

      {/* --- MODAL TAMBAH USER --- */}
      <Modal
        isOpen={showModal}
        title={isEditing ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
        onClose={() => setShowModal(false)}
      >
            <form id="user-form" onSubmit={handleSaveUser} className="space-y-4">
              {errorMessage ? (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium border border-red-100">
                  {errorMessage}
                </div>
              ) : null}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nama Lengkap</label>
                <input 
                  type="text" required
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Nama Lengkap"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Username</label>
                  <input 
                    type="text" required
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Password {isEditing && <span className="text-gray-400 font-normal normal-case">(Kosongkan jika tidak mengubah)</span>}
                  </label>
                  <input 
                    type="password" 
                    required={!isEditing}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="******"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Role / Peran</label>
                  <select 
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="Dokter">Dokter</option>
                    <option value="Analis">Analis</option>
                    <option value="Admin">Admin</option>
                  </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Status Akun</label>
                <select 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Non-Aktif">Non-Aktif</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50">Batal</button>
                <button type="submit" className="flex-1 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">{isEditing ? 'Simpan Perubahan' : 'Simpan'}</button>
              </div>
            </form>
      </Modal>

    </div>
  );
};

export default UserManagement;