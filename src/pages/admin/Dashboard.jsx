import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Cpu, 
  Zap,
  AlertTriangle,
  TrendingUp,
  Filter
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart, 
  Bar, 
  Legend
} from 'recharts';

// --- DATA DUMMY DINAMIS (Untuk Simulasi Filter) ---
const dataHarian = [
  { name: 'Senin', positif: 45, negatif: 30 },
  { name: 'Selasa', positif: 52, negatif: 28 },
  { name: 'Rabu', positif: 38, negatif: 45 },
  { name: 'Kamis', positif: 65, negatif: 32 },
  { name: 'Jumat', positif: 48, negatif: 25 },
  { name: 'Sabtu', positif: 55, negatif: 38 },
  { name: 'Minggu', positif: 40, negatif: 20 },
];

const dataMingguan = [
  { name: 'Minggu 1', positif: 200, negatif: 150 },
  { name: 'Minggu 2', positif: 240, negatif: 180 },
  { name: 'Minggu 3', positif: 180, negatif: 220 },
  { name: 'Minggu 4', positif: 300, negatif: 190 },
];

const dataBulanan = [
  { name: 'Jan', positif: 820, negatif: 640 },
  { name: 'Feb', positif: 910, negatif: 700 },
  { name: 'Mar', positif: 780, negatif: 720 },
  { name: 'Apr', positif: 1040, negatif: 830 },
  { name: 'Mei', positif: 1120, negatif: 880 },
  { name: 'Jun', positif: 990, negatif: 910 },
  { name: 'Jul', positif: 1080, negatif: 950 },
  { name: 'Agu', positif: 1025, negatif: 870 },
  { name: 'Sep', positif: 970, negatif: 810 },
  { name: 'Okt', positif: 1105, negatif: 920 },
  { name: 'Nov', positif: 1150, negatif: 940 },
  { name: 'Des', positif: 1200, negatif: 990 },
];

const dataTahunan = [
  { name: '2022', positif: 6800, negatif: 5400 },
  { name: '2023', positif: 8200, negatif: 6400 },
  { name: '2024', positif: 9400, negatif: 7200 },
  { name: '2025', positif: 12000, negatif: 9800 },
];

const confidenceData = [
  { range: '90-100%', count: 850 },
  { range: '80-90%', count: 200 },
  { range: '70-80%', count: 50 },
  { range: '< 70%', count: 20 },
];

// --- KOMPONEN KARTU MODEL ---
const ModelStatusCard = ({ type, modelName, status, metrics, icon: Icon, targetTab }) => (
  <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden flex flex-col h-full">
    <div className="p-5 border-b border-gray-200 flex justify-between items-start bg-blue-50 bg-opacity-40">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
          <Icon size={24} />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{type}</h3>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-500">
               {modelName}
             </span>
             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
             }`}>
                {status}
             </span>
          </div>
        </div>
      </div>
    </div>

    <div className="p-6">
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m, idx) => (
          <div key={idx}>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{m.label}</p>
            <p className="text-xl font-bold text-gray-800">{m.value}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="px-6 pb-5 mt-auto flex justify-end">
      <Link
        to="/admin/models"
        state={{ tab: targetTab }}
        className="group inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
      >
        <span>Konfigurasi Model</span>
        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  </div>
);

const Dashboard = () => {
  // State untuk Filter Dropdown
  const [filter, setFilter] = useState('Harian');

  // Logic ganti data berdasarkan filter
  const getChartData = () => {
    switch (filter) {
      case 'Harian': return dataHarian;
      case 'Mingguan': return dataMingguan;
      case 'Bulanan': return dataBulanan;
      case 'Tahunan': return dataTahunan;
      default: return dataHarian;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Monitoring Model AI</h1>
        <p className="text-gray-500 mt-1">Status real-time model Deteksi (YOLO) dan Klasifikasi (CNN)</p>
      </div>

      {/* 1. STATUS MODEL SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModelStatusCard 
          type="Object Detection"
          modelName="YOLOv8-Nano Custom"
          status="Active"
          icon={Zap}
          targetTab="detection"
          metrics={[
            { label: 'Mean AP (mAP)', value: '94.5%' },
            { label: 'Precision', value: '92.1%' },
            { label: 'Recall', value: '96.3%' },
            { label: 'Avg Inference', value: '14 ms' }
          ]}
        />

        <ModelStatusCard 
          type="Classification"
          modelName="ResNet50-Microbio"
          status="Active"
          icon={Cpu}
          targetTab="classification"
          metrics={[
            { label: 'Accuracy', value: '98.2%' },
            { label: 'F1-Score', value: '97.8%' },
            { label: 'Loss Value', value: '0.12' },
            { label: 'Avg Inference', value: '28 ms' }
          ]}
        />
      </div>

      {/* 2. STATISTIK HASIL & PERFORMA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kiri: TREN DETEKSI (Area Chart dengan Filter) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-gray-800">Tren Deteksi</h3>
              <p className="text-xs text-gray-400 mt-1">
                Jumlah sampel Gram Positif vs Negatif ({filter})
              </p>
            </div>
            
            {/* DROPDOWN FILTER */}
            <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <select 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                    <option value="Harian">Harian</option>
                    <option value="Mingguan">Mingguan</option>
                    <option value="Bulanan">Bulanan</option>
                    <option value="Tahunan">Tahunan</option>
                </select>
            </div>
          </div>
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart key={filter} data={getChartData()}>
                <defs>
                  <linearGradient id="colorPositif" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNegatif" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="top" height={36}/>
                <Area 
                  type="linear" 
                  dataKey="positif" 
                  name="Gram Positif" 
                  stroke="#3B82F6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorPositif)" 
                  animationDuration={1000}
                />
                <Area 
                  type="linear" 
                  dataKey="negatif" 
                  name="Gram Negatif" 
                  stroke="#EF4444" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorNegatif)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kanan: Quality Control (Confidence) */}
        <div className="bg-white p-6 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-2">Kualitas Deteksi</h3>
          <p className="text-xs text-gray-400 mb-6">Sebaran tingkat keyakinan (confidence) model</p>
          
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="range" type="category" width={50} tick={{fontSize: 11}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alert removed per request to free space */}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;