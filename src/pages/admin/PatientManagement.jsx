import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Plus, 
  X,
  Edit,
  Trash2
} from 'lucide-react';

const PatientManagement = () => {
  // --- STATE API ---
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    jenis_kelamin: 'Laki-Laki',
    tanggal_lahir: '',
    alamat: '',
    no_telepon: ''
  });

  // --- STATE UNTUK EDIT ---
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // URL Base Backend
  const API_BASE_URL = 'http://localhost:8000/api';

  // Filter Logic
  const filteredPatients = patients.filter(p => {
    const name = (p.nama_lengkap || '').toLowerCase();
    const code = (p.id_pasien || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
  });

  // --- 1. MENGAMBIL DATA PASIEN (GET) ---
  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/patients`);
      if (response.ok) {
        const data = await response.json();
        setPatients(Array.isArray(data) ? data : []);
      } else {
        console.error('Gagal mengambil data pasien');
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleAddClick = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      nama_lengkap: '',
      jenis_kelamin: 'Laki-Laki',
      tanggal_lahir: '',
      alamat: '',
      no_telepon: ''
    });
    setShowModal(true);
  };

  // --- 3. MENGEDIT DATA PASIEN (Persiapan Modal) ---
  const handleEditClick = (patient) => {
    setFormData({
      nama_lengkap: patient.nama_lengkap || '',
      jenis_kelamin: patient.jenis_kelamin || 'Laki-Laki',
      tanggal_lahir: patient.tanggal_lahir || '',
      alamat: patient.alamat || '',
      no_telepon: patient.no_telepon || ''
    });
    setEditId(patient.id || patient.id_pasien);
    setIsEditing(true);
    setShowModal(true);
  };

  // Handler Submit Form (Gabungan Add & Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEditing) {
      alert(`Simulasi Update Data Pasien ID: ${editId}`);
      setShowModal(false);
      setIsEditing(false);
      setEditId(null);
      setFormData({
        nama_lengkap: '',
        jenis_kelamin: 'Laki-Laki',
        tanggal_lahir: '',
        alamat: '',
        no_telepon: ''
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.status === 201 || response.ok) {
        alert('Pasien berhasil ditambahkan!');
        setShowModal(false);
        setFormData({
          nama_lengkap: '',
          jenis_kelamin: 'Laki-Laki',
          tanggal_lahir: '',
          alamat: '',
          no_telepon: ''
        });
        fetchPatients();
      } else {
        const errorData = await response.json();
        alert(`Gagal menambah pasien: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Error adding patient:', error);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  // --- 4. MENGHAPUS DATA PASIEN ---
  const handleDelete = (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data pasien ${name}?`)) {
      alert(`Simulasi Hapus Pasien ID: ${id}`);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditId(null);
    setFormData({
      nama_lengkap: '',
      jenis_kelamin: 'Laki-Laki',
      tanggal_lahir: '',
      alamat: '',
      no_telepon: ''
    });
  };

  return (
    <div className="space-y-6 bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
        </div>

        {/* Table Content */}
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wide text-center">
                <th className="p-4 text-left pl-6">Identitas Pasien</th>
                <th className="p-4 text-center">Jenis Kelamin</th>
                <th className="p-4 text-center">Tanggal Lahir</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-gray-400">Memuat data pasien...</td>
                </tr>
              ) : filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr key={patient.id_pasien || patient.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-left pl-6 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{patient.nama_lengkap}</div>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">{patient.id_pasien}</div>
                    </td>
                    <td className="p-4 text-center">{patient.jenis_kelamin}</td>
                    <td className="p-4 text-center">{patient.tanggal_lahir}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(patient)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg tooltip transition-colors"
                          title="Edit Pasien"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(patient.id || patient.id_pasien, patient.nama_lengkap)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg tooltip transition-colors"
                          title="Hapus Pasien"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-gray-400">
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
              <h3 className="font-bold text-lg text-gray-800">{isEditing ? 'Edit Data Pasien' : 'Tambah Pasien Baru'}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Masukkan nama pasien"
                    value={formData.nama_lengkap}
                    onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Jenis Kelamin</label>
                  <select
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    value={formData.jenis_kelamin}
                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                  >
                    <option value="Laki-Laki">Laki-Laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={formData.tanggal_lahir}
                    onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Alamat</label>
                  <textarea
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    rows={3}
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">No. Telepon</label>
                  <input
                    type="text"
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={formData.no_telepon}
                    onChange={(e) => setFormData({ ...formData, no_telepon: e.target.value })}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
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