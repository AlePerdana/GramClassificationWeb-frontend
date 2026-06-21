import React, { useEffect, useMemo, useState } from 'react';
import {
  Save, Upload, Play, Trash2, Check, Zap, Layers, FileUp, Activity, Target,
  BarChart2, Settings, Database, Clock, TrendingUp, TrendingDown, Cpu, Star, CheckCircle, RefreshCw
} from 'lucide-react';
import { ModelService } from '../../service/modelService';

const modelService = new ModelService();

const formatDate = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return String(isoString);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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
    accuracy: Number(((apiModel?.accuracy ?? 0) * 100).toFixed(2)),
    f1Score: Number(((apiModel?.f1_score ?? 0) * 100).toFixed(2)),
    inferenceTime: Number(inferenceTime ?? 0),
    delta: {
      acc: Number(((apiModel?.delta_acc ?? 0) * 100).toFixed(2)),
      f1: Number(((apiModel?.delta_f1 ?? 0) * 100).toFixed(2)),
      time: Number(apiModel?.delta_time ?? 0),
    },
    status: apiModel?.is_active ? 'Aktif' : 'Arsip',
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

const isJobFinished = (status) => {
  const s = String(status || '').toLowerCase();
  return (
    s.includes('success') ||
    s.includes('succeed') ||
    s.includes('done') ||
    s.includes('complete') ||
    s.includes('failed') ||
    s.includes('error') ||
    s.includes('cancel')
  );
};

const isJobInProgress = (status) => {
  const s = String(status || '').toLowerCase();
  if (isJobFinished(s)) return false;
  return s.includes('run') || s.includes('progress') || s.includes('queue') || s.includes('pending') || !s;
};

const getJobBadgeClass = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('success') || s.includes('done') || s.includes('complete')) return 'bg-green-50 text-green-700 border-green-200';
  if (s.includes('failed') || s.includes('error')) return 'bg-red-50 text-red-700 border-red-200';
  if (s.includes('cancel')) return 'bg-gray-50 text-gray-600 border-gray-200';
  if (isJobInProgress(s)) return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
};

const ModelManagement = () => {
  const [activeTab, setActiveTab] = useState('detection');
  const [yoloModels, setYoloModels] = useState([]);
  const [cnnModels, setCnnModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [sortBy, setSortBy] = useState('f1');

  const [isRetrainModalOpen, setIsRetrainModalOpen] = useState(false);
  const [isRetrainSubmitting, setIsRetrainSubmitting] = useState(false);
  const [activeTrainingJobId, setActiveTrainingJobId] = useState(null);
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
  // Upload model state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadModelName, setUploadModelName] = useState('');
  const [uploadModelType, setUploadModelType] = useState('Gram Classification');
  const [uploadVersion, setUploadVersion] = useState('1.0');
  const [isUploading, setIsUploading] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);


  const [trainingJobs, setTrainingJobs] = useState([]);
  const [isLoadingTrainingJobs, setIsLoadingTrainingJobs] = useState(false);
  const [trainingJobsError, setTrainingJobsError] = useState('');

  const fetchTrainingJobs = async () => {
    setIsLoadingTrainingJobs(true);
    setTrainingJobsError('');
    try {
      const res = await modelService.getProgressRetrain({ page: 1, per_page: 10 });
      const list = Array.isArray(res?.data) ? res.data : [];
      const sorted = [...list].sort((a, b) => Number(b.job_id || 0) - Number(a.job_id || 0));
      setTrainingJobs(sorted);

      if (activeTrainingJobId) {
        const job = sorted.find((j) => String(j.job_id) === String(activeTrainingJobId));
        if (job && isJobFinished(job.status)) {
          setActiveTrainingJobId(null);
          if (String(job.status || '').toLowerCase().includes('fail') || String(job.status || '').toLowerCase().includes('error')) {
            showToast('error', `Training job #${job.job_id} gagal.`);
          } else {
            showToast('success', `Training job #${job.job_id} selesai.`);
          }
        }
      }
    } catch (err) {
      setTrainingJobsError(err?.message || 'Gagal mengambil progress retrain.');
    } finally {
      setIsLoadingTrainingJobs(false);
    }
  };

  useEffect(() => {
    fetchTrainingJobs();

    // Fetch retrain config
    const fetchConfig = async () => {
      try {
        const config = await modelService.getRetrainConfig();
        setAutoRetrain(config?.auto_retrain_enabled ?? false);
      } catch {
        // Non-critical
      }
    };
    fetchConfig();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shouldPollTrainingJobs = useMemo(() => {
    if (activeTrainingJobId) return true;
    return (trainingJobs || []).some((j) => isJobInProgress(j?.status));
  }, [activeTrainingJobId, trainingJobs]);

  useEffect(() => {
    if (!shouldPollTrainingJobs) return;
    const id = window.setInterval(() => {
      fetchTrainingJobs();
    }, 4000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPollTrainingJobs]);

  useEffect(() => {
    let cancelled = false;

    const fetchModels = async () => {
      setIsLoadingModels(true);
      setModelsError('');
      try {
        const task_type = activeTab === 'detection' ? 'Detection' : 'Gram Classification';
        const result = await modelService.getModelList({ task_type });
        const mapped = (result?.data || []).map(mapApiModelToUiModel);

        if (cancelled) return;
        if (mapped.length > 0) {
          if (activeTab === 'detection') setYoloModels(mapped);
          else setCnnModels(mapped);
        }
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

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Sort models
  const sortedModels = [...currentModels].sort((a, b) => {
    if (sortBy === 'accuracy') return (b.accuracy || 0) - (a.accuracy || 0);
    if (sortBy === 'f1') return (b.f1Score || 0) - (a.f1Score || 0);
    if (sortBy === 'average') {
      const avgA = ((a.accuracy || 0) + (a.f1Score || 0)) / 2;
      const avgB = ((b.accuracy || 0) + (b.f1Score || 0)) / 2;
      return avgB - avgA;
    }
    return 0;
  });
  const reversedModels = sortedModels; // Already sorted descending, no reverse needed
  const totalPages = Math.max(1, Math.ceil(reversedModels.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedModels = reversedModels.slice(startIndex, startIndex + itemsPerPage);

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

    const batchSize = toOptionalNumber(retrainForm.batch_size);
    if (batchSize !== undefined && (batchSize < 1 || batchSize > 1024 || !Number.isInteger(batchSize))) {
      showToast('error', 'Batch Size harus berupa bilangan bulat antara 1 dan 1024.');
      return;
    }

    const epochsHead = toOptionalNumber(retrainForm.epochs_head);
    if (epochsHead !== undefined && (epochsHead < 1 || epochsHead > 1000 || !Number.isInteger(epochsHead))) {
      showToast('error', 'Epochs Head harus berupa bilangan bulat antara 1 dan 1000.');
      return;
    }

    const epochsFt = toOptionalNumber(retrainForm.epochs_ft);
    if (epochsFt !== undefined && (epochsFt < 1 || epochsFt > 1000 || !Number.isInteger(epochsFt))) {
      showToast('error', 'Epochs Fine-tune harus berupa bilangan bulat antara 1 dan 1000.');
      return;
    }

    const valRatio = toOptionalNumber(retrainForm.val_ratio_crop);
    if (valRatio !== undefined && (valRatio < 0.01 || valRatio > 0.99)) {
      showToast('error', 'Val Ratio Crop harus di antara 0.01 dan 0.99.');
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
      if (res?.job_id !== undefined && res?.job_id !== null) {
        setActiveTrainingJobId(res.job_id);
      }
      setIsRetrainModalOpen(false);
      fetchTrainingJobs();
    } catch (err) {
      showToast('error', err?.message || 'Retrain gagal.');
    } finally {
      setIsRetrainSubmitting(false);
    }
  };

  // Handler Aksi Tabel
  const handleActivateModel = async (id) => {
    if (!window.confirm('Ganti model AI yang digunakan di produksi?')) return;
    try {
      const res = await modelService.activateModel(id);
      showToast('success', res?.message || 'Model berhasil diaktifkan.');
      // Refresh model list
      const task_type = activeTab === 'detection' ? 'Detection' : 'Gram Classification';
      const result = await modelService.getModelList({ task_type });
      const mapped = (result?.data || []).map(mapApiModelToUiModel);
      if (activeTab === 'detection') setYoloModels(mapped);
      else setCnnModels(mapped);
    } catch (err) {
      showToast('error', err?.message || 'Gagal mengaktifkan model.');
    }
  };


  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      showToast('error', 'Pilih file model terlebih dahulu.');
      return;
    }
    if (!uploadModelName.trim()) {
      showToast('error', 'Nama model wajib diisi.');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('model_name', uploadModelName.trim());
    formData.append('model_type', uploadModelType);
    formData.append('version', uploadVersion.trim() || '1.0');

    setIsUploading(true);
    try {
      const res = await modelService.uploadModel(formData);
      showToast('success', res?.message || 'Model berhasil diunggah.');
      setUploadFile(null);
      setUploadModelName('');
      setUploadVersion('1.0');

      // Refresh model list
      const task_type = activeTab === 'detection' ? 'Detection' : 'Gram Classification';
      const result = await modelService.getModelList({ task_type });
      const mapped = (result?.data || []).map(mapApiModelToUiModel);
      if (activeTab === 'detection') setYoloModels(mapped);
      else setCnnModels(mapped);
    } catch (err) {
      showToast('error', err?.message || 'Gagal mengunggah model.');
    } finally {
      setIsUploading(false);
    }
  };
  const handleBenchmarkActiveCnn = async () => {
    if (!window.confirm('Jalankan benchmark untuk model klasifikasi yang aktif?')) return;
    setIsBenchmarking(true);
    try {
      const res = await modelService.benchmarkActive();
      showToast('success', res?.message || 'Benchmark model aktif selesai.');
      const task_type = activeTab === 'detection' ? 'Detection' : 'Gram Classification';
      const result = await modelService.getModelList({ task_type });
      const mapped = (result?.data || []).map(mapApiModelToUiModel);
      if (activeTab === 'detection') setYoloModels(mapped);
      else setCnnModels(mapped);
    } catch (err) {
      showToast('error', err?.message || 'Gagal menjalankan benchmark.');
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleBenchmarkAllCnn = async () => {
    if (!window.confirm('Jalankan benchmark untuk semua model klasifikasi? Ini mungkin memakan waktu beberapa saat.')) return;
    setIsBenchmarking(true);
    try {
      const res = await modelService.benchmarkAll();
      showToast('success', res?.message || 'Benchmark selesai untuk semua model.');
      // Refresh model list
      const task_type = activeTab === 'detection' ? 'Detection' : 'Gram Classification';
      const result = await modelService.getModelList({ task_type });
      const mapped = (result?.data || []).map(mapApiModelToUiModel);
      if (activeTab === 'detection') setYoloModels(mapped);
      else setCnnModels(mapped);
    } catch (err) {
      showToast('error', err?.message || 'Gagal menjalankan benchmark.');
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleBenchmarkYolo = async (modelId) => {
    const label = modelId ? `model #${modelId}` : 'model YOLO aktif';
    if (!window.confirm(`Jalankan benchmark untuk ${label}?`)) return;
    setIsBenchmarking(true);
    try {
      const res = await modelService.benchmarkYolo(modelId);
      showToast('success', `YOLO benchmark selesai: mAP50=${(res.map50*100).toFixed(1)}%, mAP50-95=${(res.map50_95*100).toFixed(1)}%`);
      const result = await modelService.getModelList({ task_type: 'Detection' });
      const mapped = (result?.data || []).map(mapApiModelToUiModel);
      setYoloModels(mapped);
    } catch (err) {
      showToast('error', err?.message || 'Gagal menjalankan benchmark YOLO.');
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleBenchmarkAllYolo = async () => {
    if (!window.confirm('Jalankan benchmark untuk semua model YOLO? Ini mungkin memakan waktu beberapa saat.')) return;
    setIsBenchmarking(true);
    try {
      const res = await modelService.benchmarkAllYolo();
      showToast('success', res?.message || 'Benchmark semua model YOLO selesai.');
      const result = await modelService.getModelList({ task_type: 'Detection' });
      const mapped = (result?.data || []).map(mapApiModelToUiModel);
      setYoloModels(mapped);
    } catch (err) {
      showToast('error', err?.message || 'Gagal menjalankan benchmark semua model YOLO.');
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleDeleteModel = async (id) => {
    if (!window.confirm('Hapus model ini dari sistem?')) return;
    try {
      const res = await modelService.deleteModel(id);
      showToast('success', res?.message || 'Model berhasil dihapus.');
      // Refresh model list
      const task_type = activeTab === 'detection' ? 'Detection' : 'Gram Classification';
      const result = await modelService.getModelList({ task_type });
      const mapped = (result?.data || []).map(mapApiModelToUiModel);
      if (activeTab === 'detection') setYoloModels(mapped);
      else setCnnModels(mapped);
    } catch (err) {
      showToast('error', err?.message || 'Gagal menghapus model.');
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
                    min="1"
                    max="1024"
                    value={retrainForm.batch_size}
                    onChange={(e) => setRetrainForm((p) => ({ ...p, batch_size: e.target.value.replace(/\D/g, '') }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                    placeholder="contoh: 16"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Epochs Head (opsional)</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={retrainForm.epochs_head}
                    onChange={(e) => setRetrainForm((p) => ({ ...p, epochs_head: e.target.value.replace(/\D/g, '') }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                    placeholder="contoh: 5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Epochs Fine-tune (opsional)</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={retrainForm.epochs_ft}
                    onChange={(e) => setRetrainForm((p) => ({ ...p, epochs_ft: e.target.value.replace(/\D/g, '') }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                    placeholder="contoh: 10"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Val Ratio Crop (opsional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.99"
                    value={retrainForm.val_ratio_crop}
                    onChange={(e) => setRetrainForm((p) => ({ ...p, val_ratio_crop: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                    placeholder="contoh: 0.2"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Nilai desimal, mis. 0.2 untuk 20% (batas: 0.01 - 0.99).</p>
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
              <div className="flex items-center gap-2 mb-2"><Activity size={18} className="text-orange-600"/><h3 className="font-bold text-gray-700 text-sm">Rata-rata</h3></div>
              <p className="text-lg font-black text-gray-800">{((activeModel?.accuracy || 0 + activeModel?.f1Score || 0) / 2).toFixed(1)}<span className="text-xs font-semibold text-gray-500">%</span></p>
              <div className="mt-1 text-[10px] font-medium text-gray-400">Akurasi + F1-Score</div>
            </div>
          </div>

          {/* Tabel Komparasi */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-gray-800">Daftar Versi Model</h3>
              <div className="flex items-center gap-2">
                {activeTab === 'detection' ? (
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-700 cursor-pointer"
                  >
                    <option value="f1">Urutkan: mAP50-95</option>
                    <option value="accuracy">Urutkan: mAP50</option>
                    <option value="average">Urutkan: Rata-rata</option>
                  </select>
                ) : (
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-700 cursor-pointer"
                  >
                    <option value="f1">Urutkan: F1-Score</option>
                    <option value="accuracy">Urutkan: Akurasi</option>
                    <option value="average">Urutkan: Rata-rata</option>
                  </select>
                )}
                {activeTab === 'detection' ? (
                  <>
                    <button
                      onClick={() => handleBenchmarkYolo()}
                      disabled={isBenchmarking}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                      title="Benchmark model YOLO aktif"
                    >
                      <BarChart2 size={14} className={isBenchmarking ? 'animate-pulse' : ''} />
                      {isBenchmarking ? 'Menguji...' : 'Benchmark Aktif'}
                    </button>
                    <button
                      onClick={handleBenchmarkAllYolo}
                      disabled={isBenchmarking}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                      title="Benchmark semua model YOLO"
                    >
                      <BarChart2 size={14} className={isBenchmarking ? 'animate-pulse' : ''} />
                      {isBenchmarking ? 'Menguji...' : 'Benchmark Semua'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleBenchmarkActiveCnn}
                      disabled={isBenchmarking}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                      title="Benchmark model klasifikasi aktif"
                    >
                      <BarChart2 size={14} className={isBenchmarking ? 'animate-pulse' : ''} />
                      {isBenchmarking ? 'Menguji...' : 'Benchmark Aktif'}
                    </button>
                    <button
                      onClick={handleBenchmarkAllCnn}
                      disabled={isBenchmarking}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                      title="Benchmark semua model klasifikasi"
                    >
                      <BarChart2 size={14} className={isBenchmarking ? 'animate-pulse' : ''} />
                      {isBenchmarking ? 'Menguji...' : 'Benchmark Semua'}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wide">
                    <th className="p-4 text-left pl-6">Versi Model</th>
                    {activeTab === 'detection' ? (
                      <>
                        <th className="p-4 text-center">mAP50</th>
                        <th className="p-4 text-center">mAP50-95</th>
                        <th className="p-4 text-center">Precision</th>
                        <th className="p-4 text-center">Recall</th>
                      </>
                    ) : (
                      <>
                        <th className="p-4 text-center">Akurasi</th>
                        <th className="p-4 text-center">F1-Score</th>
                      </>
                    )}
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {paginatedModels.map((model) => {
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
                      {activeTab === 'detection' ? (
                        <>
                          <td className="p-4 text-center whitespace-nowrap"><span className="font-bold">{model.accuracy}%</span><MetricDelta value={model.delta.acc}/></td>
                          <td className="p-4 text-center whitespace-nowrap"><span className="font-bold">{model.f1Score}%</span><MetricDelta value={model.delta.f1}/></td>
                          <td className="p-4 text-center whitespace-nowrap"><span className="font-bold">{model.accuracy}%</span></td>
                          <td className="p-4 text-center whitespace-nowrap"><span className="font-bold">{model.accuracy}%</span></td>
                        </>
                      ) : (
                        <>
                          <td className="p-4 text-center whitespace-nowrap"><span className="font-bold">{model.accuracy}%</span><MetricDelta value={model.delta.acc}/></td>
                          <td className="p-4 text-center whitespace-nowrap"><span className="font-bold">{model.f1Score}%</span><MetricDelta value={model.delta.f1}/></td>
                        </>
                      )}
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${model.status === 'Aktif' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {model.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {activeTab === 'detection' && (
                            <button onClick={() => handleBenchmarkYolo(model.id)} disabled={isBenchmarking} className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded disabled:opacity-50" title="Benchmark Model Ini"><BarChart2 size={16}/></button>
                          )}
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

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
              <span>Menampilkan {paginatedModels.length} dari {reversedModels.length} data</span>
              <div className="flex gap-2 items-center">
                <button 
                  className="px-3 py-1 border rounded transition-colors bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed" 
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  Sebelumnya
                </button>
                <span className="px-2 py-1 text-gray-500 font-medium">Hal {currentPage} / {totalPages}</span>
                <button 
                  className="px-3 py-1 border rounded transition-colors bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AREA KANAN: KONFIGURASI (Lebar 1 Kolom) */}
        <div className="xl:col-span-1 space-y-6">

          {/* Panel Upload */}
          <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FileUp size={18} className="text-slate-500"/> Upload Model Baru</h3>

            <div className="space-y-3 mb-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Model</label>
                <input
                  type="text"
                  value={uploadModelName}
                  onChange={(e) => setUploadModelName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                  placeholder="contoh: resnet50_v2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tipe Model</label>
                <select
                  value={uploadModelType}
                  onChange={(e) => setUploadModelType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                >
                  <option value="Gram Classification">Klasifikasi Gram (CNN)</option>
                  <option value="Detection">Deteksi Objek (YOLO)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Versi</label>
                <input
                  type="text"
                  value={uploadVersion}
                  onChange={(e) => setUploadVersion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                  placeholder="1.0"
                />
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => document.getElementById('model-file-input')?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer?.files?.[0];
                if (file) setUploadFile(file);
              }}
            >
              <Upload size={28} className="text-gray-400 mb-2" />
              <p className="text-sm font-bold text-gray-700">{uploadFile ? uploadFile.name : 'Drag & drop file model'}</p>
              <p className="text-xs text-gray-500 mt-1">.pt, .pth (Deteksi/Klasifikasi)</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); document.getElementById('model-file-input')?.click(); }}
                className="mt-3 px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 shadow-sm"
              >Pilih File</button>
              <input
                id="model-file-input"
                type="file"
                accept=".pt,.pth"
                className="hidden"
                onChange={(e) => {
                  const file = e.target?.files?.[0];
                  if (file) setUploadFile(file);
                }}
              />
            </div>

            <button
              onClick={handleUploadSubmit}
              disabled={isUploading}
              className="w-full mt-4 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Mengunggah...' : (<><Save size={16} /> Simpan ke Registry</>)}
            </button>
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
              <div onClick={async () => {
                const next = !autoRetrain;
                setAutoRetrain(next);
                try {
                  await modelService.updateRetrainConfig({ auto_retrain_enabled: next });
                } catch {
                  setAutoRetrain(!next);
                  showToast('error', 'Gagal menyimpan konfigurasi retrain.');
                }
              }} className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${autoRetrain ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-md transform transition-transform ${autoRetrain ? 'translate-x-4.5' : 'translate-x-0'}`} />
              </div>
            </div>

            {activeTab === 'classification' && (
            <button
              onClick={openRetrainModal}
              className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 shadow-md flex justify-center items-center gap-2"
            >
              <Play size={16} /> Mulai Manual
            </button>
            )}
          </div>

          {/* Panel Progress Retrain */}
          <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Activity size={18} className="text-slate-500"/> Progress Pelatihan</h3>
              <button
                type="button"
                onClick={fetchTrainingJobs}
                disabled={isLoadingTrainingJobs}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                aria-label="Refresh progress retrain"
                title="Refresh"
              >
                <RefreshCw size={14} className={isLoadingTrainingJobs ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
            {trainingJobsError && (
              <div className="bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-xs">
                {trainingJobsError}
              </div>
            )}

            {isLoadingTrainingJobs ? (
              <div className="text-xs text-gray-500">Memuat progress...</div>
            ) : (trainingJobs || []).length === 0 ? (
              <div className="text-xs text-gray-500">Belum ada training job.</div>
            ) : (
              <div className="space-y-3">
                {(trainingJobs || []).slice(0, 5).map((job) => {
                  const percentRaw = Number(job?.progress_percent ?? 0);
                  const percent = Number.isFinite(percentRaw) ? Math.max(0, Math.min(100, percentRaw)) : 0;
                  const isActive = activeTrainingJobId && String(job?.job_id) === String(activeTrainingJobId);
                  return (
                    <div key={job.job_id} className={`p-3 rounded-xl border ${isActive ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-800 truncate" title={job.model_name}>
                            #{job.job_id} - {job.model_name}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">Model ID: {job.model_id}</div>
                        </div>
                        <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold border ${getJobBadgeClass(job.status)}`}>
                          {job.status || 'UNKNOWN'}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold">
                          <span>Progress</span>
                          <span>{percent.toFixed(0)}%</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                          <div
                            className={`h-full rounded-full ${percent >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-3">*Auto update aktif saat ada job berjalan.</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ModelManagement;