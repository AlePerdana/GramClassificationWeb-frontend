import React from 'react';
import { AlertCircle, Terminal } from 'lucide-react';

const BackendStatusBanner = ({ isDown }) => {
  if (!isDown) return null;

  return (
    <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top duration-500">
      <div className="flex items-center gap-2 text-red-700">
        <AlertCircle size={18} className="shrink-0" />
        <p className="text-sm font-medium">
          <span className="font-bold">Koneksi Server Terkendala:</span> Backend sedang tidak aktif atau tidak dapat dijangkau.
        </p>
      </div>
    </div>
  );
};

export default BackendStatusBanner;
