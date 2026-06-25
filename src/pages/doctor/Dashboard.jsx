import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../service/authService';
import { 
  ClipboardCheck, Filter, CheckCircle,
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { APP_CONFIG } from '../../utils/constant';

const API_BASE_URL = APP_CONFIG.API_HOST;

const PRIORITY_LABELS = {
  high: { label: 'Sangat prioritas', className: 'bg-red-50 text-red-700 border border-red-100' },
  medium: { label: 'Penting', className: 'bg-amber-50 text-amber-700 border border-amber-100' },
  low: { label: 'Belum prioritas', className: 'bg-slate-50 text-slate-600 border border-slate-200' },
};

const toSortableDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getPriorityLevel = (item) => {
  const time = item?.tanggal_upload || item?.uploaded_at || item?.earliest_upload;
  const dateObj = toSortableDate(time);
  if (!dateObj) return null;
  const diff = Math.max(0, Math.floor((Date.now() - dateObj.getTime()) / 60000));
  if (diff <= 5) return 'low';
  if (diff <= 15) return 'medium';
  return 'high';
};

const getBarColor = (entry) => {
  if (entry.masuk > 0 && entry.selesai === 0) return '#ef4444';
  if (entry.masuk > entry.selesai * 2) return '#f59e0b';
  return '#22c55e';
};

const getTrend = (data, key) => {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d[key] || 0);
  const last = vals[vals.length - 1];
  const prev = vals[vals.length - 2];
  if (prev === 0) return last > 0 ? { direction: 'up', value: 100, last } : null;
  const change = ((last - prev) / prev) * 100;
  return {
    direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
    value: Math.abs(Math.round(change)),
    last,
    prev,
  };
};

const TrendIndicator = ({ trend, label, reverse }) => {
  if (!trend) return null;
  const diff = (trend.current ?? 0) - (trend.previous ?? 0);
  if (diff === 0) {
    return <span className="text-[11px] text-gray-400 font-medium" title={label}>→ 0</span>;
  }
  const isUp = diff > 0;
  const isGood = reverse ? !isUp : isUp;
  const color = isGood ? 'text-green-600' : 'text-red-600';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${color}`} title={label}>
      {isUp ? '↑' : '↓'} {Math.abs(diff)}
    </span>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('Hari Ini');
  const [queueData, setQueueData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);

  useEffect(() => {
    const fetchQueue = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/doctor/doctor-queue`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...authService.getAuthorizationHeader(),
          },
        });
        if (response.status === 401) {
          authService.clearSession();
          navigate('/login');
          return;
        }
        const result = await response.json();
        const payload = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
        setQueueData(payload);
      } catch (error) {
        console.error('Gagal mengambil antrean:', error);
        setQueueData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQueue();
  }, [navigate]);

  useEffect(() => {
    const fetchChart = async () => {
      setIsChartLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/doctor/dashboard-chart?filter=${filter}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...authService.getAuthorizationHeader(),
          },
        });
        if (response.ok) {
          const data = await response.json();
          setChartData(data);
        } else {
          setChartData([]);
        }
      } catch (error) {
        console.error('Gagal mengambil data chart:', error);
        setChartData([]);
      } finally {
        setIsChartLoading(false);
      }
    };
    fetchChart();
  }, [filter]);

  const queueCount = queueData.length;

  const selesaiHariIni = Array.isArray(chartData)
    ? chartData.reduce((sum, t) => sum + (t.validated || t.selesai || 0), 0)
    : 0;
  const trendSelesai = getTrend(chartData, 'validated') || getTrend(chartData, 'selesai');

  const trendAntrean = getTrend(
    chartData.map(d => ({ ...d, pending: (d.masuk || 0) - (d.selesai || d.validated || 0) })),
    'pending'
  );

  const sortedQueue = [...queueData].sort((a, b) => {
    const aPrio = getPriorityLevel(a);
    const bPrio = getPriorityLevel(b);
    const order = { high: 0, medium: 1, low: 2 };
    const diff = (order[aPrio] ?? 2) - (order[bPrio] ?? 2);
    if (diff !== 0) return diff;
    const aTime = toSortableDate(a.earliest_upload || a.tanggal_upload)?.getTime() ?? Infinity;
    const bTime = toSortableDate(b.earliest_upload || b.tanggal_upload)?.getTime() ?? Infinity;
    return aTime - bTime;
  });

  const getUploadTime = (item) =>
    item?.earliest_upload || item?.tanggal_upload || item?.uploaded_at || '-';

  const getFirstSpecimenId = (item) =>
    item?.specimens?.[0]?.id_specimen || null;

  return (
    <div className="h-full flex flex-col bg-slate-50/80 p-4 rounded-2xl gap-6 overflow-hidden">
      
      {/* HEADER */}
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Dokter</h1>
        <p className="text-gray-500 mt-1">Validasi hasil klasifikasi dan tinjauan medis.</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
        <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Antrean Validasi</p>
            <h3 className="text-2xl font-bold text-gray-800">
              {isLoading ? '...' : `${queueCount} Pasien`}
            </h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              Belum divalidasi
              <TrendIndicator trend={trendAntrean} label="Perubahan antrean validasi" reverse />
            </p>
          </div>
          <div className="p-3 rounded-full bg-orange-50 flex items-center justify-center w-14 h-14">
            <ClipboardCheck size={24} className="text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Selesai Hari Ini</p>
            <h3 className="text-2xl font-bold text-gray-800">
              {isChartLoading ? '...' : `${selesaiHariIni} Spesimen`}
            </h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              Tervalidasi hari ini
              <TrendIndicator trend={trendSelesai} label="Perubahan validasi" />
            </p>
          </div>
          <div className="p-3 rounded-full bg-teal-50 flex items-center justify-center w-14 h-14">
            <CheckCircle size={24} className="text-teal-600" />
          </div>
        </div>
      </div>

      {/* TREN + ANTREAN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

        {/* TREN CHART */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 p-5 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h3 className="font-bold text-gray-800">Aktivitas Validasi</h3>
              <p className="text-xs text-gray-400 mt-0.5">Sisa antrean vs selesai divalidasi ({filter})</p>
            </div>
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <option value="Hari Ini">Hari Ini</option>
                <option value="Harian">Harian</option>
                <option value="Mingguan">Mingguan</option>
                <option value="Bulanan">Bulanan</option>
                <option value="Tahunan">Tahunan</option>
              </select>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            {isChartLoading ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">Memuat...</div>
            ) : (
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value, name) => [
                        `${value} spesimen`,
                        name === 'validated' ? 'Tervalidasi' : 'Menunggu'
                      ]}
                    />
                    <Bar dataKey="validated" name="validated" fill="#3B82F6" barSize={20} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="pending" barSize={20} radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ANTREAN LIST - DIBATASI 4 ITEM MAKSIMAL (max-h-[300px]) */}
        <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Antrean Validasi</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Prioritas waktu tunggu</p>
            </div>
            <button
              onClick={() => navigate('/doctor/validation')}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
            >
              Semua →
            </button>
          </div>

          {/* PERBAIKAN: max-h-[300px] akan mengunci tingginya persis untuk menampung ~4 item pasien */}
          <div className="divide-y divide-gray-50 flex-1 overflow-y-auto max-h-[250px] pr-1">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-gray-400">Memuat...</div>
            ) : sortedQueue.length > 0 ? (
              sortedQueue.map((patient, idx) => {
                const priority = getPriorityLevel(patient);
                const badge = PRIORITY_LABELS[priority];
                return (
                  <div key={patient.id_pasien || `p-${idx}`} className="p-3 hover:bg-blue-50/30 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-bold text-gray-800 truncate max-w-[120px]">{patient.nama_pasien}</p>
                      <span className="text-[10px] text-gray-400 shrink-0">{getUploadTime(patient)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {badge ? (
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${badge.className}`}>
                          {badge.label}
                        </span>
                      ) : <span />}
                      <button
                        onClick={() => navigate(`/doctor/validation/${getFirstSpecimenId(patient)}`)}
                        className="text-[10px] bg-primary hover:bg-blue-700 text-white px-3 py-1 rounded-lg font-bold transition-all active:scale-95"
                      >
                        Validasi
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-gray-400">Tidak ada antrean.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;