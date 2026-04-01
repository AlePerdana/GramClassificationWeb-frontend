import React, { useState } from 'react';
import {
  Save, Upload, Play, Trash2, Check, Zap, Layers, FileUp, Activity, Target,
  BarChart2, Settings, Database, Clock, TrendingUp, TrendingDown, Cpu, Star, CheckCircle
} from 'lucide-react';

// --- DATA GABUNGAN ---
const initialYoloModels = [
  { id: 101, version: 'YOLOv8-Nano-Base', date: '10 Jan 2026', accuracy: 88.5, f1Score: 87.2, inferenceTime: 0.8, delta: { acc: 0, f1: 0, time: 0 }, status: 'Arsip' },
  { id: 102, version: 'YOLOv8-Nano-V2', date: '25 Jan 2026', accuracy: 92.1, f1Score: 91.5, inferenceTime: 0.6, delta: { acc: 3.6, f1: 4.3, time: -0.2 }, status: 'Aktif' },
  { id: 103, version: 'YOLOv8-Medium-Exp', date: '15 Feb 2026', accuracy: 94.8, f1Score: 94.1, inferenceTime: 1.5, delta: { acc: 2.7, f1: 2.6, time: 0.9 }, status: 'Arsip' },
];

const initialCnnModels = [
  { id: 201, version: 'ResNet50-Microbio', date: '05 Jan 2026', accuracy: 88.0, f1Score: 87.5, inferenceTime: 2.5, delta: { acc: 0, f1: 0, time: 0 }, status: 'Arsip' },
  { id: 202, version: 'GramVIT-B1', date: '20 Jan 2026', accuracy: 96.5, f1Score: 95.8, inferenceTime: 1.2, delta: { acc: 8.5, f1: 8.3, time: -1.3 }, status: 'Aktif' },
  { id: 203, version: 'Custom-CNN-Lite', date: '22 Jan 2026', accuracy: 85.2, f1Score: 84.8, inferenceTime: 0.4, delta: { acc: -11.3, f1: -11.0, time: -0.8 }, status: 'Arsip' },
];

// Helper Panah Indikator
const MetricDelta = ({ value, isTime = false }) => {
  if (value === 0) return <span className="text-gray-400 text-[10px] ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-50 border border-gray-100">-</span>;
  const isBetter = isTime ? value < 0 : value > 0;
  const color = isBetter ? 'text-green-500' : 'text-red-500';
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center text-[10px] font-bold ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-50 border ${isBetter ? 'border-green-100' : 'border-red-100'} ${color}`}>
      <Icon size={10} className="mr-0.5" />
      {Math.abs(value).toFixed(1)}{isTime ? 's' : '%'}
    </span>
  );
};

const ModelManagement = () => {
  const [activeTab, setActiveTab] = useState('detection');
  const [yoloModels, setYoloModels] = useState(initialYoloModels);
  const [cnnModels, setCnnModels] = useState(initialCnnModels);

  // State Panel Kanan
  const [autoRetrain, setAutoRetrain] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);

  // Akses Data Aktif
  const currentModels = activeTab === 'detection' ? yoloModels : cnnModels;
  const bestModel = [...currentModels].sort((a, b) => b.f1Score - a.f1Score)[0];
  const activeModel = currentModels.find(m => m.status === 'Aktif') || currentModels[0];

  // Handler Aksi Tabel
  const handleActivateModel = (id) => {
    if(window.confirm('Ganti model AI yang digunakan di produksi?')) {
      if (activeTab === 'detection') {
        setYoloModels(yoloModels.map(m => ({ ...m, status: m.id === id ? 'Aktif' : 'Arsip' })));
      } else {
        setCnnModels(cnnModels.map(m => ({ ...m, status: m.id === id ? 'Aktif' : 'Arsip' })));
      }
    }
  };

  const handleDeleteModel = (id) => {
    if(window.confirm('Hapus model ini dari sistem?')) {
      if (activeTab === 'detection') setYoloModels(yoloModels.filter(m => m.id !== id));
      else setCnnModels(cnnModels.filter(m => m.id !== id));
    }
  };

  // Handler Training
  const handleStartTraining = () => {
    setIsTraining(true); setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); setIsTraining(false); return 100; }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto bg-slate-50/80 p-4 rounded-2xl">

      {/* HEADER & TABS */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">Manajemen AI</h1>
          <p className="text-gray-500 mt-1">Kelola versi model, pantau performa inferensi, dan konfigurasi pelatihan ulang.</p>
        </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('detection')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'detection' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <Zap size={18} /> Deteksi Objek (YOLO)
        </button>
        <button onClick={() => setActiveTab('classification')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'classification' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <Layers size={18} /> Klasifikasi Gram (CNN)
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* AREA KIRI: MONITORING & TABEL (Lebar 2 Kolom) */}
        <div className="xl:col-span-2 space-y-6">

          {/* Kartu Ringkasan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 border-l-4 border-l-blue-500">
              <div className="flex items-center gap-2 mb-2"><Cpu size={18} className="text-blue-600"/><h3 className="font-bold text-gray-700 text-sm">Model Aktif</h3></div>
              <p className="text-lg font-black text-gray-800 truncate" title={activeModel?.version}>{activeModel?.version}</p>
              <div className="mt-1 text-xs text-gray-500 flex justify-between">Akurasi: <span className="font-bold text-gray-700">{activeModel?.accuracy}%</span></div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 border-l-4 border-l-indigo-500">
              <div className="flex items-center gap-2 mb-2"><Star size={18} className="text-indigo-600"/><h3 className="font-bold text-gray-700 text-sm">Rekomendasi</h3></div>
              <p className="text-lg font-black text-indigo-800 truncate" title={bestModel?.version}>{bestModel?.version}</p>
              <div className="mt-1 text-xs text-gray-500 flex justify-between">F1-Score: <span className="font-bold text-indigo-700">{bestModel?.f1Score}%</span></div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 border-l-4 border-l-orange-500">
              <div className="flex items-center gap-2 mb-2"><Activity size={18} className="text-orange-600"/><h3 className="font-bold text-gray-700 text-sm">Rata-rata Inferensi</h3></div>
              <p className="text-lg font-black text-gray-800">{activeModel?.inferenceTime} <span className="text-xs font-semibold text-gray-500">s/citra</span></p>
              <div className="mt-1 text-[10px] font-medium text-gray-400">*Batas: {activeTab === 'detection' ? '< 1.5s' : '< 2.0s'}</div>
            </div>
          </div>

          {/* Tabel Komparasi */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-gray-800">Daftar Versi Model</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wide">
                    <th className="p-4 text-left pl-6">Versi Model</th>
                    <th className="p-4 text-center">Akurasi</th>
                    <th className="p-4 text-center">F1-Score</th>
                    <th className="p-4 text-center">Inferensi</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {[...currentModels].reverse().map((model) => {
                    const isBest = model.id === bestModel?.id;
                    return (
                    <tr key={model.id} className={`hover:bg-blue-50/30 ${model.status === 'Aktif' ? 'bg-blue-50/10' : ''}`}>
                      <td className="p-4 text-left pl-6">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-gray-800">{model.version}</div>
                          {isBest && (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full border border-indigo-200 inline-flex items-center gap-1">
                              <Star size={10} /> Rekomendasi
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5"><Clock size={10} className="inline mr-1"/>{model.date}</div>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap"><span className="font-bold">{model.accuracy}%</span><MetricDelta value={model.delta.acc}/></td>
                      <td className="p-4 text-center whitespace-nowrap"><span className="font-bold">{model.f1Score}%</span><MetricDelta value={model.delta.f1}/></td>
                      <td className="p-4 text-center whitespace-nowrap"><span className="font-bold">{model.inferenceTime}s</span><MetricDelta value={model.delta.time} isTime/></td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${model.status === 'Aktif' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {model.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {model.status !== 'Aktif' && (
                            <button onClick={() => handleActivateModel(model.id)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded" title="Jadikan Aktif"><Check size={16}/></button>
                          )}
                          <button onClick={() => handleDeleteModel(model.id)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded" title="Hapus"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AREA KANAN: KONFIGURASI (Lebar 1 Kolom) */}
        <div className="xl:col-span-1 space-y-6">

          {/* Panel Upload */}
          <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FileUp size={18} className="text-slate-500"/> Upload Model Baru</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload size={32} className="text-gray-400 mb-3" />
              <p className="text-sm font-bold text-gray-700">Drag & drop file model</p>
              <p className="text-xs text-gray-500 mt-1">.pt, .onnx, .h5 (Max 200MB)</p>
              <button className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 shadow-sm">Pilih File</button>
            </div>
            <button className="w-full mt-4 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md flex justify-center items-center gap-2"><Save size={16} /> Simpan ke Registry</button>
          </div>

          {/* Panel Auto-Retrain */}
          <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Database size={18} className="text-slate-500"/> Pelatihan Ulang (Retrain)</h3>
            <p className="text-xs text-gray-500 mb-4">Gunakan data Gram Stain yang divalidasi dokter untuk melatih model aktif.</p>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
              <div>
                <p className="text-sm font-bold text-gray-800">Auto-Retrain</p>
                <p className="text-[10px] text-gray-500">Latih otomatis setiap 500 data baru</p>
              </div>
              <div onClick={() => setAutoRetrain(!autoRetrain)} className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${autoRetrain ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-md transform transition-transform ${autoRetrain ? 'translate-x-4.5' : 'translate-x-0'}`} />
              </div>
            </div>

            {isTraining ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-600"><span>Sedang Melatih...</span><span>{progress}%</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div></div>
              </div>
            ) : (
              <button onClick={handleStartTraining} className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 shadow-md flex justify-center items-center gap-2"><Play size={16} /> Mulai Manual</button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ModelManagement;