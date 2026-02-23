import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Save, 
  Upload, 
  Play, 
  Trash2, 
  Check, 
  Zap, 
  Layers, 
  FileUp,
  Activity,
  Target,
  BarChart2,
  Settings,
  Database,
  FileArchive,
  Calendar,
  Clock,
  RefreshCw
} from 'lucide-react';

// --- DUMMY DATA ---
const dummyDetectionModels = [
  { id: 101, name: 'YOLOv8-Nano-Base', version: '1.0', accuracy: '91.5%', uploaded: '2026-01-10', status: 'Tidak Aktif' },
  { id: 102, name: 'YOLOv8-Nano-V2', version: '2.1', accuracy: '94.2%', uploaded: '2026-01-25', status: 'Aktif' },
];

const dummyClassificationModels = [
  { id: 201, name: 'ResNet50-Microbio', version: '1.0', accuracy: '88.0%', uploaded: '2026-01-05', status: 'Tidak Aktif' },
  { id: 202, name: 'GramVIT-B1', version: '1.2', accuracy: '96.5%', uploaded: '2026-01-20', status: 'Aktif' },
  { id: 203, name: 'Custom-CNN-Lite', version: '0.9', accuracy: '85.2%', uploaded: '2026-01-22', status: 'Tidak Aktif' },
];

// --- KOMPONEN KECIL: KARTU METRIK ---
const MetricCard = ({ label, value, icon: Icon }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-md shadow-slate-300/40 flex items-center justify-between">
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
      <Icon size={20} />
    </div>
  </div>
);

const AIConfiguration = () => {
  const location = useLocation();
  // State Tab
  const [activeTab, setActiveTab] = useState('detection');

  // State Data Model
  const [detModels, setDetModels] = useState(dummyDetectionModels);
  const [clsModels, setClsModels] = useState(dummyClassificationModels);

  // State Config & Training
  const [threshold, setThreshold] = useState(50);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dataSource, setDataSource] = useState('system'); 
  
  // State Baru: Auto Retrain & Last Update
  const [autoRetrain, setAutoRetrain] = useState(false);
  const [lastRetrained, setLastRetrained] = useState('25 Jan 2026, 14:30');

  // Honor navigation intent from dashboard CTA
  useEffect(() => {
    const navTab = location.state?.tab;
    if (navTab === 'detection' || navTab === 'classification') {
      setActiveTab(navTab);
    }
  }, [location.state]);

  // Helper untuk mendapatkan model aktif saat ini
  const currentModels = activeTab === 'detection' ? detModels : clsModels;
  const activeModelName = currentModels.find(m => m.status === 'Aktif')?.name || 'Belum ada model aktif';

  // Handler Aktivasi Model
  const handleActivate = (id) => {
    if (activeTab === 'detection') {
      setDetModels(detModels.map(m => ({ ...m, status: m.id === id ? 'Aktif' : 'Tidak Aktif' })));
    } else {
      setClsModels(clsModels.map(m => ({ ...m, status: m.id === id ? 'Aktif' : 'Tidak Aktif' })));
    }
  };

  // Handler Training
  const handleStartTraining = () => {
    if (dataSource === 'upload') {
      alert("Fitur upload dataset dipilih. (Simulasi)");
    }
    
    setIsTraining(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          
          // Update waktu terakhir training secara otomatis setelah selesai
          const now = new Date();
          const dateString = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          setLastRetrained(`${dateString}, ${timeString}`);
          
          alert(`Training selesai! Model ${activeModelName} v.Next telah dibuat.`);
          return 100;
        }
        return prev + 5; 
      });
    }, 200);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-2 bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Konfigurasi AI</h1>
        <p className="text-gray-500 mt-1">Manajemen model, konfigurasi parameter, dan pelatihan ulang (Retraining)</p>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('detection')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'detection' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Zap size={18} /> Deteksi Objek (YOLO)
        </button>
        <button
          onClick={() => setActiveTab('classification')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'classification' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers size={18} /> Klasifikasi Gram (CNN)
        </button>
      </div>

      {/* 1. METRIK PERFORMA MODEL AKTIF (Full width) */}
      <div className="bg-white p-6 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Activity size={18} className="text-blue-600" /> 
            Performa Model Aktif
          </h3>
          <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 flex items-center gap-1 w-fit">
            <Check size={10} /> {activeModelName}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Accuracy" value={activeTab === 'detection' ? "94.2%" : "96.5%"} icon={Target} />
          <MetricCard label="Precision" value={activeTab === 'detection' ? "92.5%" : "95.1%"} icon={BarChart2} />
          <MetricCard label="Recall" value={activeTab === 'detection' ? "95.1%" : "94.8%"} icon={Activity} />
          <MetricCard label="F1-Score" value={activeTab === 'detection' ? "93.8%" : "95.5%"} icon={Zap} />
        </div>
      </div>

      {/* --- KONTEN UTAMA --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KOLOM KIRI (2/3): Model Management */}
        <div className="lg:col-span-2 space-y-6">

          {/* 2. DAFTAR MODEL */}
          <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Daftar Model Tersedia</h3>
              <span className="text-xs text-gray-400">Pilih model untuk {activeTab === 'detection' ? 'deteksi' : 'klasifikasi'}</span>
            </div>
            
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[860px]">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs">
                  <tr>
                    <th className="p-4">Nama Model</th>
                    <th className="p-4 text-center">Versi</th>
                    <th className="p-4 text-center">Akurasi</th>
                    <th className="p-4 text-center">Upload</th>
                    <th className="p-4 text-center w-28">Status</th>
                    <th className="p-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentModels.map((model) => (
                    <tr 
                      key={model.id} 
                      className={`transition-colors hover:bg-blue-50/10 ${model.status === 'Aktif' ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="p-4 font-medium text-gray-800">{model.name}</td>
                      <td className="p-4 text-center text-gray-500">{model.version}</td>
                      <td className="p-4 text-center font-bold text-gray-700">{model.accuracy}</td>
                      <td className="p-4 text-center text-gray-400 text-xs whitespace-nowrap">{model.uploaded}</td>
                      <td className="p-4 text-center whitespace-nowrap w-28">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          model.status === 'Aktif'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {model.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          {model.status !== 'Aktif' ? (
                            <button 
                              onClick={() => handleActivate(model.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded tooltip" 
                              title="Aktifkan"
                            >
                              <Check size={16} />
                            </button>
                          ) : (
                            <span className="inline-block w-8" aria-hidden="true"></span>
                          )}
                          <button className="p-1.5 text-red-600 hover:bg-red-100 rounded tooltip" title="Hapus">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Footer Pagination (Static) */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
              <span>Menampilkan {currentModels.length} dari {currentModels.length} model</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 border border-gray-200 rounded bg-white disabled:opacity-50" disabled>Prev</button>
                <button className="px-3 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50">Next</button>
              </div>
            </div>
          </div>

          {/* 3. UPLOAD MODEL BARU */}
          <div className="bg-white p-6 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 border-dashed border-2 hover:border-blue-400 transition-colors cursor-pointer group text-center">
            <div className="flex flex-col items-center justify-center py-4">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <FileUp size={32} />
              </div>
              <h4 className="font-bold text-gray-800">Upload Model Baru</h4>
              <p className="text-sm text-gray-500 mt-1">
                Drag & drop file model ({activeTab === 'detection' ? '.pt' : '.h5'}) di sini.
              </p>
            </div>
          </div>

        </div>

        {/* KOLOM KANAN (1/3): Config & Retraining */}
        <div className="space-y-6">
          
          {/* 1. KONFIGURASI PARAMETER */}
          <div className="bg-white p-6 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
              <Settings size={18} className="text-gray-500" />
              <h3 className="font-bold text-gray-800">Parameter Dasar</h3>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-gray-700">Confidence Threshold</label>
                <span className="text-sm font-bold text-blue-600">{threshold}%</span>
              </div>
              <input 
                type="range" min="10" max="90" step="1"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-2">
                Batas keyakinan minimum agar objek dideteksi oleh AI.
              </p>
            </div>

            <button className="w-full mt-6 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-colors">
              <Save size={16} /> Simpan Pengaturan
            </button>
          </div>

          {/* 2. PANEL RETRAINING */}
          <div className="bg-white p-6 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-20 rounded-full bg-blue-500 bg-opacity-5 -mr-10 -mt-10"></div>

            <div className="relative z-10">
              
              {/* Header Retraining dengan Waktu Terakhir */}
              <div className="mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <RefreshCw size={18} className="text-blue-600"/> Pelatihan Ulang
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock size={10} /> Terakhir: <span className="font-medium text-gray-700">{lastRetrained}</span>
                  </p>
              </div>

              {/* Pilihan Sumber Data */}
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Sumber Data</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => setDataSource('upload')}
                  className={`p-2 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 transition-all ${
                    dataSource === 'upload' 
                      ? 'border-blue-500 bg-white text-blue-700 shadow-sm' 
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <FileArchive size={16} />
                  Upload
                </button>
                <button
                  onClick={() => setDataSource('system')}
                  className={`p-2 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 transition-all ${
                    dataSource === 'system' 
                      ? 'border-blue-500 bg-white text-blue-700 shadow-sm' 
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Database size={16} />
                  Sistem
                </button>
              </div>

              {/* Konten Berdasarkan Pilihan */}
              <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[60px] flex items-center justify-center">
                {dataSource === 'upload' ? (
                  <p className="text-xs font-bold text-gray-700 flex items-center justify-center gap-2">
                     <Upload size={14} /> Upload Dataset (.Zip)
                  </p>
                ) : (
                  <div className="text-center w-full">
                    <p className="text-xs font-bold text-gray-700 flex items-center justify-center gap-2">
                      <Check size={14} className="text-green-500" /> Data Tervalidasi
                     </p>
                     <p className="text-[10px] text-gray-500 mt-0.5">128 sampel siap</p>
                  </div>
                )}
              </div>

              {/* TOGGLE AUTO RETRAIN */}
              <div className="flex items-center justify-between mb-6 pt-4 border-t border-gray-100">
                <div>
                   <p className="text-sm font-bold text-gray-800 flex items-center gap-1">
                      <Calendar size={14} className="text-gray-500"/> Auto-Retrain
                   </p>
                   <p className="text-[10px] text-gray-400">Jadwal: Setiap Minggu</p>
                </div>
                <div 
                   onClick={() => setAutoRetrain(!autoRetrain)}
                   className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                     autoRetrain ? 'bg-blue-600' : 'bg-gray-300'
                   }`}
                >
                   <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                     autoRetrain ? 'translate-x-4' : 'translate-x-0'
                   }`} />
                </div>
              </div>

              {/* Progress Bar & Button */}
              {isTraining ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-600">
                    <span>Sedang Melatih...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleStartTraining}
                  className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md flex justify-center items-center gap-2 transition-all active:scale-95"
                >
                  <Play size={16} /> Mulai Sekarang
                </button>
              )}
              
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AIConfiguration;