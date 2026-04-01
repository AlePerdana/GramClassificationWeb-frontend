import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Activity } from 'lucide-react';

// --- DUMMY DATA ---
// Data ini idealnya di-fetch dari backend berdasarkan ID
const reportData = {
  id_laporan: 'RPT-20260306-001',
  tanggal_cetak: '6 Maret 2026',
  pasien: {
    id: 'P001', name: 'Budi Santoso', dob: '10 Februari 2001', age: '24 Tahun', gender: 'Laki-Laki'
  },
  klinis: {
    tanggal_sampel: '27 Januari 2026', jenis_spesimen: 'Sputum', analis: 'Siti Aminah, S.Tr.A.K', dokter: 'dr. Andi Pratama, Sp.MK'
  },
  hasil: {
    total_objek: 12,
    gram_positif: { kokus: 8, batang: 0 },
    gram_negatif: { kokus: 0, batang: 4 },
    kesimpulan: 'Ditemukan dominasi bakteri Gram Positif berbentuk Kokus, serta keberadaan bakteri Gram Negatif berbentuk Batang dalam jumlah sedang.',
    catatan_dokter: 'Pasien diindikasikan mengalami infeksi saluran pernapasan. Disarankan pemberian antibiotik spektrum luas sesuai pedoman empiris.'
  },
  gambar_bukti: [
    { id: 1, img: 'https://placehold.co/150/2563eb/ffffff?text=Gram+Pos+Kokus', label: 'Gram Positif (Kokus)' },
    { id: 2, img: 'https://placehold.co/150/dc2626/ffffff?text=Gram+Neg+Batang', label: 'Gram Negatif (Batang)' }
  ]
};

const MedicalReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    document.title = `Laporan_Mikrobiologi_${reportData.pasien.name}_${reportData.pasien.id}`;
    return () => { document.title = 'Aplikasi Klasifikasi Gram'; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-200 py-8 px-4 print:p-0 print:bg-white flex justify-center">
      {/* FLOATING ACTION BUTTONS (Tidak Ikut Tercetak) */}
      <div className="fixed top-6 left-6 flex gap-3 print:hidden z-50">
        <button
          onClick={() => navigate(-1)}
          className="bg-white text-gray-700 p-3 rounded-full shadow-lg hover:bg-gray-50 flex items-center justify-center transition-transform active:scale-95"
          title="Kembali"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="fixed bottom-8 right-8 flex gap-3 print:hidden z-50">
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl hover:bg-blue-700 flex items-center gap-2 font-bold transition-transform active:scale-95"
        >
          <Printer size={20} /> Cetak / Simpan PDF
        </button>
      </div>

      {/* --- KERTAS A4 --- */}
      <div className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white text-black p-8 md:p-12 shadow-2xl print:shadow-none print:p-0">
        {/* KOP SURAT */}
        <div className="flex items-center justify-between border-b-4 border-black pb-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 text-white flex items-center justify-center rounded-xl font-black text-3xl">
              <Activity size={36} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900">RSUD KOTA SURABAYA</h1>
              <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Laboratorium Mikrobiologi Klinis</h2>
              <p className="text-xs text-gray-500 mt-1">Jl. Mayjen Prof. Dr. Moestopo No.6-8, Surabaya, Jawa Timur 60286</p>
              <p className="text-xs text-gray-500">Telp: (031) 5020251 | Email: lab.mikro@rsud-sby.go.id</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-500 uppercase">No. Dokumen</p>
            <p className="font-mono text-sm font-bold">{id ? `RPT-${id}` : reportData.id_laporan}</p>
          </div>
        </div>

        {/* JUDUL LAPORAN */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-black uppercase underline underline-offset-4">Laporan Hasil Analisis Pengecatan Gram</h2>
        </div>

        {/* IDENTITAS PASIEN & SPESIMEN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-8 text-sm">
          <div className="space-y-2">
            <div className="flex"><span className="w-40 text-gray-500 font-semibold">ID Pasien</span><span className="font-bold">: {reportData.pasien.id}</span></div>
            <div className="flex"><span className="w-40 text-gray-500 font-semibold">Nama Lengkap</span><span className="font-bold uppercase">: {reportData.pasien.name}</span></div>
            <div className="flex"><span className="w-40 text-gray-500 font-semibold">Umur / Jenis Kelamin</span><span className="font-bold">: {reportData.pasien.age} / {reportData.pasien.gender}</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex"><span className="w-40 text-gray-500 font-semibold">Jenis Spesimen</span><span className="font-bold">: {reportData.klinis.jenis_spesimen}</span></div>
            <div className="flex"><span className="w-40 text-gray-500 font-semibold">Tgl. Analisis</span><span className="font-bold">: {reportData.klinis.tanggal_sampel}</span></div>
            <div className="flex"><span className="w-40 text-gray-500 font-semibold">Analis Medis</span><span className="font-bold">: {reportData.klinis.analis}</span></div>
            <div className="flex"><span className="w-40 text-gray-500 font-semibold">Dokter Validator</span><span className="font-bold">: {reportData.klinis.dokter}</span></div>
          </div>
        </div>

        {/* HASIL ANALISIS */}
        <div className="mb-8">
          <h3 className="font-bold bg-gray-100 p-2 border-l-4 border-black mb-4 uppercase text-sm">A. Ringkasan Kuantitatif (AI Assisted)</h3>
          <table className="w-full text-sm border-collapse border border-gray-300 text-center mb-4">
            <thead>
              <tr className="bg-gray-50 font-bold">
                <th className="border border-gray-300 p-2" rowSpan="2">Morfologi</th>
                <th className="border border-gray-300 p-2" colSpan="2">Gram Positif (Ungu)</th>
                <th className="border border-gray-300 p-2" colSpan="2">Gram Negatif (Merah)</th>
              </tr>
              <tr className="bg-gray-50 font-bold text-xs">
                <th className="border border-gray-300 p-2">Kokus</th>
                <th className="border border-gray-300 p-2">Batang</th>
                <th className="border border-gray-300 p-2">Kokus</th>
                <th className="border border-gray-300 p-2">Batang</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 font-bold bg-gray-50">Jumlah Terdeteksi</td>
                <td className="border border-gray-300 p-2">{reportData.hasil.gram_positif.kokus}</td>
                <td className="border border-gray-300 p-2">{reportData.hasil.gram_positif.batang}</td>
                <td className="border border-gray-300 p-2">{reportData.hasil.gram_negatif.kokus}</td>
                <td className="border border-gray-300 p-2">{reportData.hasil.gram_negatif.batang}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 italic">*Hasil di atas telah divalidasi oleh Dokter Spesialis Mikrobiologi Klinis.</p>
        </div>

        {/* GAMBAR BUKTI */}
        <div className="mb-8">
          <h3 className="font-bold bg-gray-100 p-2 border-l-4 border-black mb-4 uppercase text-sm">B. Bukti Visual Mikroskopis (Tervalidasi)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {reportData.gambar_bukti.map((img) => (
              <div key={img.id} className="border border-gray-300 p-2 rounded w-full max-w-[170px]">
                <img src={img.img} alt={img.label} className="w-full h-auto object-cover border border-gray-200" />
                <p className="text-[10px] text-center font-bold mt-2">{img.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* KESIMPULAN & CATATAN KLINIS */}
        <div className="mb-12 border-t border-b border-gray-300 py-6">
          <h3 className="font-bold uppercase text-sm mb-2">C. Kesimpulan Klinis</h3>
          <p className="text-sm font-semibold mb-6">{reportData.hasil.kesimpulan}</p>

          <h3 className="font-bold uppercase text-sm mb-2">D. Catatan Dokter</h3>
          <p className="text-sm text-gray-800">{reportData.hasil.catatan_dokter || '-'}</p>
        </div>

        {/* TANDA TANGAN (Bawah Kanan) */}
        <div className="flex justify-end mt-16 print:mt-auto">
          <div className="text-center w-64">
            <p className="text-sm mb-1">Surabaya, {reportData.tanggal_cetak}</p>
            <p className="text-sm font-bold mb-20">Dokter Penanggung Jawab,</p>
            <p className="text-sm font-black underline">{reportData.klinis.dokter}</p>
            <p className="text-xs text-gray-600">NIP. 19800512 201001 1 003</p>
          </div>
        </div>

        {/* FOOTER KERTAS */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
          Dokumen ini dicetak secara elektronik dan sah menurut sistem Rekam Medis Rumah Sakit.
        </div>
      </div>

    </div>
  );
};

export default MedicalReport;
