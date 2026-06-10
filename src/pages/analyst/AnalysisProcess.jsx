import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import authService from '../../service/authService';
import {
  Upload, X, Play, Save, ArrowLeft, ArrowRight, Microscope,
  CheckCircle, Activity, Maximize2, AlertTriangle,
  Info, ZoomIn, ZoomOut, Move, Crop, Scan, Trash, AlertCircle,
  Hand, MousePointer2, RefreshCw
} from 'lucide-react';
import { APP_CONFIG } from '../../utils/constant';
import NgrokImage from '../../components/common/NgrokImage';

const AnalysisProcess = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const API_BASE_URL = APP_CONFIG.API_BASE_URL;
  const API_HOST = APP_CONFIG.API_HOST;
  const draftStorageKey = useMemo(() => `analysis_draft_v1:${String(id || '')}`, [id]);

  const appendNgrokSkip = useCallback((url) => {
    if (!/ngrok/i.test(url) || url.includes('ngrok-skip-browser-warning')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}ngrok-skip-browser-warning=1`;
  }, []);

  // --- STATE ---
  const [patient, setPatient] = useState(null);
  const [patientDbId, setPatientDbId] = useState(null);
  const [isPatientLoading, setIsPatientLoading] = useState(true);
  const [images, setImages] = useState([]);
  const [uploadedSpecimens, setUploadedSpecimens] = useState([]);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [hoveredRoiIndex, setHoveredRoiIndex] = useState(null);
  const [showFullPreview, setShowFullPreview] = useState(false);

  // Transform State (Zoom & Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Logic State
  const [mode, setMode] = useState('drag'); // 'view', 'drag', 'manual_crop', 'auto_detect'
  const [rois, setRois] = useState({});
  const [status, setStatus] = useState('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [, setResult] = useState(null);
  const [imageMeta, setImageMeta] = useState({});
  const [toast, setToast] = useState({
    open: false,
    type: 'success',
    message: '',
  });

  const [specimenMeta, setSpecimenMeta] = useState({
    accession_number: '',
    specimen_type: '',
    doctor_sender: '',
    clinical_diagnosis: '',
    collected_at: '',
    received_at: '',
    microscope_type: '',
    magnification: '',
    analyst_note: '',
  });

  // Interaction Refs & State
  const imgContainerRef = useRef(null);
  const imageElementRef = useRef(null);
  const modalImgRef = useRef(null);
  const modalImageRef = useRef(null);
  const cleanupData = useRef({ isSubmitted: false, uploadedSpecimens: [] });
  const [isInteracting, setIsInteracting] = useState(false); // Drawing or Dragging
  const [startPos, setStartPos] = useState({ x: 0, y: 0 }); // Posisi awal mouse (Relatif terhadap image)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // Posisi awal mouse (Screen) untuk Panning
  const [currentBox, setCurrentBox] = useState(null);

  const handleNextImg = useCallback(() => {
    if (!images.length) return;
    setActiveImgIdx(prev => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrevImg = useCallback(() => {
    if (!images.length) return;
    setActiveImgIdx(prev => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const showToast = useCallback((type, message) => {
    setToast({ open: true, type, message });
    window.setTimeout(() => {
      setToast((prev) => (prev.open ? { ...prev, open: false } : prev));
    }, 4000);
  }, []);

  const normalizeDateTimeLocal = useCallback((value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
    return raw;
  }, []);

  const generateAccessionNumber = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    const id = `ACC-${year}${month}${day}-${random}`;
    setSpecimenMeta(prev => ({ ...prev, accession_number: id }));
  }, []);

  // Auto-generate accession number on mount if empty
  useEffect(() => {
    if (!specimenMeta.accession_number) {
      generateAccessionNumber();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const readImageResolution = useCallback(async (file) => {
    if (!file) return '';
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        const resolution = `${bitmap.width}x${bitmap.height}`;
        if (typeof bitmap.close === 'function') bitmap.close();
        return resolution;
      } catch {
        return '';
      }
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        resolve(`${img.naturalWidth}x${img.naturalHeight}`);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve('');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }, []);

  const toAbsoluteUploadUrl = useCallback((path) => {
    let raw = String(path || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) {
      try {
        const urlObj = new URL(raw);
        raw = urlObj.pathname + urlObj.search;
      } catch (e) {
        raw = raw.replace(/^https?:\/\/[^\/]+/, '');
      }
    }
    const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');
    return appendNgrokSkip(`${API_HOST}/${normalized}`);
  }, [API_HOST, appendNgrokSkip]);

  // --- SHORTCUTS KEYBOARD ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Abaikan jika sedang mengetik di input (jika ada)
      if (e.target.tagName === 'INPUT') return;

      switch (e.key.toLowerCase()) {
        case 'b':
          setMode('manual_crop');
          break;
        case 'd':
          setMode('drag');
          break;
        case 'r':
          setMode(prev => prev === 'remove' ? 'view' : 'remove');
          break;
        case 'escape':
          if (showFullPreview) setShowFullPreview(false);
          else {
            setCurrentBox(null);
            setIsInteracting(false);
            setMode('view');
          }
          break;
        case 'arrowleft':
          if (showFullPreview) handlePrevImg();
          break;
        case 'arrowright':
          if (showFullPreview) handleNextImg();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredRoiIndex, rois, activeImgIdx, showFullPreview, images.length, handlePrevImg, handleNextImg]);

  // --- HANDLERS ---

  const [rawClassifications, setRawClassifications] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!id) return;
      setIsPatientLoading(true);
      try {
        // Try fetching as specimen details first (for revision)
        const specResponse = await fetch(`${API_HOST}/api/doctor/specimen-details/${id}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...authService.getAuthorizationHeader(),
          },
        });

        if (specResponse.status === 401) {
          authService.clearSession();
          navigate('/login');
          return;
        }

        if (specResponse.ok) {
          const result = await specResponse.json();
          const specimenData = result?.data || result;
          
          if (specimenData && specimenData.patient) {
            setPatientDbId(specimenData.patient_id);
            const patientData = {
              id_pasien: specimenData.patient.id_pasien || specimenData.patient.patient_id || '-',
              nama_lengkap: specimenData.patient.nama || specimenData.patient.name || '-',
              nik: specimenData.patient.nik || '',
              jenis_kelamin: specimenData.patient.jenis_kelamin || specimenData.patient.gender || '-',
              tanggal_lahir: specimenData.patient.tanggal_lahir || specimenData.patient.birth_date || null,
              no_telepon: specimenData.patient.no_telepon || '',
              alamat: specimenData.patient.alamat || '',
            };
            setPatient(patientData);
            
            // Map existing specimen metadata
            setSpecimenMeta({
              accession_number: specimenData.accession_number || '',
              specimen_type: specimenData.specimen_type || '',
              doctor_sender: specimenData.doctor_sender || '',
              clinical_diagnosis: specimenData.clinical_diagnosis || '',
              collected_at: specimenData.collected_at ? specimenData.collected_at.slice(0, 16) : '',
              received_at: specimenData.received_at ? specimenData.received_at.slice(0, 16) : '',
              microscope_type: specimenData.microscope_type || '',
              magnification: specimenData.magnification || '',
              analyst_note: specimenData.analyst_note || '',
            });

            // Map images
            const specs = specimenData.all_specimens && specimenData.all_specimens.length > 0
              ? specimenData.all_specimens
              : [specimenData];
            
            const restoredImages = specs.map(s => ({
              previewUrl: toAbsoluteUploadUrl(s.main_image_url || s.main_image_path || s.file_path || s.annotated_image_url || ''),
              specimenId: s.specimen_id || s.id,
              fileName: s.fileName || `specimen-${s.specimen_id || s.id}`,
              filePath: s.main_image_path || s.file_path || s.main_image_url || '',
            }));
            
            setImages(restoredImages);
            setUploadedSpecimens(specs.map(s => ({ id: s.specimen_id || s.id })));
            
            if (Array.isArray(specimenData.classifications)) {
              setRawClassifications(specimenData.classifications);
            }
            setIsPatientLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch specimen details, falling back to patient details:', err);
      }

      // Fallback: load patient data directly (for new analysis)
      try {
        const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...authService.getAuthorizationHeader(),
          },
        });

        if (response.status === 401) {
          authService.clearSession();
          navigate('/login');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setPatientDbId(data.id);
          setPatient({
            id_pasien: data.id_pasien || data.patient_id || data.id,
            nama_lengkap: data.nama || data.name || data.nama_lengkap,
            nik: data.nik || '',
            jenis_kelamin: data.jenis_kelamin || data.gender || '-',
            tanggal_lahir: data.tanggal_lahir || data.birth_date || null,
            no_telepon: data.no_telepon || '',
            alamat: data.alamat || '',
          });
        } else {
          setPatient(null);
          console.error('Gagal mengambil data pasien');
        }
      } catch (error) {
        setPatient(null);
        console.error('Gagal mengambil data pasien:', error);
      } finally {
        setIsPatientLoading(false);
      }
    };

    fetchInitialData();
  }, [API_BASE_URL, API_HOST, id, navigate, toAbsoluteUploadUrl]);

  useEffect(() => {
    if (!rawClassifications || !images.length) return;
    const activeImage = images[activeImgIdx];
    if (!activeImage) return;
    const activeMeta = imageMeta[activeImgIdx];
    if (!activeMeta) return;

    const specId = activeImage.specimenId;
    const activeClassifications = rawClassifications.filter(
      (c) => (c.specimen_id || c.specimen || c.specimen_id_id) === specId
    );

    if (activeClassifications.length > 0 && (!rois[activeImgIdx] || rois[activeImgIdx].length === 0)) {
      const clientW = activeMeta.clientW;
      const clientH = activeMeta.clientH;
      const naturalW = activeMeta.naturalW;
      const naturalH = activeMeta.naturalH;

      if (clientW && clientH && naturalW && naturalH) {
        const imgRatio = naturalW / naturalH;
        const containerRatio = clientW / clientH;

        let renderW;
        let renderH;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > containerRatio) {
          renderW = clientW;
          renderH = clientW / imgRatio;
          offsetY = (clientH - renderH) / 2;
        } else {
          renderH = clientH;
          renderW = clientH * imgRatio;
          offsetX = (clientW - renderW) / 2;
        }

        const scaleX = renderW / naturalW;
        const scaleY = renderH / naturalH;

        const converted = activeClassifications.map((item, index) => {
          const bbox = Array.isArray(item.roi_bbox) ? item.roi_bbox : [0, 0, 0, 0];
          const x1 = bbox[0];
          const y1 = bbox[1];
          const x2 = bbox[2];
          const y2 = bbox[3];

          const w = x2 - x1;
          const h = y2 - y1;

          const displayX = x1 * scaleX + offsetX;
          const displayY = y1 * scaleY + offsetY;
          const displayW = w * scaleX;
          const displayH = h * scaleY;

          return {
            id: item.id || `classification-${index}`,
            x: displayX,
            y: displayY,
            width: displayW,
            height: displayH,
            w: displayW,
            h: displayH,
            status: 'done',
            aiGram: item.classification_gram || item.ai_gram || item.validation_gram,
            classification_gram: item.classification_gram || item.ai_gram || item.validation_gram,
            aiShape: item.classification_bentuk || item.validation_bentuk,
            classification_bentuk: item.classification_bentuk || item.validation_bentuk,
            validation_bentuk: item.validation_bentuk,
            validation_gram: item.validation_gram,
            confidence: item.confidence || item.classification_confidence || 1,
            source: item.roi_source || 'manual',
            label: item.roi_source === 'auto' ? 'Auto' : 'Manual',
          };
        });

        setRois((prev) => ({
          ...prev,
          [activeImgIdx]: converted,
        }));
      }
    }
  }, [rawClassifications, activeImgIdx, imageMeta, images, rois]);

  useEffect(() => {
    let cancelled = false;

    const restoreDraft = async () => {
      if (!id) return;

      let parsed;
      try {
        const raw = localStorage.getItem(draftStorageKey);
        if (!raw) return;
        parsed = JSON.parse(raw);
      } catch {
        return;
      }

      if (!parsed || String(parsed.patientId || '') !== String(id)) return;

      const draftImages = Array.isArray(parsed.images) ? parsed.images : [];
      if (draftImages.length === 0) return;

      const restoredImages = [];

      for (const draftImage of draftImages) {
        const specimenId = draftImage?.specimenId ?? draftImage?.specimen_id;
        let previewUrl = draftImage?.previewUrl || '';

        // If previewUrl is a blob: URL, it's not valid across devices/sessions.
        // Fallback to absolute upload URL from filePath.
        if (!previewUrl || previewUrl.startsWith('blob:')) {
          previewUrl = toAbsoluteUploadUrl(draftImage?.filePath);
        }

        if (!previewUrl && specimenId) {
          try {
            const response = await fetch(`${API_HOST}/api/doctor/specimen-details/${specimenId}`, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                ...authService.getAuthorizationHeader(),
              },
            });

            if (response.status === 401) {
              authService.clearSession();
              navigate('/login');
              return;
            }

            if (response.ok) {
              const detail = await response.json();
              previewUrl = toAbsoluteUploadUrl(detail?.main_image_url || '');
            }
          } catch {
            // noop
          }
        }

        if (!previewUrl) continue;

        restoredImages.push({
          previewUrl,
          specimenId,
          fileName: draftImage?.fileName || `specimen-${specimenId || ''}`,
          filePath: draftImage?.filePath || '',
        });
      }

      if (cancelled || restoredImages.length === 0) return;

      setImages(restoredImages);

      const restoredUploaded = Array.isArray(parsed.uploadedSpecimens)
        ? parsed.uploadedSpecimens
          .map((s) => ({ id: s?.id ?? s?.specimen_id }))
          .filter((s) => s.id !== undefined && s.id !== null)
        : restoredImages
          .map((img) => ({ id: img.specimenId }))
          .filter((s) => s.id !== undefined && s.id !== null);

      setUploadedSpecimens(restoredUploaded);
      setRois(parsed.rois && typeof parsed.rois === 'object' ? parsed.rois : {});
      if (parsed.specimenMeta && typeof parsed.specimenMeta === 'object') {
        setSpecimenMeta((prev) => ({
          ...prev,
          ...parsed.specimenMeta,
        }));
      }
      setActiveImgIdx(
        Math.max(
          0,
          Math.min(Number(parsed.activeImgIdx || 0), Math.max(0, restoredImages.length - 1))
        )
      );
      setStatus('idle');
      setMode('drag');
      setIsSubmitted(false);
      showToast('success', 'Progress sebelumnya telah dipulihkan.');
    };

    restoreDraft();

    return () => {
      cancelled = true;
    };
  }, [API_HOST, draftStorageKey, id, navigate, showToast, toAbsoluteUploadUrl]);

  useEffect(() => {
    if (!id) return;

    if (isSubmitted || images.length === 0) {
      localStorage.removeItem(draftStorageKey);
      return;
    }

    const serializableImages = images.map((img) => ({
      specimenId: img?.specimenId ?? img?.specimen_id ?? null,
      fileName: img?.fileName || '',
      filePath: img?.filePath || '',
      previewUrl:
        String(img?.previewUrl || '').startsWith('http')
          ? img.previewUrl
          : toAbsoluteUploadUrl(img?.filePath),
    }));

    const serializableUploaded = uploadedSpecimens
      .map((s) => ({ id: s?.id ?? s?.specimen_id ?? null }))
      .filter((s) => s.id !== null);

    const payload = {
      version: 1,
      patientId: String(id),
      activeImgIdx,
      images: serializableImages,
      rois,
      specimenMeta,
      uploadedSpecimens: serializableUploaded,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(draftStorageKey, JSON.stringify(payload));
  }, [activeImgIdx, draftStorageKey, id, images, isSubmitted, rois, specimenMeta, toAbsoluteUploadUrl, uploadedSpecimens]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validasi format file
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const invalidFiles = files.filter((file) => !validTypes.includes(file.type));

    if (invalidFiles.length > 0) {
      showToast('error', 'Format file tidak valid! Harap hanya unggah gambar berformat JPG atau PNG.');
      e.target.value = '';
      return;
    }

    // Pastikan ID Spesimen diisi
    if (!(specimenMeta.accession_number || '').trim()) {
      generateAccessionNumber();
    }

    setIsUploading(true);

    try {
      const uploadedImageItems = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('patient_id', patientDbId || id);
        formData.append('accession_number', specimenMeta.accession_number || '');
        formData.append('specimen_type', specimenMeta.specimen_type || '');
        formData.append('doctor_sender', specimenMeta.doctor_sender || '');
        formData.append('clinical_diagnosis', specimenMeta.clinical_diagnosis || '');
        formData.append('collected_at', normalizeDateTimeLocal(specimenMeta.collected_at));
        formData.append('received_at', normalizeDateTimeLocal(specimenMeta.received_at));
        formData.append('microscope_type', specimenMeta.microscope_type || '');
        formData.append('magnification', specimenMeta.magnification || '');
        formData.append('analyst_note', specimenMeta.analyst_note || '');

        const resolution = await readImageResolution(file);
        if (resolution) formData.append('image_resolution', resolution);
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/analyst/upload-specimen`, {
          method: 'POST',
          headers: {
            ...authService.getAuthorizationHeader(),
          },
          body: formData,
        });

        if (response.status === 401) {
          authService.clearSession();
          navigate('/login');
          return;
        }

        if (!response.ok) {
          console.error('Gagal upload specimen awal:', file.name);
          continue;
        }

        const uploaded = await response.json();
        const specimenId = uploaded.id ?? uploaded.specimen_id;
        const previewUrl = URL.createObjectURL(file);

        uploadedImageItems.push({
          previewUrl,
          specimenId,
          fileName: file.name,
          filePath: uploaded.file_path || '',
        });

        if (specimenId) {
          setUploadedSpecimens((prev) => {
            const exists = prev.some((s) => (s.id ?? s.specimen_id) === specimenId);
            if (exists) return prev;
            return [...prev, { id: specimenId }];
          });
        }
      }

      if (uploadedImageItems.length === 0) {
        showToast('error', 'Tidak ada gambar baru yang berhasil diunggah.');
        return;
      }

      setImages((prev) => {
        const next = [...prev];
        uploadedImageItems.forEach(item => {
          if (!next.some(existing => existing.specimenId === item.specimenId)) {
            next.push(item);
          }
        });
        return next;
      });
      setStatus('idle');
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setMode('drag');
      setIsSubmitted(false);
    } catch (error) {
      console.error('Error upload specimen awal:', error);
      showToast('error', 'Gagal mengunggah gambar ke server.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Zoom ke Tengah / Kursor
  const handleZoom = useCallback((delta, focalPoint = null) => {
    setZoom(prevZoom => {
      const newZoom = Math.min(Math.max(prevZoom + delta, 0.5), 5); // Min 0.5x, Max 5x
      if (newZoom === prevZoom) return prevZoom;

      setPan(prevPan => {
        let fx;
        let fy;
        const container = showFullPreview ? modalImgRef.current : imgContainerRef.current;

        if (focalPoint) {
          fx = focalPoint.x;
          fy = focalPoint.y;
        } else if (container) {
          const rect = container.getBoundingClientRect();
          fx = rect.width / 2;
          fy = rect.height / 2;
        } else {
          fx = 0;
          fy = 0;
        }

        const scaleRatio = newZoom / prevZoom;
        return {
          x: fx - (fx - prevPan.x) * scaleRatio,
          y: fy - (fy - prevPan.y) * scaleRatio
        };
      });

      return newZoom;
    });
  }, [showFullPreview]);

  // Native Wheel Event untuk mengunci scroll halaman & mengatur sensitivitas
  useEffect(() => {
    const handleNativeWheel = (e) => {
      e.preventDefault(); // Kunci scroll halaman & pinch bawaan browser

      // Kurangi sensitivitas (Pinch trackpad biasanya membawa ctrlKey)
      const sensitivity = e.ctrlKey ? 0.005 : 0.002;
      const delta = -e.deltaY * sensitivity;

      const container = showFullPreview ? modalImgRef.current : imgContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const focalPoint = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        handleZoom(delta, focalPoint);
      }
    };

    const containerEl = imgContainerRef.current;
    const modalEl = modalImgRef.current;

    // Harus passive: false agar e.preventDefault() berfungsi
    if (containerEl) containerEl.addEventListener('wheel', handleNativeWheel, { passive: false });
    if (modalEl) modalEl.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      if (containerEl) containerEl.removeEventListener('wheel', handleNativeWheel);
      if (modalEl) modalEl.removeEventListener('wheel', handleNativeWheel);
    };
  }, [mode, showFullPreview, handleZoom, images]);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setMode('drag');
  };

  const centerImageFor = (containerRef, imageRef, isModal = false) => {
    const imgEl = imageRef.current;
    const contEl = containerRef.current;
    if (!imgEl || !contEl) return;

    const contRect = contEl.getBoundingClientRect();

    if (!isModal) {
      // Main preview: resize to 80% of container
      const maxW = contRect.width * 0.8;
      const maxH = contRect.height * 0.8;

      const nw = imgEl.naturalWidth || 1;
      const nh = imgEl.naturalHeight || 1;

      const imgRatio = nw / nh;
      const contRatio = maxW / maxH;

      let targetW, targetH;
      if (imgRatio > contRatio) {
        targetW = maxW;
        targetH = maxW / imgRatio;
      } else {
        targetH = maxH;
        targetW = maxH * imgRatio;
      }

      imgEl.style.width = `${targetW}px`;
      imgEl.style.height = `${targetH}px`;
      imgEl.style.maxHeight = 'none';
      imgEl.style.maxWidth = 'none';
    } else {
      // Modal preview: sync size with main image to preserve ROI coordinates
      const mainImgEl = imageElementRef.current;
      if (mainImgEl) {
        imgEl.style.width = mainImgEl.style.width;
        imgEl.style.height = mainImgEl.style.height;
        imgEl.style.maxHeight = 'none';
        imgEl.style.maxWidth = 'none';
      }
    }

    const finalW = parseFloat(imgEl.style.width) || imgEl.clientWidth;
    const finalH = parseFloat(imgEl.style.height) || imgEl.clientHeight;

    setPan({
      x: (contRect.width - finalW) / 2,
      y: (contRect.height - finalH) / 2,
    });
  };

  useEffect(() => {
    if (showFullPreview) {
      if (modalImageRef.current && modalImageRef.current.complete) {
        centerImageFor(modalImgRef, modalImageRef, true);
      }
    } else {
      if (imageElementRef.current && imageElementRef.current.complete) {
        centerImageFor(imgContainerRef, imageElementRef, false);
      }
    }
  }, [showFullPreview, activeImgIdx]);

  const updateImageMeta = (index, imgEl) => {
    if (!imgEl) return;
    setImageMeta((prev) => ({
      ...prev,
      [index]: {
        naturalW: imgEl.naturalWidth || 0,
        naturalH: imgEl.naturalHeight || 0,
        clientW: imgEl.clientWidth || 0,
        clientH: imgEl.clientHeight || 0,
      }
    }));
  };

  // --- KONVERSI ROI DISPLAY -> ROI NATURAL IMAGE ---
  const buildNaturalRois = (imageIdx) => {
    const roisForImage = rois[imageIdx] || [];
    if (roisForImage.length === 0) return [];

    const activeMeta = imageMeta[imageIdx] || null;

    const imageEl = imageIdx === activeImgIdx ? imageElementRef.current : null;

    // 1) Ukuran elemen HTML dan ukuran asli image
    const clientW = activeMeta?.clientW || imageEl?.clientWidth || 0;
    const clientH = activeMeta?.clientH || imageEl?.clientHeight || 0;
    const naturalW = activeMeta?.naturalW || imageEl?.naturalWidth || 0;
    const naturalH = activeMeta?.naturalH || imageEl?.naturalHeight || 0;

    if (!clientW || !clientH || !naturalW || !naturalH) return [];

    // 2) Hitung area render aktual image (object-contain) + offset letterbox
    const imgRatio = naturalW / naturalH;
    const containerRatio = clientW / clientH;

    let renderW;
    let renderH;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > containerRatio) {
      renderW = clientW;
      renderH = clientW / imgRatio;
      offsetY = (clientH - renderH) / 2;
    } else {
      renderH = clientH;
      renderW = clientH * imgRatio;
      offsetX = (clientW - renderW) / 2;
    }

    // 3) Skala dari area render ke resolusi asli
    const scaleX = naturalW / renderW;
    const scaleY = naturalH / renderH;

    return roisForImage.map((roi, index) => {
      const roiWidth = roi.width ?? roi.w ?? 0;
      const roiHeight = roi.height ?? roi.h ?? 0;
      const roiX = roi.x ?? 0;
      const roiY = roi.y ?? 0;

      let actualX = (roiX - offsetX) * scaleX;
      let actualY = (roiY - offsetY) * scaleY;
      let actualWidth = roiWidth * scaleX;
      let actualHeight = roiHeight * scaleY;

      actualX = Math.max(0, actualX);
      actualY = Math.max(0, actualY);
      actualWidth = Math.min(actualWidth, naturalW - actualX);
      actualHeight = Math.min(actualHeight, naturalH - actualY);

      return {
        id: roi.id ?? index,
        x: Math.round(actualX),
        y: Math.round(actualY),
        width: Math.round(Math.max(0, actualWidth)),
        height: Math.round(Math.max(0, actualHeight)),
        source:
          roi.source ||
          (String(roi.label || '').toLowerCase() === 'auto' ? 'auto' : 'manual'),
      };
    });
  };

  // --- MOUSE EVENT HANDLERS (CORE LOGIC) ---

  // Helper: Dapatkan koordinat mouse relatif terhadap gambar (memperhitungkan zoom & pan)
  const getRelPos = (clientX, clientY) => {
    const container = showFullPreview ? modalImgRef.current : imgContainerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();

    // Rumus: (PosisiMouse - PosisiContainer - GeseranPan) / Zoom
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  };

  const handleMouseDown = (e) => {
    // Cegah drag default browser pada gambar
    e.preventDefault();

    if (mode === 'drag') {
      setIsInteracting(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
    else if (mode === 'manual_crop') {
      setIsInteracting(true);
      const pos = getRelPos(e.clientX, e.clientY);
      setStartPos(pos);
      setCurrentBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e) => {
    if (!isInteracting) return;

    if (mode === 'drag') {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
    else if (mode === 'manual_crop') {
      const currentPos = getRelPos(e.clientX, e.clientY);

      // Hitung kotak dengan dukungan drag ke segala arah (kiri-atas, kanan-bawah, dsb)
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const w = Math.abs(currentPos.x - startPos.x);
      const h = Math.abs(currentPos.y - startPos.y);

      setCurrentBox({ x, y, w, h });
    }
  };

  const handleMouseUp = () => {
    if (!isInteracting) return;
    setIsInteracting(false);

    if (mode === 'manual_crop' && currentBox) {
      // Hanya simpan jika kotak cukup besar (mencegah klik tidak sengaja)
      if (currentBox.w > 5 && currentBox.h > 5) {
        const currentRois = rois[activeImgIdx] || [];
        setRois({
          ...rois,
          [activeImgIdx]: [...currentRois, { id: `manual-${Date.now()}-${currentRois.length}`, ...currentBox, label: 'Manual', status: 'pending' }]
        });
      }
      setCurrentBox(null);
    }
  };

  // --- TOUCH HANDLERS FOR MOBILE ---
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleMouseDown({
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => { },
      });
    }
  };

  const handleTouchMove = (e) => {
    if (isInteracting && e.touches.length === 1) {
      const touch = e.touches[0];
      handleMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => { },
      });
    }
  };

  const handleTouchEnd = () => {
    if (typeof handleMouseUp === 'function') {
      handleMouseUp();
    } else {
      setIsInteracting(false);
    }
  };

  // --- FUNGSI AUTO CROP (YOLO DETECTION) ---
  const handleAutoDetect = async () => {
    if (status === 'auto_detecting' || status === 'analyzing') {
      return;
    }

    if (images.length === 0) {
      showToast('error', 'Harap unggah gambar terlebih dahulu!');
      return;
    }

    const activeImage = images[activeImgIdx];
    const specimenId = activeImage?.specimenId;
    if (!specimenId) {
      showToast('error', 'Specimen ID untuk gambar aktif tidak ditemukan. Silakan upload ulang.');
      return;
    }

    setMode('auto_detect');
    setStatus('auto_detecting');

    try {
      const response = await fetch(`${API_BASE_URL}/analyst/detect/${specimenId}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...authService.getAuthorizationHeader(),
        },
      });

      if (response.status === 401) {
        authService.clearSession();
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('YOLO Error Payload:', errData);
        showToast('error', 'Gagal memproses gambar otomatis. Pastikan AI backend menyala.');
        return;
      }

      const data = await response.json();
      const results = Array.isArray(data?.results)
        ? data.results
        : (Array.isArray(data?.detections) ? data.detections : []);

      if (results.length === 0) {
        showToast('error', 'Model AI belum menemukan objek pada gambar ini. Coba crop manual atau unggah gambar lain.');
        return;
      }

      // Konversi koordinat backend (natural image px) -> koordinat display frontend
      const imageEl = imageElementRef.current;
      const naturalW = imageEl?.naturalWidth || 1;
      const naturalH = imageEl?.naturalHeight || 1;
      const displayW = imageEl?.clientWidth || naturalW;
      const displayH = imageEl?.clientHeight || naturalH;
      const scaleToDisplayX = displayW / naturalW;
      const scaleToDisplayY = displayH / naturalH;

      // 4. Konversi data API ke dalam format Bounding Box Frontend
      const detectedRois = results.map((item, index) => {
        const bbox = Array.isArray(item?.bbox) ? item.bbox : [0, 0, 0, 0];

        // API mereturn [x1, y1, x2, y2]
        const x1 = Number(bbox[0] ?? 0);
        const y1 = Number(bbox[1] ?? 0);
        const x2 = Number(bbox[2] ?? 0);
        const y2 = Number(bbox[3] ?? 0);

        const width = Math.max(0, x2 - x1);
        const height = Math.max(0, y2 - y1);

        // Ubah ke sistem koordinat gambar yang sedang dirender di layar
        const displayX = x1 * scaleToDisplayX;
        const displayY = y1 * scaleToDisplayY;
        const displayWidth = width * scaleToDisplayX;
        const displayHeight = height * scaleToDisplayY;

        return {
          id: `yolo-${Date.now()}-${index}`,
          x: displayX,
          y: displayY,
          width: displayWidth,
          height: displayHeight,
          status: 'pending',
          label: 'Auto',
          source: 'auto',
          confidence: item.yolo_confidence ?? item.confidence,
        };
      });

      setRois((prev) => {
        const current = prev[activeImgIdx] || [];
        const preservedManual = current.filter((roi) => {
          const src = String(roi?.source || roi?.label || '').toLowerCase();
          return src !== 'auto';
        });
        return {
          ...prev,
          [activeImgIdx]: [...preservedManual, ...detectedRois]
        };
      });

      setResult(null);
    } catch (error) {
      console.error('YOLO Fetch Error:', error);
      showToast('error', 'Terjadi kesalahan jaringan saat menghubungi server AI.');
    } finally {
      setStatus('idle');
      setMode('drag');
    }
  };

  // PROSES KLASIFIKASI MANUAL/BATCH
  const handleStartClassification = async () => {
    const normalizeGramLabel = (value) => {
      const v = String(value || '').trim().toLowerCase();
      if (['positif', 'positive', 'gram_positive', 'gram positif', '+'].includes(v)) return 'Positif';
      if (['negatif', 'negative', 'gram_negative', 'gram negatif', '-'].includes(v)) return 'Negatif';
      return String(value || '');
    };

    if (images.length === 0) {
      showToast('error', 'Harap unggah gambar terlebih dahulu.');
      return;
    }

    const imagesWithoutRoi = images
      .map((_, idx) => ({ idx, count: (rois[idx] || []).length }))
      .filter((x) => x.count === 0);

    if (imagesWithoutRoi.length > 0) {
      showToast('error', `Masih ada ${imagesWithoutRoi.length} gambar tanpa Bounding Box. Lengkapi semua gambar sebelum klasifikasi.`);
      return;
    }

    setStatus('analyzing');

    try {
      const aggregatedResults = [];
      let nextRoisState = { ...rois };

      for (let idx = 0; idx < images.length; idx += 1) {
        const specimenId = images[idx]?.specimenId;
        if (!specimenId) {
          throw new Error(`Specimen ID gambar ke-${idx + 1} tidak ditemukan`);
        }

        const naturalRois = buildNaturalRois(idx);
        if (!naturalRois.length) {
          throw new Error(`ROI gambar ke-${idx + 1} tidak valid`);
        }

        const finalRoisInNaturalPixels = naturalRois.map((roi) => ({
          x: roi.x,
          y: roi.y,
          width: roi.width,
          height: roi.height,
          source: roi.source || 'manual',
        }));

        const activeMeta = imageMeta[idx] || null;
        const resolution = activeMeta?.naturalW && activeMeta?.naturalH
          ? `${activeMeta.naturalW}x${activeMeta.naturalH}`
          : '';

        const classifyPayload = {
          rois: finalRoisInNaturalPixels,
          analyst_note: specimenMeta.analyst_note || undefined,
          accession_number: specimenMeta.accession_number || undefined,
          specimen_type: specimenMeta.specimen_type || undefined,
          clinical_diagnosis: specimenMeta.clinical_diagnosis || undefined,
          doctor_sender: specimenMeta.doctor_sender || undefined,
          image_metadata: {
            microscope_type: specimenMeta.microscope_type || undefined,
            magnification: specimenMeta.magnification || undefined,
            image_resolution: resolution || undefined,
          },
        };

        const classifyResponse = await fetch(`${API_BASE_URL}/analyst/classify/${specimenId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...authService.getAuthorizationHeader(),
          },
          body: JSON.stringify(classifyPayload),
        });

        if (classifyResponse.status === 401) {
          authService.clearSession();
          navigate('/login');
          return;
        }

        if (!classifyResponse.ok) {
          const err = await classifyResponse.json().catch(() => ({}));
          if (classifyResponse.status === 409) {
            showToast('error', err?.detail || 'Spesimen sudah diklasifikasi. Gunakan data yang sudah ada.');
            setStatus('idle');
            setMode('view');
            return;
          }
          throw new Error(err?.detail || `Gagal klasifikasi ROI gambar ke-${idx + 1}`);
        }

        const classifyData = await classifyResponse.json();
        const aiResults = Array.isArray(classifyData?.results)
          ? classifyData.results
          : Array.isArray(classifyData?.classifications)
            ? classifyData.classifications
            : Array.isArray(classifyData?.data?.results)
              ? classifyData.data.results
              : Array.isArray(classifyData?.data?.classifications)
                ? classifyData.data.classifications
                : [];
        const normalizedResults = aiResults.map((r) => ({
          ...r,
          specimen_id: r.specimen_id ?? specimenId,
          classification_gram: normalizeGramLabel(
            r.classification_gram ?? r.aiGram ?? r.gram ?? r.prediction_gram
          ),
          classification_confidence: Number(r.classification_confidence ?? r.confidence ?? 0),
          image_file_name: r.image_file_name ?? r.crop_url ?? '',
        }));

        aggregatedResults.push(...normalizedResults);

        const current = nextRoisState[idx] || [];
        nextRoisState[idx] = current.map((roi, roiIdx) => {
          const roiId = roi.id ?? roiIdx;
          const ai = normalizedResults.find((r) => (r.roi_id ?? r.id) === roiId) || normalizedResults[roiIdx];
          if (!ai) return roi;
          return {
            ...roi,
            id: roiId,
            status: 'done',
            aiGram: ai?.classification_gram ?? ai?.aiGram ?? 'Kokus',
            aiShape: ai?.classification_shape ?? ai?.aiShape ?? 'Kokus',
            confidence: Number(ai?.classification_confidence ?? ai?.confidence ?? 1),
            cropUrl: ai?.image_file_name ?? ai?.crop_url ?? roi?.cropUrl ?? '',
          };
        });
      }

      setRois(nextRoisState);

      const gramPositive = aggregatedResults.filter((r) => normalizeGramLabel(r?.classification_gram ?? r?.aiGram) === 'Positif').length;
      const gramNegative = aggregatedResults.filter((r) => normalizeGramLabel(r?.classification_gram ?? r?.aiGram) === 'Negatif').length;

      setResult({
        gramPositive,
        gramNegative,
        confidence: aggregatedResults.length
          ? Math.round((aggregatedResults.reduce((sum, r) => sum + Number(r?.classification_confidence ?? r?.confidence ?? 0), 0) / aggregatedResults.length) * 100) / 100
          : 0,
        details: [
          { type: 'Kokus (Gram +)', count: gramPositive },
          { type: 'Kokus (Gram -)', count: gramNegative },
        ]
      });

      localStorage.removeItem(draftStorageKey);
      setIsSubmitted(true);
      setStatus('done');
      setMode('view');
    } catch (error) {
      console.error('Gagal klasifikasi:', error);
      setStatus('idle');
      showToast('error', 'Terjadi kesalahan saat memproses gambar.');
    }
  };

  // --- FUNGSI MENGHAPUS GAMBAR DI BACKEND ---
  const deleteOrphanedSpecimen = async (specimenId) => {
    try {
      await fetch(`${API_BASE_URL}/analysis/cleanup/${specimenId}`, {
        method: 'DELETE',
        headers: {
          ...authService.getAuthorizationHeader(),
        },
        keepalive: true,
      });
      console.log(`Specimen sampah ${specimenId} berhasil dihapus dari server.`);
    } catch (err) {
      console.error('Gagal menghapus specimen sampah:', err);
    }
  };

  // --- FUNGSI TOMBOL RESET / CANCEL ---
  const handleReset = async () => {
    if (window.confirm('Yakin ingin membatalkan? Semua gambar dan hasil klasifikasi akan dihapus.')) {
      await Promise.all(
        uploadedSpecimens.map((specimen) => {
          const specimenId = specimen.id ?? specimen.specimen_id;
          return specimenId ? deleteOrphanedSpecimen(specimenId) : Promise.resolve();
        })
      );

      cleanupData.current.uploadedSpecimens = [];

      setImages([]);
      setRois({});
      setUploadedSpecimens([]);
      setActiveImgIdx(0);
      setResult(null);
      setStatus('idle');
      setMode('view');
      setIsSubmitted(false);
      localStorage.removeItem(draftStorageKey);
    }
  };

  // --- FUNGSI KEMBALI (BACK) DENGAN CLEANUP ---
  const handleBack = async () => {
    if (!isSubmitted && uploadedSpecimens.length > 0) {
      await Promise.all(
        uploadedSpecimens.map((specimen) => {
          const specimenId = specimen.id ?? specimen.specimen_id;
          return specimenId ? deleteOrphanedSpecimen(specimenId) : Promise.resolve();
        })
      );

      cleanupData.current.uploadedSpecimens = [];
    }

    localStorage.removeItem(draftStorageKey);

    navigate(-1);
  };

  const handleRemoveImage = async (indexToRemove) => {
    const imageToRemove = images[indexToRemove];
    const specimenId = imageToRemove?.specimenId;

    if (specimenId) {
      setUploadedSpecimens((prev) => prev.filter((s) => (s.id ?? s.specimen_id) !== specimenId));
      cleanupData.current.uploadedSpecimens = cleanupData.current.uploadedSpecimens.filter((s) => (s.id ?? s.specimen_id) !== specimenId);
    }

    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));

    setRois((prev) => {
      const next = {};
      Object.entries(prev).forEach(([k, value]) => {
        const idx = Number(k);
        if (idx < indexToRemove) next[idx] = value;
        else if (idx > indexToRemove) next[idx - 1] = value;
      });
      return next;
    });

    setImageMeta((prev) => {
      const next = {};
      Object.entries(prev).forEach(([k, value]) => {
        const idx = Number(k);
        if (idx < indexToRemove) next[idx] = value;
        else if (idx > indexToRemove) next[idx - 1] = value;
      });
      return next;
    });

    setActiveImgIdx((prevIdx) => {
      if (images.length <= 1) return 0;
      if (prevIdx > indexToRemove) return prevIdx - 1;
      if (prevIdx === indexToRemove) return Math.max(0, Math.min(indexToRemove, images.length - 2));
      return prevIdx;
    });

    setResult(null);
    setStatus('idle');
    setMode('drag');
  };

  const clearRois = () => {
    setRois({ ...rois, [activeImgIdx]: [] });
    setResult(null);
    setStatus('idle');
  };

  useEffect(() => {
    if (!images.length) return;
    if (zoom !== 1) return;
    if (pan.x !== 0 || pan.y !== 0) return;
    centerImageFor(imgContainerRef, imageElementRef);
  }, [images, activeImgIdx, pan.x, pan.y, zoom]);

  useEffect(() => {
    if (!showFullPreview) return;
    centerImageFor(modalImgRef, modalImageRef);
  }, [showFullPreview, activeImgIdx]);

  // Sinkronkan ref cleanup dengan state terbaru
  useEffect(() => {
    cleanupData.current = { isSubmitted, uploadedSpecimens };
  }, [isSubmitted, uploadedSpecimens]);

  // UNMOUNT murni: hanya saat keluar/pindah halaman
  useEffect(() => {
    return () => {
      const hasDraft = Boolean(localStorage.getItem(draftStorageKey));
      if (hasDraft) {
        return;
      }

      const {
        isSubmitted: finalIsSubmitted,
        uploadedSpecimens: finalSpecimens,
      } = cleanupData.current;

      if (!finalIsSubmitted && finalSpecimens.length > 0) {
        finalSpecimens.forEach((specimen) => {
          const specimenId = specimen.id ?? specimen.specimen_id;
          if (specimenId) {
            fetch(`${API_BASE_URL}/analysis/cleanup/${specimenId}`, {
              method: 'DELETE',
              headers: {
                ...authService.getAuthorizationHeader(),
              },
              keepalive: true,
            }).catch((err) => console.error('Cleanup error:', err));
          }
        });
      }
    };
  }, [API_BASE_URL, draftStorageKey]);

  const deleteRoi = (indexToRemove) => {
    const current = rois[activeImgIdx] || [];
    const updated = current.filter((_, i) => i !== indexToRemove);
    setRois({ ...rois, [activeImgIdx]: updated });
    setHoveredRoiIndex(null);
  };

  const currentRois = rois[activeImgIdx] || [];
  const doneRois = Object.values(rois)
    .flat()
    .filter((roi) => roi?.status === 'done');
  const normalizeGramForSummary = (value) => {
    const v = String(value || '').trim().toLowerCase();
    if (['positif', 'positive', 'gram_positive', 'gram positif', '+'].includes(v)) return 'Positif';
    if (['negatif', 'negative', 'gram_negative', 'gram negatif', '-'].includes(v)) return 'Negatif';
    return String(value || '');
  };
  const positiveCount = doneRois.filter((r) => normalizeGramForSummary(r.aiGram) === 'Positif').length;
  const negativeCount = doneRois.filter((r) => normalizeGramForSummary(r.aiGram) === 'Negatif').length;
  const totalDoneCount = doneRois.length;
  const totalRois = images.reduce((sum, _, idx) => sum + ((rois[idx] || []).length), 0);
  const imagesWithoutRoiCount = images.reduce((sum, _, idx) => sum + (((rois[idx] || []).length === 0 ? 1 : 0)), 0);
  const canStartClassification = images.length > 0 && totalRois > 0 && imagesWithoutRoiCount === 0;



  // --- LOGIKA STEPPER OPERASIONAL (UPDATE) ---
  let currentStep = 1;
  if (images.length === 0) {
    currentStep = 1; // Upload Spesimen
  } else if (status !== 'done') {
    currentStep = 2; // Analisis AI
  } else {
    currentStep = 3; // Review & Kirim
  }

  const steps = [
    { num: 1, label: 'Upload Sampel' },
    { num: 2, label: 'Analisis Gram' },
    { num: 3, label: 'Review & Kirim' }
  ];

  if (isPatientLoading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat data pasien...</div>;
  }

  if (!patient) {
    return <div className="min-h-screen flex items-center justify-center">Data pasien tidak ditemukan.</div>;
  }

  return (
    <>
      {toast.open && (
        <div className="fixed top-4 right-4 z-[10000]">
          <div className={`min-w-[280px] max-w-sm px-4 py-3 rounded-xl shadow-lg border text-sm ${toast.type === 'success' ? 'bg-white border-green-200 text-green-700' : 'bg-white border-red-200 text-red-700'}`}>
            <div className="flex items-start gap-2">
              {toast.type === 'success' ? (
                <CheckCircle size={18} className="mt-0.5" />
              ) : (
                <AlertCircle size={18} className="mt-0.5" />
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
      <div className="max-w-7xl mx-auto pb-10 mb-6 min-h-[calc(100vh-100px)] lg:h-[calc(100vh-100px)] flex flex-col bg-slate-50/80 p-2 md:p-4 rounded-2xl relative">
        {(status === 'analyzing' || status === 'auto_detecting') && (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center w-80 text-center animate-in zoom-in-95">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>

              <h3 className="text-lg font-bold text-slate-800">
                {status === 'auto_detecting' ? 'AI YOLO Memindai...' : 'AI CNN Memproses...'}
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                {status === 'auto_detecting'
                  ? 'Mencari dan mendeteksi bakteri secara otomatis. Mohon tunggu.'
                  : `Mengekstrak ${totalRois} gambar dan menjalankan klasifikasi.`}
              </p>

              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-5 overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full bg-blue-600 rounded-full animate-pulse transition-all duration-500 w-full opacity-75"></div>
                <div className="absolute top-0 left-0 h-full w-1/3 bg-white/40 skew-x-[-20deg] animate-[translate-x-full_1.5s_infinite]"></div>
              </div>
            </div>
          </div>
        )}

        {/* HEADER NAVIGASI */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors font-medium text-sm md:text-base"
          >
            <ArrowLeft size={18} className="md:w-5 md:h-5" /> Kembali ke Daftar
          </button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Microscope className="text-blue-600" /> Analisis Spesimen Baru
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Pasien: <span className="font-bold text-slate-700">{patient.nama_lengkap}</span> | ID: <span className="font-mono">{patient.id_pasien}</span> | {patient.jenis_kelamin}
            </p>
          </div>
        </div>

        {/* --- UI STEPPER --- */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-4 hidden md:flex items-center justify-between w-full">
          {steps.map((step, index) => (
            <React.Fragment key={step.num}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${currentStep > step.num
                    ? 'bg-green-500 text-white'
                    : currentStep === step.num
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                  {currentStep > step.num ? <CheckCircle size={18} /> : step.num}
                </div>
                <span className={`text-sm font-semibold ${currentStep >= step.num ? 'text-slate-800' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 rounded-full ${currentStep > step.num ? 'bg-green-500' : 'bg-slate-100'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Mobile Stepper (Versi Ringkas) */}
        <div className="md:hidden bg-white p-3 rounded-xl shadow-sm border border-slate-200 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            {currentStep}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Langkah {currentStep} dari 3</p>
            <p className="text-sm font-bold text-slate-800">{steps[currentStep - 1]?.label}</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 flex-1 pb-10">

          {/* --- ROW 1: DATA PASIEN & SPESIMEN --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* 1. INFO PASIEN */}
            <div className="bg-white p-4 md:p-5 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Info size={14} /> Data Pasien
              </h3>
              <div className="space-y-4">
                <div className="flex flex-col gap-y-3">
                  <div><p className="text-xs text-gray-500 uppercase tracking-tighter">Nama</p><p className="font-bold text-gray-800">{patient.nama_lengkap}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase tracking-tighter">ID Pasien</p><p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit">{patient.id_pasien}</p></div>
                  {patient.nik && (
                    <div><p className="text-xs text-gray-500 uppercase tracking-tighter">NIK</p><p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit">{patient.nik}</p></div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-gray-500 uppercase tracking-tighter">Gender</p><p className="text-sm font-semibold text-gray-700">{patient.jenis_kelamin}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase tracking-tighter">Tgl Lahir</p><p className="text-sm font-semibold text-gray-700">{patient.tanggal_lahir ? new Date(patient.tanggal_lahir).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</p></div>
                  </div>
                  <div><p className="text-xs text-gray-500 uppercase tracking-tighter">No. Telepon</p><p className="text-sm font-semibold text-gray-700">{patient.no_telepon || '-'}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase tracking-tighter">Alamat</p><p className="text-xs text-gray-600 leading-relaxed">{patient.alamat || '-'}</p></div>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-gray-500 uppercase tracking-tighter mb-1">Spesimen Terunggah</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-700">{uploadedSpecimens.length}</span>
                    <span className="text-xs text-slate-400">Berkas gambar citra</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 1b. DATA SPESIMEN & PERMINTAAN */}
            <div className="bg-white p-4 md:p-5 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Microscope size={14} /> Data Spesimen & Permintaan
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">ID Spesimen / Accession Number <span className="text-red-500">*</span></p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={specimenMeta.accession_number}
                      onChange={(e) => setSpecimenMeta((prev) => ({ ...prev, accession_number: e.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 30) }))}
                      placeholder="Contoh: ACC-2026-001"
                      className={`flex-1 text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none ${!specimenMeta.accession_number?.trim() ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                    />
                    <button
                      type="button"
                      onClick={generateAccessionNumber}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Generate
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Jenis Spesimen</p>
                  <input
                    type="text"
                    value={specimenMeta.specimen_type}
                    onChange={(e) => setSpecimenMeta((prev) => ({ ...prev, specimen_type: e.target.value }))}
                    placeholder="Sputum / Urin / Darah / ..."
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Diagnosa Klinis Awal</p>
                  <input
                    type="text"
                    value={specimenMeta.clinical_diagnosis}
                    onChange={(e) => setSpecimenMeta((prev) => ({ ...prev, clinical_diagnosis: e.target.value }))}
                    placeholder="Contoh: Pneumonia"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Catatan Analis</p>
                  <textarea
                    rows={3}
                    value={specimenMeta.analyst_note}
                    onChange={(e) => setSpecimenMeta((prev) => ({ ...prev, analyst_note: e.target.value }))}
                    placeholder="Catatan kualitas pewarnaan / observasi"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* --- ROW 2: PREVIEW BOX & PANEL KONTROL --- */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0">

            {/* --- AREA GAMBAR & EDITOR (PREVIEW BOX) --- */}
            <div className={`min-h-[50vh] lg:min-h-0 flex-1 flex flex-col rounded-2xl overflow-hidden shadow-xl shadow-slate-400/40 relative group select-none ${images.length ? 'bg-gray-900' : 'bg-white'}`}>

              {images.length > 0 ? (
                <>
                  {/* Toolbar Atas (Zoom & Reset) */}
                  <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 md:gap-2 bg-gray-800/90 backdrop-blur-md p-1 md:p-1.5 rounded-lg border border-gray-700 shadow-xl w-max max-w-[calc(100%-1rem)] overflow-x-auto scrollbar-hide pointer-events-auto">
                    <button onClick={(e) => { e.stopPropagation(); handleZoom(-0.2); }} className="p-1 md:p-2 text-white hover:bg-gray-700 rounded active:bg-gray-600" title="Zoom Out"><ZoomOut size={16} className="md:w-[18px] md:h-[18px]" /></button>
                    <span className="text-[10px] md:text-xs font-mono text-gray-300 w-8 md:w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={(e) => { e.stopPropagation(); handleZoom(0.2); }} className="p-1 md:p-2 text-white hover:bg-gray-700 rounded active:bg-gray-600" title="Zoom In"><ZoomIn size={16} className="md:w-[18px] md:h-[18px]" /></button>
                    <div className="w-px h-3 md:h-4 bg-gray-600 mx-0.5 md:mx-1"></div>
                    <button onClick={(e) => { e.stopPropagation(); resetView(); }} className="px-2 py-1 md:px-3 md:py-2 text-white text-[10px] md:text-xs font-semibold hover:bg-gray-700 rounded active:bg-gray-600" title="Reset View">Reset</button>
                    <div className="w-px h-3 md:h-4 bg-gray-600 mx-0.5 md:mx-1"></div>
                    <button onClick={(e) => { e.stopPropagation(); setShowFullPreview(true); }} className="p-1 md:p-2 text-white hover:bg-gray-700 rounded active:bg-gray-600" title="Full Preview">
                      <Maximize2 size={16} className="md:w-[18px] md:h-[18px]" />
                    </button>
                  </div>

                  {/* VIEWPORT UTAMA */}
                  <div
                    ref={imgContainerRef}
                    className={`relative flex-1 overflow-hidden bg-black w-full h-full ${mode !== 'view' ? 'touch-none' : ''} ${mode === 'drag'
                        ? (isInteracting ? 'cursor-grabbing' : 'cursor-grab')
                        : mode === 'remove'
                          ? 'cursor-not-allowed'
                          : mode === 'manual_crop'
                            ? 'cursor-crosshair'
                            : 'cursor-default'
                      }`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                  >
                    {/* Navigasi Gambar (Preview Box) */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrevImg();
                          }}
                          className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-30 p-2 md:p-2.5 bg-black/45 border border-white/20 text-white/80 hover:text-white hover:bg-black/65 rounded-full transition-all pointer-events-auto"
                          title="Gambar Sebelumnya"
                        >
                          <ArrowLeft size={18} className="md:w-5 md:h-5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNextImg();
                          }}
                          className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-30 p-2 md:p-2.5 bg-black/45 border border-white/20 text-white/80 hover:text-white hover:bg-black/65 rounded-full transition-all pointer-events-auto"
                          title="Gambar Berikutnya"
                        >
                          <ArrowRight size={18} className="md:w-5 md:h-5" />
                        </button>
                      </>
                    )}

                    {/* TRANSFORM LAYER */}
                    <div
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: '0 0',
                        transition: isInteracting ? 'none' : 'transform 0.1s ease-out'
                      }}
                      className="inline-block relative"
                    >
                      <NgrokImage
                        ref={imageElementRef}
                        src={images[activeImgIdx]?.previewUrl}
                        alt="Sample"
                        className="max-w-none block pointer-events-none"
                        style={{ maxHeight: '80vh' }}
                        onDragStart={(e) => e.preventDefault()}
                        onLoad={() => {
                          centerImageFor(imgContainerRef, imageElementRef, false);
                          updateImageMeta(activeImgIdx, imageElementRef.current);
                        }}
                      />

                      {/* --- ROI RENDER LAYER --- */}
                      {currentRois.map((box, idx) => {
                        const isDone = box.status === 'done';
                        const gramLabel = box.aiGram || box.classification_gram || '';
                        const isPositive = gramLabel === 'Positif';
                        const isNegative = gramLabel === 'Negatif';

                        let borderColor = 'border-blue-400';
                        if (isDone) {
                          borderColor = isPositive ? 'border-purple-500' : isNegative ? 'border-pink-500' : 'border-green-400';
                        } else if (mode === 'remove') {
                          borderColor = 'border-red-500';
                        } else if (box.label === 'Auto') {
                          borderColor = 'border-green-400';
                        }

                        return (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredRoiIndex(idx)}
                          onMouseLeave={() => setHoveredRoiIndex(null)}
                          onClick={(e) => {
                            if (mode === 'remove') {
                              e.stopPropagation();
                              deleteRoi(idx);
                            }
                          }}
                          className={`absolute border-2 transition-colors ${borderColor}`}
                          style={{
                            left: box.x,
                            top: box.y,
                            width: box.width ?? box.w,
                            height: box.height ?? box.h,
                            pointerEvents: 'auto'
                          }}
                        >
                          {isDone && gramLabel && (
                            <span className={`absolute top-0 left-0 -translate-y-full px-1.5 py-0.5 text-[9px] font-bold text-white rounded-t whitespace-nowrap ${
                              isPositive ? 'bg-purple-600' : isNegative ? 'bg-pink-600' : 'bg-gray-600'
                            }`}>
                              G{isPositive ? '+' : '-'} {(box.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        );
                      })}

                      {isInteracting && mode === 'manual_crop' && currentBox && (
                        <div
                          className="absolute border-2 border-yellow-400 bg-yellow-400/20 z-50"
                          style={{
                            left: currentBox.x,
                            top: currentBox.y,
                            width: currentBox.w,
                            height: currentBox.h
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Tips Shortcut */}
                  <div className="hidden lg:block absolute bottom-4 right-4 z-30 bg-black/60 text-white px-3 py-2 rounded-lg text-[10px] backdrop-blur-sm pointer-events-none space-y-1">
                    <p><span className="font-bold text-yellow-400">B</span> : Box Mode</p>
                    <p><span className="font-bold text-yellow-400">D</span> : Drag Mode</p>
                    <p><span className="font-bold text-red-400">R</span> : Remove Mode {mode === 'remove' && '(ON)'}</p>
                  </div>

                  {/* Mode Indicator */}
                  <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 z-30 w-full max-w-[calc(100%-1rem)] overflow-x-auto scrollbar-hide pointer-events-auto">
                    <div className="flex gap-1.5 md:gap-2 w-max">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMode(prev => prev === 'drag' ? 'view' : 'drag');
                        }}
                        className={`px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-xs font-bold backdrop-blur-md shadow-sm flex items-center gap-1.5 md:gap-2 transition-all ${mode === 'drag' ? 'bg-white text-gray-900' : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                          }`}
                      >
                        <Hand size={12} className="md:w-[14px] md:h-[14px]" /> Geser <span className="hidden md:inline">(D)</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (mode === 'auto_detect') clearRois();
                          setMode(prev => prev === 'manual_crop' ? 'view' : 'manual_crop');
                        }}
                        className={`px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-xs font-bold backdrop-blur-md shadow-sm flex items-center gap-1.5 md:gap-2 transition-all ${mode === 'manual_crop' ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                          }`}
                      >
                        <Crop size={12} className="md:w-[14px] md:h-[14px]" /> Crop ROI <span className="hidden md:inline">(B)</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMode(prev => prev === 'remove' ? 'view' : 'remove'); }}
                        className={`px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-xs font-bold backdrop-blur-md shadow-sm flex items-center gap-1.5 md:gap-2 transition-all ${mode === 'remove' ? 'bg-red-600 text-white' : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                          }`}
                      >
                        <Trash size={12} className="md:w-[14px] md:h-[14px]" /> Hapus <span className="hidden md:inline">(R)</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-10">
                  <div className="bg-white p-10 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 transition-colors shadow-md shadow-slate-300/40 text-center max-w-lg w-full mx-auto">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-full mb-4 inline-flex">
                      <Upload size={32} />
                    </div>
                    <h3 className="text-gray-800 font-bold text-lg mb-2">Upload Citra Mikroskop</h3>
                    <p className="text-gray-500 text-sm mb-6">Dukung multi-upload (JPG, PNG)</p>
                    <label className={`cursor-pointer text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg inline-flex items-center gap-2 ${isUploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                      }`}>
                      <Upload size={18} /> {isUploading ? 'Mengunggah...' : 'Pilih Gambar'}
                      <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* --- PANEL KONTROL (KANAN) --- */}
            <div className="w-full lg:w-[380px] flex flex-col gap-6">

              {/* 2. THUMBNAIL SELECTOR */}
              {images.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sampel ({images.length})</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {images.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => { setActiveImgIdx(idx); resetView(); setMode('drag'); }}
                        className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer flex-shrink-0 transition-all ${activeImgIdx === idx ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors border border-white/20 shadow-sm"
                          title="Hapus sampel"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                        <NgrokImage src={item.previewUrl} className="w-full h-full object-cover" alt="Thumb" />
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0">
                      <Upload size={20} />
                      <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                    </label>
                  </div>
                </div>
              )}

              {/* 3. PANEL PROSES (DETEKSI & KLASIFIKASI) */}
              <div className="bg-white p-4 md:p-5 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 flex-1 flex flex-col">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Microscope size={14} /> Deteksi & Klasifikasi
                </h3>

                {!images.length ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500 text-sm italic text-center px-4">
                    Silahkan upload gambar sampel terlebih dahulu.
                  </div>
                ) : status === 'done' ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center mb-4">
                      <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
                      <p className="font-bold text-green-800">Analisis Selesai</p>
                      <p className="text-xs text-green-600">{totalDoneCount} objek terdeteksi — lihat kotak berwarna di gambar</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <span className="block text-[10px] text-purple-500 font-bold">GRAM POSITIF (G+)</span>
                        <span className="text-xl font-bold text-purple-700">{positiveCount}</span>
                      </div>
                      <div className="bg-pink-50 p-3 rounded-lg text-center">
                        <span className="block text-[10px] text-pink-500 font-bold">GRAM NEGATIF (G-)</span>
                        <span className="text-xl font-bold text-pink-700">{negativeCount}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 text-center mb-4">
                      Total: {totalDoneCount} bakteri | {images.length} spesimen
                    </p>
                    <p className="text-xs text-slate-500 text-center mb-4">Total hasil: {totalDoneCount}</p>

                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          localStorage.removeItem(draftStorageKey);
                          navigate('/analyst/history');
                        }}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <ArrowLeft size={18} /> Selesai & Kembali ke Riwayat
                      </button>
                      <button onClick={handleReset} className="w-full py-2.5 border border-gray-200 text-slate-600 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors">
                        <RefreshCw size={16} className="inline mr-1" /> Analisis Ulang (Reset)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleAutoDetect}
                        disabled={status === 'auto_detecting' || status === 'analyzing'}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${mode === 'auto_detect' ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:border-green-400'
                          } ${(status === 'auto_detecting' || status === 'analyzing') ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Scan size={18} className="text-green-600" />
                          <span className="text-xs font-bold text-slate-700">Auto Crop</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">AI mendeteksi area otomatis</p>
                      </button>

                      <button
                        onClick={clearRois}
                        disabled={currentRois.length === 0}
                        className="p-3 rounded-xl border-2 border-red-100 hover:border-red-400 hover:bg-red-50 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Trash size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-red-700">Reset Seleksi</span>
                        </div>
                        <p className="text-[10px] text-red-400 leading-tight">Hapus seluruh seleksi saat ini</p>
                      </button>
                    </div>

                    <button
                      onClick={handleStartClassification}
                      disabled={!canStartClassification || status === 'analyzing' || status === 'auto_detecting'}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${!canStartClassification
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                        }`}
                    >
                      {status === 'analyzing' || status === 'auto_detecting' ? (
                        <span className="flex items-center gap-2 animate-pulse">
                          <Activity size={16} className="animate-spin" /> {status === 'auto_detecting' ? 'Memproses YOLO...' : 'Memproses CNN...'}
                        </span>
                      ) : (
                        <>
                          <Play size={16} fill="currentColor" />
                          Mulai Klasifikasi {totalRois > 0 ? `(${totalRois} Area / ${images.length} Sampel)` : ''}
                        </>
                      )}
                    </button>
                    {!canStartClassification && images.length > 0 && (
                      <p className="text-xs text-amber-600 text-center">
                        Semua sampel harus memiliki minimal 1 bounding box sebelum klasifikasi batch.
                      </p>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL FULL PREVIEW (INTERACTIVE) --- */}
      {showFullPreview && images.length > 0 && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col animate-in fade-in duration-200">
          {/* Header Modal */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full pointer-events-auto">
              <span className="text-white font-medium text-sm">
                Editor Mode: {activeImgIdx + 1} / {images.length}
              </span>
            </div>
            <button
              onClick={() => { setShowFullPreview(false); resetView(); }}
              className="p-2 bg-white/10 hover:bg-red-500/80 text-white rounded-full transition-colors pointer-events-auto"
            >
              <X size={24} />
            </button>
          </div>

          {/* TOOLBAR INTERNAL MODAL */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 pointer-events-auto">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-gray-800/90 backdrop-blur-md p-1.5 rounded-lg border border-gray-700">
              <button onClick={(e) => { e.stopPropagation(); handleZoom(-0.2); }} className="p-2 text-white hover:bg-gray-700 rounded active:bg-gray-600"><ZoomOut size={18} /></button>
              <span className="text-xs font-mono text-gray-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={(e) => { e.stopPropagation(); handleZoom(0.2); }} className="p-2 text-white hover:bg-gray-700 rounded active:bg-gray-600"><ZoomIn size={18} /></button>
            </div>

            {/* Mode Controls */}
            <div className="flex items-center gap-1 bg-gray-800/90 backdrop-blur-md p-1.5 rounded-lg border border-gray-700">
              <button
                onClick={(e) => { e.stopPropagation(); setMode('drag'); }}
                className={`p-2 rounded ${mode === 'drag' ? 'bg-white text-black' : 'text-white hover:bg-gray-700'}`}
                title="Drag (D)"
              >
                <Hand size={18} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMode('manual_crop'); }}
                className={`p-2 rounded ${mode === 'manual_crop' ? 'bg-blue-600 text-white' : 'text-white hover:bg-gray-700'}`}
                title="Crop (B)"
              >
                <Crop size={18} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMode(prev => prev === 'remove' ? 'view' : 'remove'); }}
                className={`p-2 rounded ${mode === 'remove' ? 'bg-red-600 text-white' : 'text-white hover:bg-gray-700'}`}
                title="Remove (R)"
              >
                <Trash size={18} />
              </button>
            </div>
          </div>

          {/* CANVAS AREA MODAL */}
          <div className="flex-1 relative overflow-hidden flex">

            {/* Navigasi Kiri */}
            <button
              onClick={(e) => { e.stopPropagation(); handlePrevImg(); }}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-50 p-2 md:p-3 bg-black/45 border border-white/20 text-white/80 hover:text-white hover:bg-black/65 rounded-full transition-all pointer-events-auto"
            >
              <ArrowLeft size={24} className="md:w-[32px] md:h-[32px]" />
            </button>

            {/* Container Interaktif (Sama seperti Main View) */}
            <div
              ref={modalImgRef}
              className="relative w-full h-full overflow-hidden bg-black"
              style={{
                cursor: mode === 'remove' ? 'not-allowed' : mode === 'drag' ? (isInteracting ? 'grabbing' : 'grab') : mode === 'manual_crop' ? 'crosshair' : 'default'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Transform Layer */}
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  transition: isInteracting ? 'none' : 'transform 0.1s ease-out'
                }}
                className="relative inline-block"
              >
                <NgrokImage
                  ref={modalImageRef}
                  src={images[activeImgIdx]?.previewUrl}
                  alt="Full Preview"
                  className="max-w-none pointer-events-none"
                  style={{ maxHeight: '80vh' }}
                  onDragStart={(e) => e.preventDefault()}
                  onLoad={() => {
                    centerImageFor(modalImgRef, modalImageRef, true);
                  }}
                />

                {/* Render ROIs di Modal */}
                {currentRois.map((box, idx) => (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredRoiIndex(idx)}
                    onMouseLeave={() => setHoveredRoiIndex(null)}
                    onClick={(e) => {
                      if (mode === 'remove') {
                        e.stopPropagation();
                        deleteRoi(idx);
                      }
                    }}
                    className={`absolute border-2 ${mode === 'remove'
                        ? 'cursor-pointer hover:bg-red-500/40 border-red-500'
                        : hoveredRoiIndex === idx
                          ? 'border-red-500 bg-red-500/20'
                          : box.label === 'Auto'
                            ? 'border-green-400'
                            : 'border-blue-400'
                      }`}
                    style={{
                      left: box.x,
                      top: box.y,
                      width: box.width ?? box.w,
                      height: box.height ?? box.h,
                      pointerEvents: 'auto'
                    }}
                  />
                ))}

                {/* Drawing Box */}
                {isInteracting && mode === 'manual_crop' && currentBox && (
                  <div
                    className="absolute border-2 border-yellow-400 bg-yellow-400/20 z-50"
                    style={{
                      left: currentBox.x, top: currentBox.y, width: currentBox.w, height: currentBox.h
                    }}
                  />
                )}
              </div>
            </div>

            {/* Navigasi Kanan */}
            <button
              onClick={(e) => { e.stopPropagation(); handleNextImg(); }}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-50 p-2 md:p-3 bg-black/45 border border-white/20 text-white/80 hover:text-white hover:bg-black/65 rounded-full transition-all pointer-events-auto"
            >
              <ArrowRight size={24} className="md:w-[32px] md:h-[32px]" />
            </button>

            {/* Shortcuts Hint di Modal - Adaptive Text */}
            <div className="absolute bottom-16 md:bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-[10px] bg-black/40 px-3 py-1 rounded-full pointer-events-none whitespace-nowrap">
              <span className="md:hidden">Pinch: Zoom • Sentuh & Geser: Navigasi</span>
              <span className="hidden md:inline">Scroll: Zoom • Drag: Geser • Panah: Navigasi</span>
            </div>

            {/* Keyboard Shortcuts Hint di Modal (Pojok Kanan Bawah) */}
            <div className="hidden lg:block absolute bottom-8 right-8 z-50 bg-black/60 text-white px-4 py-3 rounded-xl text-[10px] backdrop-blur-md pointer-events-none space-y-1.5 border border-white/10">
              <p className="flex items-center justify-between gap-4">
                <span className="font-bold text-blue-400">D</span>
                <span className="opacity-80">Geser (Drag)</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="font-bold text-yellow-400">B</span>
                <span className="opacity-80">Potong (Box)</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span className="font-bold text-red-400">R</span>
                <span className="opacity-80">Hapus (Remove)</span>
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

    </>
  );
};

export default AnalysisProcess;