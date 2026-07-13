import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../service/authService';
import { APP_CONFIG } from '../../utils/constant';
import {
  Filter,
  Users,
  ClipboardCheck,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const API_BASE_URL = APP_CONFIG.API_BASE_URL;

const getPriorityBadge = (level) => {
  if (level === 'high') return { label: 'Sangat prioritas', className: 'bg-red-50 text-red-700 border border-red-100' };
  if (level === 'medium') return { label: 'Penting', className: 'bg-amber-50 text-amber-700 border border-amber-100' };
  if (level === 'low') return { label: 'Belum prioritas', className: 'bg-slate-50 text-slate-600 border border-slate-200' };
  return null;
};

// --- KOMPONEN TREND INDICATOR MINI ---
// `reverse` = up=red(bad), down=green(good) — untuk antrean.
// `alwaysUp` = selalu hijau dengan jumlah saat ini — untuk selesai.
// `flat` = abu-abu, tanpa warna — untuk status diam/tidak ada aktivitas.
// `inflow`/`outflow` = menampilkan panah ganda untuk arus masuk/keluar.
const TrendIndicator = ({ trend, label, reverse, alwaysUp, flat, inflow, outflow }) => {
  if (alwaysUp && trend) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-green-600" title={label}>
        ↑{trend.current ?? 0}
      </span>
    );
  }

  // Mode inflow/outflow: tampilkan kedua panah (↑ inflow ↓ outflow)
  if (inflow !== undefined || outflow !== undefined) {
    const hasInflow = (inflow ?? 0) > 0;
    const hasOutflow = (outflow ?? 0) > 0;
    if (!hasInflow && !hasOutflow) {
      return <span className="text-[11px] text-gray-400 font-medium">→ 0</span>;
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold" title={label}>
        {hasInflow && <span className="text-red-600">↑{inflow}</span>}
        {hasOutflow && <span className="text-green-600">↓{outflow}</span>}
      </span>
    );
  }

  if (!trend) return null;
  const diff = (trend.current ?? 0) - (trend.previous ?? 0);

  // flat = abu-abu tanpa perubahan
  if (flat || diff === 0) {
    return <span className="text-[11px] text-gray-400 font-medium" title={label}>→{trend.current ?? 0}</span>;
  }

  const isUp = diff > 0;
  const isGood = reverse ? !isUp : isUp;
  const color = isGood ? 'text-green-600' : 'text-red-600';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${color}`} title={label}>
      {isUp ? '↑' : '↓'}{Math.abs(diff)}
    </span>
  );
};

const Dashboard = () => {
  const [pendingPatients, setPendingPatients] = useState([]);
  const [waitingValidationPatients, setWaitingValidationPatients] = useState([]);
  const [revisionPatients, setRevisionPatients] = useState([]);
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [filter, setFilter] = useState('Hari Ini');
  const [statsData, setStatsData] = useState({ throughput: [] });
  const [chartData, setChartData] = useState([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/analyst/dashboard-stats?filter=${filter}`, {
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
        if (response.ok) {
          const data = await response.json();
          setStatsData(data);
        }
      } catch (error) {
        console.error('Gagal mengambil data statistik:', error);
      }
    };
    fetchStats();
  }, [API_BASE_URL, filter, navigate]);

  // Fetch chart data (sisa antrean vs selesai proses)
  useEffect(() => {
    const fetchChart = async () => {
      setIsChartLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/analyst/dashboard-chart?filter=${filter}`, {
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

  useEffect(() => {
    const fetchPatients = async () => {
      setIsQueueLoading(true);
      try {
        const authHeaders = authService.getAuthorizationHeader();
        const [pendingRes, waitingRes, revisionRes] = await Promise.all([
          fetch(`${API_BASE_URL}/patients?specimen_status=pending&include_no_specimen=true`, {
            method: 'GET',
            headers: { Accept: 'application/json', ...authHeaders },
          }),
          fetch(`${API_BASE_URL}/patients?specimen_status=waiting_validation&include_no_specimen=false`, {
            method: 'GET',
            headers: { Accept: 'application/json', ...authHeaders },
          }),
          fetch(`${API_BASE_URL}/patients?specimen_status=revision&include_no_specimen=false`, {
            method: 'GET',
            headers: { Accept: 'application/json', ...authHeaders },
          }),
        ]);

        if (pendingRes.status === 401 || waitingRes.status === 401) {
          authService.clearSession();
          navigate('/login');
          return;
        }

        const pendingData = pendingRes.ok ? await pendingRes.json() : [];
        const waitingData = waitingRes.ok ? await waitingRes.json() : [];
        const revisionData = revisionRes.ok ? await revisionRes.json() : [];

        setPendingPatients(Array.isArray(pendingData?.data) ? pendingData.data : Array.isArray(pendingData) ? pendingData : []);
        setWaitingValidationPatients(Array.isArray(waitingData?.data) ? waitingData.data : Array.isArray(waitingData) ? waitingData : []);
        setRevisionPatients(Array.isArray(revisionData?.data) ? revisionData.data : Array.isArray(revisionData) ? revisionData : []);
      } catch (error) {
        console.error('Gagal mengambil antrean pasien:', error);
        setPendingPatients([]);
        setWaitingValidationPatients([]);
      } finally {
        setIsQueueLoading(false);
      }
    };
    fetchPatients();
  }, [API_BASE_URL, navigate]);

  const waitingQueue = pendingPatients
    .map((p) => {
      const dateStr = p.created_at || p.waktu_masuk;
      const diff = dateStr ? Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000) : 0;
      const priority = diff > 15 ? 'high' : diff > 5 ? 'medium' : 'low';
      return {
        id: p.id_pasien || p.id,
        patientId: p.id || p.id_pasien,
        name: p.nama_lengkap || p.name || '-',
        waktu: dateStr
          ? new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '-',
        priority,
      };
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

  const queueCount = waitingQueue.length;
  const waitingCount = waitingValidationPatients.length;
  const revisionCount = revisionPatients.length;
  const totalDiproses = statsData?.validated_count ?? 0;

  const getBarColor = (entry) => {
    if (entry.masuk > 0 && entry.selesai === 0) return '#ef4444';
    if (entry.masuk > entry.selesai * 2) return '#f59e0b';
    return '#22c55e';
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/80 p-4 rounded-2xl gap-6 overflow-hidden">
      
      {/* HEADER */}
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Analis</h1>
        <p className="text-gray-500 mt-1">Pantau antrean pasien dan kinerja pemrosesan spesimen.</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
        <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Antrean Pending</p>
            <h3 className="text-2xl font-bold text-gray-800">{queueCount} Pasien</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              Menunggu diproses
              <TrendIndicator label="Arus antrean pending" inflow={waitingQueue.length} outflow={waitingValidationPatients.length} />
            </p>
          </div>
          <div className="p-3 rounded-full bg-amber-50 flex items-center justify-center w-14 h-14">
            <Users size={24} className="text-amber-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Menunggu Validasi</p>
            <h3 className="text-2xl font-bold text-gray-800">{waitingCount} Pasien</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              Menunggu validasi dokter
              <TrendIndicator label="Arus antrean dokter" inflow={waitingValidationPatients.length} outflow={statsData?.validated_count ?? 0} />
            </p>
          </div>
          <div className="p-3 rounded-full bg-blue-50 flex items-center justify-center w-14 h-14">
            <ClipboardCheck size={24} className="text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Revisi Analis</p>
            <h3 className="text-2xl font-bold text-gray-800">{revisionCount} Pasien</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              Menunggu perbaikan Anda
              <TrendIndicator trend={statsData?.trends?.revision} label="Total revisi" reverse />
            </p>
          </div>
          <div className="p-3 rounded-full bg-amber-50 flex items-center justify-center w-14 h-14">
            <RotateCcw size={24} className="text-amber-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Selesai Proses</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalDiproses} Pasien</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              Tervalidasi dokter
              <TrendIndicator trend={statsData?.trends?.diproses} label="Total tervalidasi" />
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
              <h3 className="font-bold text-gray-800">Aktivitas Pemrosesan</h3>
              <p className="text-xs text-gray-400 mt-0.5">Sisa antrean vs selesai diproses (pasien) ({filter})</p>
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
            <div className="absolute inset-0">
            {isChartLoading ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">Memuat...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value, name) => [`${value} pasien`, name === 'validated' ? 'Selesai Proses' : 'Sisa Antrean']}
                  />
                  <Bar dataKey="validated" name="validated" fill="#3B82F6" barSize={20} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="pending" barSize={20} radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            </div>
          </div>
        </div>

        {/* ANTREAN LIST */}
        <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Antrean Pasien</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Prioritas waktu tunggu</p>
            </div>
            <button
              onClick={() => navigate('/analyst/patients')}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
            >
              Semua →
            </button>
          </div>

          <div className="divide-y divide-gray-50 flex-1 overflow-y-auto max-h-[250px] pr-1">
            {isQueueLoading ? (
              <div className="p-6 text-center text-xs text-gray-400">Memuat...</div>
            ) : waitingQueue.length > 0 ? (
              waitingQueue.map((patient) => (
                <div key={patient.id} className="p-3 hover:bg-blue-50/30 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-gray-800 truncate max-w-[120px]">{patient.name}</p>
                    <span className="text-[10px] text-gray-400 shrink-0">{patient.waktu}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    {(() => {
                      const badge = getPriorityBadge(patient.priority);
                      return badge ? (
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${badge.className}`}>
                          {badge.label}
                        </span>
                      ) : null;
                    })()}
                    <button
                      onClick={() => navigate(`/analyst/classification/${patient.patientId}`)}
                      className="text-[10px] bg-primary hover:bg-blue-700 text-white px-3 py-1 rounded-lg font-bold transition-all active:scale-95"
                    >
                      Proses
                    </button>
                  </div>
                </div>
              ))
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