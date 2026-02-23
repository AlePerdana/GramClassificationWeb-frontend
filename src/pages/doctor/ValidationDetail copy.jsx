import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, CheckCircle, User, 
  Maximize2, Activity, ZoomIn, ZoomOut, Microscope, X
} from 'lucide-react';

// --- DUMMY DETAIL DATA ---
const validationDetailData = {
  1: {
    id: 1,
    name: 'Budi Santoso',
    code: 'SPL-2026-001',
    analyst: 'Siti Aminah',
    date: '27 Jan 2026, 14:30',
    // Gambar Sampel
    imageSrc: '/gram1.png',
    aiResult: {
      conclusion: 'Gram Positif',
      confidence: 96.2,
      counts: { pos: 15, neg: 2 },
      details: [
        { type: 'Coccus (Gram +)', count: 10 },
        { type: 'Bacillus (Gram +)', count: 5 },
        { type: 'Bacillus (Gram -)', count: 2 },
      ]
    },
    crops: [
      { id: 101, label: 'Auto #1', aiPrediction: 'Gram Positif', confidence: 98.5, img: '/gram1.png' },
      { id: 102, label: 'Manual #1', aiPrediction: 'Gram Positif', confidence: 92.1, img: '/gram2.png' },
      { id: 103, label: 'Auto #2', aiPrediction: 'Gram Negatif', confidence: 89.4, img: '/gram3.png' },
      { id: 104, label: 'Auto #3', aiPrediction: 'Gram Positif', confidence: 65.0, img: '/gram4.png' },
    ]
  }
};

const ValidationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = validationDetailData[1]; // Selalu ambil dummy data 1

  const [decisions, setDecisions] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [mainZoom, setMainZoom] = useState(1);
  const [mainPan, setMainPan] = useState({ x: 0, y: 0 });
  const [modalZoom, setModalZoom] = useState(1);
  const [modalPan, setModalPan] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const mainContainerRef = useRef(null);
  const mainImageRef = useRef(null);
  const modalContainerRef = useRef(null);
  const modalImageRef = useRef(null);

  const computeFitScale = (containerEl, imageEl) => {
    if (!containerEl || !imageEl) return 1;
    const { clientWidth: cw, clientHeight: ch } = containerEl;
    const { naturalWidth: iw, naturalHeight: ih } = imageEl;
    if (!cw || !ch || !iw || !ih) return 1;
    return Math.min(cw / iw, ch / ih);
  };

  const fitMainPreview = () => {
    const scale = computeFitScale(mainContainerRef.current, mainImageRef.current);
    setMainZoom(scale);
    setMainPan({ x: 0, y: 0 });
  };

  const fitModalPreview = () => {
    const scale = computeFitScale(modalContainerRef.current, modalImageRef.current);
    setModalZoom(scale);
    setModalPan({ x: 0, y: 0 });
  };

  const handleDecisionChange = (cropId, value) => {
    setDecisions(prev => ({ ...prev, [cropId]: value }));
  };

  const activeCrop = data.crops[activeIndex] || data.crops[0];
  const previewSrc = activeCrop?.img || data.imageSrc;

  const handlePrevCrop = () => {
    setActiveIndex((prev) => (prev - 1 + data.crops.length) % data.crops.length);
  };

  const handleNextCrop = () => {
    setActiveIndex((prev) => (prev + 1) % data.crops.length);
  };

  useEffect(() => {
    if (showFullPreview) {
      requestAnimationFrame(() => fitModalPreview());
    }
  }, [showFullPreview]);

  const handleZoom = (delta, isModal = false) => {
    const maxZoom = 30; // 3000%
    if (isModal) {
      setModalZoom((prev) => Math.min(Math.max(prev + delta, 0.5), maxZoom));
    } else {
      setMainZoom((prev) => Math.min(Math.max(prev + delta, 0.5), maxZoom));
    }
  };

  const resetView = (isModal = false) => {
    if (isModal) {
      setModalZoom(1);
      setModalPan({ x: 0, y: 0 });
    } else {
      setMainZoom(1);
      setMainPan({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e, isModal = false) => {
    e.preventDefault();
    setIsInteracting(true);
    const currentPan = isModal ? modalPan : mainPan;
    setDragStart({ x: e.clientX - currentPan.x, y: e.clientY - currentPan.y });
  };

  const handleMouseMove = (e, isModal = false) => {
    if (!isInteracting) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    if (isModal) {
      setModalPan({ x: newX, y: newY });
    } else {
      setMainPan({ x: newX, y: newY });
    }
  };

  const handleWheel = (e, isModal = false) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta, isModal);
  };

  const handleMouseUp = () => {
    setIsInteracting(false);
  };

  useEffect(() => {
    if (mainZoom === 1) {
      setMainPan({ x: 0, y: 0 });
    }
  }, [mainZoom]);

  useEffect(() => {
    fitMainPreview();
  }, [previewSrc]);

  const finalStats = useMemo(() => {
    let pos = 0;
    let neg = 0;
    let rejected = 0;

    data.crops.forEach((crop) => {
      const decision = decisions[crop.id] || 'Valid';

      if (decision === 'Reject') {
        rejected += 1;
        return;
      }

      if (decision === 'Gram Positif') {
        pos += 1;
        return;
      }

      if (decision === 'Gram Negatif') {
        neg += 1;
        return;
      }

      // Default mengikuti AI
      if (crop.aiPrediction === 'Gram Positif') pos += 1; else neg += 1;
    });

    return { pos, neg, rejected };
  }, [data.crops, decisions]);

  if (!data) return <div>Data tidak ditemukan.</div>;

  return (
    <div className="max-w-7xl mx-auto pb-10 h-[calc(100vh-100px)] flex flex-col bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={() => navigate('/doctor/validation')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tinjauan Medis</h1>
          <p className="text-gray-500 text-sm">Validasi hasil klasifikasi # {data.code}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        
        {/* --- KOLOM KIRI: VISUAL (Main Preview) --- */}
        <div className="flex-1 flex flex-col bg-gray-900 rounded-2xl overflow-hidden shadow-xl shadow-slate-400/40 relative group select-none">
          {/* FLOATING TOOLBAR (Top Center) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-gray-800/90 backdrop-blur-md p-1.5 rounded-lg border border-gray-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button onClick={() => handleZoom(-1)} className="p-2 text-white hover:bg-gray-700 rounded" title="Zoom Out"><ZoomOut size={16}/></button>
            <span className="text-xs font-mono text-gray-300 w-10 text-center">{Math.round(mainZoom * 100)}%</span>
            <button onClick={() => handleZoom(1)} className="p-2 text-white hover:bg-gray-700 rounded" title="Zoom In"><ZoomIn size={16}/></button>
            <div className="w-px h-4 bg-gray-600 mx-1"></div>
            <button onClick={() => resetView(false)} className="px-2 py-1 text-white text-[10px] font-bold hover:bg-gray-700 rounded">RESET</button>
            <div className="w-px h-4 bg-gray-600 mx-1"></div>
            <button onClick={() => setShowFullPreview(true)} className="p-2 text-white hover:bg-gray-700 rounded" title="Full Preview">
              <Maximize2 size={16} />
            </button>
          </div>

          {/* CANVAS AREA */}
          <div 
            ref={mainContainerRef}
            className="relative flex-1 overflow-hidden bg-black w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => handleMouseDown(e, false)}
            onMouseMove={(e) => handleMouseMove(e, false)}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={(e) => handleWheel(e, false)}
          >
            {/* Transform Layer */}
            <div 
              style={{ 
                transform: `translate(${mainPan.x}px, ${mainPan.y}px) scale(${mainZoom})`,
                transformOrigin: 'center', 
                transition: isInteracting ? 'none' : 'transform 0.1s ease-out'
              }}
              className="relative inline-block"
            >
              <img 
                ref={mainImageRef}
                src={previewSrc} 
                alt="Sample" 
                className="max-w-none block pointer-events-none select-none"
                style={{ maxHeight: '80vh', maxWidth: '100%' }}
                draggable={false}
                onLoad={fitMainPreview}
              />
            </div>
          </div>

          {/* OVERLAY INFO (Bottom Left) */}
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
             <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-white/10 shadow-sm">
                <p className="text-xs font-mono font-bold">{data.code}</p>
                <p className="text-[10px] text-gray-300">{activeCrop?.label || 'Original'}</p>
             </div>
          </div>

          {/* NAVIGASI PREV/NEXT (Side Arrows) */}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
            <button onClick={handlePrevCrop} className="pointer-events-auto p-3 rounded-full bg-black/20 text-white hover:bg-black/60 backdrop-blur-sm transition-all transform hover:scale-110">
              <ArrowLeft size={20} />
            </button>
            <button onClick={handleNextCrop} className="pointer-events-auto p-3 rounded-full bg-black/20 text-white hover:bg-black/60 backdrop-blur-sm transition-all transform hover:scale-110">
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* --- KOLOM KANAN: TABEL VALIDASI ITEM --- */}
        <div className="w-full lg:w-[450px] flex flex-col h-full overflow-hidden relative">
          
          {/* Konten Scrollable */}
          <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin relative">
            
            {/* 1. INFO PASIEN & ANALIS (Tetap di atas, ikut scroll) */}
            <div className="space-y-1 mb-4">
              <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 text-sm font-bold text-gray-700">
                  Informasi Sampel
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400"/>
                      <span className="text-sm font-bold text-gray-700">{data.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">Pasien</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-teal-600"/>
                      <span className="text-sm font-medium text-gray-700">{data.analyst}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400 block">Analis</span>
                      <span className="text-[10px] text-gray-400">{data.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. TABEL VALIDASI DENGAN STICKY HEADER */}
            <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden flex flex-col min-h-[300px] relative">
              <div className="p-4 border-b border-gray-100 bg-gray-50 text-sm font-bold text-gray-700">
                Verifikasi Deteksi AI
              </div>
              
              {/* STICKY SUMMARY HEADER: Menempel saat di-scroll */}
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-4 py-3 border-b border-gray-100 shadow-sm grid grid-cols-3 gap-2 text-center transition-all">
                <div className="bg-blue-50 p-2 rounded border border-blue-100">
                  <span className="block text-[10px] text-blue-600 font-bold uppercase">Positif</span>
                  <span className="text-lg font-extrabold text-blue-700">{finalStats.pos}</span>
                </div>
                <div className="bg-red-50 p-2 rounded border border-red-100">
                  <span className="block text-[10px] text-red-600 font-bold uppercase">Negatif</span>
                  <span className="text-lg font-extrabold text-red-700">{finalStats.neg}</span>
                </div>
                <div className="bg-gray-100 p-2 rounded border border-gray-200">
                  <span className="block text-[10px] text-gray-600 font-bold uppercase">Ditolak</span>
                  <span className="text-lg font-extrabold text-gray-700">{finalStats.rejected}</span>
                </div>
              </div>

              {/* LIST ITEMS */}
              <div className="p-3 space-y-3">
                {data.crops.map((crop, index) => {
                  const currentDecision = decisions[crop.id];
                  // Logika Visual Feedback
                  const isRejected = currentDecision === 'Reject';
                  const isCorrected = currentDecision && currentDecision !== 'Valid' && !isRejected;
                  const isManual = crop.label.toLowerCase().includes('manual');

                  return (
                    <div 
                      key={crop.id} 
                      onClick={() => setActiveIndex(index)}
                      className={`flex gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                        isRejected 
                          ? 'bg-gray-50 border-gray-200 opacity-75' // Gaya Reject
                          : isCorrected 
                            ? 'bg-amber-50 border-amber-200 shadow-sm ring-1 ring-amber-100' // Gaya Koreksi (Highlight)
                            : 'bg-white border-gray-100 hover:border-teal-200' // Gaya Default
                      } ${activeIndex === index ? 'ring-2 ring-teal-300 shadow-md' : ''}`}
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 bg-gray-200 rounded-md overflow-hidden flex-shrink-0 relative">
                        <img src={crop.img} alt="Crop" className={`w-full h-full object-cover ${isRejected ? 'grayscale' : ''}`} />
                        {/* Overlay label kecil di gambar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] px-1 text-center truncate">
                          {crop.label}
                        </div>
                      </div>

                      {/* Kontrol */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-gray-400">{isManual ? 'Prediksi Analis' : 'Prediksi AI'}</span>
                            <span className={`text-xs font-bold ${
                              crop.aiPrediction === 'Gram Positif' ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {crop.aiPrediction} <span className="text-gray-400 font-normal">({crop.confidence}%)</span>
                            </span>
                          </div>
                        </div>
                        
                        <select 
                          className="w-full mt-2 text-xs p-1.5 rounded border border-gray-300 bg-white text-gray-700 font-medium outline-none cursor-pointer focus:ring-2 focus:ring-teal-500 transition-shadow"
                          value={currentDecision || 'Valid'}
                          onChange={(e) => handleDecisionChange(crop.id, e.target.value)}
                        >
                        <option value="Valid">✅ Valid ({isManual ? 'Sesuai Analis' : 'Sesuai AI'})</option>
                        <option value="Gram Positif">✏️ Ubah: Positif</option>
                        <option value="Gram Negatif">✏️ Ubah: Negatif</option>
                        <option value="Reject">❌ Tolak (Bukan Bakteri)</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BAGIAN BAWAH: TOMBOL (Fixed) */}
          <div className="flex-shrink-0 pt-3 border-t border-gray-100 bg-white/50 backdrop-blur-sm">
            <button 
              onClick={() => {
                if(window.confirm(`Simpan hasil validasi?\nPositif: ${finalStats.pos}\nNegatif: ${finalStats.neg}\nReject: ${finalStats.rejected}`)) {
                  navigate('/doctor/validation');
                }
              }}
              className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-600/20 hover:bg-teal-700 active:scale-95 transition-all flex justify-center items-center gap-2"
            >
              <CheckCircle size={18} /> 
              <span>Simpan & Finalisasi</span>
            </button>
          </div>

        </div>
      </div>

      {/* --- MODAL FULL PREVIEW (Konsisten dengan AnalysisProcess) --- */}
      {showFullPreview && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-200">
          {/* HEADER MODAL */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full pointer-events-auto border border-white/5">
              <span className="text-white font-medium text-sm flex items-center gap-2">
                <Microscope size={14} className="text-teal-400"/>
                Mode Validasi: {activeCrop?.label}
              </span>
            </div>
            <button 
              onClick={() => setShowFullPreview(false)}
              className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-red-500/80 text-white rounded-full transition-colors pointer-events-auto backdrop-blur-md"
            >
              <X size={20} />
            </button>
          </div>

          {/* TOOLBAR INTERNAL MODAL */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 pointer-events-auto">
            <div className="flex items-center gap-1 bg-gray-800/90 backdrop-blur-md p-1.5 rounded-lg border border-gray-700 shadow-xl">
              <button onClick={() => handleZoom(-1, true)} className="p-2 text-white hover:bg-gray-700 rounded" title="Zoom Out"><ZoomOut size={18}/></button>
              <span className="text-xs font-mono text-gray-300 w-12 text-center">{Math.round(modalZoom * 100)}%</span>
              <button onClick={() => handleZoom(1, true)} className="p-2 text-white hover:bg-gray-700 rounded" title="Zoom In"><ZoomIn size={18}/></button>
              <div className="w-px h-4 bg-gray-600 mx-1"></div>
              <button onClick={() => resetView(true)} className="px-3 py-1 text-white text-xs font-bold hover:bg-gray-700 rounded">RESET</button>
            </div>
          </div>

          {/* CANVAS MODAL */}
          <div 
            ref={modalContainerRef}
            className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing bg-black"
            onMouseDown={(e) => handleMouseDown(e, true)}
            onMouseMove={(e) => handleMouseMove(e, true)}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={(e) => handleWheel(e, true)}
          >
            {/* Transform Layer */}
            <div 
              style={{ 
                transform: `translate(${modalPan.x}px, ${modalPan.y}px) scale(${modalZoom})`,
                transformOrigin: 'center',
                transition: isInteracting ? 'none' : 'transform 0.1s ease-out'
              }}
              className="relative inline-block"
            >
              <img 
                ref={modalImageRef}
                src={previewSrc} 
                alt="Full Preview" 
                className="max-w-none block pointer-events-none select-none"
                style={{ maxHeight: '90vh', maxWidth: '100vw' }}
                draggable={false}
                onLoad={fitModalPreview}
              />
            </div>

            {/* Navigasi Modal */}
            <button onClick={handlePrevCrop} className="absolute left-6 top-1/2 -translate-y-1/2 z-40 p-4 text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-all">
              <ArrowLeft size={32} />
            </button>
            <button onClick={handleNextCrop} className="absolute right-6 top-1/2 -translate-y-1/2 z-40 p-4 text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-all">
              <ArrowRight size={32} />
            </button>
          </div>

          {/* Footer Hint */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-[10px] bg-black/40 px-3 py-1 rounded-full pointer-events-none border border-white/5">
             Scroll untuk Zoom • Drag untuk Geser • Panah untuk Navigasi
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationDetail;