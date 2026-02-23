import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Activity, ZoomIn, ZoomOut, 
  Microscope, X, Eye, Download, Check, RefreshCw, Save
} from 'lucide-react';

// --- DUMMY DATA ---
const validationDetailData = {
  1: {
    id: 1,
    name: 'Budi Santoso',
    id_pasien: 'P001',
    dob: '10 Februari 2001',
    age: '24 Tahun',
    gender: 'Laki-Laki',
    analyst: 'Siti Aminah',
    date: '27 Jan 2026',
    crops: [
      { id: 101, label: 'Crop #1', aiPrediction: 'Positif Kok', aiShape: 'Kokus', aiGram: 'Positif', img: '/gram1.png' },
      { id: 102, label: 'Crop #2', aiPrediction: 'Negatif Bat', aiShape: 'Batang', aiGram: 'Negatif', img: '/gram2.png' },
    ]
  }
};

const ValidationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = validationDetailData[1];

  // State untuk menyimpan validasi per baris (crop ID)
  // Format: { 101: { shape: 'Kokus', gram: 'Positif' }, ... }
  const [validations, setValidations] = useState({});
  const [doctorNotes, setDoctorNotes] = useState('');
  
  // State Modal Preview
  const [showModal, setShowModal] = useState(false);
  const [activeCrop, setActiveCrop] = useState(null);
  const [modalZoom, setModalZoom] = useState(1);
  const [modalPan, setModalPan] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const pinchStartDist = useRef(null);

  const modalContainerRef = useRef(null);
  const modalImageRef = useRef(null);

  const computeFitScale = (containerEl, imageEl) => {
    if (!containerEl || !imageEl) return 1;
    const { clientWidth: cw, clientHeight: ch } = containerEl;
    const { naturalWidth: iw, naturalHeight: ih } = imageEl;
    if (!cw || !ch || !iw || !ih) return 1;
    return Math.min(cw / iw, ch / ih);
  };

  const fitModalPreview = () => {
    const scale = computeFitScale(modalContainerRef.current, modalImageRef.current);
    const targetZoom = Math.min(Math.max(scale * 0.7, 0.5), 30);
    setModalZoom(targetZoom);
    setModalPan({ x: 0, y: 0 });
  };

  // Inisialisasi state validasi dengan nilai default dari AI
  useEffect(() => {
    if (data) {
      const initialValidations = {};
      data.crops.forEach(crop => {
        initialValidations[crop.id] = {
          shape: crop.aiShape, // Default sesuai AI
          gram: crop.aiGram    // Default sesuai AI
        };
      });
      setValidations(initialValidations);
    }
  }, [data]);

  const handleValidationChange = (cropId, field, value) => {
    setValidations(prev => ({
      ...prev,
      [cropId]: {
        ...prev[cropId],
        [field]: value
      }
    }));
  };

  const openPreview = (crop) => {
    setActiveCrop(crop);
    setModalZoom(1);
    setModalPan({ x: 0, y: 0 });
    setShowModal(true);
  };

  // --- HANDLERS MODAL (Sama seperti sebelumnya) ---
  const handleZoom = (delta) => {
    const maxZoom = 30; // 3000%
    setModalZoom(prev => Math.min(Math.max(prev + delta, 0.5), maxZoom));
  };
  const handleWheel = (e) => { e.preventDefault(); handleZoom(e.deltaY > 0 ? -0.1 : 0.1); };
  const handleMouseDown = (e) => { 
    e.preventDefault(); setIsInteracting(true); 
    setDragStart({ x: e.clientX - modalPan.x, y: e.clientY - modalPan.y }); 
  };
  const handleMouseMove = (e) => { 
    if (!isInteracting) return; 
    setModalPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); 
  };

  // --- TOUCH HANDLERS (MOBILE PAN & ZOOM) ---
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleMouseDown({
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {},
      });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      pinchStartDist.current = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isInteracting) {
      const touch = e.touches[0];
      handleMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {},
      });
    } else if (e.touches.length === 2 && pinchStartDist.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      const delta = (currentDist - pinchStartDist.current) * 0.01;

      if (Math.abs(delta) > 0.05) {
        setModalZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 5));
        pinchStartDist.current = currentDist;
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) pinchStartDist.current = null;
    if (e.touches.length === 0) setIsInteracting(false);
  };

  useEffect(() => {
    if (showModal) {
      requestAnimationFrame(() => fitModalPreview());
    }
  }, [showModal, activeCrop]);

  if (!data) return <div>Data tidak ditemukan.</div>;

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/doctor/validation')} className="p-2 hover:bg-white rounded-full transition-colors text-slate-600">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Validasi Hasil</h1>
        </div>
      </div>

      {/* --- GRID ATAS: IDENTITAS & CATATAN --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        
        {/* CARD 1: IDENTITAS PASIEN */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Identitas Pasien</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">ID Pasien</p>
              <p className="text-lg font-medium text-slate-800">{data.id_pasien}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Nama Lengkap</p>
              <p className="text-lg font-medium text-slate-800">{data.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Tanggal Lahir</p>
                <p className="text-sm font-medium text-slate-800">{data.dob}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Umur</p>
                <p className="text-sm font-medium text-slate-800">{data.age}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Jenis Kelamin</p>
              <p className="text-sm font-medium text-slate-800">{data.gender}</p>
            </div>
          </div>
        </div>

        {/* CARD 2: CATATAN DOKTER (Mengambil sisa space di row ini jika ada, atau full di mobile) */}
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
            <button className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2">
              <Save size={16} /> Simpan Catatan
            </button>
          </div>
        </div>
      </div>

      {/* --- BAGIAN BAWAH: TABEL VALIDASI --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header Card Tabel */}
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-lg">Hasil Klasifikasi Gram Stain</h3>
          <button 
            onClick={() => alert("Seluruh hasil divalidasi dan disimpan!")}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
          >
            <Check size={18} /> Validasi Hasil
          </button>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-4 text-center w-16">No</th>
                <th className="p-4 text-center w-24">Gambar</th>
                <th className="p-4 w-40">Hasil Proses</th>
                <th className="p-4 text-center">Validasi Bentuk</th>
                <th className="p-4 text-center">Validasi Gram</th>
                <th className="p-4 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data.crops.map((crop, index) => {
                // State Check
                const currentVal = validations[crop.id] || {};
                const isRejected = currentVal.status === 'rejected';
                const isModified = !isRejected && (currentVal.shape !== crop.aiShape || currentVal.gram !== crop.aiGram);

                return (
                  <tr 
                    key={crop.id} 
                    className={`transition-all duration-200 ${
                      isRejected ? 'bg-slate-50 opacity-60' : isModified ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* No */}
                    <td className="p-4 text-center font-medium text-slate-500">{index + 1}</td>
                    
                    {/* Gambar */}
                    <td className="p-4">
                      <div 
                        onClick={() => openPreview(crop)}
                        className={`w-14 h-14 mx-auto bg-slate-100 rounded-lg overflow-hidden cursor-pointer border border-slate-200 shadow-sm transition-all group ${
                          isRejected ? 'grayscale' : 'hover:border-blue-400 hover:scale-105'
                        }`}
                      >
                        <img src={crop.img} alt="Crop" className="w-full h-full object-cover" />
                      </div>
                    </td>

                    {/* Hasil AI + Confidence (Revisi: Badge Simple) */}
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <div>
                          <span className="block font-bold text-slate-800 text-sm leading-tight">{crop.aiGram}</span>
                          <span className="block text-slate-500 text-xs">{crop.aiShape}</span>
                        </div>
                        {/* Confidence Score Badge */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          98% Akurat
                        </span>
                      </div>
                    </td>

                    {/* Validasi Bentuk (Revisi: Indikator AI & Centered) */}
                    <td className="p-4">
                      <div className="flex flex-col gap-2 items-center justify-center w-full"> {/* Center Alignment */}
                        {['Batang', 'Kokus'].map((shape) => (
                          <label key={shape} className={`flex items-center w-28 cursor-pointer select-none ${isRejected ? 'pointer-events-none' : ''}`}>
                            <div className="relative flex items-center justify-center mr-2">
                              <input 
                                type="radio" 
                                name={`shape-${crop.id}`}
                                className="peer appearance-none w-3.5 h-3.5 border-2 border-slate-300 rounded-full checked:border-blue-600 checked:bg-blue-600 transition-colors"
                                checked={!isRejected && currentVal.shape === shape}
                                onChange={() => handleValidationChange(crop.id, 'shape', shape)}
                                disabled={isRejected}
                              />
                              <div className="absolute w-1 h-1 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                            </div>
                            <span className={`text-xs font-semibold uppercase ${
                              !isRejected && currentVal.shape === shape ? 'text-blue-700' : 'text-slate-500'
                            }`}>
                              {shape}
                            </span>
                            {/* Indikator AI */}
                            {crop.aiShape === shape && (
                              <span className="ml-auto text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 rounded border border-slate-200">
                                AI
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </td>

                    {/* Validasi Gram (Revisi: Indikator AI & Centered) */}
                    <td className="p-4">
                      <div className="flex flex-col gap-2 items-center justify-center w-full"> {/* Center Alignment */}
                        {['Positif', 'Negatif'].map((gram) => (
                          <label key={gram} className={`flex items-center w-28 cursor-pointer select-none ${isRejected ? 'pointer-events-none' : ''}`}>
                            <div className="relative flex items-center justify-center mr-2">
                              <input 
                                type="radio" 
                                name={`gram-${crop.id}`}
                                className={`peer appearance-none w-3.5 h-3.5 border-2 border-slate-300 rounded-full transition-colors ${
                                  gram === 'Positif' ? 'checked:border-purple-600 checked:bg-purple-600' : 'checked:border-red-600 checked:bg-red-600'
                                }`}
                                checked={!isRejected && currentVal.gram === gram}
                                onChange={() => handleValidationChange(crop.id, 'gram', gram)}
                                disabled={isRejected}
                              />
                              <div className="absolute w-1 h-1 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                            </div>
                            <span className={`text-xs font-semibold uppercase ${
                              !isRejected && currentVal.gram === gram 
                                ? (gram === 'Positif' ? 'text-purple-700' : 'text-red-700') 
                                : 'text-slate-500'
                            }`}>
                              {gram}
                            </span>
                            {/* Indikator AI */}
                            {crop.aiGram === gram && (
                              <span className="ml-auto text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 rounded border border-slate-200">
                                AI
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </td>

                    {/* Aksi (Revisi: Reject & Undo) */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openPreview(crop)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors tooltip" 
                          title="Lihat Detail"
                        >
                          <Eye size={18} />
                        </button>
                        
                        <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors" title="Unduh">
                          <Download size={18} />
                        </button>

                        <div className="w-px h-5 bg-slate-200 mx-1"></div>
                        
                        {isRejected ? (
                          // Tombol Undo (Jika sudah reject)
                          <button 
                            onClick={() => handleValidationChange(crop.id, 'status', 'active')} 
                            className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors" 
                            title="Batalkan Tolak (Pulihkan)"
                          >
                            <RefreshCw size={18} />
                          </button>
                        ) : (
                          // Tombol Reject (Jika aktif)
                          <button 
                            onClick={() => handleValidationChange(crop.id, 'status', 'rejected')} 
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" 
                            title="Hapus / Tolak Baris Ini"
                          >
                            <X size={18} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL PREVIEW (Menggunakan Portal agar Full Screen Sempurna) --- */}
      {showModal && activeCrop && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col animate-in fade-in duration-200">
          {/* Header Modal */}
          <div className="absolute top-0 left-0 right-0 p-3 md:p-4 flex justify-between items-center z-50 pointer-events-none">
            <span className="text-white font-medium text-[10px] md:text-sm px-3 py-1.5 md:px-4 md:py-2 bg-white/10 rounded-full backdrop-blur pointer-events-auto border border-white/5 truncate max-w-[70%]">
              {activeCrop.label} - {activeCrop.aiGram} {activeCrop.aiShape}
            </span>
            <button 
              onClick={() => setShowModal(false)}
              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors pointer-events-auto backdrop-blur flex-shrink-0"
            >
              <X size={18} className="md:w-5 md:h-5" />
            </button>
          </div>

          {/* Canvas Container */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
               ref={modalContainerRef}
               onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
               onMouseUp={() => setIsInteracting(false)} onMouseLeave={() => setIsInteracting(false)}
               onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}>
            <div style={{ 
              transform: `translate(${modalPan.x}px, ${modalPan.y}px) scale(${modalZoom})`,
              transformOrigin: 'center', transition: isInteracting ? 'none' : 'transform 0.1s ease-out'
            }}>
              <img 
                ref={modalImageRef}
                src={activeCrop.img} 
                alt="Pratinjau" 
                className="max-w-none pointer-events-none select-none" 
                style={{ maxHeight: '85vh', maxWidth: '100vw' }}
                onLoad={fitModalPreview}
              />
            </div>
          </div>
          
          {/* Zoom Controls di Bawah */}
           <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-4 bg-black/50 backdrop-blur px-3 py-2 md:px-6 md:py-3 rounded-full border border-white/10 pointer-events-auto shadow-2xl">
             <button onClick={() => handleZoom(-1)} className="p-1 hover:text-blue-400 transition-colors"><ZoomOut size={16} className="md:w-5 md:h-5 text-white"/></button>
             <span className="text-white font-mono text-xs md:text-sm min-w-[2.5rem] md:min-w-[3rem] text-center">{Math.round(modalZoom * 100)}%</span>
             <button onClick={() => handleZoom(1)} className="p-1 hover:text-blue-400 transition-colors"><ZoomIn size={16} className="md:w-5 md:h-5 text-white"/></button>
          </div>
        </div>,
        document.body // Target Portal: Render langsung di body
      )}

    </div>
  );
};

export default ValidationDetail;