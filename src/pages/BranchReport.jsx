import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AlertTriangle, MapPin, Building, Search, ArrowRight, RefreshCw, FileSpreadsheet, Image as ImageIcon, Settings } from 'lucide-react';
import Select from 'react-select';
import * as htmlToImage from 'html-to-image';
import * as XLSX from 'xlsx';
import MultiSelectDropdown from '../components/MultiSelectDropdown';

const AtRiskCustomers = ({ data }) => {
  const [selectedProvs, setSelectedProvs] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const reportRef = useRef(null);

  // 1. Calculate the base unique locations to power the filters
  const { allProvinces, allBranches, branchProvMap, monthsList, latestMonth } = useMemo(() => {
     const pSet = new Set();
     const bSet = new Set();
     const mSet = new Set();
     const map = {};
     data.forEach(r => {
        const p = r['จังหวัด'];
        const b = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'];
        const m = r['เดือน'] || r.month;
        const y = r['ปี'] || r.year || 2026;
        if(p) pSet.add(p);
        if(b) {
           bSet.add(b);
           map[b] = p; // naïve mapping, assumes branch names map 1:1 to a province well enough
        }
        if(m) mSet.add(`${m} ${y}`);
     });

     const mToNum = {'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12};
     const sortedMonths = Array.from(mSet).sort((a,b) => {
        const partsA = a.split(' ');
        const partsB = b.split(' ');
        const valA = parseInt(partsA[1] || 0) * 100 + (mToNum[partsA[0]] || 0);
        const valB = parseInt(partsB[1] || 0) * 100 + (mToNum[partsB[0]] || 0);
        return valA - valB;
     });

     return { 
        allProvinces: Array.from(pSet).sort(), 
        allBranches: Array.from(bSet).sort(),
        branchProvMap: map,
        monthsList: sortedMonths,
        latestMonth: sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : ''
     };
  }, [data]);

  const [filterMonth, setFilterMonth] = useState([]);
  useEffect(() => {
     if (latestMonth && filterMonth.length === 0) setFilterMonth([latestMonth]);
  }, [latestMonth]);

  const [showSettings, setShowSettings] = useState(false);
  const [customDropPercent, setCustomDropPercent] = useState(25);
  const [customConsecutiveMonths, setCustomConsecutiveMonths] = useState(3);
  const [customMinRev, setCustomMinRev] = useState(100000);
  const [visibleCount, setVisibleCount] = useState(50);

  // Options for react-select removed

  // Clean up selected branches if they no longer fit the province filter
  const handleProvChange = (selected) => {
     setSelectedProvs(selected || []);
     if ((selected || []).length > 0) {
        const newValidBranches = selectedBranches.filter(b => selected.includes(branchProvMap[b]));
        setSelectedBranches(newValidBranches);
     }
  };

  const handleResetFilters = () => {
    setSelectedProvs([]);
    setSelectedBranches([]);
    setSearchTerm('');
    if (latestMonth) setFilterMonth([latestMonth]);
  };

  // 2. Group data by customer and calculate timeline
  const atRiskCustomers = useMemo(() => {
    if (filterMonth.length === 0) return [];
    
    const custMap = {};
    const fm = filterMonth[0]; // For historical analysis, use the first selected month as target
    
    // Parse target month filter limit
    const targetMToNum = {'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12};
    const fmParts = fm.split(' ');
    const targetVal = parseInt(fmParts[1] || 0) * 100 + (targetMToNum[fmParts[0]] || 0);

    // Filter chronological
    const filteredData = data.filter(r => {
       const mPart = r['เดือน'] || r.month;
       const yPart = r['ปี'] || r.year || 2026;
       const val = parseInt(yPart) * 100 + (targetMToNum[mPart] || 0);
       return val <= targetVal; // Only keep data up to the selected month
    });

    filteredData.forEach(row => {
      const name = row['ชื่อบัญชี'];
      const prov = row['จังหวัด'];
      const branch = row[' ชื่อที่ทำการไปรษณีย์'] || row['ชื่อที่ทำการไปรษณีย์'];
      
      if (!name) return;

      if (!custMap[name]) {
        custMap[name] = { 
          name, 
          branch, 
          province: prov,
          type: row['ประเภทบริการ'] || row['ชื่อบริการ'] || '-',
          totalRev: 0,
          monthlyDataArr: []
        };
      }
      const rev = parseFloat(row['รายได้']) || parseFloat(String(row['รายได้']).replace(/,/g, '')) || 0;
      custMap[name].totalRev += rev;
      
      const monthYear = `${row['เดือน'] || row.month} ${row['ปี'] || row.year}`;
      let mth = custMap[name].monthlyDataArr.find(m => m.month === monthYear);
      if (!mth) {
         mth = { month: monthYear, revenue: 0 };
         custMap[name].monthlyDataArr.push(mth);
      }
      mth.revenue += rev;
    });

    Object.values(custMap).forEach(cust => {
        // Sort the custom array chronologically
        cust.monthlyDataArr.sort((a,b) => {
            const pa = a.month.split(' ');
            const pb = b.month.split(' ');
            const va = parseInt(pa[1]||2026)*100 + (targetMToNum[pa[0]]||0);
            const vb = parseInt(pb[1]||2026)*100 + (targetMToNum[pb[0]]||0);
            return va - vb;
        });

        // Pad the selected month if it's missing (it means revenue was 0 in filterMonth)
        if (cust.monthlyDataArr.length > 0) {
            const lastMth = cust.monthlyDataArr[cust.monthlyDataArr.length - 1].month;
            if (fm && lastMth !== fm) {
                cust.monthlyDataArr.push({ month: fm, revenue: 0 });
            }
        }
    });

    // Evaluate Risk
    const risks = [];
    Object.values(custMap).forEach(cust => {
        let isRisk = false;
        let riskReason = [];
        const arr = cust.monthlyDataArr;
        
        // condition 1: last month rev drop > customDropPercent
        if (arr.length >= 2) {
           const current = arr[arr.length - 1].revenue;
           const prev = arr[arr.length - 2].revenue;
           if (prev > 0) {
              const drop = ((current - prev) / prev) * 100;
              if (drop <= -customDropPercent) {
                 isRisk = true;
                 const type = drop <= -(customDropPercent * 2) ? 'critical' : 'high';
                 riskReason.push({ text: `รายได้ลดลง ${Math.abs(drop).toFixed(1)}% ในเดือนล่าสุด`, type });
              }
           }
        }
        
        // condition 2: custom consecutive drops
        if (arr.length >= customConsecutiveMonths + 1) {
           let isConsecutiveDrop = true;
           for (let i = 1; i <= customConsecutiveMonths; i++) {
              const curr = arr[arr.length - i].revenue;
              const prev = arr[arr.length - i - 1].revenue;
              if (curr >= prev) {
                 isConsecutiveDrop = false;
                 break;
              }
           }
           if (isConsecutiveDrop) {
              isRisk = true;
              riskReason.push({ text: `รายได้ลดลงติดต่อกัน ${customConsecutiveMonths} เดือนแล้ว`, type: 'consecutive' });
           }
        }

        if (isRisk && cust.totalRev >= customMinRev) {
           cust.riskReasonsStr = riskReason.map(r => r.text).join(', ');
           cust.riskReasons = riskReason;
           cust.lastRev = arr[arr.length - 1]?.revenue || 0;
           risks.push(cust);
        }
    });

    return risks.sort((a,b) => b.totalRev - a.totalRev);
  }, [data, filterMonth, customDropPercent, customConsecutiveMonths, customMinRev]);

  const filteredLists = useMemo(() => {
     return atRiskCustomers.filter(c => {
        if (selectedProvs.length > 0 && !selectedProvs.includes(c.province)) return false;
        if (selectedBranches.length > 0 && !selectedBranches.includes(c.branch)) return false;
        if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
     });
  }, [atRiskCustomers, selectedProvs, selectedBranches, searchTerm]);

  const displayLists = filteredLists.slice(0, visibleCount);

  const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(val);

  // Export functions
  const handleExportImage = () => {
    if (reportRef.current === null) return;
    htmlToImage.toPng(reportRef.current, { cacheBust: true, backgroundColor: '#f9fafb' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `at-risk-customers-${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
      }).catch(console.error);
  };

  const handleExportExcel = () => {
      const wsData = filteredLists.map((c, i) => ({
         'No.': i + 1,
         'Customer Name': c.name,
         'Branch': c.branch,
         'Province': c.province,
         'Primary Service': c.type,
         'Latest Monthly Revenue': c.lastRev,
         'Risk Signals': c.riskReasonsStr
      }));
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "At Risk Customers");
      XLSX.writeFile(wb, `AtRisk_Customers_${new Date().getTime()}.xlsx`);
  };

  // selectStyles removed

  return (
    <div className="space-y-6" ref={reportRef}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-red-50 p-6 rounded-3xl border border-red-100 gap-4">
         <div>
            <h2 className="text-2xl font-bold text-red-800 flex items-center">
               <AlertTriangle className="mr-3" size={28} />
               At-Risk Customers (ลูกค้ากลุ่มเสี่ยง)
            </h2>
            <p className="text-red-600 mt-2">รายชื่อลูกค้าที่มีสัญญาณรายได้ลดลงเกิน {customDropPercent}% ล่าสุด หรือลดลงติดต่อกัน {customConsecutiveMonths} เดือน แนะนำให้เข้าพบด่วน</p>
         </div>
         <div className="text-center bg-white p-4 rounded-2xl shadow-sm min-w-[140px] shrink-0">
            <p className="text-3xl font-extrabold text-red-600">{filteredLists.length}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase mt-1">Customers At Risk</p>
         </div>
      </div>
      
      {/* Filters & Actions */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end z-20 relative">
        <div className="flex-1 w-full sm:w-auto min-w-[200px]">
           <label className="block text-xs font-medium text-gray-500 mb-1">Search Name</label>
           <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl outline-none focus:ring-2 focus:ring-red-200 h-[42px]"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        <MultiSelectDropdown label="Month" options={monthsList} selectedValues={filterMonth} onChange={setFilterMonth} width="w-32" />
        <MultiSelectDropdown label="Provinces" options={allProvinces} selectedValues={selectedProvs} onChange={handleProvChange} width="w-48" />
        <MultiSelectDropdown label="Branches" options={allBranches.filter(b => selectedProvs.length === 0 || selectedProvs.includes(branchProvMap[b]))} selectedValues={selectedBranches} onChange={setSelectedBranches} width="w-48" />

        <div className="flex gap-2">
           <button onClick={() => setShowSettings(!showSettings)} className={`flex items-center justify-center text-sm border shadow-sm px-4 py-2 rounded-xl transition-colors h-[42px] font-medium ${showSettings ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              <Settings size={16} className="mr-2" /> Criteria
           </button>
           <button onClick={handleResetFilters} className="flex items-center justify-center text-sm bg-gray-100 border border-gray-200 shadow-sm px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-200 transition-colors h-[42px]">
              <RefreshCw size={16} className="mr-2" /> Reset
           </button>
        </div>

        <div className="flex gap-2">
            <button onClick={handleExportImage} className="flex items-center justify-center text-sm bg-white border border-gray-200 shadow-sm px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors h-[42px] font-medium">
               <ImageIcon size={16} className="mr-2 text-indigo-600" /> Image
            </button>
            <button onClick={handleExportExcel} className="flex items-center justify-center text-sm bg-green-600 border border-transparent shadow-sm shadow-green-200 px-4 py-2 rounded-xl text-white hover:bg-green-700 transition-colors h-[42px] font-medium">
               <FileSpreadsheet size={16} className="mr-2" /> Excel
            </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
         <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl shadow-sm z-10 relative flex flex-wrap gap-6 items-center animate-fade-in">
            <div className="flex items-center gap-3">
               <label className="text-sm font-semibold text-indigo-900">Target Drop %:</label>
               <div className="flex items-center text-sm shadow-sm rounded-lg overflow-hidden">
                  <span className="bg-white border border-gray-200 border-r-0 px-3 py-2 text-gray-500 font-bold">%</span>
                  <input type="number" min="1" max="100" value={customDropPercent} onChange={e => setCustomDropPercent(Number(e.target.value) || 1)} className="w-20 px-3 py-2 border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center font-bold text-indigo-700" />
               </div>
            </div>
            <div className="flex items-center gap-3">
               <label className="text-sm font-semibold text-indigo-900">Consecutive Declines:</label>
               <div className="flex items-center text-sm shadow-sm rounded-lg overflow-hidden">
                  <input type="number" min="2" max="12" value={customConsecutiveMonths} onChange={e => setCustomConsecutiveMonths(Number(e.target.value) || 2)} className="w-16 px-3 py-2 border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center font-bold text-indigo-700" />
                  <span className="bg-white border border-gray-200 border-l-0 px-3 py-2 text-gray-500 font-bold">Months</span>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <label className="text-sm font-semibold text-indigo-900">Total Rev. Floor:</label>
               <div className="flex items-center text-sm shadow-sm rounded-lg overflow-hidden">
                  <span className="bg-white border border-gray-200 border-r-0 px-3 py-2 text-gray-500 font-bold">฿</span>
                  <input type="number" min="0" step="10000" value={customMinRev} onChange={e => setCustomMinRev(Number(e.target.value) || 0)} className="w-24 px-3 py-2 border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-left font-bold text-indigo-700" />
               </div>
            </div>
            <div className="flex-1"></div>
            <button onClick={() => { setCustomDropPercent(25); setCustomConsecutiveMonths(3); setCustomMinRev(100000); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline">Reset Defaults</button>
         </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden z-10 relative">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-4 px-6 font-semibold text-gray-600 w-1/4">Customer Name</th>
                  <th className="py-4 px-6 font-semibold text-gray-600">Location</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 whitespace-nowrap">Latest Rev.</th>
                  <th className="py-4 px-6 font-semibold text-gray-600">Risk Signals</th>
                </tr>
              </thead>
              <tbody>
                {displayLists.length > 0 ? displayLists.map((c, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 align-top">
                       <p className="font-bold text-gray-800 leading-tight">{c.name}</p>
                       <p className="text-xs text-gray-500 mt-1">{c.type}</p>
                    </td>
                    <td className="py-4 px-6 align-top">
                       <div className="flex items-center text-sm text-gray-600 mb-1"><Building size={14} className="mr-1.5 text-gray-400 shrink-0"/> <span className="truncate max-w-[180px]">{c.branch}</span></div>
                       <div className="flex items-center text-xs text-gray-500"><MapPin size={12} className="mr-1.5 text-gray-400 shrink-0"/> {c.province}</div>
                    </td>
                    <td className="py-4 px-6 align-top">
                       <p className="font-semibold text-gray-800 whitespace-nowrap">{formatCurrency(c.lastRev)}</p>
                    </td>
                    <td className="py-4 px-6 align-top">
                       <div className="flex flex-col gap-2 items-start">
                          {c.riskReasons.map((r, idx) => {
                             let colors = "bg-orange-100 text-orange-800 border-orange-200"; // high (25-50)
                             if (r.type === 'critical') colors = "bg-red-600 text-white border-red-700 shadow-sm animate-pulse"; // >50
                             if (r.type === 'consecutive') colors = "bg-purple-100 text-purple-800 border-purple-200"; // 3 months
                             return (
                               <span key={idx} className={`inline-block text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-lg font-bold border ${colors}`}>
                                  {r.type === 'critical' && <AlertTriangle size={12} className="inline mr-1.5 -mt-0.5" />}
                                  {r.text}
                               </span>
                             )
                          })}
                       </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                     <td colSpan="4" className="py-12 text-center text-gray-500">
                        No at-risk customers found matching your criteria.
                     </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {filteredLists.length > visibleCount && (
               <div className="py-4 px-6 border-t border-gray-100 bg-gray-50 text-center">
                  <button 
                    onClick={() => setVisibleCount(v => v + 50)}
                    className="px-6 py-2 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                     Load More (+50)
                  </button>
                  <p className="text-xs text-gray-500 mt-2">Showing {visibleCount} of {filteredLists.length} customers</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default AtRiskCustomers;
