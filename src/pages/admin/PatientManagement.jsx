import React, { useEffect, useState } from 'react';
import { PatientService } from '../../service/patientService';
import PageHeader from '../../components/common/PageHeader';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';
import { 
  Plus, 
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const getDefaultWaktuMasuk = () => {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const normalizeWaktuMasuk = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  return raw;
};

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
  const [toast, setToast] = useState({
    open: false,
    type: 'success',
    message: '',
  });

  const patientService = new PatientService();

  const showToast = (type, message) => {
    setToast({ open: true, type, message });
    window.setTimeout(() => {
      setToast((prev) => (prev.open ? { ...prev, open: false } : prev));
    }, 4000);
  };

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
      const res = await patientService.getPatientList();
      setPatients(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
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

    const payload = {
      nama_lengkap: formData.nama_lengkap,
      jenis_kelamin: formData.jenis_kelamin,
      tanggal_lahir: formData.tanggal_lahir,
      alamat: formData.alamat,
      no_telepon: formData.no_telepon,
      waktu_masuk: normalizeWaktuMasuk(getDefaultWaktuMasuk()),
    };

    if (isEditing) {
      try {
        if (!editId) {
          showToast('error', 'Gagal: ID pasien tidak ditemukan.');
          return;
        }
        await patientService.updatePatient(editId, payload);
        showToast('success', 'Data pasien berhasil diperbarui!');
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
        fetchPatients();
      } catch (error) {
        console.error('Error updating patient:', error);
        showToast('error', `Gagal memperbarui pasien: ${error?.message || 'Terjadi kesalahan.'}`);
      }
      return;
    }

    try {
      await patientService.createPatient(payload);
      showToast('success', 'Pasien berhasil ditambahkan!');
      setShowModal(false);
      setFormData({
        nama_lengkap: '',
        jenis_kelamin: 'Laki-Laki',
        tanggal_lahir: '',
        alamat: '',
        no_telepon: ''
      });
      fetchPatients();
    } catch (error) {
      console.error('Error adding patient:', error);
      showToast('error', `Gagal menambah pasien: ${error?.message || 'Terjadi kesalahan jaringan.'}`);
    }
  };

  // --- 4. MENGHAPUS DATA PASIEN ---
  const handleDelete = (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data pasien ${name}?`)) {
      (async () => {
        try {
          await patientService.deletePatient(id);
          showToast('success', 'Pasien berhasil dihapus!');
          fetchPatients();
        } catch (error) {
          console.error('Error deleting patient:', error);
          showToast('error', `Gagal menghapus pasien: ${error?.message || 'Terjadi kesalahan.'}`);
        }
      })();
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
      {toast.open && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`min-w-[280px] max-w-sm px-4 py-3 rounded-xl shadow-lg border text-sm ${toast.type === 'success' ? 'bg-white border-green-200 text-green-700' : 'bg-white border-red-200 text-red-700'}`}>
            <div className="flex items-start gap-2">
              {toast.type === 'success' ? (
                <CheckCircle size={18} className="mt-0.5" />
              ) : (
                <AlertCircle size={18} className="mt-0.5" />
              )}
              <div className="font-semibold leading-snug">{toast.message}</div>
              <button
                type="button"
                onClick={() => setToast((prev) => ({ ...prev, open: false }))}
                className="ml-auto text-gray-400 hover:text-gray-600"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* HEADER & ACTIONS */}
      <PageHeader
        title="Manajemen Pasien"
        subtitle="Kelola data pasien dan registrasi sampel baru"
        actions={(
          <button
            onClick={handleAddClick}
            className="bg-primary hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={20} /> Tambah Pasien Baru
          </button>
        )}
      />

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden">
        
        {/* Toolbar Table */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center gap-4">
          <SearchInput
            className="flex-1 max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama pasien atau kode sampel..."
          />
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
      <Modal
        isOpen={showModal}
        title={isEditing ? 'Edit Data Pasien' : 'Tambah Pasien Baru'}
        onClose={handleCloseModal}
        footer={(
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              form="patient-form"
              className="flex-1 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 shadow-md"
            >
              {isEditing ? 'Simpan Perubahan' : 'Simpan Data'}
            </button>
          </div>
        )}
      >
        <form id="patient-form" onSubmit={handleSubmit} className="space-y-4">
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
        </form>
      </Modal>

    </div>
  );
};

export default PatientManagement;