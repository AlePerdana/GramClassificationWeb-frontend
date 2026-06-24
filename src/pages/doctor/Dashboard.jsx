import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../service/authService';
import { 
  Users, ClipboardCheck, Clock, CheckCircle, 
  AlertCircle, ChevronRight, Activity, TrendingUp,
  Calendar, ArrowUpRight,
  Filter,
  AlertTriangle,
  ArrowRight,
  Stethoscope
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { APP_CONFIG } from '../../utils/constant';

// Menggunakan aset yang sama agar konsisten
import bakteriIcon from '../../assets/bakteri.png'; 

const API_BASE_URL = APP_CONFIG.API_HOST;

// --- DATA DUMMY (Konteks: Validasi Dokter) ---

// 1. Filter: HARI INI (Performa Validasi per Jam)
const dataHariIni = [
  { name: '09:00', pending: 4, validated: 2 },
  { name: '11:00', pending: 6, validated: 5 },
  { name: '13:00', pending: 3, validated: 6 },
  { name: '15:00', pending: 5, validated: 4 },
];

// 2. Filter: HARIAN
const dataHarian = [
  { name: 'Sen', pending: 5, validated: 15 },
  { name: 'Sel', pending: 8, validated: 12 },
  { name: 'Rab', pending: 4, validated: 20 },
  { name: 'Kam', pending: 6, validated: 18 },
  { name: 'Jum', pending: 10, validated: 8 }, 
  { name: 'Sab', pending: 2, validated: 5 },
];

// 3. Filter: MINGGUAN
const dataMingguan = [
  { name: 'Mg 1', pending: 20, validated: 80 },
  { name: 'Mg 2', pending: 15, validated: 95 },
  { name: 'Mg 3', pending: 25, validated: 85 },
  { name: 'Mg 4', pending: 10, validated: 110 },
];

// 4. Filter: TAHUNAN
const dataTahunan = [
  { name: '2023', pending: 150, validated: 2000 },
  { name: '2024', pending: 120, validated: 2400 },
  { name: '2025', pending: 80, validated: 3100 },
];



// --- KOMPONEN KARTU STATISTIK (Reusable) ---
const StatCard = ({ title, value, subtext, icon: Icon, imageSrc, color, bg, border }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border ${border || 'border-gray-100'} flex items-start justify-between hover:shadow-md transition-shadow`}>
    <div>
      <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      <p className="text-xs text-gray-400 mt-1">{subtext}</p>
    </div>
    
    <div className={`p-3 rounded-full ${bg} flex items-center justify-center w-14 h-14`}>
      {imageSrc ? (
        <img src={imageSrc} alt="Icon" className="w-8 h-8 object-contain opacity-90" />
      ) : (
        <Icon size={24} className={color} />
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('Harian');
  const [validationQueue, setValidationQueue] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isChartLoading, setIsChartLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      setIsChartLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/doctor/dashboard-chart?filter=${filter}`, {
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
          setChartData(data);
        }
      } catch (error) {
        console.error('Gagal mengambil data chart:', error);
      } finally {
        setIsChartLoading(false);
      }
    };
    fetchChartData();
  }, [filter]);

  useEffect(() => {
    const fetchQueue = async () => {
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

        if (!response.ok) {
          setValidationQueue([]);
          return;
        }

        const result = await response.json();
        const payload = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : [];

        const mapped = payload
          .map((item) => {
            const dateStr = item.earliest_upload;
            const diff = dateStr ? Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000) : 0;
            const urgency = diff > 15 ? 'high' : diff > 5 ? 'medium' : 'low';
            return {
              id: item?.specimens?.[0]?.id_specimen ?? item?.id_specimen ?? item?.specimen_id ?? item?.id,
              name: item?.nama_pasien || item?.patient_name || '-',
              result: item?.hasil_gram || 'Menunggu Validasi',
              confidence: item?.confidence ? `${item.confidence}%` : '-',
              urgency,
              sortTime: dateStr ? new Date(dateStr).getTime() : 0,
            };
          })
          .sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            const d = order[a.urgency] - order[b.urgency];
            return d !== 0 ? d : a.sortTime - b.sortTime;
          });

        setValidationQueue(mapped);
      } catch (error) {
        console.error('Gagal mengambil antrean validasi dokter:', error);
        setValidationQueue([]);
      }
    };

    fetchQueue();
  }, [navigate]);

  const queueCount = validationQueue.length;

  const goToValidationDetail = (specimenId) => {
    if (!specimenId) {
      navigate('/doctor/validation');
      return;
    }
    navigate(`/doctor/validation/${specimenId}`);
  };

  const getChartData = () => {
    if (chartData && chartData.length > 0) return chartData;
    switch (filter) {
      case 'Hari Ini': return dataHariIni;
      case 'Harian': return dataHarian;
      case 'Mingguan': return dataMingguan;
      case 'Bulanan': return [
        { name: 'Jan', pending: 15, validated: 90 },
        { name: 'Feb', pending: 20, validated: 110 },
        { name: 'Mar', pending: 12, validated: 130 },
        { name: 'Apr', pending: 18, validated: 105 },
        { name: 'Mei', pending: 25, validated: 125 },
        { name: 'Jun', pending: 14, validated: 140 },
        { name: 'Jul', pending: 19, validated: 130 },
        { name: 'Agt', pending: 22, validated: 135 },
        { name: 'Sep', pending: 15, validated: 150 },
        { name: 'Okt', pending: 10, validated: 165 },
        { name: 'Nov', pending: 17, validated: 145 },
        { name: 'Des', pending: 12, validated: 170 },
      ];
      case 'Tahunan': return dataTahunan;
      default: return dataHarian;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Dokter</h1>
          <p className="text-gray-500 mt-1">Validasi hasil klasifikasi dan tinjauan medis</p>
        </div>
      </div>

      {/* 1. STATISTIK UTAMA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KARTU 1: Menunggu Validasi (Paling Kritis) */}
        <StatCard 
          title="Menunggu Validasi" 
          value={`${queueCount} Pasien`} 
          subtext="Belum Divalidasi"
          icon={ClipboardCheck} 
          color="text-orange-600" 
          bg="bg-orange-50"
          border="border-orange-100" // Highlight border agar mencolok
        />
        
        {/* KARTU 2: Positif Dikonfirmasi */}
        <StatCard 
          title="Positif Tervalidasi" 
          value="85 Kasus" 
          subtext="Bulan ini"
          imageSrc={bakteriIcon} 
          bg="bg-teal-50" // Ganti ke Teal/Hijau Medis
        />
        
        {/* KARTU 3: Negatif Dikonfirmasi */}
        <StatCard 
          title="Negatif Tervalidasi" 
          value="42 Kasus" 
          subtext="Bulan ini"
          imageSrc={bakteriIcon} 
          bg="bg-rose-50" // Merah muda lembut
        />
      </div>

      {/* 2. AREA VISUALISASI DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KIRI: Grafik Aktivitas Validasi (Area Chart) */}
        {/* Menggunakan Area Chart agar beda nuansa dengan Bar Chart Analis */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          
          <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="font-bold text-gray-800">Aktivitas Validasi</h3>
                <p className="text-xs text-gray-400 mt-0.5">Sisa Antrean vs Selesai Divalidasi</p>
            </div>
            
            {/* Filter Dropdown */}
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
          
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getChartData()} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValidated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9CA3AF'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9CA3AF'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                
                {/* Area Hijau = Sudah Divalidasi */}
                <Area 
                  type="monotone" 
                  dataKey="validated" 
                  name="Tervalidasi" 
                  stroke="#3B82F6" 
                  fillOpacity={1} 
                  fill="url(#colorValidated)" 
                  strokeWidth={2}
                />
                
                {/* Area Kuning = Pending (Sisa beban kerja) */}
                <Area 
                    type="monotone" 
                    dataKey="pending" 
                    name="Menunggu" 
                  stroke="#94a3b8" 
                    fillOpacity={1} 
                    fill="url(#colorPending)" 
                    strokeWidth={2}
                    strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KANAN: Daftar Tugas Validasi */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">Antrean Validasi</h3>
            <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} /> {queueCount} Menunggu
            </span>
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-1 scrollbar-thin scrollbar-thumb-gray-200">
            {validationQueue.map((patient) => (
              <div key={patient.id} className="p-4 border border-gray-100 rounded-xl hover:border-teal-200 hover:shadow-md transition-all group bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{patient.name}</p>
                    {patient.urgency === 'high' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 mt-1">
                        <AlertTriangle size={10} /> Prioritas Tinggi
                      </span>
                    )}
                    {patient.urgency === 'medium' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-yellow-600 mt-1">
                        <Clock size={10} /> Prioritas Sedang
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded font-bold ${
                      patient.result === 'Gram Positif' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {patient.result}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-end">
                    <button
                      onClick={() => goToValidationDetail(patient.id)}
                      className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-teal-700 transition-colors flex items-center gap-1 font-medium w-full justify-center"
                    >
                        <ClipboardCheck size={14} /> Periksa & Validasi
                    </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-50 text-center">
            <p className="text-xs text-gray-400">
                Data real-time dari hasil klasifikasi Analis.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;