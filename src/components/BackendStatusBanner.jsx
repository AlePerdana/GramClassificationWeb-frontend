import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const BackendStatusBanner = ({ isDown }) => {
  if (!isDown) return null;

  return (
    <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top duration-500 z-[9999]">
      <div className="flex items-center gap-2 text-red-700">
        <AlertCircle size={18} className="shrink-0 text-red-500" />
        <p className="text-sm font-medium">
          <span className="font-bold">Koneksi Server Terkendala:</span> Backend sedang tidak aktif atau tidak dapat dijangkau.
        </p>
      </div>
      
      <div className="hidden md:block h-4 w-px bg-red-200"></div>
      
      <button 
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800 transition-colors bg-white px-2 py-1 rounded border border-red-200 shadow-sm"
      >
        <RefreshCw size={12} />
        REFRESH
      </button>
    </div>
  );
};

export default BackendStatusBanner;
