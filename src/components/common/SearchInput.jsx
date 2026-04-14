import React from 'react';
import { Search } from 'lucide-react';

const SearchInput = ({ value, onChange, placeholder, className = '' }) => {
  return (
    <div className={`relative ${className}`.trim()}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm transition-all"
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default SearchInput;
