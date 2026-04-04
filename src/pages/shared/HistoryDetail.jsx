import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Printer, Edit, CheckCircle,
  Info, AlertCircle, User, Activity, FileText
} from 'lucide-react';

// --- DUMMY DATA ---
// Data ini mensimulasikan hasil yang sudah diproses Analis dan (mungkin) sudah divalidasi Dokter.
const dummyData = {
  id: 'SPL-2026-001',
  status: 'validated', // Bisa 'pending' (menunggu dokter) atau 'validated' (selesai)
  patient: { name: 'Budi Santoso', age: 45, gender: 'Laki-laki', rm: 'RM-09823' },
  clinical: { date: '27 Jan 2026', specimen: 'Sputum', analyst: 'Siti Aminah', doctor: 'Dr. Riro, Sp.MK' },
  doctorNote: 'Pasien diindikasikan mengalami infeksi saluran pernapasan. Ditemukan dominasi Gram Positif Kokus.',
  crops: [
    { id: 1, img: 'https://placehold.co/150/2563eb/ffffff?text=Bakteri+1', aiGram: 'Positif', aiShape: 'Kokus', finalGram: 'Positif', finalShape: 'Kokus', status: 'accepted' },
    { id: 2, img: 'https://placehold.co/150/dc2626/ffffff?text=Bakteri+2', aiGram: 'Negatif', aiShape: 'Batang', finalGram: 'Negatif', finalShape: 'Batang', status: 'accepted' },
    { id: 3, img: 'https://placehold.co/150/94a3b8/ffffff?text=Kotoran', aiGram: 'Positif', aiShape: 'Kokus', finalGram: null, finalShape: null, status: 'rejected' },
    { id: 4, img: 'https://placehold.co/150/2563eb/ffffff?text=Bakteri+4', aiGram: 'Negatif', aiShape: 'Kokus', finalGram: 'Positif', finalShape: 'Kokus', status: 'revised' }
  ]
};

const HistoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Deteksi Role berdasarkan URL saat ini
  const isDoctor = location.pathname.includes('/doctor');
  const isAnalyst = location.pathname.includes('/analyst');

  const data = dummyData;

  // Menghitung statistik untuk header
  const totalCrops = data.crops.length;
  const validCrops = data.crops.filter(c => c.status !== 'rejected').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">

      {/* HEADER & ACTION BUTTONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            title="Kembali"
          >
            <ArrowLeft className="text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">Detail Riwayat Analisis</h1>
              {data.status === 'validated' ? (
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={14} /> Selesai Divalidasi</span>
              ) : (
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle size={14} /> Menunggu Validasi</span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1">ID Spesimen: <span className="font-mono font-bold">{data.id}</span></p>
          </div>
        </div>

        {/* TOMBOL AKSI DINAMIS BERDASARKAN ROLE */}
        <div className="flex gap-3 w-full md:w-auto">
          {isDoctor && (
            <>
              <button
                onClick={() => navigate(`/doctor/validation/${id}`)}
                className="px-4 py-2 bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <Edit size={16} /> Edit Validasi
              </button>
              {data.status === 'validated' && (
                <button
                  onClick={() => navigate(`/doctor/report/${id}`)}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
                >
                  <Printer size={16} /> Cetak Laporan
                </button>
              )}
            </>
          )}

          {isAnalyst && (
            <button
              onClick={() => navigate(`/analyst/process/${id}`)}
              className="px-4 py-2 bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Edit size={16} /> Revisi Analisis
            </button>
          )}
        </div>
      </div>

      {/* INFORMASI PASIEN (Read Only) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><User size={18} className="text-blue-600" /> Data Pasien</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500 text-xs">Nama Lengkap</p><p className="font-bold text-slate-800">{data.patient.name}</p></div>
            <div><p className="text-slate-500 text-xs">No. Rekam Medis</p><p className="font-bold text-slate-800">{data.patient.rm}</p></div>
            <div><p className="text-slate-500 text-xs">Umur / Gender</p><p className="font-semibold text-slate-700">{data.patient.age} Thn / {data.patient.gender}</p></div>
          </div>
        </div>
        <div className="hidden md:block w-px bg-slate-200"></div>
        <div className="flex-1 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-blue-600" /> Data Klinis</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500 text-xs">Tanggal Analisis</p><p className="font-semibold text-slate-700">{data.clinical.date}</p></div>
            <div><p className="text-slate-500 text-xs">Jenis Spesimen</p><p className="font-semibold text-slate-700">{data.clinical.specimen}</p></div>
            <div><p className="text-slate-500 text-xs">Analis / Dokter</p><p className="font-semibold text-slate-700">{data.clinical.analyst} / {data.clinical.doctor}</p></div>
          </div>
        </div>
      </div>

      {/* GRID GAMBAR HASIL (Read Only) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Hasil Objek Terdeteksi</h3>
            <p className="text-xs text-slate-500 mt-1">Total {totalCrops} objek terdeteksi (Valid: {validCrops} objek).</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {data.crops.map((crop) => {
            let borderColor = 'border-slate-200';
            let statusBadge = null;

            if (data.status === 'validated') {
              if (crop.status === 'accepted') {
                borderColor = 'border-green-400 ring-2 ring-green-100';
                statusBadge = <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Sesuai AI</span>;
              } else if (crop.status === 'revised') {
                borderColor = 'border-orange-400 ring-2 ring-orange-100';
                statusBadge = <span className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Direvisi</span>;
              } else if (crop.status === 'rejected') {
                borderColor = 'border-red-400 opacity-60';
                statusBadge = <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Ditolak</span>;
              }
            }

            return (
              <div key={crop.id} className={`bg-white rounded-xl border ${borderColor} overflow-hidden shadow-sm relative transition-all`}>
                {statusBadge}

                <div className="aspect-square bg-slate-100 relative">
                  <img src={crop.img} alt="Crop" className="w-full h-full object-cover" />
                  {data.status === 'validated' && crop.status === 'rejected' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-1 bg-red-500/80 -rotate-45 absolute"></div>
                      <div className="w-full h-1 bg-red-500/80 rotate-45 absolute"></div>
                    </div>
                  )}
                </div>

                <div className="p-3 text-center">
                  {data.status === 'validated' && crop.status !== 'rejected' ? (
                    <>
                      <p className={`text-xs font-bold ${crop.finalGram === 'Positif' ? 'text-purple-700' : 'text-red-600'}`}>
                        Gram {crop.finalGram}
                      </p>
                      <p className="text-xs text-slate-600 font-medium">{crop.finalShape}</p>
                    </>
                  ) : data.status === 'pending' ? (
                    <>
                      <p className="text-[10px] text-slate-400 mb-0.5">Prediksi AI:</p>
                      <p className={`text-xs font-bold ${crop.aiGram === 'Positif' ? 'text-purple-700' : 'text-red-600'}`}>
                        Gram {crop.aiGram}
                      </p>
                      <p className="text-xs text-slate-600 font-medium">{crop.aiShape}</p>
                    </>
                  ) : (
                    <p className="text-xs font-bold text-red-500 mt-2">Bukan Bakteri</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CATATAN DOKTER */}
      <div className={`p-6 rounded-2xl border ${data.status === 'validated' ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
          <FileText size={18} className={data.status === 'validated' ? 'text-blue-600' : 'text-slate-400'} />
          Catatan & Kesimpulan Dokter
        </h3>

        {data.status === 'validated' ? (
          <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-blue-50 shadow-sm">
            {data.doctorNote || 'Tidak ada catatan tambahan dari dokter.'}
          </p>
        ) : (
          <div className="flex items-center gap-3 text-sm text-slate-500 bg-white p-4 rounded-xl border border-slate-100">
            <Info size={18} className="text-slate-400" />
            <p>Dokter belum melakukan validasi dan memberikan catatan pada sampel ini.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default HistoryDetail;
