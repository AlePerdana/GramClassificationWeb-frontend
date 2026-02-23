import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Plus, 
  Filter, 
  Edit, 
  Trash2, 
  User, 
  FileText,
  X
} from 'lucide-react';

// --- DUMMY DATA ---
const initialPatients = [
  { id: 1, name: 'Budi Santoso', sampleCode: 'SPL-2026-001', age: 45, gender: 'L', status: 'Menunggu Sampel', date: '27 Jan 2026, 09:00' },
  { id: 2, name: 'Siti Aminah', sampleCode: 'SPL-2026-002', age: 32, gender: 'P', status: 'Selesai Klasifikasi', date: '27 Jan 2026, 10:30' },
  { id: 3, name: 'Rudi Hartono', sampleCode: 'SPL-2026-003', age: 28, gender: 'L', status: 'Tervalidasi', date: '26 Jan 2026, 14:15' },
  { id: 4, name: 'Dewi Sartika', sampleCode: 'SPL-2026-004', age: 50, gender: 'P', status: 'Menunggu Sampel', date: '27 Jan 2026, 11:45' },
];

const PatientManagement = () => {
  // State
  const [patients, setPatients] = useState(initialPatients);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', age: '', gender: 'L', sampleCode: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // --- TAMBAHAN BARU ---
  const [filterStatus, setFilterStatus] = useState('Semua'); // Pilihan status aktif

  // Filter Logic (Diperbarui)
  const filteredPatients = patients.filter(p => {
    // 1. Filter Teks (Nama/Kod)
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sampleCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Filter Kategori (Status)
    const matchesStatus = filterStatus === 'Semua' || p.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    let colorClass = '';
    switch (status) {
      case 'Menunggu Sampel': colorClass = 'bg-gray-100 text-gray-600'; break;
      case 'Selesai Klasifikasi': colorClass = 'bg-blue-100 text-blue-600'; break;
      case 'Tervalidasi': colorClass = 'bg-green-100 text-green-600'; break;
      default: colorClass = 'bg-gray-100 text-gray-600';
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colorClass}`}>
        {status}
      </span>
    );
  };

  // --- HANDLERS ---

  const handleEditClick = (patient) => {
    setFormData({
      name: patient.name,
      age: patient.age,
      gender: patient.gender === 'Laki-laki' ? 'L' : patient.gender === 'Perempuan' ? 'P' : patient.gender,
      sampleCode: patient.sampleCode
    });
    setIsEditing(true);
    setCurrentId(patient.id);
    setShowModal(true);
  };

  const handleAddClick = () => {
    setFormData({ name: '', age: '', gender: 'L', sampleCode: '' });
    setIsEditing(false);
    setCurrentId(null);
    setShowModal(true);
  };

  const handleSavePatient = (e) => {
    e.preventDefault();
    if (isEditing) {
      setPatients(patients.map(p => p.id === currentId ? { ...p, ...formData } : p));
    } else {
      const newPatient = {
        id: patients.length + 1,
        ...formData,
        status: 'Menunggu Sampel',
        date: new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      };
      setPatients([newPatient, ...patients]);
    }
    setShowModal(false);
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ name: '', age: '', gender: 'L', sampleCode: '' });
  };

  return (
    <div className="space-y-6 bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Pasien</h1>
          <p className="text-gray-500 mt-1">Kelola data pasien dan registrasi sampel baru</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="bg-primary hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus size={20} /> Tambah Pasien Baru
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden">
        
        {/* Toolbar Table */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama pasien atau kode sampel..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Bahagian Toolbar Filter (selaras dengan tren) */}
          <div className="flex gap-2 relative">
            <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              {['Semua', 'Menunggu Sampel', 'Selesai Klasifikasi', 'Tervalidasi'].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-center border-collapse whitespace-nowrap min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wide text-center">
                <th className="p-5 text-center">Tanggal Masuk</th>
                <th className="p-5 text-center">Nama Pasien</th>
                <th className="p-5 text-center">Kode Sampel</th> 
                <th className="p-5 text-center">Identitas</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-center">Aksi</th> 
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-blue-50/30 transition-colors group">
                    {/* Tanggal */}
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-600 font-medium">
                        <span>{patient.date}</span>
                      </div>
                    </td>

                    {/* Pasien */}
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div>
                          <p className="font-bold text-gray-800">{patient.name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Kode Sampel */}
                    <td className="p-5 text-center">
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono font-medium border border-gray-200">
                        {patient.sampleCode}
                      </span>
                    </td>

                    {/* Identitas (Gender & Umur) */}
                    <td className="p-5 text-center text-sm text-gray-600">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-medium text-gray-700">{patient.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">{patient.age} Th</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-5 text-center">
                      <StatusBadge status={patient.status} />
                    </td>

                    {/* Aksi */}
                    <td className="p-5 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditClick(patient)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg tooltip transition-colors" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg tooltip transition-colors" title="Hapus">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-gray-400">
                    Tidak ada data pasien ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination (Static) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
          <span>Menampilkan {filteredPatients.length} dari {patients.length} data</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-200 rounded bg-white disabled:opacity-50" disabled>Sebelumnya</button>
            <button className="px-3 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50">Berikutnya</button>
          </div>
        </div>
      </div>

      {/* --- MODAL TAMBAH PASIEN --- */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">{isEditing ? 'Edit Data Pasien' : 'Registrasi Pasien Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Form */}
            <form onSubmit={handleSavePatient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nama Lengkap</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="Masukkan nama pasien"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Kode Sampel</label>
                  <div className="relative">
                    <FileText size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                      placeholder="SPL-YYYY-XXX"
                      value={formData.sampleCode}
                      onChange={(e) => setFormData({...formData, sampleCode: e.target.value})}
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Umur</label>
                  <input 
                    type="number" 
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Contoh: 30"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                  />
                </div>

                <div className="col-span-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Jenis Kelamin</label>
                  <select 
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 shadow-md"
                >
                  {isEditing ? 'Simpan Perubahan' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default PatientManagement;