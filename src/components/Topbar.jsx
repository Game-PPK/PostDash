import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Bell, CheckSquare, Square, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Topbar = ({ currentTab, setCurrentTab, data = [] }) => {
  const { currentUser, logout } = useAuth();
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'customers', label: 'Customers' },
    { id: 'reporting', label: 'Reporting' },
  ];

  const [showNotifications, setShowNotifications] = useState(false);
  const [completedRenewals, setCompletedRenewals] = useState(new Set());
  const notifRef = useRef(null);

  const { expiringCustomers, currentMonthName } = useMemo(() => {
     if (!data || !data.length) return { expiringCustomers: [], currentMonthName: '' };
     const thaiMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
     const shortThaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
     
     const currentMonthIdx = new Date().getMonth();
     const fullMonth = thaiMonths[currentMonthIdx];
     const shortMonth = shortThaiMonths[currentMonthIdx];

     const expiringMap = {};
     data.forEach(row => {
        const name = row['ชื่อบัญชี'];
        const ce = String(row['contractEnd'] || row['วันสิ้นสุดสัญญา'] || '');
        
        const targetMonth = currentMonthIdx + 1;

        let isExpiringThisMonth = ce.includes(fullMonth) || ce.includes(shortMonth);
        
        if (!isExpiringThisMonth && ce.includes('/')) {
           const parts = ce.split('/');
           if (parts.length >= 2) {
              const p0 = parseInt(parts[0], 10);
              const p1 = parseInt(parts[1], 10);
              // Handle both MM/DD/YYYY and DD/MM/YYYY gracefully. 
              // Usually one is > 12, but if both are <= 12, matching either works fine for our simple dashboard.
              if (p0 === targetMonth || p1 === targetMonth) {
                 isExpiringThisMonth = true;
              }
           }
        } else if (!isExpiringThisMonth && ce.includes('-')) {
           const parts = ce.split('-');
           if (parts.length >= 2) {
              const p0 = parseInt(parts[0], 10);
              const p1 = parseInt(parts[1], 10);
              if (p0 === targetMonth || p1 === targetMonth) {
                 isExpiringThisMonth = true;
              }
           }
        }

        if (name && isExpiringThisMonth) {
           if (!expiringMap[name]) {
              expiringMap[name] = { 
                 name, 
                 contractEnd: ce,
                 branch: row[' ชื่อที่ทำการไปรษณีย์'] || row['ชื่อที่ทำการไปรษณีย์']
              };
           }
        }
     });
     return { expiringCustomers: Object.values(expiringMap).sort((a,b) => a.name.localeCompare(b.name)), currentMonthName: fullMonth };
  }, [data]);

  const pendingCount = expiringCustomers.length - completedRenewals.size;

  const toggleRenewalStatus = (name) => {
     setCompletedRenewals(prev => {
        const newSet = new Set(prev);
        if (newSet.has(name)) newSet.delete(name);
        else newSet.add(name);
        return newSet;
     });
  };

  useEffect(() => {
     const closeDropdown = (e) => {
        if (notifRef.current && !notifRef.current.contains(e.target)) {
           setShowNotifications(false);
        }
     };
     if (showNotifications) {
        document.addEventListener('mousedown', closeDropdown);
     }
     return () => document.removeEventListener('mousedown', closeDropdown);
  }, [showNotifications]);

  return (
    <div className="flex items-center justify-between px-8 py-4 bg-[#fdfaf6] border-b border-gray-200 sticky top-0 z-50 hidden sm:flex">
      {/* Logo Area */}
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
          <span className="text-white font-bold text-lg leading-none">P</span>
        </div>
        <span className="text-xl font-semibold text-gray-800 tracking-tight">PostDash</span>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center bg-white rounded-full p-1 border border-gray-100 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
              currentTab === tab.id
                ? 'bg-gray-100 text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Right Icons */}
      <div className="flex items-center space-x-2">
        <div className="relative" ref={notifRef}>
          <button 
             onClick={() => setShowNotifications(!showNotifications)}
             className={`p-2 rounded-full transition-colors relative ${showNotifications ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <Bell size={20} />
            {pendingCount > 0 && (
               <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#fdfaf6]"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 transform origin-top-right transition-all">
               <div className="bg-indigo-600 p-4 text-white">
                 <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold flex items-center"><Calendar size={16} className="mr-2"/> หมดสัญญาเดือนนี้</h3>
                    <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-medium">{pendingCount} pending</span>
                 </div>
                 <p className="text-indigo-100 text-xs font-medium">({currentMonthName}) To-Do List</p>
               </div>
               
               <div className="max-h-[350px] overflow-y-auto p-2">
                  {expiringCustomers.length === 0 ? (
                     <p className="text-sm text-gray-500 text-center py-6">ไม่มีลูกค้าที่หมดสัญญาในเดือนนี้</p>
                  ) : (
                     <div className="space-y-1">
                        {expiringCustomers.map((cust) => {
                           const isCompleted = completedRenewals.has(cust.name);
                           return (
                              <div key={cust.name} onClick={() => toggleRenewalStatus(cust.name)} 
                                   className={`flex items-start p-3 rounded-xl cursor-pointer transition-colors ${isCompleted ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                                 <button className={`mt-0.5 flex-shrink-0 focus:outline-none ${isCompleted ? 'text-green-500' : 'text-gray-300'}`}>
                                    {isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
                                 </button>
                                 <div className="ml-3 min-w-0 flex-1">
                                    <p className={`text-sm font-semibold truncate ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                       {cust.name}
                                    </p>
                                    <p className={`text-xs truncate ${isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
                                       {cust.branch} • สิ้นสุด: {cust.contractEnd}
                                    </p>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  )}
               </div>
            </div>
          )}
        </div>
        <div className="ml-3 flex items-center gap-2">
           <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
           </div>
           <button
              onClick={logout}
              title={`ออกจากระบบ (${currentUser?.email})`}
              className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
           >
              <LogOut size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
