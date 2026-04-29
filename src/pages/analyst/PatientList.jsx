import React, { useEffect, useState } from 'react';
import authService from '../../service/authService';
import { 
  Search, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '../../utils/constant';

const API_BASE_URL = APP_CONFIG.API_BASE_URL;

const AnalystPatientList = () => {
  const LEGACY_STATUS = {
    pending: 'Belum Diproses',
    waitingValidation: 'Menunggu Dokter'
  };

  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        const authHeaders = authService.getAuthorizationHeader();

        const extractItems = (payload) => {
          if (Array.isArray(payload)) return payload;
          if (Array.isArray(payload?.data)) return payload.data;
          if (Array.isArray(payload?.results)) return payload.results;
          return [];
        };

        // ONLY fetch 'pending' patients as per user request (Waiting Validation and Selesai are in History)
        const response = await fetch(`${API_BASE_URL}/patients?specimen_status=pending&include_no_specimen=true`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...authHeaders,
          },
        });

        if (response.status === 401) {
          authService.clearSession();
          navigate('/login');
          return;
        }

        const data = response.ok ? await response.json() : [];
        const normalized = extractItems(data).map((p) => {
          const queue_status = 'pending';
          const priority = calculatePriority(p); // Adding own parameter for prioritas
          return {
            ...p,
            queue_status,
            priority
          };
        });

        setPatients(normalized);
      } catch (error) {
        console.error('Gagal mengambil data pasien:', error);
        setPatients([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, [API_BASE_URL, navigate]);

  const calculatePriority = (patient) => {
    const dateObj = toSortableDate(getQueueTime(patient));
    if (!dateObj) return 'normal';
    const diffMinutes = Math.max(0, Math.floor((Date.now() - dateObj.getTime()) / 60000));
    
    if (diffMinutes > 15) return 'kritis';
    if (diffMinutes > 5) return 'tinggi';
    return 'normal';
  };

  const getQueueStatus = (patient) => String(patient.queue_status || patient.specimen_status || patient.status || 'pending').toLowerCase();
  
  const getLegacyStatus = (patient) => {
    const status = getQueueStatus(patient);
    // In this page, it will likely always be pending because we only fetch pending
    return status === 'waiting_validation' ? LEGACY_STATUS.waitingValidation : LEGACY_STATUS.pending;
  };

  const getQueueTime = (patient) =>
    patient.waktu_masuk || patient.created_at || patient.tanggal_masuk || patient.date || patient.uploaded_at;

  const toSortableDate = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const dateObj = new Date(normalized);
    if (Number.isNaN(dateObj.getTime())) return null;
    return dateObj;
  };

  const getPriorityLevel = (patient) => {
    // Return the dedicated parameter if it exists, otherwise calculate
    return patient.priority || calculatePriority(patient);
  };

  const getPriorityBadge = (level) => {
    if (level === 'kritis') return { label: 'Kritis (> 15 menit)', className: 'bg-red-50 text-red-700 border border-red-100' };
    if (level === 'tinggi') return { label: 'Tinggi (5-15 menit)', className: 'bg-amber-50 text-amber-700 border border-amber-100' };
    if (level === 'normal') return { label: 'Normal (0-5 menit)', className: 'bg-blue-50 text-blue-700 border border-blue-100' };
    return null;
  };

  const formatWaktuMasuk = (value) => {
    if (!value) return '-';

    const raw = String(value).trim();
    const isoNormalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const date = new Date(isoNormalized);

    if (Number.isNaN(date.getTime())) {
      return raw.slice(0, 16).replace('T', ' ');
    }

    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Filter Logic
  const filteredPatients = patients.filter((p) => {
    const patientName = (p.nama_lengkap || p.name || '').toLowerCase();
    const sampleCode = (p.id_pasien || p.sampleCode || '').toLowerCase();

    const matchSearch =
      patientName.includes(searchTerm.toLowerCase()) ||
      sampleCode.includes(searchTerm.toLowerCase());
    
    // Use the dedicated priority parameter for filtering
    const matchPriority = priorityFilter === 'Semua' || getPriorityLevel(p) === priorityFilter;
    return matchSearch && matchPriority;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, priorityFilter]);

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const aDate = toSortableDate(getQueueTime(a));
    const bDate = toSortableDate(getQueueTime(b));
    return (aDate?.getTime() ?? Infinity) - (bDate?.getTime() ?? Infinity);
  });

  const totalPages = Math.max(1, Math.ceil(sortedPatients.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = sortedPatients.slice(startIndex, startIndex + itemsPerPage);

  const getPatientKey = (patient, index) => {
    const key = String(
      patient?.id_pasien ??
      patient?.patient_id ??
      patient?.patientId ??
      patient?.id ??
      patient?.specimen_id ??
      patient?.specimenId ??
      patient?.sampleCode ??
      ''
    ).trim();

    if (key) return key;
    return `${patient?.nama_lengkap || patient?.name || 'unknown'}-${index}`;
  };

  // Handler untuk menuju halaman Upload/Proses
  const handleProcess = (patientId) => {
    navigate(`/analyst/process/${patientId}`);
  };

  return (
    <div className="space-y-6 bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Daftar Pasien</h1>
        <p className="text-gray-500 mt-1">Daftar pasien yang belum diproses. Pasien yang sudah diproses dapat dilihat di menu Riwayat.</p>
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
              placeholder="Cari Nama atau Kode Pasien..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Prioritas */}
          <div className="relative w-full md:w-64">
            <select 
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="Semua">Semua Prioritas</option>
              <option value="normal">Normal (0 - 5 menit)</option>
              <option value="tinggi">Tinggi (5 - 15 menit)</option>
              <option value="kritis">Kritis (&gt; 15 menit)</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wide text-center">
                <th className="p-5 text-center">Waktu Masuk</th>
                <th className="p-5 text-center">Kode Pasien</th>
                <th className="p-5 text-center">Nama Pasien</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-gray-400">Memuat data pasien...</td>
                </tr>
              ) : paginatedPatients.length > 0 ? (
                paginatedPatients.map((patient, index) => (
                  <tr key={getPatientKey(patient, index)} className="hover:bg-blue-50/30 transition-colors group">
                    {/* Tanggal */}
                    <td className="p-5 text-center">
                      <div className="flex flex-col items-center justify-center gap-1 text-gray-600 font-medium">
                        <span>{formatWaktuMasuk(getQueueTime(patient))}</span>
                        {(() => {
                          const badge = getPriorityBadge(getPriorityLevel(patient));
                          return badge ? (
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${badge.className}`}>
                              {badge.label}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </td>

                    {/* Kode Pasien */}
                    <td className="p-5 text-center">
                      <span className="font-mono font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">
                        {patient.id_pasien || patient.patient_id || patient.patientId || patient.id || patient.sampleCode || '-'}
                      </span>
                    </td>

                    {/* Nama Pasien */}
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{patient.nama_lengkap || patient.name}</p>
                          <p className="text-xs text-gray-500">{patient.jenis_kelamin || (patient.gender === 'L' ? 'Laki-laki' : 'Perempuan')}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-5 text-center">
                      {(() => {
                        const queueStatus = getQueueStatus(patient);
                        const patientStatus = getLegacyStatus(patient);
                        return (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center ${
                        queueStatus === 'pending' 
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' 
                          : 'bg-green-50 text-green-700 border border-green-100'
                      }`}>
                        {patientStatus}
                      </span>
                        );
                      })()}
                    </td>

                    {/* Tombol Aksi */}
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => handleProcess(patient.id || patient.id_pasien)}
                        className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-2 mx-auto transition-all active:scale-95"
                      >
                        Proses
                      </button>
                    </td>

                  </tr>
                ))

              ) : (
                <tr>
                  <td colSpan="5" className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <AlertCircle size={40} className="mb-2 opacity-20" />
                      <p>Tidak ada pasien pada kriteria ini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
          <span>Menampilkan {paginatedPatients.length} dari {sortedPatients.length} data</span>
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

export default AnalystPatientList;