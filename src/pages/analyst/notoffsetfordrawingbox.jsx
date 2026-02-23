import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Upload, X, Play, Save, ArrowLeft, Microscope, 
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
  const [isInteracting, setIsInteracting] = useState(false); // Drawing or Dragging
  const [startPos, setStartPos] = useState({ x: 0, y: 0 }); // Posisi awal mouse (Relatif terhadap image)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // Posisi awal mouse (Screen) untuk Panning
  const [currentBox, setCurrentBox] = useState(null);

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
        case 'escape':
          setCurrentBox(null);
          setIsInteracting(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setMode('view');
  };

  // --- MOUSE EVENT HANDLERS (CORE LOGIC) ---
  
  // Helper: Dapatkan koordinat mouse relatif terhadap gambar (memperhitungkan zoom & pan)
  const getRelPos = (clientX, clientY) => {
    if (!imgContainerRef.current) return { x: 0, y: 0 };
    const rect = imgContainerRef.current.getBoundingClientRect();
    
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

  // Auto Detect Dummy
  const handleAutoDetect = () => {
    setMode('auto_detect');
    setTimeout(() => {
      // Koordinat dummy (hardcoded pixel value simulasi)
      const dummyAutoRois = [
        { x: 100, y: 150, w: 50, h: 50, label: 'Auto' },
        { x: 300, y: 200, w: 40, h: 40, label: 'Auto' }
      ];
      setRois(prev => ({ ...prev, [activeImgIdx]: dummyAutoRois }));
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

  const currentRois = rois[activeImgIdx] || [];

  return (
    <div className="max-w-7xl mx-auto pb-10 h-[calc(100vh-100px)] flex flex-col">
      
      {/* HEADER NAVIGASI */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => navigate('/analyst/patients')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors font-medium"
        >
          <ArrowLeft size={20} /> Kembali ke Daftar
        </button>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
          <Activity size={14} /> Workstation Mode
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        
        {/* --- KOLOM KIRI: AREA GAMBAR & EDITOR --- */}
        <div className="flex-1 flex flex-col bg-gray-900 rounded-2xl overflow-hidden shadow-lg relative group select-none">
          
          {images.length > 0 ? (
            <>
              {/* Toolbar Atas (Zoom & Reset) */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-gray-800/90 backdrop-blur-md p-1.5 rounded-lg border border-gray-700 shadow-xl">
                <button onClick={() => handleZoom(-0.2)} className="p-2 text-white hover:bg-gray-700 rounded" title="Zoom Out"><ZoomOut size={18}/></button>
                <span className="text-xs font-mono text-gray-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => handleZoom(0.2)} className="p-2 text-white hover:bg-gray-700 rounded" title="Zoom In"><ZoomIn size={18}/></button>
                <div className="w-px h-4 bg-gray-600 mx-1"></div>
                <button onClick={resetView} className="p-2 text-white hover:bg-gray-700 rounded" title="Reset View"><Maximize2 size={18}/></button>
              </div>

              {/* VIEWPORT UTAMA */}
              {/* Wrapper ini menangkap event mouse */}
              <div 
                ref={imgContainerRef}
                className="relative flex-1 overflow-hidden bg-black w-full h-full"
                style={{ 
                  cursor: mode === 'drag' ? (isInteracting ? 'grabbing' : 'grab') : mode === 'manual_crop' ? 'crosshair' : 'default' 
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp} // Stop dragging/drawing jika keluar area
              >
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
                    src={images[activeImgIdx]} 
                    alt="Sample" 
                    className="max-w-none block pointer-events-none" // pointer-events-none agar gambar tidak di-drag browser
                    style={{ maxHeight: '80vh' }} // Batas tinggi awal
                    onDragStart={(e) => e.preventDefault()}
                  />
                  
                  {/* --- ROI RENDER LAYER (Inside Transform) --- */}
                  
                  {/* 1. Existing ROIs */}
                  {currentRois.map((box, idx) => (
                    <div 
                      key={idx}
                      className={`absolute border-2 ${box.label === 'Auto' ? 'border-green-400' : 'border-blue-400'} bg-white/10 hover:bg-white/20`}
                      style={{
                        left: box.x, 
                        top: box.y, 
                        width: box.w, 
                        height: box.h
                      }}
                    >
                      <span className={`absolute -top-5 left-0 text-[10px] px-1 font-bold text-black ${box.label === 'Auto' ? 'bg-green-400' : 'bg-blue-400'}`}>
                        {box.label} #{idx+1}
                      </span>
                    </div>
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
              <div className="absolute bottom-4 right-4 z-10 bg-black/60 text-white px-3 py-2 rounded-lg text-[10px] backdrop-blur-sm pointer-events-none">
                <p><span className="font-bold text-yellow-400">B</span> : Box Mode</p>
                <p><span className="font-bold text-yellow-400">D</span> : Drag Mode</p>
              </div>

              {/* Mode Indicator (Pojok Kiri Bawah) */}
              <div className="absolute bottom-4 left-4 z-10">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setMode('drag')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold backdrop-blur-md shadow-sm flex items-center gap-2 transition-all ${
                      mode === 'drag' ? 'bg-white text-gray-900' : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Hand size={14} /> Geser (D)
                  </button>
                  <button 
                    onClick={() => setMode('manual_crop')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold backdrop-blur-md shadow-sm flex items-center gap-2 transition-all ${
                      mode === 'manual_crop' ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Crop size={14} /> Crop ROI (B)
                  </button>
                </div>
              </div>
            </>
          ) : (
            // State Kosong (Upload)
            <div className="flex-1 flex flex-col items-center justify-center p-10">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <Upload size={32} className="text-gray-400" />
              </div>
              <h3 className="text-gray-300 font-bold text-lg mb-2">Upload Citra Mikroskop</h3>
              <p className="text-gray-500 text-sm mb-6">Dukung multi-upload (JPG, PNG)</p>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2">
                <Upload size={18} /> Pilih Gambar
                <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          )}
        </div>

        {/* --- KOLOM KANAN: PANEL KONTROL --- */}
        <div className="w-full lg:w-[380px] flex flex-col gap-6">
          
          {/* 1. INFO PASIEN */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
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
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Microscope size={14} /> Metode Deteksi
            </h3>

            {!images.length ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
                Menunggu upload...
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
                
                {/* Opsi Auto Detect */}
                <button 
                  onClick={handleAutoDetect}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                    mode === 'auto_detect' ? 'border-green-600 bg-green-50' : 'border-gray-100 hover:border-green-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Scan size={18} className="text-green-600" />
                    <span className="text-xs font-bold text-gray-700">Auto Detect (AI)</span>
                  </div>
                  <p className="text-[10px] text-gray-400">Biarkan AI mencari ROI bakteri secara otomatis.</p>
                </button>

                {/* List ROI */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 min-h-[80px]">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-gray-500">Area Terpilih ({currentRois.length})</p>
                    {currentRois.length > 0 && (
                      <button onClick={clearRois} className="text-[10px] text-red-500 hover:underline flex items-center gap-1">
                        <Trash size={10} /> Reset
                      </button>
                    )}
                  </div>
                  {currentRois.length === 0 ? (
                    <p className="text-[10px] text-gray-400 text-center mt-2 italic">
                      Gambar kotak pada area bakteri atau gunakan Auto Detect.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {currentRois.map((_, i) => (
                        <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-mono text-gray-600">
                          ROI #{i+1}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tombol Eksekusi */}
                <button 
                  onClick={handleClassify}
                  disabled={currentRois.length === 0 || status === 'classifying'}
                  className={`w-full py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${
                    currentRois.length === 0 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-primary text-white hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  {status === 'classifying' ? (
                    'Memproses CNN...'
                  ) : (
                    <>
                      <Play size={16} fill="currentColor" /> Klasifikasi {currentRois.length > 0 ? `(${currentRois.length} Area)` : ''}
                    </>
                  )}
                </button>

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default AnalysisProcess;