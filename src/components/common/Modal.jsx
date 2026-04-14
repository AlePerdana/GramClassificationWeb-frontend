import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ isOpen, title, onClose, children, footer }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="sticky top-0 z-10 p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {children}
          {footer ? <div className="pt-4">{footer}</div> : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
