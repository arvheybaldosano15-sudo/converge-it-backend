import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ onSearch, placeholder = 'Search tickets, customers...', className = '' }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(value);
    }, 400);
    return () => clearTimeout(handler);
  }, [value, onSearch]);

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="glass-input w-full pl-10 pr-10 py-2 rounded-xl text-sm placeholder:text-slate-500"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="absolute right-3 text-slate-400 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
