import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../service/authService';
import { APP_CONFIG } from '../../utils/constant';
import {
  Clock,
  ArrowRight,
  Filter,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import bakteriIcon from '../../assets/bakteri.png';

const dataHariIni = [
  { name: '08:00', masuk: 5, selesai: 4 },
  { name: '10:00', masuk: 8, selesai: 6 },
  { name: '12:00', masuk: 4, selesai: 4 },
  { name: '14:00', masuk: 7, selesai: 5 },
  { name: '16:00', masuk: 3, selesai: 3 },
];

const dataHarian = [
  { name: 'Sen', masuk: 24, selesai: 20 },
  { name: 'Sel', masuk: 18, selesai: 18 },
  { name: 'Rab', masuk: 30, selesai: 25 },
  { name: 'Kam', masuk: 22, selesai: 22 },
  { name: 'Jum', masuk: 15, selesai: 10 },
  { name: 'Sab', masuk: 10, selesai: 10 },
];

const dataMingguan = [
  { name: 'Mg 1', masuk: 120, selesai: 110 },
  { name: 'Mg 2', masuk: 145, selesai: 130 },
  { name: 'Mg 3', masuk: 100, selesai: 95 },
  { name: 'Mg 4', masuk: 160, selesai: 140 },
];

const dataTahunan = [
  { name: '2023', masuk: 3200, selesai: 3150 },
  { name: '2024', masuk: 4500, selesai: 4400 },
  { name: '2025', masuk: 5100, selesai: 5000 },
  { name: '2026', masuk: 1200, selesai: 1150 },
];

const StatCard = ({ title, value, subtext, icon, imageSrc, color, bg }) => {
  const IconComponent = icon;

  return (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      <p className="text-xs text-gray-400 mt-1">{subtext}</p>
    </div>
    <div className={`p-3 rounded-full ${bg} flex items-center justify-center w-14 h-14`}>
      {imageSrc ? (
        <img src={imageSrc} alt="Icon" className="w-8 h-8 object-contain opacity-80" />
      ) : (
        <IconComponent size={24} className={color} />
      )}
    </div>
  </div>
  );
};

const Dashboard = () => {
  const API_BASE_URL = APP_CONFIG.API_BASE_URL;
  const [pendingPatients, setPendingPatients] = useState([]);
  const [waitingValidationPatients, setWaitingValidationPatients] = useState([]);
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [filter, setFilter] = useState('Harian');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatients = async () => {
      setIsQueueLoading(true);
      try {
        const authHeaders = authService.getAuthorizationHeader();

        const [pendingRes, waitingRes] = await Promise.all([
          fetch(`${API_BASE_URL}/patients?specimen_status=pending&include_no_specimen=true`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              ...authHeaders,
            },
          }),
          fetch(`${API_BASE_URL}/patients?specimen_status=waiting_validation&include_no_specimen=false`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              ...authHeaders,
            },
          }),
        ]);

        if (pendingRes.status === 401 || waitingRes.status === 401) {
          authService.clearSession();
          navigate('/login');
          return;
        }

        const pendingData = pendingRes.ok ? await pendingRes.json() : [];
        const waitingData = waitingRes.ok ? await waitingRes.json() : [];

        setPendingPatients(Array.isArray(pendingData) ? pendingData : []);
        setWaitingValidationPatients(Array.isArray(waitingData) ? waitingData : []);
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

  const waitingQueue = pendingPatients.map((p) => ({
    id: p.id_pasien || p.id,
    patientId: p.id || p.id_pasien,
    name: p.nama_lengkap || p.name || '-',
    time: p.created_at
      ? new Date(p.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : '-',
    status: 'Menunggu Sampel',
  }));

  const queueCount = waitingQueue.length + waitingValidationPatients.length;

  const handleInputSample = (patientId) => {
    navigate(`/analyst/classification/${patientId}`);
  };

  const getChartData = () => {
    switch (filter) {
      case 'Hari Ini': return dataHariIni;
      case 'Harian': return dataHarian;
      case 'Mingguan': return dataMingguan;
      case 'Tahunan': return dataTahunan;
      default: return dataHarian;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Analis</h1>
        <p className="text-gray-500 mt-1">Pantau antrean pasien dan progres klasifikasi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Antrean Pasien"
          value={`${queueCount} Orang`}
          subtext="Belum diproses"
          icon={Clock}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <StatCard title="Gram Positif" value="12 Sampel" subtext="Hari ini" imageSrc={bakteriIcon} bg="bg-blue-100" />
        <StatCard title="Gram Negatif" value="8 Sampel" subtext="Hari ini" imageSrc={bakteriIcon} bg="bg-red-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-gray-800">Tren Produktivitas</h3>
              <p className="text-xs text-gray-400 mt-0.5">Sampel Masuk vs Selesai ({filter})</p>
            </div>
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
                <option value="Tahunan">Tahunan</option>
              </select>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getChartData()} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSelesai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="masuk" name="Sampel Masuk" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorMasuk)" />
                <Area type="monotone" dataKey="selesai" name="Selesai" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSelesai)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">Antrean Pasien</h3>
            <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} /> {queueCount} Menunggu
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-1 scrollbar-thin scrollbar-thumb-gray-200">
            {isQueueLoading ? (
              <div className="p-4 text-sm text-gray-500">Memuat antrean pasien...</div>
            ) : waitingQueue.length > 0 ? (
              waitingQueue.map((patient) => (
                <div key={patient.id} className="p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all group bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{patient.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{patient.id}</p>
                    </div>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded font-medium">{patient.time}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                      <AlertCircle size={10} /> {patient.status}
                    </span>

                    <button
                      onClick={() => handleInputSample(patient.patientId)}
                      className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-1 font-medium group-hover:scale-105 transform duration-200"
                    >
                      Input Sampel <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-gray-500">Tidak ada antrean pasien menunggu sampel.</div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-50 text-center">
            <p className="text-xs text-gray-400">Data disinkronkan dari Admin pendaftaran.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;