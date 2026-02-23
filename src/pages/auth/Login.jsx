import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Microscope } from 'lucide-react'; // Icon library
import logoPens from '../../assets/react.svg'; // Ganti dengan path logo PENS kamu nanti

const Login = () => {
  const navigate = useNavigate();
  
  // State untuk input form
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  // State untuk toggle lihat password
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Handle perubahan input
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Reset error saat mengetik
  };

  // Handle Submit (Simulasi Login Sementara)
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // LOGIKA SEMENTARA (Hardcode) untuk tes navigasi antar role
    // Nanti ini diganti dengan Axios ke Django
    const { username, password } = formData;

    if (username === 'admin') {
      navigate('/admin');
    } else if (username === 'dokter') {
      navigate('/doctor');
    } else if (username === 'analis') {
      navigate('/analyst');
    } else {
      setError('Username atau password salah! (Coba: admin/dokter/analis)');
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      
      {/* BAGIAN KIRI - Branding (Hanya muncul di layar laptop/besar) */}
      <div className="hidden md:flex md:w-1/2 bg-primary flex-col justify-center items-center text-white p-10 relative overflow-hidden">
        {/* Hiasan background circle */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full translate-x-1/2 translate-y-1/2"></div>
        
        <div className="z-10 text-center space-y-6 max-w-lg">
            <div className="bg-white/20 p-4 rounded-full inline-block mb-4">
                <Microscope size={64} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold leading-tight">
                Sistem Klasifikasi Bakteri Gram
            </h1>
        </div>
      </div>

      {/* BAGIAN KANAN - Form Login */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center bg-white p-8 md:p-12">
        <div className="w-full max-w-md space-y-8">
            
            {/* Header Form */}
            <div className="text-center">
                <img src={logoPens} alt="Logo PENS" className="h-16 mx-auto mb-4" /> 
                <h2 className="text-2xl font-bold text-gray-900">Selamat Datang</h2>
                <p className="text-gray-500 mt-2">Silakan masuk menggunakan akun Anda</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 mt-8">
                
                {/* Alert Error */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-200">
                        {error}
                    </div>
                )}

                {/* Input Username */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">Username</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            name="username"
                            required
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors outline-none"
                            placeholder="Masukkan username anda"
                            value={formData.username}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Input Password */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">Password</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required
                            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors outline-none"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                            ) : (
                                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Tombol Login */}
                <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform hover:scale-[1.02]"
                >
                    Masuk ke Sistem
                </button>
            </form>

            <div className="mt-6 text-center text-xs text-gray-400">
                &copy; 2026 Politeknik Elektronika Negeri Surabaya
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;