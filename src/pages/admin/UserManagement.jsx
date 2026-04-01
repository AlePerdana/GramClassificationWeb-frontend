import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Plus, 
  Filter, 
  Edit, 
  Trash2, 
  User, 
  Shield,       // Ikon Admin
  Stethoscope,  // Ikon Dokter
  Microscope,   // Ikon Analis
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';

// --- DUMMY DATA ---
const initialUsers = [
  { id: 1, name: 'Dr. Riro', username: 'dokter_riro', role: 'Dokter', status: 'Aktif' },
  { id: 2, name: 'Ale Perdana', username: 'admin_ale', role: 'Admin', status: 'Aktif' },
  { id: 3, name: 'Nufus', username: 'admin_nufus', role: 'Admin', status: 'Aktif' },
  { id: 4, name: 'Andrey Analis', username: 'analis_andrey', role: 'Analis', status: 'Non-Aktif' },
];

const UserManagement = () => {
  // State
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [filterRole, setFilterRole] = useState('Semua'); // Filter Role
  
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'Dokter', status: 'Aktif' });
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        u.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'Semua' || u.role === filterRole;
    return matchSearch && matchRole;
  });

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

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (isEditing) {
      setUsers(users.map(u => u.id === currentId ? {
        ...u,
        name: formData.name,
        username: formData.username,
        role: formData.role,
        status: formData.status,
        ...(formData.password ? { password: formData.password } : {}),
      } : u));
    } else {
      const newUser = {
        id: users.length + 1,
        ...formData,
      };
      setUsers([newUser, ...users]);
    }
    setShowModal(false);
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ name: '', username: '', password: '', role: 'Dokter', status: 'Aktif' });
  };

  return (
    <div className="space-y-6 bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Pengguna</h1>
          <p className="text-gray-500 mt-1">Kelola akun akses untuk Dokter, Analis, dan Admin</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="bg-primary hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus size={20} /> Tambah Pengguna
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama atau username..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
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
              {filteredUsers.map((user) => (
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
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg tooltip" title="Hapus"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
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
      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="sticky top-0 z-10 p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">{isEditing ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
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
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default UserManagement;