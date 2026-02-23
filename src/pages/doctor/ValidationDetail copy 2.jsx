import React, { useState, useEffect } from 'react';
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
  const handleZoom = (delta) => setModalZoom(prev => Math.min(Math.max(prev + delta, 0.5), 5));
  const handleWheel = (e) => { e.preventDefault(); handleZoom(e.deltaY > 0 ? -0.1 : 0.1); };
  const handleMouseDown = (e) => { 
    e.preventDefault(); setIsInteracting(true); 
    setDragStart({ x: e.clientX - modalPan.x, y: e.clientY - modalPan.y }); 
  };
  const handleMouseMove = (e) => { 
    if (!isInteracting) return; 
    setModalPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); 
  };

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
          <p className="text-slate-500 text-sm">ID Sampel: {data.code}</p>
        </div>
      </div>

      {/* --- GRID ATAS: IDENTITAS & CATATAN --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
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
                <th className="p-4 w-40">Hasil AI</th>
                <th className="p-4 text-center">Validasi Bentuk</th>
                <th className="p-4 text-center">Validasi Gram</th>
                <th className="p-4 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.crops.map((crop, index) => (
                <tr key={crop.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-center font-medium text-slate-600">{index + 1}</td>
                  
                  {/* Thumbnail */}
                  <td className="p-4">
                    <div 
                      onClick={() => openPreview(crop)}
                      className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all mx-auto"
                    >
                      <img src={crop.img} alt="Crop" className="w-full h-full object-cover" />
                    </div>
                  </td>

                  {/* Hasil AI */}
                  <td className="p-4">
                    <div>
                      <p className="font-bold text-slate-800">{crop.aiGram}</p>
                      <p className="text-xs text-slate-500">{crop.aiShape}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded border border-slate-200">
                        Conf: 98%
                      </span>
                    </div>
                  </td>

                  {/* Validasi Bentuk (Radio) */}
                  <td className="p-4">
                    <div className="flex flex-col gap-2 items-center justify-center">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name={`shape-${crop.id}`}
                          checked={validations[crop.id]?.shape === 'Batang'}
                          onChange={() => handleValidationChange(crop.id, 'shape', 'Batang')}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-800 uppercase text-xs font-bold">Batang</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name={`shape-${crop.id}`}
                          checked={validations[crop.id]?.shape === 'Kokus'}
                          onChange={() => handleValidationChange(crop.id, 'shape', 'Kokus')}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-800 uppercase text-xs font-bold">Kokus</span>
                      </label>
                    </div>
                  </td>

                  {/* Validasi Gram (Radio) */}
                  <td className="p-4">
                    <div className="flex flex-col gap-2 items-center justify-center">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name={`gram-${crop.id}`}
                          checked={validations[crop.id]?.gram === 'Positif'}
                          onChange={() => handleValidationChange(crop.id, 'gram', 'Positif')}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-800 uppercase text-xs font-bold">Positif</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name={`gram-${crop.id}`}
                          checked={validations[crop.id]?.gram === 'Negatif'}
                          onChange={() => handleValidationChange(crop.id, 'gram', 'Negatif')}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-800 uppercase text-xs font-bold">Negatif</span>
                      </label>
                    </div>
                  </td>

                  {/* Aksi */}
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => openPreview(crop)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors tooltip" title="Lihat Detail"
                      >
                        <Eye size={18} />
                      </button>
                      <button className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="Download">
                        <Download size={18} />
                      </button>
                      {/* Indikator Status (Opsional, atau bisa jadi tombol Reset) */}
                      <button 
                        onClick={() => handleValidationChange(crop.id, 'reset', null)} // Logic reset perlu disesuaikan
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Reset / Hapus"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL PREVIEW (Reused Logic) --- */}
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

          <div className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
               onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
               onMouseUp={() => setIsInteracting(false)} onMouseLeave={() => setIsInteracting(false)}
               onWheel={handleWheel}>
            <div style={{ 
              transform: `translate(${modalPan.x}px, ${modalPan.y}px) scale(${modalZoom})`,
              transformOrigin: 'center', transition: isInteracting ? 'none' : 'transform 0.1s ease-out'
            }}>
              <img src={activeCrop.img} alt="Preview" className="max-w-none pointer-events-none" style={{ maxHeight: '85vh', maxWidth: '100vw' }} />
            </div>
          </div>
          
          {/* Zoom Controls di Bawah */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur px-6 py-3 rounded-full border border-white/10">
             <button onClick={() => handleZoom(-0.5)}><ZoomOut size={20} className="text-white"/></button>
             <span className="text-white font-mono text-sm">{Math.round(modalZoom * 100)}%</span>
             <button onClick={() => handleZoom(0.5)}><ZoomIn size={20} className="text-white"/></button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ValidationDetail;