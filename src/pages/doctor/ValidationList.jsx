import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../service/authService';
import { Search } from 'lucide-react';
import { APP_CONFIG } from '../../utils/constant';

const API_BASE_URL = APP_CONFIG.API_HOST;
const LEGACY_STATUS = {
  pending: 'Menunggu Validasi',
  done: 'Selesai Validasi'
};

const PRIORITY_FILTERS = [
  { value: 'Semua', label: 'Semua Prioritas' },
  { value: 'low', label: '< 5 menit (Belum prioritas)' },
  { value: 'medium', label: '6-15 menit (Penting)' },
  { value: 'high', label: '> 15 menit (Sangat prioritas)' }
];

const toSortableDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const dateObj = new Date(normalized);
  if (Number.isNaN(dateObj.getTime())) return null;
  return dateObj;
};

const getQueueTime = (item) =>
  item?.tanggal_upload || item?.uploaded_at || item?.created_at || item?.date || item?.waktu_masuk;

const getPriorityLevel = (item) => {
  const dateObj = toSortableDate(getQueueTime(item));
  if (!dateObj) return null;
  const diffMinutes = Math.max(0, Math.floor((Date.now() - dateObj.getTime()) / 60000));
  if (diffMinutes <= 5) return 'low';
  if (diffMinutes <= 15) return 'medium';
  return 'high';
};

const getPriorityBadge = (level) => {
  if (level === 'high') return { label: 'Sangat prioritas', className: 'bg-red-50 text-red-700 border border-red-100' };
  if (level === 'medium') return { label: 'Penting', className: 'bg-amber-50 text-amber-700 border border-amber-100' };
  if (level === 'low') return { label: 'Belum prioritas', className: 'bg-slate-50 text-slate-600 border border-slate-200' };
  return null;
};

const ValidationList = () => {
  const navigate = useNavigate();
  const [queueData, setQueueData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('Semua');
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

        // Support both grouped (new) and flat (legacy) formats
        const payload = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
          ? result.data
          : [];

        // Normalize: if data is already grouped by patient (has 'specimens' array), use as-is.
        // If flat (legacy format per-specimen), group it here for consistency.
        if (payload.length > 0 && !('specimens' in payload[0])) {
          const map = new Map();
          for (const item of payload) {
            const key = item.id_pasien || item.nama_pasien || 'unknown';
            if (!map.has(key)) {
              map.set(key, {
                id_pasien: item.id_pasien,
                nama_pasien: item.nama_pasien || item.name || '-',
                nik: item.nik,
                earliest_upload: item.tanggal_upload || item.uploaded_at,
                total_specimens: 0,
                total_bakteri: 0,
                specimens: [],
              });
            }
            const g = map.get(key);
            g.total_specimens += 1;
            const bakteri = item.total_bakteri || 0;
            g.total_bakteri += bakteri;
            g.specimens.push({
              id_specimen: item.id_specimen ?? item.specimen_id ?? item.id,
              accession_number: item.accession_number || item.kode_sampel || '',
              tanggal_upload: item.tanggal_upload || item.uploaded_at,
              specimen_type: item.specimen_type,
              doctor_sender: item.doctor_sender,
              clinical_diagnosis: item.clinical_diagnosis,
              validation_status: item.validation_status,
              total_bakteri: bakteri,
            });
          }
          setQueueData(Array.from(map.values()));
        } else {
          setQueueData(payload);
        }
      } catch (error) {
        console.error('Gagal mengambil antrean:', error);
        setQueueData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueue();
  }, [navigate]);

  // Filter Logic (searches across patient name + specimen codes)
  const filteredPatients = queueData.filter((p) => {
    const patientName = String(p.nama_pasien || '').toLowerCase();
    const specimenCodes = (p.specimens || []).map(s =>
      String(s.accession_number || s.id_specimen || '').toLowerCase()
    ).join(' ');
    const matchSearch = patientName.includes(searchTerm.toLowerCase()) || specimenCodes.includes(searchTerm.toLowerCase());

    if (priorityFilter !== 'Semua') {
      const firstSpec = p.specimens?.[0];
      const level = getPriorityLevel(firstSpec || p);
      if (level !== priorityFilter) return false;
    }
    return matchSearch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, priorityFilter]);

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const aDate = toSortableDate(a.earliest_upload || getQueueTime(a.specimens?.[0] || a));
    const bDate = toSortableDate(b.earliest_upload || getQueueTime(b.specimens?.[0] || b));
    return (aDate?.getTime() ?? Infinity) - (bDate?.getTime() ?? Infinity);
  });

  const totalPages = Math.max(1, Math.ceil(sortedPatients.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = sortedPatients.slice(startIndex, startIndex + itemsPerPage);

  const handleValidate = (specimenId) => {
    navigate(`/doctor/validate/${specimenId}`);
  };

  return (
    <div className="space-y-6 bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Validasi Hasil</h1>
        <p className="text-gray-500 mt-1">Daftar pemeriksaan yang menunggu tinjauan medis Anda, dikelompokkan per pasien.</p>
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
              placeholder="Cari Nama Pasien..." 
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
              {PRIORITY_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wide text-center">
                <th className="p-5 text-center">Waktu Masuk</th>
                <th className="p-5 text-center">Nama Pasien</th>
                <th className="p-5 text-center">Jumlah Sampel</th>
                <th className="p-5 text-center">Prioritas</th>
                <th className="p-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan="5" className="p-10 text-center text-gray-400">Memuat antrean validasi...</td></tr>
              ) : paginatedPatients.length > 0 ? (
                paginatedPatients.map((patient, pIdx) => {
                  const specimens = patient.specimens || [];
                  const totalSpecimens = patient.total_specimens || specimens.length;
                  const uploadTime = patient.earliest_upload || '-';
                  const priorityInfo = getPriorityBadge(getPriorityLevel(specimens[0] || patient));
                  const firstSpecimenId = specimens[0]?.id_specimen || null;

                  return (
                  <tr key={patient.id_pasien || `patient-${pIdx}`} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-5 text-center">
                      <span className="text-gray-600 font-medium">{uploadTime}</span>
                    </td>
                    <td className="p-5 text-center">
                      <p className="font-bold text-gray-800">{patient.nama_pasien}</p>
                    </td>
                    <td className="p-5 text-center">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                        {totalSpecimens} sampel
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      {priorityInfo && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${priorityInfo.className}`}>
                          {priorityInfo.label}
                        </span>
                      )}
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleValidate(firstSpecimenId)}
                          className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-2 mx-auto transition-all active:scale-95"
                        >
                          Validasi
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr><td colSpan="5" className="p-10 text-center text-gray-400">Tidak ada antrean validasi ditemukan.</td></tr>
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

export default ValidationList;