import React, { useEffect, useState } from 'react';
import {
  Save, Upload, Play, Trash2, Check, Zap, Layers, FileUp, Activity, Target,
  BarChart2, Settings, Database, Clock, TrendingUp, TrendingDown, Cpu, Star, CheckCircle
} from 'lucide-react';
import { ModelService } from '../../service/modelService';

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

const modelService = new ModelService();

const formatDate = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return String(isoString);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normalizeStatus = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('aktif') || s.includes('active')) return 'Aktif';
  if (s.includes('arsip') || s.includes('archive')) return 'Arsip';
  return status || 'Arsip';
};

const mapApiModelToUiModel = (apiModel) => {
  const modelName = String(apiModel?.model_name || '').trim();
  const version = String(apiModel?.version || '').trim();
  const displayName = `${modelName}${modelName && version ? '-' : ''}${version}`.trim() || modelName || version;

  const inferenceTime =
    typeof apiModel?.inference_time === 'number'
      ? apiModel.inference_time
      : typeof apiModel?.inferenceTime === 'number'
        ? apiModel.inferenceTime
        : 0;

  return {
    id: apiModel?.id,
    version: displayName,
    date: formatDate(apiModel?.created_at),
    accuracy: Number(apiModel?.accuracy ?? 0),
    f1Score: Number(apiModel?.f1_score ?? 0),
    inferenceTime: Number(inferenceTime ?? 0),
    delta: {
      acc: Number(apiModel?.delta_acc ?? 0),
      f1: Number(apiModel?.delta_f1 ?? 0),
      time: Number(apiModel?.delta_time ?? 0),
    },
    status: normalizeStatus(apiModel?.status),
  };
};

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
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');

  const [isRetrainModalOpen, setIsRetrainModalOpen] = useState(false);
  const [isRetrainSubmitting, setIsRetrainSubmitting] = useState(false);
  const [retrainForm, setRetrainForm] = useState({
    model_id: '',
    epochs_head: '',
    epochs_ft: '',
    batch_size: '',
    val_ratio_crop: '',
  });
  const [modelSearch, setModelSearch] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    type: 'success',
    message: '',
  });

  useEffect(() => {
    let cancelled = false;

    const fetchModels = async () => {
      setIsLoadingModels(true);
      setModelsError('');
      try {
        const task_type = activeTab === 'detection' ? 'Detection' : 'Classification';
        const result = await modelService.getModelList({ task_type });
        const mapped = (result?.data || []).map(mapApiModelToUiModel);

        if (cancelled) return;
        if (activeTab === 'detection') setYoloModels(mapped);
        else setCnnModels(mapped);
      } catch (err) {
        if (cancelled) return;
        setModelsError(err?.message || 'Gagal mengambil daftar model.');
      } finally {
        if (!cancelled) setIsLoadingModels(false);
      }
    };

    fetchModels();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // State Panel Kanan
  const [autoRetrain, setAutoRetrain] = useState(false);

  // Akses Data Aktif
  const currentModels = activeTab === 'detection' ? yoloModels : cnnModels;
  const bestModel = [...currentModels].sort((a, b) => b.f1Score - a.f1Score)[0];
  const activeModel = currentModels.find(m => m.status === 'Aktif') || currentModels[0];

  const modelOptions = (currentModels || [])
    .filter((m) => m && m.id !== undefined && m.id !== null)
    .map((m) => ({
      id: m.id,
      label: m.version,
      status: m.status,
    }));

  const filteredModelOptions = modelOptions.filter((opt) => {
    const q = String(modelSearch || '').trim().toLowerCase();
    if (!q) return true;
    return String(opt.id).includes(q) || String(opt.label || '').toLowerCase().includes(q);
  });

  const showToast = (type, message) => {
    setToast({ open: true, type, message });
    window.setTimeout(() => {
      setToast((prev) => (prev.open ? { ...prev, open: false } : prev));
    }, 4000);
  };

  const openRetrainModal = () => {
    const defaultId = activeModel?.id ?? '';
    const defaultLabel = activeModel?.version ?? '';
    setRetrainForm({
      model_id: String(defaultId),
      epochs_head: '',
      epochs_ft: '',
      batch_size: '',
      val_ratio_crop: '',
    });
    setModelSearch(defaultId ? `${defaultId} - ${defaultLabel}`.trim() : '');
    setIsModelDropdownOpen(false);
    setIsRetrainModalOpen(true);
  };

  const closeRetrainModal = () => {
    if (isRetrainSubmitting) return;
    setIsRetrainModalOpen(false);
  };

  const handleSubmitRetrain = async (e) => {
    e.preventDefault();

    const toOptionalNumber = (v) => {
      if (v === '' || v === null || v === undefined) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const modelId = toOptionalNumber(retrainForm.model_id);
    if (!modelId) {
      showToast('error', 'Model ID wajib diisi.');
      return;
    }

    const payload = {
      model_id: modelId,
      epochs_head: toOptionalNumber(retrainForm.epochs_head),
      epochs_ft: toOptionalNumber(retrainForm.epochs_ft),
      batch_size: toOptionalNumber(retrainForm.batch_size),
      val_ratio_crop: toOptionalNumber(retrainForm.val_ratio_crop),
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    setIsRetrainSubmitting(true);
    try {
      const res = await modelService.retrainModel(payload);
      showToast('success', res?.message || 'Retrain berhasil diproses.');
      setIsRetrainModalOpen(false);
    } catch (err) {
      showToast('error', err?.message || 'Retrain gagal.');
    } finally {
      setIsRetrainSubmitting(false);
    }
  };

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto bg-slate-50/80 p-4 rounded-2xl">

      {toast.open && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`min-w-[280px] max-w-sm px-4 py-3 rounded-xl shadow-lg border text-sm ${toast.type === 'success' ? 'bg-white border-green-200 text-green-700' : 'bg-white border-red-200 text-red-700'}`}>
            <div className="flex items-start gap-2">
              {toast.type === 'success' ? (
                <CheckCircle size={18} className="mt-0.5" />
              ) : (
                <Target size={18} className="mt-0.5" />
              )}
              <div className="font-semibold leading-snug">{toast.message}</div>
              <button
                type="button"
                onClick={() => setToast((prev) => ({ ...prev, open: false }))}
                className="ml-auto text-gray-400 hover:text-gray-600"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {isRetrainModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800">Retrain Model (Manual)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Isi parameter sesuai kebutuhan retrain.</p>
              </div>
              <button type="button" onClick={closeRetrainModal} className="text-gray-400 hover:text-gray-600" aria-label="Tutup">×</button>
            </div>

            <form onSubmit={handleSubmitRetrain} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Model</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={modelSearch}
                      onChange={(e) => {
                        const next = e.target.value;
                        setModelSearch(next);
                        const m = String(next).match(/^\s*(\d+)/);
                        if (m?.[1]) {
                          setRetrainForm((p) => ({ ...p, model_id: m[1] }));
                        }
                        setIsModelDropdownOpen(true);
                      }}
                      onFocus={() => setIsModelDropdownOpen(true)}
                      onBlur={() => window.setTimeout(() => setIsModelDropdownOpen(false), 150)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                      placeholder={isLoadingModels ? 'Memuat model...' : 'Cari model (id / nama)'}
                      disabled={isLoadingModels}
                      required
                    />

                    {isModelDropdownOpen && !isLoadingModels && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-auto">
                        {filteredModelOptions.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-500">Tidak ada model yang cocok.</div>
                        ) : (
                          filteredModelOptions.slice(0, 50).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setRetrainForm((p) => ({ ...p, model_id: String(opt.id) }));
                                setModelSearch(`${opt.label}`.trim());
                                setIsModelDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50/30"
                            >
                              <div className="text-sm font-bold text-gray-800 truncate">{opt.id} - {opt.label}</div>
                              <div className="text-[10px] text-gray-400">Status: {opt.status}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Batch Size (opsional)</label>
                  <input
                    type="number"
                    value={retrainForm.batch_size}
                    onChange={(e) => setRetrainForm((p) => ({ ...p, batch_size: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                    placeholder="contoh: 16"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Epochs Head (opsional)</label>
                  <input
                    type="number"
                    value={retrainForm.epochs_head}
                    onChange={(e) => setRetrainForm((p) => ({ ...p, epochs_head: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                    placeholder="contoh: 5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Epochs Fine-tune (opsional)</label>
                  <input
                    type="number"
                    value={retrainForm.epochs_ft}
                    onChange={(e) => setRetrainForm((p) => ({ ...p, epochs_ft: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                    placeholder="contoh: 10"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Val Ratio Crop (opsional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={retrainForm.val_ratio_crop}
                    onChange={(e) => setRetrainForm((p) => ({ ...p, val_ratio_crop: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                    placeholder="contoh: 0.2"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Nilai desimal, mis. 0.2 untuk 20%.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={closeRetrainModal} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50" disabled={isRetrainSubmitting}>
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-60" disabled={isRetrainSubmitting}>
                  {isRetrainSubmitting ? 'Memproses...' : 'Mulai Retrain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

          {modelsError && (
            <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-xl text-sm">
              {modelsError}
            </div>
          )}

          {isLoadingModels && (
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-xl text-sm text-gray-600">
              Memuat daftar model...
            </div>
          )}

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

            <button
              onClick={openRetrainModal}
              className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 shadow-md flex justify-center items-center gap-2"
            >
              <Play size={16} /> Mulai Manual
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ModelManagement;