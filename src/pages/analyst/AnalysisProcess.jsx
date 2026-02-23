import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Upload, X, Play, Save, ArrowLeft, ArrowRight, Microscope, 
  CheckCircle, Activity, Maximize2, AlertTriangle, 
  Info, ZoomIn, ZoomOut, Move, Crop, Scan, Trash,
  Hand, MousePointer2
} from 'lucide-react';

// --- DUMMY DATA PASIEN ---
const patientsDB = {
  1: { id: 1, name: 'Budi Santoso', code: 'SPL-2026-001', nik: '357801220490001', gender: 'Laki-laki', age: 45 },
  4: { id: 4, name: 'Dewi Sartika', code: 'SPL-2026-004', nik: '357801650185004', gender: 'Perempuan', age: 50 },
};

const AnalysisProcess = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const patient = patientsDB[id] || patientsDB[1];

  // --- STATE ---
  const [images, setImages] = useState([]); 
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
  const [result, setResult] = useState(null);

  // Interaction Refs & State
  const imgContainerRef = useRef(null);
  const imgRef = useRef(null);
  const modalImgRef = useRef(null);
  const modalImageRef = useRef(null);
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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newImages = files.map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newImages]);
      setStatus('idle');
      // Reset view saat upload baru
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleZoom = (delta) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 5)); // Min 0.5x, Max 5x
  };

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  };

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
          [activeImgIdx]: [...currentRois, { ...currentBox, label: 'Manual' }]
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

  // Auto Detect Dummy (append, non-destructive)
  const handleAutoDetect = () => {
    setMode('auto_detect');
    // Simulasi loading
    setTimeout(() => {
      const activeImageEl = imgRef.current || modalImageRef.current;
      const imgW = activeImageEl?.naturalWidth || activeImageEl?.width || 1200;
      const imgH = activeImageEl?.naturalHeight || activeImageEl?.height || 800;

      // ROI lebih besar dan tersebar di beberapa area citra
      const roiTemplate = [
        { x: 0.08, y: 0.12, w: 0.18, h: 0.14 },
        { x: 0.34, y: 0.18, w: 0.16, h: 0.12 },
        { x: 0.62, y: 0.10, w: 0.17, h: 0.15 },
        { x: 0.18, y: 0.52, w: 0.20, h: 0.16 },
        { x: 0.55, y: 0.58, w: 0.19, h: 0.14 },
      ];

      const dummyAutoRois = roiTemplate.map((r) => ({
        x: Math.round(imgW * r.x),
        y: Math.round(imgH * r.y),
        w: Math.max(60, Math.round(imgW * r.w)),
        h: Math.max(45, Math.round(imgH * r.h)),
        label: 'Auto'
      }));
      
      setRois(prev => {
        const currentRois = prev[activeImgIdx] || [];
        return { 
          ...prev, 
          [activeImgIdx]: [...currentRois, ...dummyAutoRois] 
        };
      });
    }, 600);
  };

  const handleClassify = () => {
    setStatus('classifying');
    setTimeout(() => {
      setStatus('done');
      setResult({
        gramPositive: 15,
        gramNegative: 8,
        confidence: 96.2,
        details: [
          { type: 'Coccus (Gram +)', count: 10 },
          { type: 'Bacillus (Gram +)', count: 5 },
          { type: 'Bacillus (Gram -)', count: 8 },
        ]
      });
    }, 1500);
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
    centerImageFor(imgContainerRef, imgRef);
  }, [images, activeImgIdx, pan.x, pan.y, zoom]);

  useEffect(() => {
    if (!showFullPreview) return;
    centerImageFor(modalImgRef, modalImageRef);
  }, [showFullPreview, activeImgIdx]);

  const deleteRoi = (indexToRemove) => {
    const current = rois[activeImgIdx] || [];
    const updated = current.filter((_, i) => i !== indexToRemove);
    setRois({ ...rois, [activeImgIdx]: updated });
    setHoveredRoiIndex(null);
  };

  const currentRois = rois[activeImgIdx] || [];

  return (
    <>
    <div className="max-w-7xl mx-auto pb-10 min-h-[calc(100vh-100px)] lg:h-[calc(100vh-100px)] flex flex-col bg-slate-50/80 p-2 md:p-4 rounded-2xl">
      
      {/* HEADER NAVIGASI */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => navigate('/analyst/patients')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors font-medium text-sm md:text-base"
        >
          <ArrowLeft size={18} className="md:w-5 md:h-5" /> Kembali ke Daftar
        </button>
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
                onWheel={handleWheel}
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
                    ref={imgRef}
                    src={images[activeImgIdx]} 
                    alt="Sample" 
                    className="max-w-none block pointer-events-none" // pointer-events-none agar gambar tidak di-drag browser
                    style={{ maxHeight: '80vh' }} // Batas tinggi awal
                    onDragStart={(e) => e.preventDefault()}
                    onLoad={() => centerImageFor(imgContainerRef, imgRef)}
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
                        width: box.w, 
                        height: box.h,
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
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg inline-flex items-center gap-2">
                  <Upload size={18} /> Pilih Gambar
                  <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
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
              <div><p className="text-xs text-gray-500">Nama</p><p className="font-bold text-gray-800">{patient.name}</p></div>
              <div><p className="text-xs text-gray-500">Kode Sampel</p><p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit">{patient.code}</p></div>
            </div>
          </div>

          {/* 2. THUMBNAIL SELECTOR */}
          {images.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sampel ({images.length})</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((src, idx) => (
                  <div 
                    key={idx}
                    onClick={() => { setActiveImgIdx(idx); resetView(); }}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer flex-shrink-0 transition-all ${
                      activeImgIdx === idx ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={src} className="w-full h-full object-cover" alt="Thumb" />
                  </div>
                ))}
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0">
                  <Upload size={20} />
                  <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
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
                    <span className="text-xl font-bold text-blue-700">{result.gramPositive}</span>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <span className="block text-[10px] text-red-500 font-bold">GRAM -</span>
                    <span className="text-xl font-bold text-red-700">{result.gramNegative}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button onClick={() => navigate('/analyst/patients')} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">
                    Simpan & Keluar
                  </button>
                  <button onClick={() => { setStatus('idle'); setResult(null); clearRois(); }} className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-50">
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
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      mode === 'auto_detect' ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:border-green-400'
                    }`}
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
                      <span className="text-xs font-bold text-red-700">Reset Semua</span>
                    </div>
                    <p className="text-[10px] text-red-400 leading-tight">Hapus seluruh seleksi saat ini</p>
                  </button>
                </div>

                {/* Tombol Eksekusi */}
                <button 
                  onClick={handleClassify}
                  disabled={currentRois.length === 0 || status === 'classifying'}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${
                    currentRois.length === 0 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  {status === 'classifying' ? (
                    <span className="flex items-center gap-2 animate-pulse">
                      <Activity size={16} className="animate-spin"/> Memproses CNN...
                    </span>
                  ) : (
                    <>
                      <Play size={16} fill="currentColor" /> 
                      Mulai Klasifikasi {currentRois.length > 0 ? `(${currentRois.length} Area)` : ''}
                    </>
                  )}
                </button>
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
            onWheel={handleWheel}
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
                src={images[activeImgIdx]} 
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
                    left: box.x, top: box.y, width: box.w, height: box.h,
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