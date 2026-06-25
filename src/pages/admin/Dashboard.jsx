import React, { useState, useEffect, useCallback } from 'react';
import { ModelService } from '../../service/modelService';
const modelService = new ModelService();
import { Link, useNavigate } from 'react-router-dom';
import { 
  Cpu, 
  Zap,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';

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
  const navigate = useNavigate();
  const [activeModels, setActiveModels] = useState({ detection: null, classification: null });
  const [modelsLoading, setModelsLoading] = useState(true);
  const [confidenceData, setConfidenceData] = useState({ current: [], previous: [], drift: {} });
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('Mingguan');

  const FILTER_MAP = {
    'Hari Ini': 1,
    'Harian': 7,
    'Mingguan': 30,
    'Bulanan': 90,
    'Tahunan': 365,
  };
  const getDaysForFilter = (f) => FILTER_MAP[f] || 30;

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
              precision: item.model.precision_score != null ? (item.model.precision_score * 100).toFixed(1) + '%' : '-',
              recall: item.model.recall_score != null ? (item.model.recall_score * 100).toFixed(1) + '%' : '-',
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

  // Fetch confidence & drift data
  const fetchConfidenceData = async () => {
    setLoading(true);
    try {
      const days = getDaysForFilter(filter);
      const raw = await modelService.getTrendData('daily', days);

      setConfidenceData({
        current: Array.isArray(raw?.confidence_current) ? raw.confidence_current : [],
        previous: Array.isArray(raw?.confidence_previous) ? raw.confidence_previous : [],
        drift: raw?.drift || {},
      });
      setSummary(raw?.summary || {});
    } catch (err) {
      console.error('Gagal memuat data distribusi confidence:', err);
      setConfidenceData({ current: [], previous: [], drift: {} });
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfidenceData();
  }, [filter]);

  // Build chart data with side-by-side bars
  const chartData = confidenceData.current.map((curr, idx) => {
    const prev = confidenceData.previous[idx] || { range: curr.range, count: 0, percentage: 0 };
    return {
      range: curr.range,
      current: curr.percentage,
      previous: prev.percentage,
      currentCount: curr.count,
      previousCount: prev.count,
      drift: confidenceData.drift[curr.range]?.delta_percentage || 0,
    };
  });

  const BAR_COLORS = {
    '90-100%': '#22c55e',
    '80-90%': '#3b82f6',
    '70-80%': '#f59e0b',
    '< 70%': '#ef4444',
  };

  const handleBarClick = (data) => {
    navigate('/admin/models', { state: { tab: 'classification' } });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto bg-slate-50/80 p-4 rounded-2xl">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Monitoring Model AI</h1>
          <p className="text-gray-500 mt-1">Status real-time dan distribusi keyakinan model Deteksi (YOLO) dan Klasifikasi (CNN)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <option value="Hari Ini">Hari Ini</option>
              <option value="Harian">Harian</option>
              <option value="Mingguan">Mingguan</option>
              <option value="Bulanan">Bulanan</option>
              <option value="Tahunan">Tahunan</option>
            </select>
          </div>
        </div>
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

      {/* 2. DISTRIBUSI KEYAKINAN MODEL */}
      <div className="bg-white p-6 rounded-xl shadow-md shadow-slate-300/40 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-gray-800">Distribusi Keyakinan Model</h3>
            <p className="text-xs text-gray-400 mt-1">
              {loading ? 'Memuat...' : `${getDaysForFilter(filter)} hari terakhir vs periode sebelumnya (${summary.total_classifications_current || 0} klasifikasi)`}
            </p>
          </div>
          <button
            onClick={fetchConfidenceData}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
              onClick={(e) => {
                if (e?.activeLabel) {
                  const item = chartData.find(d => d.range === e.activeLabel);
                  if (item) handleBarClick(item);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="range" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                unit="%"
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(value, name) => [`${value}%`, name === 'current' ? 'Periode Saat Ini' : 'Periode Sebelumnya']}
                labelFormatter={(label) => `Rentang: ${label}`}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => value === 'current' ? '30 Hari Terakhir' : '30 Hari Sebelumnya'}
              />
              <Bar 
                dataKey="previous" 
                name="previous" 
                fill="#E5E7EB" 
                barSize={20}
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="current" 
                name="current" 
                barSize={20}
                radius={[4, 4, 0, 0]}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[entry.range] || '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-gray-100">
          {chartData.map((item) => (
            <button
              key={item.range}
              onClick={() => handleBarClick(item)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all hover:shadow-sm ${
                item.range === '< 70%' 
                  ? 'bg-red-50 border-red-200 hover:border-red-400 text-red-700' 
                  : item.range === '70-80%'
                  ? 'bg-amber-50 border-amber-200 hover:border-amber-400 text-amber-700'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-400 text-gray-600'
              }`}
            >
              <span className="font-medium">{item.range}</span>
              <span className="font-bold">{item.current}%</span>
              {item.drift !== 0 && (
                <span className={`text-xs ${item.drift > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.drift > 0 ? '+' : ''}{item.drift.toFixed(1)}%
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => navigate('/admin/models', { state: { tab: 'classification' } })}
            className="ml-auto text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Konfigurasi Model →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;