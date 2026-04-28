import React, { useEffect, useState } from 'react';
import authService from '../../service/authService';
import { 
  Search, 
  Filter, 
  CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000';
const LEGACY_STATUS = {
  pending: 'Menunggu Validasi',
  done: 'Selesai Validasi'
};

const ValidationList = () => {
  const navigate = useNavigate();
  const [queueData, setQueueData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Menunggu Validasi');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchQueue = async () => {
      setIsLoading(true);
      try {
        const headers = authService.getAuthorizationHeader();
        const response = await fetch(`${API_BASE_URL}/api/doctor/doctor-queue`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...headers,
          },
        });

        if (response.status === 401) {
          authService.clearSession();
          navigate('/login');
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || 'Gagal mengambil antrean dokter.');
        }

        const payload = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
          ? result.data
          : [];

        setQueueData(payload);
      } catch (error) {
        console.error('Gagal mengambil antrean:', error);
        setQueueData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueue();
    const id = window.setInterval(fetchQueue, 10000);
    return () => window.clearInterval(id);
  }, [navigate]);

  const resolveLegacyStatus = (item) => {
    const isDone =
      item?.is_validated === true ||
      item?.sudah_divalidasi === true ||
      Boolean(item?.validated_at) ||
      Boolean(item?.tanggal_validasi);

    return isDone ? LEGACY_STATUS.done : LEGACY_STATUS.pending;
  };

  // Filter Logic
  const filteredPatients = queueData.filter((p) => {
    const patientName = String(p.nama_pasien || p.name || '').toLowerCase();
    const specimenCode = String(p.kode_sampel || p.sampleCode || p.id_specimen || '').toLowerCase();
    const displayStatus = resolveLegacyStatus(p);

    const matchSearch = patientName.includes(searchTerm.toLowerCase()) || specimenCode.includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'Semua' || displayStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  const handleValidate = (specimenId) => {
    navigate(`/doctor/validate/${specimenId}`);
  };

  return (
    <div className="space-y-6 bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Validasi Hasil</h1>
        <p className="text-gray-500 mt-1">Daftar pemeriksaan yang menunggu tinjauan medis Anda.</p>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden">
        
        {/* TOOLBAR */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari Nama Pasien atau Kode..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Status */}
          <div className="relative w-full md:w-56">
            <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <select 
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 pr-3 py-2"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="Semua">Semua Status</option>
              <option value="Menunggu Validasi">Menunggu Validasi</option>
              <option value="Selesai Validasi">Selesai Validasi</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-center border-collapse whitespace-nowrap min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wide">
                <th className="p-5 text-center">Waktu Masuk</th>
                <th className="p-5 text-center">Nama Pasien</th>
                <th className="p-5 text-center">Kode Sampel</th>
                <th className="p-5 text-center">Analis Pengirim</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-gray-500">Memuat antrean validasi...</td>
                </tr>
              ) : paginatedPatients.length > 0 ? (
                paginatedPatients.map((patient) => {
                  const specimenId = patient.id_specimen ?? patient.specimen_id ?? patient.id;
                  const displayStatus = resolveLegacyStatus(patient);
                  const patientName = patient.nama_pasien || patient.name || '-';
                  const sampleCode = patient.kode_sampel || patient.sampleCode || `SPL-${specimenId ?? '-'}`;
                  const analystName = patient.analis_pengirim || patient.analyst || '-';
                  const uploadTime = patient.tanggal_upload || patient.uploaded_at || patient.date || '-';

                  return (
                  <tr key={specimenId} className="hover:bg-blue-50/30 transition-colors group">
                    {/* Tanggal */}
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-600 font-medium">
                        <span>{uploadTime}</span>
                      </div>
                    </td>

                    {/* Pasien */}
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{patientName}</p>
                        </div>
                      </div>
                    </td>

                    {/* Kode Sampel */}
                    <td className="p-5 text-center">
                      <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200 inline-block">
                        {sampleCode}
                      </span>
                    </td>

                    {/* Analis */}
                    <td className="p-5 text-center text-sm text-gray-600">
                      {analystName}
                    </td>

                    {/* Status (Konsisten dengan Analis) */}
                    <td className="p-5 text-center">
                      {displayStatus === 'Menunggu Validasi' ? (
                        <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-100 inline-flex items-center justify-center w-fit mx-auto">
                          {displayStatus}
                        </span>
                      ) : (
                        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-100 inline-flex items-center justify-center w-fit mx-auto">
                          {displayStatus}
                        </span>
                      )}
                    </td>

                    {/* Tombol Aksi */}
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => handleValidate(specimenId)}
                        className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-2 mx-auto transition-all active:scale-95"
                      >
                        Validasi
                      </button>
                    </td>

                  </tr>
                );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <CheckCircle size={40} className="mb-2 opacity-20" />
                      <p>Tidak ada antrean validasi.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
          <span>Menampilkan {paginatedPatients.length} dari {filteredPatients.length} data</span>
          <div className="flex gap-2 items-center">
            <button 
              className="px-3 py-1 border border-gray-200 rounded bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors" 
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              Sebelumnya
            </button>
            <span className="px-2 py-1 text-gray-500 font-medium">Hal {currentPage} / {totalPages}</span>
            <button 
              className="px-3 py-1 border border-gray-200 rounded bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationList;