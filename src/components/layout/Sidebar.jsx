import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  History, 
  LogOut, 
  Microscope, 
  Activity,
  Database,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Sidebar = ({ role, isOpen, toggleSidebar, isMobileOpen, setIsMobileOpen }) => {
  const navigate = useNavigate();

  // Definisi Menu untuk Setiap Role berdasarkan Proposal Bab 3.5
  const menus = {
    admin: [
      { path: '/admin', name: 'Beranda', icon: LayoutDashboard },
      { path: '/admin/models', name: 'Manajemen AI', icon: Activity },
      { path: '/admin/patients', name: 'Manajemen Pasien', icon: Database },
      { path: '/admin/users', name: 'Manajemen Pengguna', icon: Users },
    ],
    dokter: [
      { path: '/doctor', name: 'Beranda', icon: LayoutDashboard },
      { path: '/doctor/validation', name: 'Daftar Validasi', icon: FileText },
      { path: '/doctor/history', name: 'Riwayat', icon: History },
    ],
    analis: [
      { path: '/analyst', name: 'Beranda', icon: LayoutDashboard },
      { path: '/analyst/patients', name: 'Daftar Pasien', icon: FileText },
      { path: '/analyst/history', name: 'Riwayat', icon: History },
    ]
  };

  // Pilih menu berdasarkan role yang aktif
  const currentMenu = menus[role] || [];

  const handleLogout = () => {
    // Nanti tambahkan logika hapus token di sini
    setIsMobileOpen(false);
    navigate('/login');
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`bg-white border-r border-gray-200 min-h-screen flex flex-col shadow-sm fixed h-full top-0 left-0 z-50 transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          lg:translate-x-0 ${isOpen ? 'lg:w-64' : 'lg:w-20'}
        `}
      >
      {/* Logo Area */}
      <div className={`h-16 lg:h-20 flex items-center border-b border-gray-100 relative px-4 ${!isOpen ? 'lg:justify-center' : ''}`}>
        <Microscope className={`w-8 h-8 text-primary flex-shrink-0 ${isOpen || isMobileOpen ? 'mr-3' : 'lg:mr-0'}`} />
        <span
          className={`font-bold text-gray-800 text-lg tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ${
            isOpen || isMobileOpen ? 'w-auto opacity-100' : 'lg:w-0 lg:opacity-0'
          }`}
        >
          Mikrobiologi
        </span>

        <button
          onClick={toggleSidebar}
          className="hidden lg:flex items-center justify-center absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 text-gray-500 hover:text-primary transition-colors"
          aria-label={isOpen ? 'Tutup sidebar' : 'Buka sidebar'}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Menu List */}
      <nav className={`flex-1 py-6 space-y-1 overflow-y-auto ${isOpen || isMobileOpen ? 'px-4' : 'lg:px-2'}`}>
        {currentMenu.map((item, idx) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={idx === 0}
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${!isOpen ? 'lg:justify-center' : ''}`
            }
          >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${isOpen || isMobileOpen ? 'mr-3' : 'lg:mr-0'}`} />
            <span
              className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isOpen || isMobileOpen ? 'w-auto opacity-100' : 'lg:w-0 lg:opacity-0'
              }`}
            >
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* User Profile & Logout (Di Bawah) */}
      <div className="p-4 border-t border-gray-100">
        <div className={`flex items-center mb-4 px-2 ${!isOpen ? 'lg:justify-center' : ''}`}>
          {/* FIX: Added flex-shrink-0, min-w-[32px], and min-h-[32px] */}
          <div className="w-8 h-8 min-w-[32px] min-h-[32px] flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-primary font-bold uppercase">
            {role ? role[0] : 'U'}
          </div>
          {/* Text Container */}
          <div
            className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isOpen || isMobileOpen ? 'ml-3 w-auto opacity-100' : 'lg:ml-0 lg:w-0 lg:opacity-0'
            }`}
          >
            <p className="text-sm font-semibold text-gray-700 capitalize">{role || 'User'}</p>
            <p className="text-xs text-gray-500">Online</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className={`w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
            !isOpen ? 'lg:justify-center' : ''
          }`}
        >
          <LogOut className={`w-5 h-5 flex-shrink-0 ${isOpen || isMobileOpen ? 'mr-3' : 'lg:mr-0'}`} />
          <span
            className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isOpen || isMobileOpen ? 'w-auto opacity-100' : 'lg:w-0 lg:opacity-0'
            }`}
          >
            Keluar
          </span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;