import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  Microscope,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- DUMMY DATA ---
const validationQueue = [
  { 
    id: 1, 
    name: 'Budi Santoso', 
    sampleCode: 'SPL-2026-001', 
    gender: 'L', 
    age: 45, 
    date: '27 Jan 2026, 09:00', 
    analyst: 'Siti Aminah', 
    priority: 'High',
    status: 'Menunggu Validasi'
  },
  { 
    id: 4, 
    name: 'Dewi Sartika', 
    sampleCode: 'SPL-2026-004', 
    gender: 'P', 
    age: 50, 
    date: '27 Jan 2026, 10:15', 
    analyst: 'Rudi Hartono', 
    priority: 'Normal',
    status: 'Menunggu Validasi'
  },
  { 
    id: 5, 
    name: 'Siti Aminah', 
    sampleCode: 'SPL-2026-002', 
    gender: 'P', 
    age: 32, 
    date: '26 Jan 2026, 08:30', 
    analyst: 'Budi Santoso', 
    priority: 'Normal',
    status: 'Selesai Validasi'
  },
  { 
    id: 6, 
    name: 'Rudi Hartono', 
    sampleCode: 'SPL-2026-003', 
    gender: 'L', 
    age: 38, 
    date: '25 Jan 2026, 15:45', 
    analyst: 'Dewi Sartika', 
    priority: 'High',
    status: 'Selesai Validasi'
  },
];

const ValidationList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Menunggu Validasi');

  // Filter Logic
  const filteredPatients = validationQueue.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
              p.sampleCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'Semua' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleValidate = (id) => {
    navigate(`/doctor/validation/${id}`);
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
                          <p className="font-bold text-gray-800 text-sm">{patient.name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Kode Sampel */}
                    <td className="p-5 text-center">
                      <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200 inline-block">
                        {patient.sampleCode}
                      </span>
                    </td>

                    {/* Analis */}
                    <td className="p-5 text-center text-sm text-gray-600">
                      {patient.analyst}
                    </td>

                    {/* Status (Konsisten dengan Analis) */}
                    <td className="p-5 text-center">
                      {patient.status === 'Menunggu Validasi' ? (
                        <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-100 inline-flex items-center justify-center w-fit mx-auto">
                          {patient.status}
                        </span>
                      ) : (
                        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-100 inline-flex items-center justify-center w-fit mx-auto">
                          {patient.status}
                        </span>
                      )}
                    </td>

                    {/* Tombol Aksi */}
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => handleValidate(patient.id)}
                        className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-2 mx-auto transition-all active:scale-95"
                      >
                        Validasi
                      </button>
                    </td>

                  </tr>
                ))
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

        {/* Footer Pagination (Static) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
          <span>Menampilkan {filteredPatients.length} dari {validationQueue.length} data</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-200 rounded bg-white disabled:opacity-50" disabled>Sebelumnya</button>
            <button className="px-3 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50">Berikutnya</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationList;