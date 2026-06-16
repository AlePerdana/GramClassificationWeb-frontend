import React, { useState, useEffect } from 'react';
import { ModelService } from '../../service/modelService';
const modelService = new ModelService();
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

// Data fetched from API

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
  const [activeModels, setActiveModels] = useState({ detection: null, classification: null });
  const [modelsLoading, setModelsLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  const [confidenceData, setConfidenceData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [totals, setTotals] = useState({ total_classifications: 0, total_positif: 0, total_negatif: 0 });

  useEffect(() => {
    const fetchActive = async () => {
      setModelsLoading(true);
      try {
        const data = await modelService.getActiveModel();
        const result = {};
        for (const item of (data || [])) {
          const key = item.task_type === 'Detection' ? 'detection' : 'classification';
          if (item.model) {
            result[key] = {
              name: item.model.model_name || '-',
              accuracy: item.model.accuracy != null ? (item.model.accuracy * 100).toFixed(1) + '%' : '-',
              f1: item.model.f1_score != null ? (item.model.f1_score * 100).toFixed(1) + '%' : '-',
              precision: item.model.accuracy != null ? (item.model.accuracy * 100).toFixed(1) + '%' : '-',
              recall: item.model.accuracy != null ? (item.model.accuracy * 100).toFixed(1) + '%' : '-',
              status: item.model.is_active ? 'Active' : 'Inactive',
            };
          }
        }
        setActiveModels(result);
      } catch (err) {
        console.error('Gagal memuat model aktif:', err);
      } finally {
        setModelsLoading(false);
      }
    };
    fetchActive();
  }, []);

  // Fetch trend data from API
  const fetchTrend = async (period) => {
    setTrendLoading(true);
    try {
      const data = await modelService.getTrendData(period);
      setTrendData(data.trend || []);
      setConfidenceData(data.confidence || []);
      setTotals(data.summary || {});
    } catch (err) {
      console.error('Gagal memuat tren:', err);
      setTrendData([]);
      setConfidenceData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    const periodMap = { 'Harian': 'daily', 'Mingguan': 'weekly', 'Bulanan': 'monthly', 'Tahunan': 'yearly' };
    fetchTrend(periodMap[filter] || 'daily');
  }, [filter]);

  const getChartData = () => trendData;

  return (
    <div className="space-y-8 max-w-7xl mx-auto bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Monitoring Model AI</h1>
        <p className="text-gray-500 mt-1">Status real-time model Deteksi (YOLO) dan Klasifikasi (CNN)</p>
      </div>

      {/* 1. STATUS MODEL SECTION */}
      {modelsLoading ? (
        <div className="text-sm text-gray-500">Memuat status model...</div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModelStatusCard 
          type="Object Detection"
          modelName={activeModels.detection?.name || 'YOLO'}
          status={activeModels.detection?.status || 'Inactive'}
          icon={Zap}
          targetTab="detection"
          metrics={[
            { label: 'mAP50', value: activeModels.detection?.accuracy || '-' },
            { label: 'mAP50-95', value: activeModels.detection?.f1 || '-' },
            { label: 'Precision', value: activeModels.detection?.precision || '-' },
            { label: 'Recall', value: activeModels.detection?.recall || '-' }
          ]}
        />

        <ModelStatusCard 
          type="Classification"
          modelName={activeModels.classification?.name || 'CNN'}
          status={activeModels.classification?.status || 'Inactive'}
          icon={Cpu}
          targetTab="classification"
          metrics={[
            { label: 'Accuracy', value: activeModels.classification?.accuracy || '-' },
            { label: 'F1-Score', value: activeModels.classification?.f1 || '-' },
            { label: 'Precision', value: activeModels.classification?.precision || '-' },
            { label: 'Recall', value: activeModels.classification?.recall || '-' }
          ]}
        />
      </div>
      )}

      {/* 2. STATISTIK HASIL & PERFORMA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kiri: TREN DETEKSI (Area Chart dengan Filter) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-gray-800">Tren Deteksi</h3>
              <p className="text-xs text-gray-400 mt-1">
                {trendLoading ? 'Memuat...' : `${totals.total_classifications || 0} total klasifikasi (${filter})`}
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