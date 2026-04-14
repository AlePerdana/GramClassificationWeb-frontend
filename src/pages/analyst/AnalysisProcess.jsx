import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Upload, X, Play, Save, ArrowLeft, ArrowRight, Microscope, 
  CheckCircle, Activity, Maximize2, AlertTriangle, 
  Info, ZoomIn, ZoomOut, Move, Crop, Scan, Trash,
  Hand, MousePointer2
} from 'lucide-react';

const AnalysisProcess = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:8000/api';

  // --- STATE ---
  const [patient, setPatient] = useState(null);
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
  const [mode, setMode] = useState('view'); // 'view', 'drag', 'manual_crop', 'auto_detect'
  const [rois, setRois] = useState({}); 
  const [status, setStatus] = useState('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [, setResult] = useState(null);
  const [imageMeta, setImageMeta] = useState({});

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

  // --- SHORTCUTS KEYBOARD ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Abaikan jika sedang mengetik di input (jika ada)
      if (e.target.tagName === 'INPUT') return;

      switch(e.key.toLowerCase()) {
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

  useEffect(() => {
    const fetchPatientData = async () => {
      setIsPatientLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/patients`);
        if (response.ok) {
          const data = await response.json();
          const numericId = Number(id);
          const currentPatient = (Array.isArray(data) ? data : []).find((p) => {
            const pid = Number(p.id ?? p.id_pasien);
            return Number.isNaN(numericId) ? String(p.id ?? p.id_pasien) === String(id) : pid === numericId;
          });
          setPatient(currentPatient || null);
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

    fetchPatientData();
  }, [API_BASE_URL, id]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validasi format file
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const invalidFiles = files.filter((file) => !validTypes.includes(file.type));

    if (invalidFiles.length > 0) {
      alert('Format file tidak valid! Harap hanya unggah gambar berformat JPG atau PNG.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    try {
      const uploadedImageItems = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('patient_id', id);
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/analyst/upload-specimen`, {
          method: 'POST',
          body: formData,
        });

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
        });

        if (specimenId) {
          setUploadedSpecimens((prev) => {
            if (prev.find((s) => (s.id ?? s.specimen_id) === specimenId)) return prev;
            return [...prev, { id: specimenId }];
          });
        }
      }

      if (uploadedImageItems.length === 0) {
        alert('Tidak ada gambar yang berhasil diunggah ke server.');
        return;
      }

      setImages((prev) => [...prev, ...uploadedImageItems]);
      setStatus('idle');
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setMode('drag');
      setIsSubmitted(false);
    } catch (error) {
      console.error('Error upload specimen awal:', error);
      alert('Gagal mengunggah gambar ke server.');
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
      if (mode === 'drag') {
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
  }, [mode, showFullPreview, handleZoom]);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setMode('view');
  };

  const centerImageFor = (containerRef, imageRef) => {
    const imgEl = imageRef.current;
    const contEl = containerRef.current;
    if (!imgEl || !contEl) return;
    const imgRect = imgEl.getBoundingClientRect();
    const contRect = contEl.getBoundingClientRect();
    setPan({
      x: (contRect.width - imgRect.width) / 2,
      y: (contRect.height - imgRect.height) / 2,
    });
  };

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
        preventDefault: () => {},
      });
    }
  };

  const handleTouchMove = (e) => {
    if (isInteracting && e.touches.length === 1) {
      const touch = e.touches[0];
      handleMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {},
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
      alert('Harap unggah gambar terlebih dahulu!');
      return;
    }

    const activeImage = images[activeImgIdx];
    const specimenId = activeImage?.specimenId;
    if (!specimenId) {
      alert('Specimen ID untuk gambar aktif tidak ditemukan. Silakan upload ulang.');
      return;
    }

    setMode('auto_detect');
    setStatus('auto_detecting');

    try {
      const response = await fetch(`${API_BASE_URL}/analyst/detect/${specimenId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('YOLO Error Payload:', errData);
        alert('Gagal memproses gambar otomatis. Pastikan AI backend menyala.');
        return;
      }

      const data = await response.json();
      const results = Array.isArray(data?.results)
        ? data.results
        : (Array.isArray(data?.detections) ? data.detections : []);

      if (results.length === 0) {
        alert('YOLO tidak menemukan objek pada gambar ini.');
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
      alert('Terjadi kesalahan jaringan saat menghubungi server AI.');
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
      alert('Harap unggah gambar terlebih dahulu.');
      return;
    }

    const imagesWithoutRoi = images
      .map((_, idx) => ({ idx, count: (rois[idx] || []).length }))
      .filter((x) => x.count === 0);

    if (imagesWithoutRoi.length > 0) {
      alert(`Masih ada ${imagesWithoutRoi.length} gambar tanpa Bounding Box. Lengkapi semua gambar sebelum klasifikasi.`);
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

        const classifyResponse = await fetch(`${API_BASE_URL}/analyst/classify/${specimenId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rois: finalRoisInNaturalPixels }),
        });

        if (!classifyResponse.ok) {
          const err = await classifyResponse.json().catch(() => ({}));
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
            aiGram: ai.classification_gram ?? ai.aiGram,
            aiShape: ai.classification_shape ?? ai.aiShape ?? 'Kokus',
            confidence: ai.classification_confidence ?? ai.confidence,
            cropUrl: ai.image_file_name ?? ai.crop_url ?? roi.cropUrl,
          };
        });
      }

      setRois(nextRoisState);

      const gramPositive = aggregatedResults.filter((r) => normalizeGramLabel(r.classification_gram ?? r.aiGram) === 'Positif').length;
      const gramNegative = aggregatedResults.filter((r) => normalizeGramLabel(r.classification_gram ?? r.aiGram) === 'Negatif').length;

      setResult({
        gramPositive,
        gramNegative,
        confidence: aggregatedResults.length
          ? Math.round((aggregatedResults.reduce((sum, r) => sum + Number(r.classification_confidence ?? r.confidence ?? 0), 0) / aggregatedResults.length) * 100) / 100
          : 0,
        details: [
          { type: 'Kokus (Gram +)', count: gramPositive },
          { type: 'Kokus (Gram -)', count: gramNegative },
        ]
      });

      setIsSubmitted(true);
      setStatus('done');
      setMode('view');
    } catch (error) {
      console.error('Gagal klasifikasi:', error);
      setStatus('idle');
      alert('Terjadi kesalahan saat memproses gambar.');
    }
  };

  // --- FUNGSI MENGHAPUS GAMBAR DI BACKEND ---
  const deleteOrphanedSpecimen = async (specimenId) => {
    try {
      await fetch(`${API_BASE_URL}/analysis/cleanup/${specimenId}`, {
        method: 'DELETE',
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

    navigate(-1);
  };

  const handleRemoveImage = async (indexToRemove) => {
    const imageToRemove = images[indexToRemove];
    const specimenId = imageToRemove?.specimenId;

    if (specimenId) {
      await deleteOrphanedSpecimen(specimenId);
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
              keepalive: true,
            }).catch((err) => console.error('Cleanup error:', err));
          }
        });
      }
    };
  }, []);

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

  const handleSubmitToDoctor = async () => {
    if (isSubmitting || isSubmitted) {
      return;
    }

    if (doneRois.length === 0) {
      alert('Belum ada hasil klasifikasi untuk dikirim.');
      return;
    }

    setIsSubmitting(true);
    setStatus('submitting');
    try {
      setIsSubmitted(true);
      alert('Hasil classify sudah tersimpan dan masuk antrean dokter.');
      setTimeout(() => {
        navigate('/analyst/history');
      }, 500);
    } catch (error) {
      console.error('Submit error:', error);
      alert('Terjadi kesalahan koneksi saat submit.');
    } finally {
      setIsSubmitting(false);
      setStatus('idle');
    }
  };

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
    <div className="max-w-7xl mx-auto pb-10 min-h-[calc(100vh-100px)] lg:h-[calc(100vh-100px)] flex flex-col bg-slate-50/80 p-2 md:p-4 rounded-2xl relative">
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
                : `Mengekstrak ${currentRois.length} gambar dan menjalankan klasifikasi.`}
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                currentStep > step.num
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

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full flex-1">
        
        {/* --- KOLOM KIRI: AREA GAMBAR & EDITOR --- */}
        <div className={`min-h-[50vh] lg:min-h-0 flex-1 flex flex-col rounded-2xl overflow-hidden shadow-xl shadow-slate-400/40 relative group select-none ${images.length ? 'bg-gray-900' : 'bg-white'}`}> 
          
          {images.length > 0 ? (
            <>
              {/* Toolbar Atas (Zoom & Reset) */}
              <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 md:gap-2 bg-gray-800/90 backdrop-blur-md p-1 md:p-1.5 rounded-lg border border-gray-700 shadow-xl w-max max-w-[calc(100%-1rem)] overflow-x-auto scrollbar-hide pointer-events-auto">
                <button onClick={(e) => { e.stopPropagation(); handleZoom(-0.2); }} className="p-1 md:p-2 text-white hover:bg-gray-700 rounded active:bg-gray-600" title="Zoom Out"><ZoomOut size={16} className="md:w-[18px] md:h-[18px]"/></button>
                <span className="text-[10px] md:text-xs font-mono text-gray-300 w-8 md:w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={(e) => { e.stopPropagation(); handleZoom(0.2); }} className="p-1 md:p-2 text-white hover:bg-gray-700 rounded active:bg-gray-600" title="Zoom In"><ZoomIn size={16} className="md:w-[18px] md:h-[18px]"/></button>
                <div className="w-px h-3 md:h-4 bg-gray-600 mx-0.5 md:mx-1"></div>
                <button onClick={(e) => { e.stopPropagation(); resetView(); }} className="px-2 py-1 md:px-3 md:py-2 text-white text-[10px] md:text-xs font-semibold hover:bg-gray-700 rounded active:bg-gray-600" title="Reset View">Reset</button>
                <div className="w-px h-3 md:h-4 bg-gray-600 mx-0.5 md:mx-1"></div>
                <button onClick={(e) => { e.stopPropagation(); setShowFullPreview(true); }} className="p-1 md:p-2 text-white hover:bg-gray-700 rounded active:bg-gray-600" title="Full Preview">
                  <Maximize2 size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
              </div>

              {/* VIEWPORT UTAMA */}
              {/* Wrapper ini menangkap event mouse */}
              <div 
                ref={imgContainerRef}
                className={`relative flex-1 overflow-hidden bg-black w-full h-full ${mode !== 'view' ? 'touch-none' : ''} ${
                  mode === 'drag'
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
                onMouseLeave={handleMouseUp} // Stop dragging/drawing jika keluar area
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

                {/* TRANSFORM LAYER: Ini yang bergerak saat dipan/zoom */}
                <div 
                  style={{ 
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0', // Penting agar koordinat konsisten
                    transition: isInteracting ? 'none' : 'transform 0.1s ease-out' // Smooth zoom, instant drag
                  }}
                  className="inline-block relative" // Bungkus konten agar size pas dengan gambar
                >
                  <img 
                    ref={imageElementRef}
                    src={images[activeImgIdx]?.previewUrl} 
                    crossOrigin="anonymous"
                    alt="Sample" 
                    className="max-w-none block pointer-events-none" // pointer-events-none agar gambar tidak di-drag browser
                    style={{ maxHeight: '80vh' }} // Batas tinggi awal
                    onDragStart={(e) => e.preventDefault()}
                    onLoad={() => {
                      centerImageFor(imgContainerRef, imageElementRef);
                      updateImageMeta(activeImgIdx, imageElementRef.current);
                    }}
                  />
                  
                  {/* --- ROI RENDER LAYER (Inside Transform) --- */}
                  
                  {/* 1. Existing ROIs */}
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
                      className={`absolute border-2 ${
                        mode === 'remove'
                          ? 'cursor-pointer hover:bg-red-500/40 border-red-500'
                          : hoveredRoiIndex === idx
                            ? 'border-red-500 bg-red-500/20'
                            : box.label === 'Auto'
                              ? 'border-green-400'
                              : 'border-blue-400'
                      } transition-colors`}
                      style={{
                        left: box.x, 
                        top: box.y, 
                        width: box.width ?? box.w, 
                        height: box.height ?? box.h,
                        pointerEvents: 'auto'
                      }}
                    />
                  ))}

                  {/* 2. Drawing Box (Sedang digambar) */}
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

              {/* Tips Shortcut (Pojok Kanan Bawah) */}
              <div className="hidden lg:block absolute bottom-4 right-4 z-30 bg-black/60 text-white px-3 py-2 rounded-lg text-[10px] backdrop-blur-sm pointer-events-none space-y-1">
                <p><span className="font-bold text-yellow-400">B</span> : Box Mode</p>
                <p><span className="font-bold text-yellow-400">D</span> : Drag Mode</p>
                <p><span className="font-bold text-red-400">R</span> : Remove Mode {mode === 'remove' && '(ON)'}</p>
              </div>

              {/* Mode Indicator (Pojok Kiri Bawah) */}
              <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 z-30 w-full max-w-[calc(100%-1rem)] overflow-x-auto scrollbar-hide pointer-events-auto">
                <div className="flex gap-1.5 md:gap-2 w-max">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setMode(prev => prev === 'drag' ? 'view' : 'drag');
                    }}
                    className={`px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-xs font-bold backdrop-blur-md shadow-sm flex items-center gap-1.5 md:gap-2 transition-all ${
                      mode === 'drag' ? 'bg-white text-gray-900' : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
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
                    className={`px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-xs font-bold backdrop-blur-md shadow-sm flex items-center gap-1.5 md:gap-2 transition-all ${
                      mode === 'manual_crop' ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Crop size={12} className="md:w-[14px] md:h-[14px]" /> Crop ROI <span className="hidden md:inline">(B)</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setMode(prev => prev === 'remove' ? 'view' : 'remove'); }}
                    className={`px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-xs font-bold backdrop-blur-md shadow-sm flex items-center gap-1.5 md:gap-2 transition-all ${
                      mode === 'remove' ? 'bg-red-600 text-white' : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Trash size={12} className="md:w-[14px] md:h-[14px]" /> Hapus <span className="hidden md:inline">(R)</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            // State Kosong (Upload)
            <div className="flex-1 flex flex-col items-center justify-center p-10">
              <div className="bg-white p-10 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 transition-colors shadow-md shadow-slate-300/40 text-center max-w-lg w-full mx-auto">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-full mb-4 inline-flex">
                  <Upload size={32} />
                </div>
                <h3 className="text-gray-800 font-bold text-lg mb-2">Upload Citra Mikroskop</h3>
                <p className="text-gray-500 text-sm mb-6">Dukung multi-upload (JPG, PNG)</p>
                <label className={`cursor-pointer text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg inline-flex items-center gap-2 ${
                  isUploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}>
                  <Upload size={18} /> {isUploading ? 'Mengunggah...' : 'Pilih Gambar'}
                  <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* --- KOLOM KANAN: PANEL KONTROL --- */}
        <div className="w-full lg:w-[380px] flex flex-col gap-6">
          
          {/* 1. INFO PASIEN */}
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Info size={14} /> Data Pasien
            </h3>
            <div className="space-y-3">
              <div><p className="text-xs text-gray-500">Nama</p><p className="font-bold text-gray-800">{patient.nama_lengkap}</p></div>
              <div><p className="text-xs text-gray-500">ID Pasien</p><p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit">{patient.id_pasien}</p></div>
              <div><p className="text-xs text-gray-500">Jenis Kelamin</p><p className="text-sm text-gray-700">{patient.jenis_kelamin}</p></div>
              <div><p className="text-xs text-gray-500">Spesimen Terunggah</p><p className="text-sm font-semibold text-blue-700">{uploadedSpecimens.length}</p></div>
            </div>
          </div>

          {/* 2. THUMBNAIL SELECTOR */}
          {images.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sampel ({images.length})</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => { setActiveImgIdx(idx); resetView(); setMode('drag'); }}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer flex-shrink-0 transition-all ${
                      activeImgIdx === idx ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      className="absolute top-0.5 right-0.5 z-10 w-4 h-4 rounded-full bg-black/70 text-white text-[10px] leading-none flex items-center justify-center hover:bg-red-600"
                      title="Hapus sampel"
                    >
                      ×
                    </button>
                    <img src={item.previewUrl} className="w-full h-full object-cover" alt="Thumb" />
                  </div>
                ))}
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0">
                  <Upload size={20} />
                  <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                </label>
              </div>
            </div>
          )}

          {/* 3. PANEL PROSES */}
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Microscope size={14} /> Deteksi & Klasifikasi
            </h3>

            {!images.length ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm italic text-center px-4">
                Silahkan upload gambar sampel terlebih dahulu.
              </div>
            ) : status === 'done' ? (
              // HASIL AKHIR
              <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center mb-4">
                  <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
                  <p className="font-bold text-green-800">Analisis Selesai</p>
                  <p className="text-xs text-green-600">Hasil siap divalidasi</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <span className="block text-[10px] text-blue-500 font-bold">GRAM +</span>
                    <span className="text-xl font-bold text-blue-700">{positiveCount}</span>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <span className="block text-[10px] text-red-500 font-bold">GRAM -</span>
                    <span className="text-xl font-bold text-red-700">{negativeCount}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center mb-4">Total hasil: {totalDoneCount}</p>

                <div className="space-y-2">
                  <button
                    onClick={handleSubmitToDoctor}
                    disabled={isSubmitting || isSubmitted}
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={18} /> {isSubmitting ? 'Mengirim...' : isSubmitted ? 'Terkirim' : 'Submit ke Dokter'}
                  </button>
                  <button onClick={handleReset} className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-50">
                    Analisis Ulang
                  </button>
                </div>
              </div>
            ) : (
              // KONTROL PROSES
              <div className="space-y-4">
                
                {/* Grup Tombol Tools */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleAutoDetect}
                    disabled={status === 'auto_detecting' || status === 'analyzing'}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      mode === 'auto_detect' ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:border-green-400'
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

                {/* Tombol Eksekusi */}
                <button 
                  onClick={handleStartClassification}
                  disabled={!canStartClassification || status === 'analyzing' || status === 'auto_detecting'}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${
                    !canStartClassification 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  {status === 'analyzing' || status === 'auto_detecting' ? (
                    <span className="flex items-center gap-2 animate-pulse">
                      <Activity size={16} className="animate-spin"/> {status === 'auto_detecting' ? 'Memproses YOLO...' : 'Memproses CNN...'}
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

    {/* --- MODAL FULL PREVIEW (INTERACTIVE) --- */}
    {showFullPreview && images.length > 0 && (
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-200">
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
            <button onClick={(e) => { e.stopPropagation(); handleZoom(-0.2); }} className="p-2 text-white hover:bg-gray-700 rounded active:bg-gray-600"><ZoomOut size={18}/></button>
            <span className="text-xs font-mono text-gray-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={(e) => { e.stopPropagation(); handleZoom(0.2); }} className="p-2 text-white hover:bg-gray-700 rounded active:bg-gray-600"><ZoomIn size={18}/></button>
          </div>
          
          {/* Mode Controls */}
          <div className="flex items-center gap-1 bg-gray-800/90 backdrop-blur-md p-1.5 rounded-lg border border-gray-700">
            <button 
              onClick={(e) => { e.stopPropagation(); setMode('drag'); }}
              className={`p-2 rounded ${mode === 'drag' ? 'bg-white text-black' : 'text-white hover:bg-gray-700'}`} 
              title="Drag (D)"
            >
              <Hand size={18}/>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setMode('manual_crop'); }}
              className={`p-2 rounded ${mode === 'manual_crop' ? 'bg-blue-600 text-white' : 'text-white hover:bg-gray-700'}`} 
              title="Crop (B)"
            >
              <Crop size={18}/>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setMode(prev => prev === 'remove' ? 'view' : 'remove'); }}
              className={`p-2 rounded ${mode === 'remove' ? 'bg-red-600 text-white' : 'text-white hover:bg-gray-700'}`} 
              title="Remove (R)"
            >
              <Trash size={18}/>
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
              <img 
                ref={modalImageRef}
                src={images[activeImgIdx]?.previewUrl} 
                crossOrigin="anonymous"
                alt="Full Preview" 
                className="max-w-none pointer-events-none"
                style={{ maxHeight: '80vh' }}
                onDragStart={(e) => e.preventDefault()}
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
                  className={`absolute border-2 ${
                    mode === 'remove' 
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

          {/* Zoom Controls Modal */}
          <div className="absolute bottom-4 md:bottom-8 right-4 md:left-1/2 md:-translate-x-1/2 flex items-center gap-2 md:gap-4 bg-black/50 backdrop-blur px-3 py-2 md:px-6 md:py-3 rounded-full border border-white/10 pointer-events-auto z-50">
             <button onClick={(e) => { e.stopPropagation(); handleZoom(-0.2); }} className="p-1 hover:text-blue-400 active:text-blue-500 transition-colors"><ZoomOut size={16} className="md:w-5 md:h-5 text-white"/></button>
             <span className="text-white font-mono text-xs md:text-sm min-w-[2.5rem] md:min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
             <button onClick={(e) => { e.stopPropagation(); handleZoom(0.2); }} className="p-1 hover:text-blue-400 active:text-blue-500 transition-colors"><ZoomIn size={16} className="md:w-5 md:h-5 text-white"/></button>
          </div>
        </div>
      </div>
    )}

    </>
  );
};

export default AnalysisProcess;