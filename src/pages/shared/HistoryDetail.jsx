import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import authService from '../../service/authService';
import {
  ArrowLeft, Printer, Edit,
  Info, User, Activity, FileText,
  ChevronLeft, ChevronRight, AlertTriangle
} from 'lucide-react';
import { APP_CONFIG } from '../../utils/constant';
import NgrokImage from '../../components/common/NgrokImage';
import AnnotatedImage from '../../components/common/AnnotatedImage';

const API_HOST = APP_CONFIG.API_HOST;

const appendNgrokSkip = (url) => {
  if (!/ngrok/i.test(url) || url.includes('ngrok-skip-browser-warning')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}ngrok-skip-browser-warning=1`;
};

const joinApiUrl = (path) => {
  let raw = String(path || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) {
    try {
      const urlObj = new URL(raw);
      raw = urlObj.pathname + urlObj.search;
    } catch {
      raw = raw.replace(/^https?:\/\/[^/]+/, '');
    }
  }
  const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  return appendNgrokSkip(`${API_HOST}/${normalized}`);
};

const normalizeGram = (value) => {
  const v = String(value || '').toLowerCase();
  if (!v) return null;
  if (v.includes('posit')) return 'Positif';
  if (v.includes('negat')) return 'Negatif';
  return value;
};

const normalizeShape = (value) => {
  const v = String(value || '').toLowerCase();
  if (!v) return null;
  if (v.includes('kokus') || v.includes('coccus')) return 'Kokus';
  if (v.includes('batang') || v.includes('basil') || v.includes('bacillus')) return 'Batang';
  if (v.includes('spir')) return 'Spiral';
  return value;
};

const HistoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [detailData, setDetailData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  // Deteksi Role berdasarkan URL saat ini
  const isDoctor = location.pathname.includes('/doctor');
  const isAnalyst = location.pathname.includes('/analyst');
  const isDoctorHistoryDetail = isDoctor && location.pathname.includes('/doctor/history/');
  const imageSectionRef = useRef(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const fetchSpecimen = async (specimenId) => {
    setIsLoadingImage(true);
    setError('');
    try {
      const url = `${API_HOST}/api/doctor/specimen-details/${specimenId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...authService.getAuthorizationHeader(),
        },
      });

      if (response.status === 401) {
        authService.clearSession();
        navigate('/login');
        return null;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || result?.detail || 'Gagal mengambil detail riwayat.');
      }

      return result?.data || result;
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat mengambil data.');
      return null;
    } finally {
      setIsLoadingImage(false);
    }
  };

  const switchSpecimen = async (specimenId) => {
    const newData = await fetchSpecimen(specimenId);
    if (newData) {
      setDetailData(newData);
    }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await fetchSpecimen(id);
        if (data) setDetailData(data);
      } catch (err) {
        setError(err.message || 'Terjadi kesalahan saat mengambil data.');
        setDetailData(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchDetail();
  }, [id]);

  const data = useMemo(() => {
    if (!detailData) return null;

    const patient = detailData?.patient || {};
    const isValidated =
      isDoctorHistoryDetail ||
      detailData?.is_validated === true ||
      Boolean(detailData?.validated_at) ||
      Boolean(detailData?.tanggal_validasi) ||
      String(detailData?.status || detailData?.validation_status || '').toLowerCase().includes('valid');

    const mappedCrops = (detailData?.classifications || []).map((item, index) => {
      const aiGram = normalizeGram(item?.ai_gram || item?.classification_gram);
      const aiShape = normalizeShape(item?.classification_bentuk);
      const finalGram = normalizeGram(item?.validation_gram);
      const finalShape = normalizeShape(item?.validation_bentuk);
      const displayGram = finalGram || aiGram;
      const displayShape = finalShape || aiShape;

      const isRejected =
        item?.is_rejected === true ||
        String(item?.validation_gram || '').toLowerCase() === 'reject' ||
        String(item?.validation_bentuk || '').toLowerCase() === 'reject';

      let cropStatus = 'accepted';
      if (isRejected) cropStatus = 'rejected';
      else if (finalGram || finalShape) {
        const sameGram = !finalGram || !aiGram || finalGram === aiGram;
        const sameShape = !finalShape || !aiShape || finalShape === aiShape;
        cropStatus = sameGram && sameShape ? 'accepted' : 'revised';
      }

      return {
        id: item?.id ?? item?.classification_id ?? index,
        img: joinApiUrl(item?.image_url || item?.crop_url || ''),
        aiGram,
        aiShape,
        finalGram,
        finalShape,
        displayGram,
        displayShape,
        status: cropStatus
      };
    });

    const firstClassificationNote = (detailData?.classifications || [])
      .map((item) => item?.catatan || item?.doctor_note || item?.catatan_dokter || item?.validation_note)
      .find((note) => String(note || '').trim().length > 0);

    return {
      id: detailData?.specimen_code || detailData?.specimen_id || id,
      status: isValidated ? 'validated' : 'pending',
      patient: {
        name: patient?.nama || patient?.name || detailData?.patient_name || '-',
        age: patient?.umur || patient?.age || '-',
        gender: patient?.jenis_kelamin || patient?.gender || '-',
        rm: patient?.id_pasien || patient?.patient_id || '-',
        nik: patient?.nik || '-',
        address: patient?.alamat || '-',
        phone: patient?.no_telepon || '-',
        birthDate: patient?.tanggal_lahir || '-',
        registeredAt: patient?.registration_date || '-'
      },
      clinical: {
        date: detailData?.tanggal || detailData?.created_at || '-',
        analyst: detailData?.analyst_name || detailData?.analyst || '-',
        doctor: detailData?.validator || detailData?.doctor_name || detailData?.dokter || '-',
        accessionNumber: detailData?.accession_number || detailData?.specimen_code || '-',
        specimenType: detailData?.specimen_type || '-',
        doctorSender: detailData?.doctor_sender || '-',
        clinicalDiagnosis: detailData?.clinical_diagnosis || '-',
        collectedAt: detailData?.collected_at || '-',
        receivedAt: detailData?.received_at || '-',
        microscopeType: detailData?.microscope_type || '-',
        magnification: detailData?.magnification || '-',
        imageResolution: detailData?.image_resolution || '-',
        analystNote: detailData?.analyst_note || '-',
        validationStatus: detailData?.validation_status || '-',
        validatedAt: detailData?.validated_at || '-',
        validator: detailData?.validator || '-'
      },
      doctorNote:
        detailData?.doctor_note ||
        detailData?.catatan_dokter ||
        detailData?.catatan ||
        detailData?.doctor_notes ||
        detailData?.notes ||
        detailData?.validation?.catatan_dokter ||
        detailData?.validation?.catatan ||
        detailData?.validation_result?.catatan_dokter ||
        detailData?.validation_result?.catatan ||
        firstClassificationNote ||
        '',
      crops: mappedCrops,
      annotatedImageUrl: joinApiUrl(detailData?.annotated_image_url || ''),
      mainImageUrl: joinApiUrl(detailData?.main_image_url || ''),
      allSpecimens: (detailData?.all_specimens || []).map(s => ({
        ...s,
        annotatedImageUrl: joinApiUrl(s.annotated_image_url || ''),
        mainImageUrl: joinApiUrl(s.main_image_url || ''),
      })),
      classificationList: (detailData?.classifications || []).map((item) => ({
        id: item?.id ?? item?.classification_id,
        roi_bbox: item?.roi_bbox,
        roi_source: item?.roi_source,
        classification_gram: item?.classification_gram || item?.ai_gram,
        classification_bentuk: item?.classification_bentuk,
        validation_gram: item?.validation_gram,
        validation_bentuk: item?.validation_bentuk,
        is_rejected:
          item?.is_rejected === true ||
          String(item?.validation_gram || '').toLowerCase() === 'reject' ||
          String(item?.validation_bentuk || '').toLowerCase() === 'reject',
      })),
    };
  }, [detailData, id, isDoctorHistoryDetail]);

  if (isLoading) {
    return <div className="p-6 text-slate-600">Memuat detail riwayat...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!data) {
    return <div className="p-6 text-slate-600">Data detail riwayat tidak ditemukan.</div>;
  }

  // Menghitung statistik untuk header
  const totalCrops = data.crops.length;

  const handleAnalystRevision = () => {
    if (data.status === 'validated') {
      setShowRevisionModal(true);
    } else {
      navigate(`/analyst/process/${id}`);
    }
  };

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
              onClick={handleAnalystRevision}
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
            <div><p className="text-slate-500 text-xs">NIK</p><p className="font-semibold text-slate-700">{data.patient.nik}</p></div>
            <div><p className="text-slate-500 text-xs">Umur / Gender</p><p className="font-semibold text-slate-700">{data.patient.age} / {data.patient.gender}</p></div>
            <div><p className="text-slate-500 text-xs">Tgl Lahir</p><p className="font-semibold text-slate-700">{data.patient.birthDate}</p></div>
            <div><p className="text-slate-500 text-xs">No. Telepon</p><p className="font-semibold text-slate-700">{data.patient.phone}</p></div>
            <div className="col-span-2"><p className="text-slate-500 text-xs">Alamat</p><p className="font-semibold text-slate-700">{data.patient.address}</p></div>
            <div className="col-span-2"><p className="text-slate-500 text-xs">Terdaftar Pada</p><p className="font-semibold text-slate-700">{data.patient.registeredAt}</p></div>
          </div>
        </div>
        <div className="hidden md:block w-px bg-slate-200"></div>
        <div className="flex-1 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-blue-600" /> Data Klinis</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500 text-xs">Tanggal Analisis</p><p className="font-semibold text-slate-700">{data.clinical.date}</p></div>
            <div><p className="text-slate-500 text-xs">Analis / Dokter</p><p className="font-semibold text-slate-700">{data.clinical.analyst} / {data.clinical.doctor}</p></div>
            <div><p className="text-slate-500 text-xs">ID Spesimen</p><p className="font-semibold text-slate-700">{data.clinical.accessionNumber}</p></div>
            <div><p className="text-slate-500 text-xs">Jenis Spesimen</p><p className="font-semibold text-slate-700">{data.clinical.specimenType}</p></div>
            <div><p className="text-slate-500 text-xs">Diagnosa Klinis Awal</p><p className="font-semibold text-slate-700">{data.clinical.clinicalDiagnosis}</p></div>
            <div><p className="text-slate-500 text-xs">Resolusi Citra</p><p className="font-semibold text-slate-700">{data.clinical.imageResolution}</p></div>
            <div className="col-span-2"><p className="text-slate-500 text-xs">Catatan Analis</p><p className="font-semibold text-slate-700 leading-relaxed">{data.clinical.analystNote}</p></div>
          </div>
        </div>
      </div>

      {/* HASIL OBJEK TERDETEKSI — annotated image with prev/next arrows */}
      <div ref={imageSectionRef} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Hasil Objek Terdeteksi</h3>
            <p className="text-xs text-slate-500 mt-1">
              {totalCrops} objek —{' '}
              <span className="text-purple-700 font-semibold">Ungu: Gram Positif</span>
              <span className="text-pink-600 font-semibold ml-2">Pink: Gram Negatif</span>
            </p>
          </div>
          {data.allSpecimens.length > 1 && (
            <div className="text-xs text-slate-400 font-medium">
              Spesimen {data.allSpecimens.findIndex(s => s.is_current) + 1} dari {data.allSpecimens.length}
            </div>
          )}
        </div>
        <div className="relative flex items-center justify-center p-6 min-h-[200px]">
          {(data.annotatedImageUrl || data.mainImageUrl) ? (
            <>
              {/* Prev/Next arrows for cycling specimens */}
              {data.allSpecimens.length > 1 && (() => {
                const currIdx = data.allSpecimens.findIndex(s => s.is_current);
                const prevSpec = data.allSpecimens[currIdx > 0 ? currIdx - 1 : data.allSpecimens.length - 1];
                const nextSpec = data.allSpecimens[currIdx < data.allSpecimens.length - 1 ? currIdx + 1 : 0];
                return (
                  <>
                    <button
                      onClick={() => switchSpecimen(prevSpec.specimen_id)}
                      disabled={isLoadingImage}
                      className="absolute left-3 z-10 p-2.5 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 backdrop-blur-sm transition-all active:scale-90 shadow disabled:opacity-40 disabled:cursor-not-allowed"
                      title={`Spesimen sebelumnya: ${prevSpec.accession_number}`}
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={() => switchSpecimen(nextSpec.specimen_id)}
                      disabled={isLoadingImage}
                      className="absolute right-3 z-10 p-2.5 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 backdrop-blur-sm transition-all active:scale-90 shadow disabled:opacity-40 disabled:cursor-not-allowed"
                      title={`Spesimen berikutnya: ${nextSpec.accession_number}`}
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                );
              })()}

              {/* Loading overlay for image switching */}
              {isLoadingImage && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-slate-500 font-medium">Memuat gambar...</span>
                  </div>
                </div>
              )}

              <NgrokImage
                src={data.annotatedImageUrl || data.mainImageUrl}
                alt="Hasil deteksi bakteri"
                className="w-full max-w-2xl h-[450px] object-contain rounded-lg shadow bg-slate-100"
              />
            </>
          ) : (
            <p className="text-slate-400 text-sm py-10">Gambar tidak tersedia</p>
          )}
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

      {/* MODAL KONFIRMASI REVISI */}
      {showRevisionModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-lg font-bold text-slate-800">Konfirmasi Revisi</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              Data sudah selesai divalidasi. Lanjutkan revisi? Status akan kembali ke Menunggu Validasi.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRevisionModal(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowRevisionModal(false);
                  navigate(`/analyst/process/${id}`);
                }}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-all active:scale-95 shadow-md"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default HistoryDetail;
