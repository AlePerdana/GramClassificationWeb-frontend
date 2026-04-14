import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  X,
  Eye,
  Check,
  Save
} from 'lucide-react';

const API_HOST = 'http://localhost:8000';
const SHAPE_OPTIONS = ['Kokus', 'Basil', 'Spiral'];
const GRAM_OPTIONS = ['Positif', 'Negatif'];

const joinApiUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_HOST}${path.startsWith('/') ? '' : '/'}${path}`;
};

const normalizeShape = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (text.includes('kokus') || text.includes('coccus')) return 'Kokus';
  if (text.includes('basil') || text.includes('batang') || text.includes('bacillus')) return 'Basil';
  if (text.includes('spir')) return 'Spiral';
  return value;
};

const normalizeGram = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (text.includes('posit')) return 'Positif';
  if (text.includes('negat')) return 'Negatif';
  return value;
};

const ValidationDetail = () => {
  const { specimenId, id } = useParams();
  const navigate = useNavigate();
  const resolvedSpecimenId = specimenId || id;

  const [specimenData, setSpecimenData] = useState(null);
  const [validations, setValidations] = useState({});
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [activeCrop, setActiveCrop] = useState(null);
  const [modalZoom, setModalZoom] = useState(1);
  const [modalPan, setModalPan] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!resolvedSpecimenId) {
      setError('Specimen ID tidak ditemukan.');
      setIsLoading(false);
      return;
    }

    const fetchSpecimenDetails = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(`${API_HOST}/api/doctor/specimen-details/${resolvedSpecimenId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || result?.detail || 'Gagal memuat detail spesimen.');
        }

        const payload = result?.data || result || null;
        const rows = payload?.classifications || [];
        const initialValidations = {};

        rows.forEach((item, index) => {
          const key = String(item?.id ?? item?.classification_id ?? index);
          initialValidations[key] = {
            validation_bentuk: normalizeShape(item?.validation_bentuk || item?.classification_bentuk || ''),
            validation_gram: normalizeGram(item?.validation_gram || item?.ai_gram || item?.classification_gram || ''),
            catatan: item?.catatan || ''
          };
        });

        setSpecimenData(payload);
        setValidations(initialValidations);
        setDoctorNotes(payload?.doctor_notes || payload?.catatan_dokter || '');
      } catch (err) {
        setError(err.message || 'Terjadi kesalahan saat mengambil data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpecimenDetails();
  }, [resolvedSpecimenId]);

  const rows = useMemo(() => specimenData?.classifications || [], [specimenData]);

  const toDisplayConfidence = (value) => {
    if (value === null || value === undefined || value === '') return '100';
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return '100';
    const percent = parsed <= 1 ? parsed * 100 : parsed;
    return percent.toFixed(1);
  };

  const displayData = useMemo(() => {
    const patient = specimenData?.patient || {};
    return {
      specimenCode: specimenData?.specimen_code || specimenData?.specimen_id || resolvedSpecimenId,
      idPasien: patient?.id_pasien || patient?.patient_id || '-',
      name: patient?.nama || patient?.name || specimenData?.patient_name || '-',
      dob: patient?.tanggal_lahir || patient?.birth_date || '-',
      age: patient?.umur || patient?.age || '-',
      gender: patient?.jenis_kelamin || patient?.gender || '-',
      analyst: specimenData?.analyst_name || specimenData?.analyst || '-',
      date: specimenData?.tanggal || specimenData?.created_at || '-'
    };
  }, [specimenData, resolvedSpecimenId]);

  const handleValidationChange = (rowKey, field, value) => {
    setValidations((prev) => ({
      ...prev,
      [rowKey]: {
        ...prev[rowKey],
        [field]: value
      }
    }));
  };

  const openPreview = (row, rowIndex) => {
    setActiveCrop({
      id: row?.id ?? row?.classification_id ?? rowIndex,
      label: `Crop #${rowIndex + 1}`,
      imageUrl: joinApiUrl(row?.image_url || row?.crop_url || ''),
      aiShape: normalizeShape(row?.classification_bentuk || ''),
      aiGram: normalizeGram(row?.ai_gram || row?.classification_gram || '')
    });
    setModalZoom(1);
    setModalPan({ x: 0, y: 0 });
    setShowModal(true);
  };

  const handleZoom = (delta) => {
    setModalZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 5));
  };

  const handleWheel = (e) => {
    e.preventDefault();
    handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsInteracting(true);
    setDragStart({ x: e.clientX - modalPan.x, y: e.clientY - modalPan.y });
  };

  const handleMouseMove = (e) => {
    if (!isInteracting) return;
    setModalPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleSubmitValidation = async () => {
    if (!resolvedSpecimenId || rows.length === 0) return;

    const payload = {
      specimen_id: Number(specimenData?.specimen_id || resolvedSpecimenId),
      validations: rows.map((item, index) => {
        const key = String(item?.id ?? item?.classification_id ?? index);
        const draft = validations[key] || {};
        return {
          id: Number(item?.id ?? item?.classification_id ?? index),
          validation_bentuk: draft.validation_bentuk || '',
          validation_gram: draft.validation_gram || '',
          catatan: draft.catatan || doctorNotes || ''
        };
      })
    };

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await fetch(`${API_HOST}/api/doctor/submit-validation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || 'Gagal menyimpan validasi.');
      }

      setSubmitMessage('Validasi berhasil disimpan.');
      navigate('/doctor/validation');
    } catch (err) {
      setSubmitMessage(err.message || 'Terjadi kesalahan saat menyimpan validasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-slate-600">Memuat detail spesimen...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!specimenData) {
    return <div className="p-6 text-slate-600">Data spesimen tidak ditemukan.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/doctor/validation')}
          className="p-2 hover:bg-white rounded-full transition-colors text-slate-600"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Validasi Hasil</h1>
          <p className="text-slate-500 text-sm">ID Sampel: {displayData.specimenCode}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Identitas Pasien</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">ID Pasien</p>
              <p className="text-lg font-medium text-slate-800">{displayData.idPasien}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Nama Lengkap</p>
              <p className="text-lg font-medium text-slate-800">{displayData.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Tanggal Lahir</p>
                <p className="text-sm font-medium text-slate-800">{displayData.dob}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Umur</p>
                <p className="text-sm font-medium text-slate-800">{displayData.age}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Jenis Kelamin</p>
              <p className="text-sm font-medium text-slate-800">{displayData.gender}</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-semibold uppercase">Analis</p>
              <p className="text-sm font-medium text-slate-800">{displayData.analyst}</p>
              <p className="text-xs text-slate-500 mt-1">{displayData.date}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:col-span-2">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Catatan Dokter</h3>
          <textarea
            className="flex-1 w-full p-4 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="Tambahkan catatan klinis atau observasi tambahan di sini..."
            rows={8}
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <Save size={16} /> Simpan Catatan
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-lg">Hasil Klasifikasi Gram Stain</h3>
          <button
            onClick={handleSubmitValidation}
            disabled={isSubmitting || rows.length === 0}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <Check size={18} /> {isSubmitting ? 'Menyimpan...' : 'Validasi Hasil'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 text-center w-16">No</th>
                <th className="p-4 text-center w-24">Gambar</th>
                <th className="p-4 w-44">Hasil AI</th>
                <th className="p-4 text-center">Validasi Bentuk</th>
                <th className="p-4 text-center">Validasi Gram</th>
                <th className="p-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Belum ada hasil klasifikasi.</td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const rowKey = String(row?.id ?? row?.classification_id ?? index);
                  const draft = validations[rowKey] || {};
                  const imageUrl = joinApiUrl(row?.image_url || row?.crop_url || '');
                  const aiGram = normalizeGram(row?.ai_gram || row?.classification_gram || '-');
                  const aiShape = normalizeShape(row?.classification_bentuk || '-');

                  return (
                    <tr key={rowKey} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center font-medium text-slate-600">{index + 1}</td>
                      <td className="p-4">
                        <div
                          onClick={() => openPreview(row, index)}
                          className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all mx-auto"
                        >
                          {imageUrl ? (
                            <img src={imageUrl} alt={`Crop ${index + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">N/A</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{aiGram}</p>
                        <p className="text-xs text-slate-500">{aiShape}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded border border-slate-200">
                          Conf: {toDisplayConfidence(row?.confidence)}%
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2 items-center justify-center">
                          {SHAPE_OPTIONS.map((option) => (
                            <label key={option} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="radio"
                                name={`shape-${rowKey}`}
                                checked={draft.validation_bentuk === option}
                                onChange={() => handleValidationChange(rowKey, 'validation_bentuk', option)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="text-sm text-slate-600 group-hover:text-slate-800 uppercase text-xs font-bold">
                                {option}
                              </span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2 items-center justify-center">
                          {GRAM_OPTIONS.map((option) => (
                            <label key={option} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="radio"
                                name={`gram-${rowKey}`}
                                checked={draft.validation_gram === option}
                                onChange={() => handleValidationChange(rowKey, 'validation_gram', option)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="text-sm text-slate-600 group-hover:text-slate-800 uppercase text-xs font-bold">
                                {option}
                              </span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => openPreview(row, index)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {submitMessage ? (
        <div className={`text-sm ${submitMessage.includes('berhasil') ? 'text-green-600' : 'text-red-600'}`}>
          {submitMessage}
        </div>
      ) : null}

      {showModal && activeCrop && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-200">
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
            <span className="text-white font-medium text-sm px-4 py-2 bg-white/10 rounded-full backdrop-blur pointer-events-auto">
              {activeCrop.label} - {activeCrop.aiGram} {activeCrop.aiShape}
            </span>
            <button
              onClick={() => setShowModal(false)}
              className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors pointer-events-auto backdrop-blur"
            >
              <X size={20} />
            </button>
          </div>

          <div
            className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsInteracting(false)}
            onMouseLeave={() => setIsInteracting(false)}
            onWheel={handleWheel}
          >
            <div
              style={{
                transform: `translate(${modalPan.x}px, ${modalPan.y}px) scale(${modalZoom})`,
                transformOrigin: 'center',
                transition: isInteracting ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              {activeCrop.imageUrl ? (
                <img
                  src={activeCrop.imageUrl}
                  alt="Preview"
                  className="max-w-none pointer-events-none"
                  style={{ maxHeight: '85vh', maxWidth: '100vw' }}
                />
              ) : (
                <div className="text-slate-300">Gambar tidak tersedia</div>
              )}
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur px-6 py-3 rounded-full border border-white/10">
            <button onClick={() => handleZoom(-0.5)}>
              <ZoomOut size={20} className="text-white" />
            </button>
            <span className="text-white font-mono text-sm">{Math.round(modalZoom * 100)}%</span>
            <button onClick={() => handleZoom(0.5)}>
              <ZoomIn size={20} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationDetail;