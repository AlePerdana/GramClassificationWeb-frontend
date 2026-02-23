import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  Download,
  Eye,
  Edit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- DUMMY DATA RIWAYAT ---
const historyData = [
  { 
    id: 1, 
    date: '27 Jan 2026, 14:30', 
    patientName: 'Budi Santoso', 
    code: 'SPL-2026-001', 
    result: 'Gram Positif (Dominan)', 
    counts: { pos: 15, neg: 2, rejected: 0 },
    status: 'Menunggu Validasi',
    analyst: 'Anda' 
  },
  { 
    id: 2, 
    date: '26 Jan 2026, 09:15', 
    patientName: 'Siti Aminah', 
    code: 'SPL-2026-002', 
    result: 'Gram Negatif (Dominan)', 
    counts: { pos: 3, neg: 18, rejected: 0 },
    status: 'Sudah Validasi',
    analyst: 'Anda' 
  },
  { 
    id: 3, 
    date: '26 Jan 2026, 11:00', 
    patientName: 'Rudi Hartono', 
    code: 'SPL-2026-003', 
    result: 'Campuran (Inkonklusif)', 
    counts: { pos: 10, neg: 12, rejected: 0 },
    status: 'Menunggu Validasi',
    analyst: 'Anda' 
  },
];

const History = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const navigate = useNavigate();

  // Logic Filter
  const filteredData = historyData.filter(item => {
    const matchSearch = item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Komponen Status Badge
  const StatusBadge = ({ status }) => {
    switch (status) {
      case 'Menunggu Validasi':
        return <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-[10px] font-bold border border-yellow-100 w-fit">Menunggu</span>;
      case 'Sudah Validasi':
        return <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold border border-green-100 w-fit">Sudah Validasi</span>;
      default:
        return <span>{status}</span>;
    }
  };

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
              <option value="Semua">Semua Status</option>
              <option value="Menunggu Validasi">Menunggu Validasi</option>
              <option value="Sudah Validasi">Sudah Validasi</option>
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
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* Tanggal */}
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-600 font-medium">
                        {item.date}
                      </div>
                    </td>

                    {/* Pasien */}
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div>
                          <p className="font-bold text-gray-800">{item.patientName}</p>
                        </div>
                      </div>
                    </td>

                    {/* Kode Sampel */}
                    <td className="p-5 text-center">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200 inline-block">
                        {item.code}
                      </span>
                    </td>

                    {/* Detail Jumlah */}
                    <td className="p-5 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <div className="flex items-center px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium">
                          <span className="opacity-70 mr-1">Pos:</span>
                          <span className="font-bold">{item.counts.pos}</span>
                        </div>
                        <div className="flex items-center px-2 py-1 rounded-md bg-red-50 border border-red-100 text-red-700 text-xs font-medium">
                          <span className="opacity-70 mr-1">Neg:</span>
                          <span className="font-bold">{item.counts.neg}</span>
                        </div>
                        {item.counts.rejected > 0 && (
                          <div className="flex items-center px-2 py-1 rounded-md bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium">
                            <span className="opacity-70 mr-1">Tolak:</span>
                            <span className="font-bold">{item.counts.rejected}</span>
                          </div>
                        )}
                        {item.counts.rejected === 0 && (
                          <div className="flex items-center px-2 py-1 rounded-md bg-gray-50 border border-gray-100 text-gray-400 text-xs font-medium">
                            <span className="opacity-70 mr-1">Tolak:</span>
                            <span className="font-bold">0</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-5 text-center flex justify-center">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* Aksi */}
                    <td className="p-5 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => navigate(`/analyst/classification/${item.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                          title="Lihat Detail"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                          title="Edit Data"
                        >
                          <Edit size={18} />
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

        {/* Pagination Footer (Static) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
          <span>Menampilkan {filteredData.length} data</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50" disabled>Sebelumnya</button>
            <button className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100">Berikutnya</button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default History;