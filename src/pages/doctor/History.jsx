import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Clock
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api';

const pad2 = (num) => String(num).padStart(2, '0');

const toDateTimeParts = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return { date: '-', time: '-' };

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const dateObj = new Date(normalized);

  if (Number.isNaN(dateObj.getTime())) {
    const [d, t] = raw.replace('T', ' ').split(' ');
    return { date: d || '-', time: (t || '-').slice(0, 5) };
  }

  return {
    date: `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}-${pad2(dateObj.getDate())}`,
    time: `${pad2(dateObj.getHours())}:${pad2(dateObj.getMinutes())}`
  };
};

const getPositiveCount = (item) =>
  item.total_g_positif ??
  item.gram_positive ??
  item.gram_positive_count ??
  item.positive_count ??
  item.summary?.gram_positive_count ??
  item.result_summary?.gram_positive_count ??
  item.counts?.pos ??
  0;

const getNegativeCount = (item) =>
  item.total_g_negatif ??
  item.gram_negative ??
  item.gram_negative_count ??
  item.negative_count ??
  item.summary?.gram_negative_count ??
  item.result_summary?.gram_negative_count ??
  item.counts?.neg ??
  0;

const getRejectedCount = (item) =>
  item.rejected_count ??
  item.summary?.rejected_count ??
  item.result_summary?.rejected_count ??
  item.counts?.rejected ??
  0;

const isValidatedItem = (item) => {
  const status = String(item?.status || item?.validation_status || item?.status_validasi || '').toLowerCase();
  return (
    item?.is_validated === true ||
    item?.sudah_divalidasi === true ||
    Boolean(item?.validated_at) ||
    Boolean(item?.tanggal_validasi) ||
    status === 'validated' ||
    status === 'tervalidasi' ||
    status.includes('selesai')
  );
};

const History = () => {
  const [historyData, setHistoryData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/analyst/history`);
        if (!response.ok) {
          setHistoryData([]);
          return;
        }

        const result = await response.json();
        const rawList = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result?.results)
              ? result.results
              : [];

        const mapped = rawList
          .filter((item) => isValidatedItem(item))
          .map((item, index) => {
            const when = item?.validated_at || item?.tanggal_validasi || item?.updated_at || item?.created_at || item?.tanggal || item?.date;
            const { date, time } = toDateTimeParts(when);
            return {
              id: item?.id ?? item?.id_specimen ?? item?.specimen_id ?? item?.specimenId ?? index,
              date,
              time,
              patient: item?.patient_name || item?.patientName || item?.nama_pasien || item?.nama_lengkap || '-',
              code: item?.specimen_code || item?.specimenCode || item?.code || item?.id_specimen || item?.id_spesimen || item?.specimen_id || item?.specimenId || '-',
              analyst: item?.analis_pengirim || item?.analyst || item?.analyst_name || '-',
              doctor: item?.dokter || item?.doctor || item?.doctor_name || '-',
              status: 'Valid',
              stats: {
                pos: getPositiveCount(item),
                neg: getNegativeCount(item),
                rejected: getRejectedCount(item)
              }
            };
          });

        setHistoryData(mapped);
      } catch (error) {
        console.error('Gagal mengambil riwayat validasi dokter:', error);
        setHistoryData([]);
      }
    };

    fetchHistory();
  }, []);

  // Filter Logic Sederhana
  const filteredData = historyData.filter(item => {
    const term = searchTerm.toLowerCase();
    return item.patient.toLowerCase().includes(term) || item.code.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Riwayat Validasi</h1>
          <p className="text-gray-500 mt-1">Arsip hasil pemeriksaan yang telah  divalidasi.</p>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden">
        {/* TOOLBAR: Hanya Search Bar */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari Nama Pasien atau Kode..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-100 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wide">
                <th className="p-4 text-left pl-6">Waktu Validasi</th>
                <th className="p-4 text-left">Identitas Pasien</th>
                <th className="p-4 text-center">Ringkasan Hasil</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">

                    {/* Kolom 1: Waktu Validasi */}
                    <td className="p-4 text-left pl-6 whitespace-nowrap">
                      <div className="font-bold text-gray-800">{item.date}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock size={12} /> {item.time} WIB
                      </div>
                    </td>

                    {/* Kolom 2: Identitas Pasien (Nama + ID Spesimen) */}
                    <td className="p-4 text-left whitespace-nowrap">
                      <div className="font-bold text-gray-800">{item.patient}</div>
                      <div className="text-xs font-mono text-gray-500 mt-0.5">{item.code}</div>
                    </td>

                    {/* Kolom 3: Ringkasan Hasil */}
                    <td className="p-4 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <div className="flex items-center px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium">
                          <span className="opacity-70 mr-1">Pos:</span>
                          <span className="font-bold">{item.stats.pos}</span>
                        </div>

                        <div className="flex items-center px-2 py-1 rounded-md bg-red-50 border border-red-100 text-red-700 text-xs font-medium">
                          <span className="opacity-70 mr-1">Neg:</span>
                          <span className="font-bold">{item.stats.neg}</span>
                        </div>

                        {item.stats.rejected > 0 && (
                          <div className="flex items-center px-2 py-1 rounded-md bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium">
                            <span className="opacity-70 mr-1">Tolak:</span>
                            <span className="font-bold">{item.stats.rejected}</span>
                          </div>
                        )}

                        {item.stats.rejected === 0 && (
                          <div className="flex items-center px-2 py-1 rounded-md bg-gray-50 border border-gray-100 text-gray-400 text-xs font-medium">
                            <span className="opacity-70 mr-1">Tolak:</span>
                            <span className="font-bold">0</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Kolom 4: Aksi */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => navigate(`/doctor/history/${item.id}`)}
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
                  <td colSpan="4" className="p-10 text-center text-gray-400 italic">
                    Tidak ada data riwayat untuk periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
          <span>Menampilkan {filteredData.length} data</span>
          <div className="flex gap-2">
            <button disabled className="px-3 py-1 bg-white border border-gray-200 rounded text-gray-400 cursor-not-allowed">Sebelumnya</button>
            <button className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 text-gray-600">Berikutnya</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
