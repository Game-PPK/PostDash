import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { Download, FileSpreadsheet, FileText, MapPin, Briefcase, Award, TrendingUp, Calendar, Users, Activity, BarChart2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import MultiSelectDropdown from '../components/MultiSelectDropdown';

const COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#db2777', '#0d9488'];

const mToNum = {'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12};

const FullReport = ({ data }) => {
  const reportRef = useRef(null);

  // Filters State
  const [filterYear, setFilterYear] = useState([]);
  const [filterMonth, setFilterMonth] = useState([]);
  const [filterProv, setFilterProv] = useState([]);

  // Extract base options
  const { allYears, allMonths, allProvinces } = useMemo(() => {
    const ySet = new Set();
    const mSet = new Set();
    const pSet = new Set();
    data.forEach(r => {
      if (r['ปี'] || r.year) ySet.add(String(r['ปี'] || r.year || '2026'));
      if (r['เดือน'] || r.month) mSet.add(r['เดือน'] || r.month);
      if (r['จังหวัด']) pSet.add(r['จังหวัด']);
    });
    return {
      allYears: ['All', ...Array.from(ySet).sort((a,b) => parseInt(b) - parseInt(a))],
      allMonths: ['All', ...Array.from(mSet).sort((a,b) => (mToNum[a] || 0) - (mToNum[b] || 0))],
      allProvinces: ['All', ...Array.from(pSet).sort()]
    };
  }, [data]);

  // Set default filters (Latest Year & Latest Month)
  useEffect(() => {
    if (data && data.length > 0 && filterYear.length === 0 && filterMonth.length === 0) {
      const years = Array.from(new Set(data.map(r => String(r['ปี'] || r.year || '2026')))).sort((a,b) => parseInt(b) - parseInt(a));
      if (years.length > 0) {
        setFilterYear([years[0]]);
        const monthsForYear = data.filter(r => String(r['ปี'] || r.year || '2026') === years[0])
                                  .map(r => r['เดือน'] || r.month).filter(Boolean);
        const sortedMonths = Array.from(new Set(monthsForYear)).sort((a,b) => (mToNum[b] || 0) - (mToNum[a] || 0));
        if (sortedMonths.length > 0) {
          setFilterMonth([sortedMonths[0]]);
        }
      }
    }
  }, [data]);

  // Main Filtered Data (Respects Month Limit)
  const filteredData = useMemo(() => {
    return data.filter(r => {
      const y = String(r['ปี'] || r.year || '2026');
      if (filterYear.length > 0 && !filterYear.includes(y)) return false;
      const m = r['เดือน'] || r.month;
      if (filterMonth.length > 0 && !filterMonth.includes(m)) return false;
      if (filterProv.length > 0 && !filterProv.includes(r['จังหวัด'])) return false;
      return true;
    });
  }, [data, filterYear, filterMonth, filterProv]);

  // Trend Filtered Data (Ignores Month Limit logically inside useMemo)
  const filteredDataTrend = useMemo(() => {
    return data.filter(r => {
      const y = String(r['ปี'] || r.year || '2026');
      if (filterYear.length > 0 && !filterYear.includes(y)) return false;
      if (filterProv.length > 0 && !filterProv.includes(r['จังหวัด'])) return false;
      return true; // Ignite Month Filter intentionally
    });
  }, [data, filterYear, filterProv]);

  // Calculate Insights
  const { summary, provData, customerTypeData, membershipData, monthlyTrend, topCustomers, autoInsight } = useMemo(() => {
    let totalRev = 0;
    let totalVol = 0;
    const pMap = {};
    const ctMap = {};
    const mMap = {};
    const monthMap = {};
    const custMap = {};

    // 1. Process standard tables & rankings with strict limits
    filteredData.forEach(r => {
      const rev = parseFloat(r['รายได้']) || parseFloat(String(r['รายได้']).replace(/,/g, '')) || 0;
      const vol = parseInt(r['ชิ้นงาน']) || parseInt(String(r['ชิ้นงาน']).replace(/,/g, '')) || 0;
      const prov = r['จังหวัด'] || 'Unknown';
      const branch = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'] || 'Unknown';
      const custType = r['customerType'] || r['ประเภทลูกค้า'] || 'Unknown';
      const mem = r.membership && r.membership !== '-' ? r.membership : 'None';
      const custName = r['ชื่อบัญชี'];

      if (rev <= 0 && vol <= 0) return;

      totalRev += rev;
      totalVol += vol;

      // Province Map
      if (!pMap[prov]) pMap[prov] = { name: prov, rev: 0, vol: 0, branches: {} };
      pMap[prov].rev += rev;
      pMap[prov].vol += vol;
      
      if (!pMap[prov].branches[branch]) pMap[prov].branches[branch] = { name: branch, rev: 0, vol: 0 };
      pMap[prov].branches[branch].rev += rev;
      pMap[prov].branches[branch].vol += vol;

      // Customer Type Map
      if (!ctMap[custType]) ctMap[custType] = { name: custType, value: 0 };
      ctMap[custType].value += rev;

      // Membership Map
      if (!mMap[mem]) mMap[mem] = { name: mem, value: 0, vol: 0 };
      mMap[mem].value += rev;
      mMap[mem].vol += vol;

      // Customers Ranking
      if (custName && custName !== '-') {
         if (!custMap[custName]) custMap[custName] = { name: custName, rev: 0, vol: 0, mainBranch: branch };
         custMap[custName].rev += rev;
         custMap[custName].vol += vol;
      }
    });

    // 2. Process Monthly Trends without month restriction
    filteredDataTrend.forEach(r => {
      const rev = parseFloat(r['รายได้']) || parseFloat(String(r['รายได้']).replace(/,/g, '')) || 0;
      const vol = parseInt(r['ชิ้นงาน']) || parseInt(String(r['ชิ้นงาน']).replace(/,/g, '')) || 0;
      const month = r['เดือน'] || r.month;
      
      if (rev <= 0 && vol <= 0) return;
      if (month) {
         if (!monthMap[month]) monthMap[month] = { name: month, revenue: 0, volume: 0 };
         monthMap[month].revenue += rev;
         monthMap[month].volume += vol;
      }
    });

    const provArr = Object.values(pMap).map(p => {
       p.branches = Object.values(p.branches).sort((a,b) => b.rev - a.rev);
       return p;
    }).sort((a,b) => b.rev - a.rev);

    const ctArr = Object.values(ctMap).sort((a,b) => b.value - a.value);
    const memArr = Object.values(mMap).sort((a,b) => b.value - a.value);
    const topCustArr = Object.values(custMap).sort((a,b) => b.rev - a.rev).slice(0, 20);
    const trendArr = Object.values(monthMap).sort((a,b) => (mToNum[a.name] || 0) - (mToNum[b.name] || 0));

    // Auto-Insight Text Generation
    let insightStr = "ยังไม่มีข้อมูลเพียงพอสำหรับประมวลผลคำแนะนำเชิงบริหาร";
    if (provArr.length > 0 && ctArr.length > 0) {
      const topP = provArr[0];
      const pct = totalRev > 0 ? ((topP.rev / totalRev) * 100).toFixed(1) : 0;
      const topCT = ctArr[0].name;
      const topCTPct = totalRev > 0 ? ((ctArr[0].value / totalRev) * 100).toFixed(1) : 0;
      
      insightStr = `จากข้อมูลที่เลือก พื้นที่ที่มีผลการดำเนินงานโดดเด่นทำกำไรสูงสุดคือ "${topP.name}" ซึ่งครอบครองสัดส่วนถึง ${pct}% ของรายได้รวมทั้งหมดในขอบเขตรายงานนี้ กลุ่มเป้าหมายหรือประเภทของลูกค้าที่เป็นรายได้หลักคือกลุ่ม "${topCT}" คิดเป็น ${topCTPct}% ของทั้งหมด โดยมีรายได้ต่อชิ้นงานเฉลี่ยในองค์รวมอยู่ที่ ${(totalVol ? totalRev/totalVol : 0).toLocaleString('th-TH', {maximumFractionDigits:1})} บาท`;
    }

    return { 
      summary: { totalRev, totalVol, avgRev: totalVol ? totalRev / totalVol : 0 },
      provData: provArr,
      customerTypeData: ctArr,
      membershipData: memArr,
      monthlyTrend: trendArr,
      topCustomers: topCustArr,
      autoInsight: insightStr
    };
  }, [filteredData, filteredDataTrend]);

  const topProvince = provData.length > 0 ? provData[0] : null;

  // Formatters
  const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val || 0);
  const formatNumber = (val) => new Intl.NumberFormat('th-TH').format(val || 0);

  // Exports
  const handleExportImage = () => {
    if (reportRef.current === null) return;
    htmlToImage.toPng(reportRef.current, { cacheBust: true, backgroundColor: '#ffffff' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `Management-Report-${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
      }).catch(console.error);
  };

  const handleExportExcel = () => {
    const wsData = [];
    provData.forEach(p => {
       p.branches.forEach(b => {
          wsData.push({
             'Province': p.name,
             'Branch': b.name,
             'Revenue (THB)': b.rev,
             'Volume (Pcs)': b.vol,
             'Avg Rev/Piece': b.vol ? (b.rev / b.vol).toFixed(2) : 0,
             '% of Total Rev': ((b.rev / summary.totalRev) * 100).toFixed(2) + '%'
          });
       });
    });
    
    if (wsData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Branch Detailed Report");
    XLSX.writeFile(wb, `Management_Report_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (reportRef.current === null) return;
    try {
      // Temporarily add a class for PDF layout rendering if needed
      reportRef.current.classList.add('px-8', 'py-8');
      const canvas = await html2canvas(reportRef.current, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      reportRef.current.classList.remove('px-8', 'py-8');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      if (pdfHeight > pdf.internal.pageSize.getHeight()) {
         let heightLeft = pdfHeight;
         let position = 0;
         pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
         heightLeft -= pdf.internal.pageSize.getHeight();
         
         while (heightLeft >= 0) {
           position = heightLeft - pdfHeight;
           pdf.addPage();
           pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
           heightLeft -= pdf.internal.pageSize.getHeight();
         }
      } else {
         pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      pdf.save(`Management_Report_${new Date().getTime()}.pdf`);
    } catch (e) {
      console.error("PDF Export Error", e);
    }
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
     const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
     const x = cx + radius * Math.cos(-midAngle * RADIAN);
     const y = cy + radius * Math.sin(-midAngle * RADIAN);
     return percent > 0.05 ? (
       <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="bold">
         {`${(percent * 100).toFixed(0)}%`}
       </text>
     ) : null;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 pt-4">
      
      {/* Tools & Filters (Not exported in the PDF context visually inside A4 container but acts as controller) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative z-30 mx-auto max-w-[1240px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Calendar className="mr-2 text-indigo-600" size={24} />
              Report Configuration
            </h2>
          </div>
          <div className="flex gap-2">
             <button onClick={handleExportImage} className="flex items-center text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2 rounded-xl transition-colors">
                <Download size={16} className="mr-2 text-indigo-600" /> Export PNG
             </button>
             <button onClick={handleExportPDF} className="flex items-center text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm border border-transparent px-4 py-2 rounded-xl transition-colors">
                <FileText size={16} className="mr-2" /> Export Document (PDF)
             </button>
             <button onClick={handleExportExcel} className="flex items-center text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm border border-transparent px-4 py-2 rounded-xl transition-colors">
                <FileSpreadsheet size={16} className="mr-2" /> Export Excel
             </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <MultiSelectDropdown label="Year" options={allYears} selectedValues={filterYear} onChange={setFilterYear} width="w-28" />
          <MultiSelectDropdown label="Month" options={allMonths} selectedValues={filterMonth} onChange={setFilterMonth} width="w-32" />
          <MultiSelectDropdown label="Province" options={allProvinces} selectedValues={filterProv} onChange={setFilterProv} width="w-48" />
          <button 
             onClick={() => { setFilterYear([]); setFilterMonth([]); setFilterProv([]); }} 
             className="text-[11px] bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-200 h-[32px] font-bold mt-auto mb-[2px] leading-none">
             Reset Filters
          </button>
        </div>
      </div>

      {/* DOCUMENT A4 RENDER CONTAINER */}
      <div 
        ref={reportRef}
        className="max-w-[1240px] mx-auto bg-white shadow-xl border border-gray-300 min-h-[1400px] text-gray-800"
      >
         {/* Internal Doc Padding Wrapper */}
         <div className="p-10 md:p-14 lg:p-16 space-y-10">

            {/* Document Header */}
            <div className="border-b-4 border-indigo-900 pb-8 flex justify-between items-end">
               <div>
                  <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight leading-tight">Management Report</h1>
                  <p className="text-lg text-gray-500 font-medium mt-1">รายงานผลการดำเนินงาน และ ข้อมูลระดับบริหาร</p>
               </div>
               <div className="text-right">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Generated Period</p>
                  <p className="text-xl font-bold text-gray-800">
                     {filterMonth.length > 0 ? filterMonth.join(', ') : 'All Months'} {filterYear.length > 0 ? filterYear.join(', ') : 'All Years'}
                  </p>
               </div>
            </div>

            {/* Part 1: Management Summary Text */}
            <div className="bg-gray-50/80 p-8 rounded border-l-4 border-indigo-600">
               <h3 className="text-lg font-bold text-indigo-900 flex items-center mb-3">
                  <Activity size={20} className="mr-2" /> Management Summary (บทสรุปผู้บริหาร)
               </h3>
               <p className="text-gray-700 leading-relaxed font-medium">
                  "{autoInsight}"
               </p>
               <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
                  <div>
                     <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Total Valid Revenue</p>
                     <p className="text-3xl font-black text-gray-900">{formatCurrency(summary.totalRev)}</p>
                  </div>
                  <div>
                     <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Total Volume Handled</p>
                     <p className="text-3xl font-black text-gray-900">{formatNumber(summary.totalVol)} pcs</p>
                  </div>
                  <div>
                     <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">Average Revenue/Piece</p>
                     <p className="text-3xl font-black text-indigo-700">{formatCurrency(summary.avgRev)}</p>
                  </div>
               </div>
            </div>

            {/* Part 2: Year Trends & Structure Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               
               {/* Line Chart: Monthly Trend (Whole Year Context) */}
               <div>
                  <h3 className="text-base font-bold text-gray-800 mb-6 uppercase tracking-wider border-b border-gray-200 pb-2">
                     Seasonality & Revenue Trends
                  </h3>
                  <div className="h-64 w-full">
                     <ResponsiveContainer>
                        <ComposedChart data={monthlyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                           <YAxis yAxisId="left" tickFormatter={val => `${(val/1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                           <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ borderRadius: '8px' }} />
                           <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} name="Revenue" />
                           <Bar yAxisId="left" dataKey="volume" fill="#e5e7eb" barSize={20} name="Volume" />
                        </ComposedChart>
                     </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-gray-400 italic text-center mt-2">* กราฟแสดงแนวโน้มรวมตลอดทั้งปี ตามตัวกรองพื้นที่และปี (ไม่อิงตัวกรองเดือน)</p>
               </div>

               {/* Pie Charts : Demographic / Membership */}
               <div className="flex flex-col gap-6">
                  <div>
                     <h3 className="text-base font-bold text-gray-800 mb-2 uppercase tracking-wider border-b border-gray-200 pb-2">
                        Customer Type Distribution
                     </h3>
                     <div className="h-40 w-full flex items-center">
                        <ResponsiveContainer width="50%" height="100%">
                           <PieChart>
                              <Pie data={customerTypeData} cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={2} dataKey="value" labelLine={false}>
                                 {customerTypeData.map((entry, index) => (
                                    <Cell key={`cell-ct-${index}`} fill={COLORS[index % COLORS.length]} />
                                 ))}
                              </Pie>
                              <Tooltip formatter={(val) => formatCurrency(val)} />
                           </PieChart>
                        </ResponsiveContainer>
                        <div className="w-[50%] space-y-2">
                           {customerTypeData.slice(0, 4).map((m, i) => (
                              <div key={i} className="flex justify-between items-center text-sm">
                                 <div className="flex items-center gap-1.5 min-w-0">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                    <p className="font-medium text-gray-700 truncate">{m.name}</p>
                                 </div>
                                 <p className="font-bold text-gray-900 ml-2">{((m.value / summary.totalRev) * 100).toFixed(1)}%</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div>
                     <h3 className="text-base font-bold text-gray-800 mb-2 uppercase tracking-wider border-b border-gray-200 pb-2">
                        Membership Program Share
                     </h3>
                     <div className="h-40 w-full flex items-center">
                        <ResponsiveContainer width="50%" height="100%">
                           <PieChart>
                              <Pie data={membershipData} cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={2} dataKey="value" labelLine={false}>
                                 {membershipData.map((entry, index) => (
                                    <Cell key={`cell-mem-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                 ))}
                              </Pie>
                              <Tooltip formatter={(val) => formatCurrency(val)} />
                           </PieChart>
                        </ResponsiveContainer>
                        <div className="w-[50%] space-y-2">
                           {membershipData.slice(0, 4).map((m, i) => (
                              <div key={i} className="flex justify-between items-center text-sm">
                                 <div className="flex items-center gap-1.5 min-w-0">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[(i+3) % COLORS.length] }}></div>
                                    <p className="font-medium text-gray-700 truncate">{m.name}</p>
                                 </div>
                                 <p className="font-bold text-gray-900 ml-2">{((m.value / summary.totalRev) * 100).toFixed(1)}%</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

            </div>

            {/* Part 3: Top Entities / Branch Data */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
               
               {/* Left: Top Customers Ranking */}
               <div className="lg:col-span-4">
                  <h3 className="text-base font-bold text-gray-800 mb-4 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center" style={{ pageBreakInside: 'avoid'}}>
                     Top 20 Key Customers
                  </h3>
                  <div className="space-y-0 border-l-2 border-indigo-100 pl-4">
                     {topCustomers.length > 0 ? topCustomers.map((c, i) => (
                        <div key={i} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0" style={{ pageBreakInside: 'avoid'}}>
                           <div className="min-w-0 pr-4">
                              <p className="text-sm font-bold text-gray-800 truncate" title={c.name}>{i+1}. {c.name}</p>
                              <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">{c.mainBranch}</p>
                           </div>
                           <div className="text-right shrink-0">
                              <p className="text-sm font-black text-indigo-700">{formatCurrency(c.rev)}</p>
                           </div>
                        </div>
                     )) : (
                        <p className="text-sm text-gray-400 py-4">No customer data retrieved.</p>
                     )}
                  </div>
               </div>

               {/* Right: Branch/Geographic Exact Data Table */}
               <div className="lg:col-span-8">
                  <h3 className="text-base font-bold text-gray-800 mb-4 uppercase tracking-wider border-b border-gray-200 pb-2">
                     Detailed Location Performance (Province & Branch)
                  </h3>
                  <div className="w-full">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-300">
                              <th className="py-2.5 px-2">Province / Branch</th>
                              <th className="py-2.5 px-2 text-right">Revenue</th>
                              <th className="py-2.5 px-2 text-right">Volume</th>
                              <th className="py-2.5 px-2 text-right">Rev/Pc</th>
                           </tr>
                        </thead>
                        <tbody className="text-sm text-gray-700">
                           {provData.length > 0 ? provData.map((prov, i) => (
                              <React.Fragment key={`prov-${i}`}>
                                 <tr className="bg-gray-100 font-bold border-b border-gray-200" style={{ pageBreakInside: 'avoid' }}>
                                    <td className="py-2.5 px-2 text-gray-900">
                                       <span className="text-indigo-600 mr-2">▪</span> {prov.name}
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-indigo-800">{formatCurrency(prov.rev)}</td>
                                    <td className="py-2.5 px-2 text-right text-gray-700">{formatNumber(prov.vol)}</td>
                                    <td className="py-2.5 px-2 text-right">{formatCurrency(prov.vol ? prov.rev/prov.vol : 0)}</td>
                                 </tr>
                                 {prov.branches.slice(0, 15).map((b, j) => (
                                    <tr key={`branch-${i}-${j}`} className="border-b border-gray-100" style={{ pageBreakInside: 'avoid' }}>
                                       <td className="py-2 px-2 pl-8 text-xs font-medium text-gray-600">{b.name}</td>
                                       <td className="py-2 px-2 text-right text-xs font-semibold">{formatCurrency(b.rev)}</td>
                                       <td className="py-2 px-2 text-right text-xs">{formatNumber(b.vol)}</td>
                                       <td className="py-2 px-2 text-right text-xs text-gray-500">{formatCurrency(b.vol ? b.rev/b.vol : 0)}</td>
                                    </tr>
                                 ))}
                                 {prov.branches.length > 15 && (
                                    <tr className="border-b border-gray-100">
                                       <td colSpan="4" className="py-1 px-2 pl-8 text-[10px] text-gray-400 italic">
                                          ... and {prov.branches.length - 15} more smaller branches. (Export Excel for full list)
                                       </td>
                                    </tr>
                                 )}
                              </React.Fragment>
                           )) : (
                              <tr>
                                 <td colSpan="4" className="py-12 text-center text-gray-400 font-medium">No valid breakdown data available.</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

            </div>

            {/* Document Footer */}
            <div className="pt-10 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400 font-medium mt-16">
               <p>Generated by PostDash Reporting Analytics • Internal Use Only</p>
               <p>Printed on: {new Date().toLocaleDateString('en-GB')}</p>
            </div>

         </div>
      </div>
    </div>
  );
};

export default FullReport;
