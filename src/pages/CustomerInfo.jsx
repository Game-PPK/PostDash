import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine, PieChart, Pie, Cell, Legend
} from 'recharts';
import { MapPin, Calendar, ArrowUpRight, TrendingDown, Package, TrendingUp, Download, Camera, RefreshCw, AlertTriangle, Info, Activity } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import Select from 'react-select';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#0088FE', '#00C49F'];

const CustomerInfo = ({ data }) => {
  const pageRef = useRef(null);
  const chartRef = useRef(null);

  const { customers, provinces, allBranchesParsed, branchProvMap, allCustTypes, allContractEnds } = useMemo(() => {
    const custMap = {};
    const provSet = new Set();
    const branchSet = new Set();
    const custTypeSet = new Set();
    const contractEndSet = new Set();
    
    const sortedData = [...data].sort((a,b) => {
      const mToNum = {'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12};
      const yearA = parseInt(a['ปี'] || a.year || 2026);
      const yearB = parseInt(b['ปี'] || b.year || 2026);
      const valA = yearA * 100 + (mToNum[a['เดือน'] || a.month] || 0);
      const valB = yearB * 100 + (mToNum[b['เดือน'] || b.month] || 0);
      return valA - valB; 
    });

    sortedData.forEach(row => {
      const name = row['ชื่อบัญชี'];
      const prov = row['จังหวัด'];
      const branch = row[' ชื่อที่ทำการไปรษณีย์'] || row['ชื่อที่ทำการไปรษณีย์'];
      const custType = row['customerType'] || row['ประเภทลูกค้า'] || '-';
      const contractEnd = row['contractEnd'] || row['วันสิ้นสุดสัญญา'] || '-';
      
      if (!name) return;
      if (prov) provSet.add(prov);
      if (branch) branchSet.add(branch);
      if (custType !== '-') custTypeSet.add(custType);
      if (contractEnd !== '-') contractEndSet.add(contractEnd);

      if (!custMap[name]) {
        custMap[name] = { 
          name, branch, province: prov, type: row['ประเภทบริการ'], contractEnd, customerType: custType,
          volumeCriteria: row['volumeCriteria'] || row['เกณฑ์ชิ้นงาน'] || '-',
          membership: row['membership'] || row['ระดับสมาชิก'] || '-',
          totalRev: 0, totalVol: 0, services: {}, monthlyDataMap: {}, monthlyDataArr: []
        };
      } else {
        if (contractEnd && contractEnd !== '-') custMap[name].contractEnd = contractEnd;
        if (custType && custType !== '-') custMap[name].customerType = custType;
        const vCrit = row['volumeCriteria'] || row['เกณฑ์ชิ้นงาน'];
        if (vCrit && vCrit !== '-' && vCrit !== '0') custMap[name].volumeCriteria = vCrit;
        const memb = row['membership'] || row['ระดับสมาชิก'];
        if (memb && memb !== '-') custMap[name].membership = memb;
        if (row['ประเภทบริการ'] && row['ประเภทบริการ'] !== '-') custMap[name].type = row['ประเภทบริการ'];
      }
      
      const rev = parseFloat(row['รายได้']) || parseFloat(String(row['รายได้']).replace(/,/g, '')) || 0;
      const vol = parseInt(row['ชิ้นงาน']) || parseInt(String(row['ชิ้นงาน']).replace(/,/g, '')) || 0;
      
      custMap[name].totalRev += rev;
      custMap[name].totalVol += vol;
      
      const srv = row['ชื่อบริการ'];
      custMap[name].services[srv] = (custMap[name].services[srv] || 0) + rev;

      const m = row['เดือน'] || row.month || 'Unknown';
      const y = row['ปี'] || row.year || '2026';
      const monthYear = `${m} ${y}`;
      if (!custMap[name].monthlyDataMap[monthYear]) {
        const newMonth = { month: monthYear, mText: m, yearText: y, revenue: 0, volume: 0 };
        custMap[name].monthlyDataMap[monthYear] = newMonth;
        custMap[name].monthlyDataArr.push(newMonth); 
      }
      custMap[name].monthlyDataMap[monthYear].revenue += rev;
      custMap[name].monthlyDataMap[monthYear].volume += vol;
    });

    Object.values(custMap).forEach(cust => {
        for(let i = 0; i < cust.monthlyDataArr.length; i++) {
           const current = cust.monthlyDataArr[i];
           if (i === 0) {
              current.revChange = 0; current.volChange = 0;
           } else {
              const prev = cust.monthlyDataArr[i-1];
              current.revChange = prev.revenue ? ((current.revenue - prev.revenue) / prev.revenue) * 100 : 0;
              current.volChange = prev.volume ? ((current.volume - prev.volume) / prev.volume) * 100 : 0;
           }
        }
    });

    return { 
      customers: Object.values(custMap).sort((a, b) => b.totalRev - a.totalRev),
      provinces: ['All', ...Array.from(provSet).sort()],
      allBranchesParsed: Array.from(branchSet).sort(),
      branchProvMap: Object.fromEntries(
         [...data].map(r => [r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'], r['จังหวัด']]).filter(r => r[0] && r[1])
      ),
      allCustTypes: ['All', ...Array.from(custTypeSet).sort()],
      allContractEnds: ['All', ...Array.from(contractEndSet).sort()]
    };
  }, [data]);

  const [filterProv, setFilterProv] = useState('All');
  
  const allBranches = useMemo(() => {
     let available = allBranchesParsed;
     if (filterProv !== 'All') available = available.filter(b => branchProvMap[b] === filterProv);
     return ['All', ...available];
  }, [allBranchesParsed, filterProv, branchProvMap]);

  const [filterBranch, setFilterBranch] = useState('All');
  const [filterCustType, setFilterCustType] = useState('All');
  const [filterContractEnd, setFilterContractEnd] = useState('All');
  
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
       if (filterProv !== 'All' && c.province !== filterProv) return false;
       if (filterBranch !== 'All' && c.branch !== filterBranch) return false;
       if (filterCustType !== 'All' && c.customerType !== filterCustType) return false;
       if (filterContractEnd !== 'All' && c.contractEnd !== filterContractEnd) return false;
       return true;
    });
  }, [customers, filterProv, filterBranch, filterCustType, filterContractEnd]);

  const [selectedCustNames, setSelectedCustNames] = useState([]);
  const customerOptions = useMemo(() => filteredCustomers.map(c => ({ value: c.name, label: c.name })), [filteredCustomers]);

  useEffect(() => {
     if (customerOptions.length > 0) setSelectedCustNames([customerOptions[0]]);
     else setSelectedCustNames([]);
  }, [customerOptions]);

  const resetFilters = () => {
    setFilterProv('All');
    setFilterBranch('All');
    setFilterCustType('All');
    setFilterContractEnd('All');
    if (customerOptions.length > 0) setSelectedCustNames([customerOptions[0]]);
  };

  const cust = useMemo(() => {
     if (selectedCustNames.length === 0) return null;
     const names = selectedCustNames.map(opt => opt.value);
     const selected = filteredCustomers.filter(c => names.includes(c.name));
     
     if (selected.length === 0) return null;
     if (selected.length === 1) return selected[0];

     const agg = {
        name: names.length > 2 ? `${names[0]} และลูกค้าอีก ${names.length-1} ราย` : names.join(', '),
        branch: filterBranch !== 'All' ? filterBranch : 'Multiple Branches', 
        province: filterProv !== 'All' ? filterProv : 'Multiple Provinces',
        type: 'Mixed Services', contractEnd: 'Various', customerType: '-', volumeCriteria: '-', membership: '-',
        totalRev: 0, totalVol: 0, services: {}, monthlyDataMap: {}, monthlyDataArr: []
     };

     selected.forEach(c => {
        agg.totalRev += c.totalRev;
        agg.totalVol += c.totalVol;
        for (const [srv, rev] of Object.entries(c.services)) {
           agg.services[srv] = (agg.services[srv] || 0) + rev;
        }
        c.monthlyDataArr.forEach(m => {
           if (!agg.monthlyDataMap[m.month]) {
              agg.monthlyDataMap[m.month] = { month: m.month, mText: m.mText, yearText: m.yearText, revenue: 0, volume: 0 };
           }
           agg.monthlyDataMap[m.month].revenue += m.revenue;
           agg.monthlyDataMap[m.month].volume += m.volume;
        });
     });

     agg.monthlyDataArr = Object.values(agg.monthlyDataMap).sort((a,b) => {
        const mToNum = {'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12};
        const partsA = a.month.split(' ');
        const valA = parseInt(partsA[1] || 0) * 100 + (mToNum[partsA[0]] || 0);
        const partsB = b.month.split(' ');
        const valB = parseInt(partsB[1] || 0) * 100 + (mToNum[partsB[0]] || 0);
        return valA - valB;
     });

     for(let i = 0; i < agg.monthlyDataArr.length; i++) {
        const current = agg.monthlyDataArr[i];
        if (i === 0) { current.revChange = 0; current.volChange = 0; } 
        else {
           const prev = agg.monthlyDataArr[i-1];
           current.revChange = prev.revenue ? ((current.revenue - prev.revenue) / prev.revenue) * 100 : 0;
           current.volChange = prev.volume ? ((current.volume - prev.volume) / prev.volume) * 100 : 0;
        }
     }
     return agg;
  }, [filteredCustomers, selectedCustNames, filterProv, filterBranch]);

  const avgRev = cust && cust.totalVol ? cust.totalRev / cust.totalVol : 0;
  
  const chartData = cust ? cust.monthlyDataArr : [];
  const lastMonth = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const revChangeLabel = lastMonth?.revChange ? `${lastMonth.revChange > 0 ? '+' : ''}${lastMonth.revChange.toFixed(1)}% YoY` : 'N/A';
  const volChangeLabel = lastMonth?.volChange ? `${lastMonth.volChange > 0 ? '+' : ''}${lastMonth.volChange.toFixed(1)}% YoY` : 'N/A';
  
  // Warnings
  const warnings = useMemo(() => {
    if (!cust || !cust.monthlyDataArr || cust.monthlyDataArr.length === 0) return [];
    const alerts = [];
    const _chartData = cust.monthlyDataArr;
    
    if (_chartData.length >= 2) {
      const last = _chartData[_chartData.length - 1];
      if (last.revChange <= -25) {
        alerts.push(`รายได้เดือนล่าสุดลดลง ${Math.abs(last.revChange).toFixed(1)}% เมื่อเทียบกับเดือนก่อนหน้า (${last.month})`);
      }
    }
    
    if (_chartData.length >= 4) {
      const m1 = _chartData[_chartData.length - 1].revenue;
      const m2 = _chartData[_chartData.length - 2].revenue;
      const m3 = _chartData[_chartData.length - 3].revenue;
      const m4 = _chartData[_chartData.length - 4].revenue;
      if (m1 < m2 && m2 < m3 && m3 < m4) {
        alerts.push(`สัญญานเตือนเร่งด่วน: รายได้มีแนวโน้มลดลงติดต่อกันมาเป็นเวลา 3 เดือนแล้ว`);
      }
    }
    return alerts;
  }, [cust]);

  // Target Criteria
  const targetCriteria = useMemo(() => {
     if(!cust || !cust.volumeCriteria || cust.volumeCriteria === '-') return null;
     const str = String(cust.volumeCriteria).replace(/,/g, '');
     const match = str.match(/\d+/);
     if (!match) return null;
     const parsed = parseInt(match[0], 10);
     return isNaN(parsed) || parsed === 0 ? null : parsed;
  }, [cust]);

  // Derived Donut Chart Data
  const servicePieData = useMemo(() => {
     if (!cust) return [];
     return Object.entries(cust.services).map(([name, value]) => ({name, value})).sort((a,b)=>b.value-a.value);
  }, [cust]);

  // Quarterly and Yearly Data
  const quarterData = useMemo(() => {
     if(!cust || !cust.monthlyDataArr) return [];
     const qMap = {};
     const mToQ = {'มกราคม':'Q1','กุมภาพันธ์':'Q1','มีนาคม':'Q1', 'เมษายน':'Q2','พฤษภาคม':'Q2','มิถุนายน':'Q2', 'กรกฎาคม':'Q3','สิงหาคม':'Q3','กันยายน':'Q3', 'ตุลาคม':'Q4','พฤศจิกายน':'Q4','ธันวาคม':'Q4'};
     cust.monthlyDataArr.forEach(m => {
        const q = `${mToQ[m.mText]} ${m.yearText}`;
        if(!qMap[q]) qMap[q] = { name: q, revenue: 0, volume: 0 };
        qMap[q].revenue += m.revenue;
        qMap[q].volume += m.volume;
     });
     return Object.values(qMap);
  }, [cust]);

  const yearlyData = useMemo(() => {
     if(!cust || !cust.monthlyDataArr) return [];
     const yMap = {};
     cust.monthlyDataArr.forEach(m => {
        const y = m.yearText;
        if(!yMap[y]) yMap[y] = { name: y, revenue: 0, volume: 0 };
        yMap[y].revenue += m.revenue;
        yMap[y].volume += m.volume;
     });
     return Object.values(yMap);
  }, [cust]);

  const aiInsights = useMemo(() => {
     if (!cust || !cust.monthlyDataArr || cust.monthlyDataArr.length === 0) return ["ไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์", "โปรดเลือกลูกค้าเพื่อดูคำแนะนำ"];
     const history = cust.monthlyDataArr;
     const last = history[history.length - 1];
     const prev = history.length > 1 ? history[history.length - 2] : null;
     
     let text = "ภาพรวมผลประกอบการยังคงที่";
     if (prev && prev.revenue > 0) {
        if (last.revenue > prev.revenue) text = `⭐ ยอดเยี่ยม! รายได้เดือนล่าสุดเพิ่มขึ้น ${(((last.revenue - prev.revenue)/prev.revenue)*100).toFixed(1)}% เทียบกับเดือนก่อนหน้า`;
        else text = `⚠️ ข้อควรระวัง: รายได้เดือนล่าสุดลดลง ${(((prev.revenue - last.revenue)/prev.revenue)*100).toFixed(1)}% เทียบกับเดือนก่อนหน้า ควรติดตามสอบถาม`;
     }

     const insight2 = targetCriteria && last.volume >= targetCriteria 
        ? `🏆 ลูกค้ารายนี้ทำยอดปริมาณงานทะลุเกณฑ์ที่กำหนดในเดือนล่าสุด`
        : targetCriteria 
        ? `📉 เฝ้าระวัง: ลูกค้ารายนี้ทำยอดชิ้นงานไม่ถึงเกณฑ์ที่กำหนดในเดือนล่าสุด`
        : `💡 รักษาความสัมพันธ์อันดีกับลูกค้ารายนี้อย่างต่อเนื่อง เพื่อให้เกิดการใช้บริการสม่ำเสมอ`;

     return [
        text,
        insight2,
        `📈 ปัจจุบันลูกค้ามีรายได้เฉลี่ยต่อชิ้นงานอยู่ที่ ${new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(avgRev || 0)}`
     ];
  }, [cust, targetCriteria, avgRev]);

  const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
  const formatNumberCompact = (val) => new Intl.NumberFormat('th-TH', {notation: "compact", compactDisplay: "short"}).format(val);
  const formatNumberFull = (val) => new Intl.NumberFormat('th-TH').format(val);

  const captureFullPage = () => {
    if (pageRef.current === null) return;
    htmlToImage.toPng(pageRef.current, { cacheBust: true, backgroundColor: '#f9fafb' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `customer-${cust?.name || 'info'}-full.png`;
        link.href = dataUrl;
        link.click();
      }).catch(console.error);
  };

  const captureChart = () => {
    if (chartRef.current === null) return;
    htmlToImage.toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `customer-${cust?.name || 'info'}-trends.png`;
        link.href = dataUrl;
        link.click();
      }).catch(console.error);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6" ref={pageRef}>
      {/* LEFT CONTENT */}
      <div className="flex-1 space-y-6 pt-4 xl:pt-0 min-w-0">
        
        {/* Filters & Header */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col xl:flex-row justify-between gap-4 relative z-30">
           <div>
              <h2 className="text-xl font-bold text-gray-800">Customer View</h2>
              <p className="text-sm text-gray-500">Filter and select customers below</p>
           </div>
           
           <div className="flex flex-wrap gap-3 items-end">
             <div>
               <label className="block text-[11px] font-medium text-gray-500 mb-1">Province</label>
               <select value={filterProv} onChange={(e) => setFilterProv(e.target.value)} className="w-32 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-2 py-2 outline-none">
                 {provinces.map(p => <option key={p} value={p}>{p === 'All' ? 'All' : p}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-[11px] font-medium text-gray-500 mb-1">Branch</label>
               <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="w-32 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-2 py-2 outline-none">
                 {allBranches.map(p => <option key={p} value={p}>{p === 'All' ? 'All' : p}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-[11px] font-medium text-gray-500 mb-1">Customer Type</label>
               <select value={filterCustType} onChange={(e) => setFilterCustType(e.target.value)} className="w-32 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-2 py-2 outline-none">
                 {allCustTypes.map(p => <option key={p} value={p}>{p === 'All' ? 'All' : p}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-[11px] font-medium text-gray-500 mb-1">Contract End</label>
               <select value={filterContractEnd} onChange={(e) => setFilterContractEnd(e.target.value)} className="w-32 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-2 py-2 outline-none">
                 {allContractEnds.map(p => <option key={p} value={p}>{p === 'All' ? 'All Exp.' : p}</option>)}
               </select>
             </div>

             <button onClick={resetFilters} className="text-sm bg-gray-100 border border-gray-200 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-200 h-[36px]">
                Reset
             </button>
             <button onClick={captureFullPage} className="text-sm bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-lg text-indigo-700 hover:bg-indigo-100 h-[36px] font-medium">
                <Download size={14} className="inline mr-1" /> Export View
             </button>
          </div>
        </div>

        {/* Multi-Select Dropdown */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 z-20 relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Customer(s)</label>
            <Select 
              isMulti
              options={customerOptions}
              value={selectedCustNames}
              onChange={setSelectedCustNames}
              className="text-base text-gray-800"
              placeholder="Search and select customers..."
              styles={{
                 control: (base) => ({ ...base, borderColor: '#e5e7eb', boxShadow: 'none', borderRadius: '0.75rem', minHeight: '44px', cursor: 'pointer', ':hover': { borderColor: '#c7d2fe' } }),
                 multiValue: (base) => ({ ...base, backgroundColor: '#eef2ff', borderRadius: '8px', padding: '2px' }),
                 multiValueLabel: (base) => ({ ...base, color: '#4f46e5', fontWeight: 600 }),
                 multiValueRemove: (base) => ({ ...base, color: '#4f46e5', ':hover': { backgroundColor: '#c7d2fe', color: '#3730a3', borderRadius: '4px' } }),
              }}
            />
        </div>

        {filterContractEnd !== 'All' && (
          <div className="bg-orange-50 p-4 rounded-2xl shadow-sm border border-orange-100 mt-4 mb-2 relative z-10">
            <h3 className="text-sm font-bold text-orange-800 mb-3 flex items-center">
               <AlertTriangle size={16} className="mr-2" /> รายชื่อลูกค้าที่หมดสัญญาเดือน {filterContractEnd} ทั้งหมด ({filteredCustomers.length} ราย)
            </h3>
            <div className="flex flex-wrap gap-2">
               {filteredCustomers.map((c, i) => (
                  <span key={i} className="bg-white border border-orange-200 text-orange-800 text-xs px-3 py-1.5 rounded-lg shadow-sm font-semibold cursor-pointer hover:bg-orange-100 transition-colors"
                        onClick={() => setSelectedCustNames([{value: c.name, label: c.name}])}>
                     {c.name}
                  </span>
               ))}
            </div>
            <p className="text-xs text-orange-600 mt-3 font-medium">*คลิกป้ายชื่อเพื่อสลับดูรายละเอียดของลูกค้าแต่ละรายด้านล่าง</p>
          </div>
        )}

        {!cust && (
          <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-6 py-12 rounded-2xl text-center font-bold text-lg shadow-sm">
             <Info size={40} className="mx-auto mb-4 opacity-50" />
             Please select at least one customer from the dropdown above to view insights.
          </div>
        )}

        {cust && warnings.length > 0 && (
          <div className="bg-red-50 border-2 border-red-500 p-6 rounded-2xl shadow-md mb-2 animate-[pulse_3s_ease-in-out_infinite]">
            <div className="flex items-center">
              <div className="flex-shrink-0 mr-4">
                 <AlertTriangle size={36} className="text-red-600" />
              </div>
              <div className="ml-2 w-full">
                <div className="flex justify-between items-center mb-1">
                   <h3 className="text-lg font-bold text-red-800">ACTION REQUIRED: สัญญาณเตือนอันตราย</h3>
                   <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full font-bold">URGENT</span>
                </div>
                <div className="text-sm text-red-700 font-medium">
                  <ul className="list-disc pl-5 space-y-1">
                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {cust && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center"><TrendingUp size={18} className="mr-2"/> Business Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#fcdab7] p-4 rounded-2xl relative overflow-hidden group hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-black/70 text-xs">Total Revenue</span>
                  <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center"><ArrowUpRight size={12} className="text-black/70"/></div>
                </div>
                <div>
                   <p className="text-xl font-bold text-[#3d2c1d] mb-1 leading-none">{formatCurrency(cust.totalRev)}</p>
                   <p className={`text-[10px] font-bold ${lastMonth?.revChange >= 0 ? 'text-green-800' : 'text-red-800'}`}>{revChangeLabel} YoY</p>
                </div>
              </div>

              <div className="bg-[#a2c8f9] p-4 rounded-2xl relative overflow-hidden group hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-black/70 text-xs">Total Volume</span>
                  <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center"><Package size={12} className="text-black/70"/></div>
                </div>
                <div>
                   <p className="text-xl font-bold text-[#1f304a] mb-1 leading-none">{formatNumberFull(cust.totalVol)} pcs</p>
                   <p className={`text-[10px] font-bold ${lastMonth?.volChange >= 0 ? 'text-green-800' : 'text-red-800'}`}>{volChangeLabel} YoY</p>
                </div>
              </div>

              <div className="bg-[#fbb1a9] p-4 rounded-2xl relative overflow-hidden group hover:shadow-md transition-shadow flex flex-col justify-between">
                 <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-black/70 text-xs">Avg Rev/Piece</span>
                  <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center"><TrendingDown size={12} className="text-black/70"/></div>
                </div>
                <div>
                   <p className="text-xl font-bold text-[#4a211e] mb-1 leading-none">{formatCurrency(avgRev)}</p>
                   <p className="text-[10px] text-black/60">Across all services</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 shadow-sm p-4 rounded-2xl relative overflow-hidden group hover:shadow-md transition-shadow flex flex-col justify-between">
                 <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-500 text-xs">Performance Target</span>
                  <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center"><Calendar size={12} className="text-indigo-600"/></div>
                </div>
                <div>
                   <p className={`text-xl font-bold mb-1 leading-none ${targetCriteria ? 'text-indigo-600' : 'text-gray-300'}`}>
                      {targetCriteria ? formatNumberFull(targetCriteria) : 'No Criteria'}
                   </p>
                   <p className="text-[10px] text-gray-500">Volume Goal</p>
                </div>
              </div>
            </div>
            
            {/* AI Custom Insights */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 rounded-2xl shadow-sm text-white flex flex-col mt-4">
               <div className="flex items-center mb-4">
                  <span className="bg-indigo-500/50 p-2 rounded-lg mr-3"><Activity size={20} className="text-indigo-100" /></span>
                  <h3 className="text-lg font-bold">AI Performance Summary (Customer Insight)</h3>
               </div>
               <p className="text-indigo-200 text-sm mb-3">ข้อมูลเชิงลึกเฉพาะลูกค้า:</p>
               <ul className="space-y-3">
                  {aiInsights.map((text, idx) => (
                     <li key={idx} className="bg-indigo-500/20 p-3 rounded-xl border border-indigo-400/30 text-sm leading-relaxed shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                        {text}
                     </li>
                  ))}
               </ul>
            </div>
          </div>
        )}

        {cust && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100" ref={chartRef}>
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-semibold text-gray-800">Monthly Usage Trends (Volume vs Revenue)</h3>
               <button onClick={captureChart} className="flex items-center text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full font-medium hover:bg-indigo-100 transition-colors">
                  <Camera size={14} className="mr-1.5" /> Capture Chart
               </button>
             </div>
             
             <div className="h-72 w-full mt-4">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(val) => `${val/1000}k`} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  
                  {targetCriteria && (
                     <ReferenceLine y={targetCriteria} yAxisId="right" stroke="#ff7f50" strokeDasharray="3 3" strokeWidth={2} label={{ position: 'right', value: 'Criteria', fill: '#ff7f50', fontSize: 12 }} />
                  )}

                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
                            <p className="font-semibold text-gray-800 mb-2">{label}</p>
                            <div className="text-sm space-y-1">
                              <p className="text-[#8884d8] font-medium">Revenue: {formatCurrency(data.revenue)} </p>
                              <p className="text-[#82ca9d] font-medium">Volume: {formatNumberFull(data.volume)} pcs</p>
                              {targetCriteria && (
                                <p className={`font-semibold mt-2 pt-1 border-t border-gray-100 ${data.volume >= targetCriteria ? 'text-green-600' : 'text-red-500'}`}>
                                  Target: {((data.volume / targetCriteria) * 100).toFixed(1)}% 
                                  ({data.volume >= targetCriteria ? 'Met!' : 'Missed'})
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="right" dataKey="volume" name="Volume" fill="#E8EAF6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#8884d8" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Quarterly & Yearly Charts */}
        {cust && quarterData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Quarterly Usage</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer>
                    <BarChart data={quarterData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                       <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{fill: '#9ca3af', fontSize: 12}} />
                       <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={(val) => `${formatNumberCompact(val)}`} tick={{fill: '#9ca3af', fontSize: 12}} />
                       <Tooltip formatter={(value, name) => [name === 'Revenue' || name === 'revenue' ? formatCurrency(value) : formatNumberFull(value), name]} cursor={{fill: '#f9fafb'}}/>
                       <Legend />
                       <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={20} />
                       <Bar yAxisId="right" dataKey="volume" name="Volume" fill="#82ca9d" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
             
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">Yearly Usage</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer>
                    <BarChart data={yearlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                       <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{fill: '#9ca3af', fontSize: 12}} />
                       <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={(val) => `${formatNumberCompact(val)}`} tick={{fill: '#9ca3af', fontSize: 12}} />
                       <Tooltip formatter={(value, name) => [name === 'Revenue' || name === 'revenue' ? formatCurrency(value) : formatNumberFull(value), name]} cursor={{fill: '#f9fafb'}}/>
                       <Legend />
                       <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={30} />
                       <Bar yAxisId="right" dataKey="volume" name="Volume" fill="#82ca9d" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-full xl:w-96 space-y-6">
        {cust && (
          <>
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-6 shadow-sm border border-gray-100 text-center flex flex-col items-center relative">
              <div className="w-20 h-20 bg-indigo-100 rounded-full border-4 border-white shadow-sm mb-3 flex items-center justify-center text-3xl font-black text-indigo-700 uppercase">
                {cust.name.substring(0, 2)}
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">{cust.name}</h2>
              <p className="text-sm font-medium text-gray-500 mb-4">{cust.branch}</p>
              <div className="flex gap-2 text-xs font-semibold">
                 <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md">{cust.type}</span>
                 <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-md">{cust.customerType}</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-base font-bold text-gray-800 mb-4 uppercase tracking-wider">Detailed Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1 font-medium">ระดับสมาชิก (Membership)</p>
                  <div className="flex flex-col">
                     <p className="text-sm font-bold text-gray-800">{cust.membership}</p>
                     {cust.membership === 'Customer' && (
                        <p className="text-xs font-semibold text-red-600 bg-red-50 mt-1 inline-block px-2 py-1 rounded w-fit border border-red-100">
                           ! แนะนำสมัคร Post Family
                        </p>
                     )}
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1 font-medium">วันสิ้นสุดสัญญา (Contract End)</p>
                  <p className="text-sm font-bold text-gray-800">{cust.contractEnd}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-base font-bold text-gray-800 mb-4 uppercase tracking-wider">Revenue by Service</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={servicePieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} fill="#8884d8" paddingAngle={4} dataKey="value" stroke="none">
                      {servicePieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{fontSize: "12px"}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-base font-bold text-gray-800 mb-4 uppercase tracking-wider">Volume Goal Progress</h3>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-2 font-medium text-gray-500">Month</th>
                    <th className="pb-2 font-medium text-gray-500 text-right">Target</th>
                    <th className="pb-2 font-medium text-gray-500 text-right">Actual</th>
                    <th className="pb-2 font-medium text-gray-500 text-right">Diff</th>
                    <th className="pb-2 font-medium text-gray-500 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.slice(-4).map((m, i) => {
                     const diff = m.volume - (targetCriteria || 0);
                     const pct = targetCriteria ? ((m.volume / targetCriteria) * 100).toFixed(0) : '-';
                     const isMet = diff >= 0;
                     return (
                       <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                         <td className="py-2.5 text-gray-800 font-medium">{m.mText}</td>
                         <td className="py-2.5 text-right text-gray-600">{targetCriteria ? formatNumberCompact(targetCriteria) : '-'}</td>
                         <td className="py-2.5 text-right text-gray-800 font-semibold">{formatNumberCompact(m.volume)}</td>
                         <td className={`py-2.5 text-right font-medium ${!targetCriteria ? 'text-gray-400' : isMet ? 'text-green-600' : 'text-red-500'}`}>
                           {targetCriteria ? (diff > 0 ? `+${formatNumberCompact(diff)}` : formatNumberCompact(diff)) : '-'}
                         </td>
                         <td className={`py-2.5 text-right font-bold ${!targetCriteria ? 'text-gray-400' : isMet ? 'text-green-600' : 'text-red-500'}`}>
                           {targetCriteria ? `${pct}%` : '-'}
                         </td>
                       </tr>
                     );
                  })}
                </tbody>
              </table>
              {!targetCriteria && <p className="text-xs text-gray-400 mt-2 text-center italic">No active criteria set.</p>}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default CustomerInfo;
