import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';

const MainLayout = ({ role }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center px-4 shadow-sm">
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
      {/* Margin kiri dinamis mengikuti lebar sidebar */}
      <main
        className={`flex-1 w-full p-4 lg:p-8 pt-20 lg:pt-8 overflow-x-hidden transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        {/* Outlet adalah tempat halaman-halaman (Dashboard, PatientList, dll) akan dirender */}
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;