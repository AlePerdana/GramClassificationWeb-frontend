import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Microscope, 
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- DUMMY DATA (Sinkron dengan data Admin) ---
const initialPatients = [
  { id: 1, name: 'Budi Santoso', sampleCode: 'SPL-2026-001', gender: 'L', age: 45, date: '27 Jan 2026, 09:00', status: 'Menunggu Sampel', priority: 'High' },
  { id: 4, name: 'Dewi Sartika', sampleCode: 'SPL-2026-004', gender: 'P', age: 50, date: '27 Jan 2026, 10:15', status: 'Menunggu Sampel', priority: 'Normal' },
  // Pasien yang sudah selesai tidak perlu muncul di tab utama, atau bisa difilter
  { id: 2, name: 'Siti Aminah', sampleCode: 'SPL-2026-002', gender: 'P', age: 32, date: '26 Jan 2026, 08:30', status: 'Selesai Klasifikasi', priority: 'Low' },
];

const AnalystPatientList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Menunggu Sampel'); // Default ke tugas yang belum selesai

  // Filter Logic
  const filteredPatients = initialPatients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.sampleCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'Semua' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Handler untuk menuju halaman Upload/Proses
  const handleProcess = (patientId) => {
    // Navigasi ke halaman detail klasifikasi (akan kita buat setelah ini)
    navigate(`/analyst/classification/${patientId}`);
  };

  return (
    <div className="space-y-6 bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Daftar Pasien</h1>
        <p className="text-gray-500 mt-1">Pilih pasien untuk mulai mengunggah sampel citra mikroskop.</p>
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
              placeholder="Cari Nama atau Kode Sampel..." 
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
              <option value="Menunggu Sampel">Menunggu Sampel</option>
              <option value="Selesai Klasifikasi">Selesai Klasifikasi</option>
              <option value="Semua">Semua Data</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wide text-center">
                <th className="p-5 text-center">Waktu Masuk</th>
                <th className="p-5 text-center">Kode Sampel</th>
                <th className="p-5 text-center">Nama Pasien</th>
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

                    {/* Kode Sampel */}
                    <td className="p-5 text-center">
                      <span className="font-mono font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">
                        {patient.sampleCode}
                      </span>
                    </td>

                    {/* Nama Pasien */}
                    <td className="p-5 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{patient.name}</p>
                          <p className="text-xs text-gray-500">{patient.gender === 'L' ? 'Laki-laki' : 'Perempuan'} - {patient.age} Th</p>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center ${
                        patient.status === 'Menunggu Sampel' 
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' 
                          : 'bg-green-50 text-green-700 border border-green-100'
                      }`}>
                        {patient.status}
                      </span>
                    </td>

                    {/* Tombol Aksi (Paling Penting) */}
                    <td className="p-5 text-center">
                      {patient.status === 'Menunggu Sampel' ? (
                        <button 
                          onClick={() => handleProcess(patient.id)}
                          className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-2 mx-auto transition-all active:scale-95"
                        >
                          Proses
                        </button>
                      ) : (
                        <button 
                          disabled
                          className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 mx-auto cursor-not-allowed"
                        >
                          <CheckCircle size={14} /> Selesai
                        </button>
                      )}
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <AlertCircle size={40} className="mb-2 opacity-20" />
                      <p>Tidak ada pasien dengan status "{filterStatus}".</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination (Static) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
          <span>Menampilkan {filteredPatients.length} dari {initialPatients.length} data</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-200 rounded bg-white disabled:opacity-50" disabled>Sebelumnya</button>
            <button className="px-3 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50">Berikutnya</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalystPatientList;