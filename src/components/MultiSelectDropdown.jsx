import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

const MultiSelectDropdown = ({ 
  label, 
  options, 
  selectedValues, 
  onChange, 
  placeholder = "Select...",
  className = "",
  width = "w-40"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (val) => {
    if (val === 'All') {
      onChange([]);
      return;
    }
    const newSelected = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val];
    onChange(newSelected);
  };

  const isAllSelected = selectedValues.length === 0 || selectedValues.length === options.filter(o => o !== 'All').length;

  const getDisplayText = () => {
    if (selectedValues.length === 0) return 'All';
    if (selectedValues.length === 1) return selectedValues[0];
    return `${label} (${selectedValues.length})`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`${width} bg-gray-50 border border-gray-100 text-gray-700 text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer flex justify-between items-center hover:border-indigo-200 transition-colors h-[32px]`}
      >
        <span className="truncate pr-1 font-medium">{getDisplayText()}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-56 bg-white border border-gray-100 rounded-xl shadow-xl max-h-64 overflow-y-auto p-1 animate-in fade-in zoom-in duration-200">
          <div 
            onClick={() => toggleOption('All')}
            className="flex items-center px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors border-b border-gray-50 mb-1"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 ${selectedValues.length === 0 ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
              {selectedValues.length === 0 && <Check size={12} className="text-white" />}
            </div>
            Select All (All)
          </div>
          
          <div className="space-y-0.5">
            {options.filter(o => o !== 'All').map(opt => (
              <div 
                key={opt}
                onClick={() => toggleOption(opt)}
                className="flex items-center px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors ${selectedValues.includes(opt) ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-300 group-hover:border-indigo-300'}`}>
                  {selectedValues.includes(opt) && <Check size={12} className="text-white" />}
                </div>
                <span className="truncate">{opt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
