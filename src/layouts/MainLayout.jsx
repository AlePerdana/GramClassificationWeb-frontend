import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { Menu } from 'lucide-react';
import BackendStatusBanner from '../components/BackendStatusBanner';
import { APP_CONFIG } from '../utils/constant';
import authService from '../service/authService';

const MainLayout = ({ role }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isBackendDown, setIsBackendDown] = useState(false);

  // Guard: Redirect to login if not authenticated
  useEffect(() => {
    if (!authService.isLoggedIn()) {
      authService.clearSession();
      navigate('/login');
    }
  }, [navigate]);

  // Health check to detect if backend is down
  useEffect(() => {
    const checkHealth = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(`${APP_CONFIG.API_HOST}/health`, { 
          method: 'GET',
          headers: { 'ngrok-skip-browser-warning': 'true' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Server returned error');
        
        // Ensure it's actually our JSON health endpoint and not an ngrok error page
        const data = await response.json();
        if (data.status !== 'healthy' && data.status !== 'degraded') {
          throw new Error('Invalid response format');
        }

        setIsBackendDown(false);
      } catch (error) {
        setIsBackendDown(true);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => {
      clearInterval(interval);
    };
  }, []);


  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      {/* Global Status Banner */}
      <BackendStatusBanner isDown={isBackendDown} />

      <div className="flex flex-1 relative">
        {/* Mobile Header */}
        <div className={`lg:hidden fixed left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center px-4 shadow-sm transition-all duration-300 ${isBackendDown ? 'top-[45px]' : 'top-0'}`}>
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Buka menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="ml-3 font-bold text-lg text-gray-800 leading-tight">
            Mikrobiologi <span className="text-blue-600">Klinis</span>
          </h1>
        </div>

        {/* Sidebar (Collapsible) */}
        <Sidebar
          role={role}
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* Main Content Area */}
        <main
          className={`flex-1 w-full p-4 lg:p-8 pt-20 lg:pt-8 overflow-x-hidden transition-all duration-300 ${
            isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;