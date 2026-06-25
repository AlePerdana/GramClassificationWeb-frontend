import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../service/authService';
import { APP_CONFIG } from '../../utils/constant';
import {
  Filter,
  Users,
  ClipboardCheck,
  CheckCircle,
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
// Shows arrow + count difference (e.g. "↑ 5" or "↓ 3").
// `reverse` flips the color logic: pass reverse=true when "up is bad" (queue/waiting).
const TrendIndicator = ({ trend, label, reverse }) => {
  if (!trend) return null;
  const diff = (trend.current ?? 0) - (trend.previous ?? 0);
  if (diff === 0) {
    return <span className="text-[11px] text-gray-400 font-medium" title={label}>→ 0</span>;
  }
  const isUp = diff > 0;
  // For reverse (queue): up=bad(red), down=good(green)
  // For normal (diproses): up=good(green), down=bad(red)
  const isGood = reverse ? !isUp : isUp;
  const color = isGood ? 'text-green-600' : 'text-red-600';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${color}`} title={label}>
      {isUp ? '↑' : '↓'} {Math.abs(diff)}
    </span>
  );
};

const Dashboard = () => {
  const [pendingPatients, setPendingPatients] = useState([]);
  const [waitingValidationPatients, setWaitingValidationPatients] = useState([]);
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [filter, setFilter] = useState('Hari Ini');
  const [statsData, setStatsData] = useState({ throughput: [] });
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

  useEffect(() => {
    const fetchPatients = async () => {
      setIsQueueLoading(true);
      try {
        const authHeaders = authService.getAuthorizationHeader();
        const [pendingRes, waitingRes] = await Promise.all([
          fetch(`${API_BASE_URL}/patients?specimen_status=pending&include_no_specimen=true`, {
            method: 'GET',
            headers: { Accept: 'application/json', ...authHeaders },
          }),
          fetch(`${API_BASE_URL}/patients?specimen_status=waiting_validation&include_no_specimen=false`, {
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

        setPendingPatients(Array.isArray(pendingData?.data) ? pendingData.data : Array.isArray(pendingData) ? pendingData : []);
        setWaitingValidationPatients(Array.isArray(waitingData?.data) ? waitingData.data : Array.isArray(waitingData) ? waitingData : []);
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

  const queueCount = waitingQueue.length + waitingValidationPatients.length;
  const waitingCount = waitingValidationPatients.length;
  const totalDiproses = Array.isArray(statsData.throughput)
    ? statsData.throughput.reduce((sum, t) => sum + (t.diterima || 0), 0)
    : 0;

  const getBarColor = (entry) => {
    if (entry.diterima > 0 && entry.terkirim === 0) return '#ef4444';
    if (entry.diterima > entry.terkirim * 2) return '#f59e0b';
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Antrean Pending</p>
            <h3 className="text-2xl font-bold text-gray-800">{queueCount} Pasien</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              Menunggu diproses
              <TrendIndicator trend={statsData?.trends?.pending} label="Perubahan antrean pending" reverse />
            </p>
          </div>
          <div className="p-3 rounded-full bg-amber-50 flex items-center justify-center w-14 h-14">
            <Users size={24} className="text-amber-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Menunggu Dokter</p>
            <h3 className="text-2xl font-bold text-gray-800">{waitingCount} Pasien</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              Menunggu validasi dokter
              <TrendIndicator trend={statsData?.trends?.waiting} label="Perubahan antrean dokter" reverse />
            </p>
          </div>
          <div className="p-3 rounded-full bg-blue-50 flex items-center justify-center w-14 h-14">
            <ClipboardCheck size={24} className="text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md shadow-slate-300/40 border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Diproses</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalDiproses} Spesimen</h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              Periode {filter.toLowerCase()}
              <TrendIndicator trend={statsData?.trends?.diproses} label="Perubahan spesimen diproses" />
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
              <h3 className="font-bold text-gray-800">Tren Pemrosesan</h3>
              <p className="text-xs text-gray-400 mt-0.5">Spesimen diterima vs terkirim ke dokter ({filter})</p>
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData.throughput} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value, name) => [`${value} spesimen`, name === 'diterima' ? 'Diterima' : 'Terkirim']}
                />
                <Bar dataKey="diterima" name="diterima" fill="#3B82F6" barSize={20} radius={[4, 4, 0, 0]} />
                <Bar dataKey="terkirim" name="terkirim" barSize={20} radius={[4, 4, 0, 0]}>
                  {statsData.throughput.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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