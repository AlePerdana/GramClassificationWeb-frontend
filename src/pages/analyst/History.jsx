import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import authService from '../../service/authService';
import { APP_CONFIG } from '../../utils/constant';

const History = () => {
  const API_BASE_URL = APP_CONFIG.API_BASE_URL;
  const LEGACY_STATUS = {
    waiting: 'Menunggu Validasi',
    done: 'Selesai Validasi'
  };

  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua Status');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const headers = authService.getAuthorizationHeader();
        const response = await fetch(`${API_BASE_URL}/analyst/history`, {
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

        if (response.ok) {
          const raw = await response.json();
          const data = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.data)
            ? raw.data
            : Array.isArray(raw?.results)
            ? raw.results
            : [];
          setHistoryData(data);
        } else {
          setHistoryData([]);
        }
      } catch (error) {
        console.error('Gagal mengambil data history:', error);
        setHistoryData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
    const id = window.setInterval(fetchHistory, 10000);
    return () => window.clearInterval(id);
  }, [API_BASE_URL, navigate]);

  const getStatusLabel = (item) => {
    const statusRaw = String(item?.status || item?.validation_status || item?.status_validasi || '');
    const status = statusRaw.toLowerCase();
    const isDone =
      status === 'validated' ||
      status === 'tervalidasi' ||
      status.includes('selesai') ||
      item?.is_validated === true ||
      Boolean(item?.validated_at) ||
      Boolean(item?.tanggal_validasi);
    return isDone ? LEGACY_STATUS.done : LEGACY_STATUS.waiting;
  };

  // Logic Filter
  const filteredData = historyData.filter(item => {
    const patientName = String(item.patient_name || item.patientName || item.nama_pasien || item.nama_lengkap || '').toLowerCase();
    const code = String(item.specimen_code || item.specimenCode || item.code || item.id_specimen || item.id_spesimen || item.specimen_id || item.specimenId || '').toLowerCase();
    const status = getStatusLabel(item);

    const matchSearch = patientName.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'Semua Status' || status === filterStatus;
    return matchSearch && matchStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, historyData.length]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Komponen Status Badge
  const StatusBadge = ({ status }) => {
    const normalized = String(status || '').toLowerCase();
    switch (normalized) {
      case 'menunggu validasi':
        return <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-[10px] font-bold border border-yellow-100 w-fit">{status}</span>;
      case 'selesai validasi':
        return <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold border border-green-100 w-fit">{status}</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-[10px] font-bold border border-slate-200 w-fit">{status}</span>;
    }
  };

  const getPosCount = (item) =>
    item.total_g_positif ??
    item.gram_positive ??
    item.gram_positive_count ??
    item.positive_count ??
    item.summary?.gram_positive_count ??
    item.summary?.gram_positive ??
    item.result_summary?.gram_positive_count ??
    item.result_summary?.gram_positive ??
    item.classification_summary?.gram_positive_count ??
    item.classification_summary?.gram_positive ??
    item.counts?.pos ??
    0;

  const getNegCount = (item) =>
    item.total_g_negatif ??
    item.gram_negative ??
    item.gram_negative_count ??
    item.negative_count ??
    item.summary?.gram_negative_count ??
    item.summary?.gram_negative ??
    item.result_summary?.gram_negative_count ??
    item.result_summary?.gram_negative ??
    item.classification_summary?.gram_negative_count ??
    item.classification_summary?.gram_negative ??
    item.counts?.neg ??
    0;

  const getRejectedCount = (item) =>
    item.rejected_count ??
    item.summary?.rejected_count ??
    item.result_summary?.rejected_count ??
    item.classification_summary?.rejected_count ??
    item.counts?.rejected ??
    0;

  const getDetailId = (item) =>
    item.id_specimen ||
    item.id_spesimen ||
    item.specimen_id ||
    item.specimenId ||
    item.specimen_code ||
    item.specimenCode ||
    item.id ||
    item.patient_id ||
    item.patientId;

  return (
    <div className="space-y-6 max-w-7xl mx-auto bg-slate-50/80 p-4 rounded-2xl">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Riwayat Klasifikasi</h1>
          <p className="text-gray-500 mt-1">Arsip hasil pemeriksaan sampel yang telah Anda kerjakan.</p>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden">
        {/* TOOLBAR */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari Pasien atau Kode Sampel..." 
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
              <option value="Semua Status">Semua Status</option>
              <option value="Menunggu Validasi">Menunggu Validasi</option>
              <option value="Selesai Validasi">Selesai Validasi</option>
            </select>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-center border-collapse whitespace-nowrap min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wide text-center">
                <th className="p-5 text-center">Tanggal & Waktu</th>
                <th className="p-5 text-center">Nama Pasien</th>
                <th className="p-5 text-center">Kode Sampel</th>
                <th className="p-5 text-center">Detail Jumlah</th>
                <th className="p-5 text-center">Status Validasi</th>
                <th className="p-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-gray-400 italic">
                    Memuat data riwayat...
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <tr key={getDetailId(item)} className="hover:bg-blue-50/30 transition-colors">
                    {/* Tanggal */}
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-600 font-medium">
                        {item.tanggal || item.created_at || item.createdAt || item.uploaded_at || item.date || '-'}
                      </div>
                    </td>

                    {/* Pasien */}
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div>
                          <p className="font-bold text-gray-800">{item.patient_name || item.patientName || item.nama_pasien || '-'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Kode Sampel */}
                    <td className="p-5 text-center">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200 inline-block">
                        {item.specimen_code || item.specimenCode || item.code || item.id_specimen || item.id_spesimen || item.specimen_id || item.specimenId || '-'}
                      </span>
                    </td>

                    {/* Detail Jumlah */}
                    <td className="p-5 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <div className="flex items-center px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium">
                          <span className="opacity-70 mr-1">Pos:</span>
                          <span className="font-bold">{getPosCount(item)}</span>
                        </div>
                        <div className="flex items-center px-2 py-1 rounded-md bg-red-50 border border-red-100 text-red-700 text-xs font-medium">
                          <span className="opacity-70 mr-1">Neg:</span>
                          <span className="font-bold">{getNegCount(item)}</span>
                        </div>
                        {getRejectedCount(item) > 0 && (
                          <div className="flex items-center px-2 py-1 rounded-md bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium">
                            <span className="opacity-70 mr-1">Tolak:</span>
                            <span className="font-bold">{getRejectedCount(item)}</span>
                          </div>
                        )}
                        {getRejectedCount(item) === 0 && (
                          <div className="flex items-center px-2 py-1 rounded-md bg-gray-50 border border-gray-100 text-gray-400 text-xs font-medium">
                            <span className="opacity-70 mr-1">Tolak:</span>
                            <span className="font-bold">0</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-5 text-center flex justify-center">
                      <StatusBadge status={getStatusLabel(item)} />
                    </td>

                    {/* Aksi */}
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => navigate(`/analyst/history/${getDetailId(item)}`)}
                          className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-2 mx-auto transition-all active:scale-95"
                          title="Lihat Detail Riwayat"
                        >
                          Detail
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-gray-400 italic">
                    Tidak ada data riwayat ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
          <span>Menampilkan {paginatedData.length} dari {filteredData.length} data</span>
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

export default History;