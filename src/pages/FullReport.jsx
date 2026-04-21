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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6'];

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

  // Filter Data
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

  // Calculate Insights
  const { summary, provData, serviceData, membershipData, monthlyTrend, topCustomers, autoInsight } = useMemo(() => {
    let totalRev = 0;
    let totalVol = 0;
    const pMap = {};
    const sMap = {};
    const mMap = {};
    const monthMap = {};
    const custMap = {};

    filteredData.forEach(r => {
      const rev = parseFloat(r['รายได้']) || parseFloat(String(r['รายได้']).replace(/,/g, '')) || 0;
      const vol = parseInt(r['ชิ้นงาน']) || parseInt(String(r['ชิ้นงาน']).replace(/,/g, '')) || 0;
      const prov = r['จังหวัด'] || 'Unknown';
      const branch = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'] || 'Unknown';
      const srv = r['ประเภทบริการ'] || 'Unknown';
      const mem = r.membership && r.membership !== '-' ? r.membership : 'None';
      const month = r['เดือน'] || r.month;
      const cust = r['ชื่อบัญชี'];

      if (rev <= 0 && vol <= 0) return; // Skip zero/negative rows for ranking if any

      totalRev += rev;
      totalVol += vol;

      // Province Map
      if (!pMap[prov]) pMap[prov] = { name: prov, rev: 0, vol: 0, branches: {} };
      pMap[prov].rev += rev;
      pMap[prov].vol += vol;
      
      if (!pMap[prov].branches[branch]) pMap[prov].branches[branch] = { name: branch, rev: 0, vol: 0 };
      pMap[prov].branches[branch].rev += rev;
      pMap[prov].branches[branch].vol += vol;

      // Service Map
      if (!sMap[srv]) sMap[srv] = { name: srv, value: 0 };
      sMap[srv].value += rev;

      // Membership Map
      if (!mMap[mem]) mMap[mem] = { name: mem, value: 0, vol: 0 };
      mMap[mem].value += rev;
      mMap[mem].vol += vol;

      // Monthly Trend
      if (month) {
         if (!monthMap[month]) monthMap[month] = { name: month, revenue: 0, volume: 0 };
         monthMap[month].revenue += rev;
         monthMap[month].volume += vol;
      }

      // Customers Map
      if (cust && cust !== '-') {
         if (!custMap[cust]) custMap[cust] = { name: cust, rev: 0, vol: 0, mainBranch: branch, srv: srv };
         custMap[cust].rev += rev;
         custMap[cust].vol += vol;
      }
    });

    const provArr = Object.values(pMap).map(p => {
       p.branches = Object.values(p.branches).sort((a,b) => b.rev - a.rev);
       return p;
    }).sort((a,b) => b.rev - a.rev);

    const srvArr = Object.values(sMap).sort((a,b) => b.value - a.value);
    const memArr = Object.values(mMap).sort((a,b) => b.value - a.value);
    const topCustArr = Object.values(custMap).sort((a,b) => b.rev - a.rev).slice(0, 20);
    const trendArr = Object.values(monthMap).sort((a,b) => (mToNum[a.name] || 0) - (mToNum[b.name] || 0));

    // Auto-Insight Text
    let insightStr = "ยังไม่มีข้อมูลพอชี้บ่งประเด็นเด่นชัด";
    if (provArr.length > 0 && srvArr.length > 0) {
      const topP = provArr[0];
      const pct = totalRev > 0 ? ((topP.rev / totalRev) * 100).toFixed(1) : 0;
      const topSrv = srvArr[0].name;
      const topSrvPct = totalRev > 0 ? ((srvArr[0].value / totalRev) * 100).toFixed(1) : 0;
      
      insightStr = `จากข้อมูลที่คุณเลือก พื้นที่ "${topP.name}" เป็นตัวจักรสำคัญที่สุด คิดเป็นสัดส่วนรายได้ ${pct}% ของสัดส่วนทั้งหมด โดยบริการขวัญใจอันดับหนึ่งคือการส่งแบบ "${topSrv}" หรืองบรวม ${topSrvPct}% นอกเหนือจากนี้ฐานจำนวนชิ้นต่อรายได้เฉลี่ยอยู่ที่ ${(totalVol ? totalRev/totalVol : 0).toLocaleString('th-TH', {maximumFractionDigits:1})} บาทต่อชิ้น`;
    }

    return { 
      summary: { totalRev, totalVol, avgRev: totalVol ? totalRev / totalVol : 0 },
      provData: provArr,
      serviceData: srvArr,
      membershipData: memArr,
      monthlyTrend: trendArr,
      topCustomers: topCustArr,
      autoInsight: insightStr
    };
  }, [filteredData]);

  const topProvince = provData.length > 0 ? provData[0] : null;

  // Formatters
  const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val || 0);
  const formatNumber = (val) => new Intl.NumberFormat('th-TH').format(val || 0);

  // Exports
  const handleExportImage = () => {
    if (reportRef.current === null) return;
    htmlToImage.toPng(reportRef.current, { cacheBust: true, backgroundColor: '#f9fafb' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `Reporting-Detailed-${new Date().getTime()}.png`;
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
    XLSX.writeFile(wb, `Detailed_Report_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (reportRef.current === null) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 1.5, useCORS: true, backgroundColor: '#f9fafb' });
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
      pdf.save(`Comprehensive_Report_${new Date().getTime()}.pdf`);
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
    <div className="space-y-6 animate-fade-in" ref={reportRef}>
      {/* Header & Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative z-30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-indigo-900 flex items-center">
              <Calendar className="mr-3 text-indigo-600" size={28} />
              Comprehensive Reporting
            </h2>
            <p className="text-gray-500 mt-1 pl-10 text-sm">รายงานและข้อมูลเชิงลึกแบบละเอียด (Deep-Dive Analysis)</p>
          </div>
          <div className="flex gap-2">
             <button onClick={handleExportImage} className="flex items-center text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2 rounded-xl transition-colors">
                <Download size={16} className="mr-2 text-indigo-600" /> Export Image
             </button>
             <button onClick={handleExportPDF} className="flex items-center text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm border border-transparent px-4 py-2 rounded-xl transition-colors">
                <FileText size={16} className="mr-2" /> Export PDF
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
             Reset
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 p-8 rounded-3xl shadow-xl relative overflow-hidden text-white border border-indigo-900/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-2xl" />
        
        <h3 className="text-xl font-black mb-6 flex items-center relative z-10"><TrendingUp className="mr-2 text-indigo-300" size={24} /> Executive Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div>
             <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1.5">Total Filtered Revenue</p>
             <p className="text-4xl font-black leading-tight">{formatCurrency(summary.totalRev)}</p>
             <p className="text-indigo-300 text-sm mt-1">{formatNumber(summary.totalVol)} pcs total volume</p>
          </div>
          <div className="border-l border-white/10 pl-8">
             <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1.5">Avg Revenue / Piece</p>
             <p className="text-4xl font-black leading-tight text-emerald-400">{formatCurrency(summary.avgRev)}</p>
             <p className="text-indigo-300 text-sm mt-1">Overall operational efficiency</p>
          </div>
          <div className="border-l border-white/10 pl-8 w-full">
             <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1.5">Top Performing Location</p>
             <p className="text-2xl font-black leading-tight truncate">{topProvince ? topProvince.name : 'N/A'}</p>
             <p className="text-indigo-300 text-sm mt-1">
                {topProvince ? `${((topProvince.rev / summary.totalRev) * 100).toFixed(1)}% of total revenue` : ''}
             </p>
          </div>
        </div>
        
        {/* Auto Insights box built-in to the summary */}
        <div className="mt-8 bg-white/10 p-4 rounded-2xl border border-white/20 relative z-10 backdrop-blur-sm flex items-start gap-4 shadow-inner">
             <div className="p-2.5 bg-indigo-500/30 rounded-full shrink-0"><Activity size={20} className="text-emerald-300" /></div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Automated System Insight</p>
                <p className="text-sm font-medium leading-relaxed italic text-indigo-50">"{autoInsight}"</p>
             </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Type Breakdown */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <h3 className="text-base font-bold text-gray-800 mb-6 uppercase tracking-wider flex items-center"><Briefcase size={18} className="mr-2 text-gray-400" /> Revenue by Service Type</h3>
           <div className="h-64 w-full relative group">
              <ResponsiveContainer>
                 <PieChart>
                    <Pie data={serviceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" labelLine={false} label={renderCustomizedLabel}>
                       {serviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
                       ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                 </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-[20px]">
                 <span className="text-sm font-black text-gray-800 uppercase text-center leading-none tracking-tight">Services</span>
              </div>
           </div>
        </div>

        {/* Membership Breakdown */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <h3 className="text-base font-bold text-gray-800 mb-2 uppercase tracking-wider flex items-center"><Award size={18} className="mr-2 text-gray-400" /> Member Tier & Revenue Insight</h3>
           <p className="text-xs text-gray-400 mb-6 pl-6 font-medium">สัดส่วนรายได้แยกตามระดับสมาชิกของลูกค้า</p>
           
           <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="h-56 w-full sm:w-1/2">
                 <ResponsiveContainer>
                    <PieChart>
                       <Pie data={membershipData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" labelLine={false}>
                          {membershipData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                          ))}
                       </Pie>
                       <Tooltip formatter={(val) => formatCurrency(val)} />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 space-y-3">
                 {membershipData.map((m, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[(i+3) % COLORS.length] }}></div>
                          <p className="text-xs font-bold text-gray-700">{m.name}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-indigo-700">{formatCurrency(m.value)}</p>
                          <p className="text-[10px] text-gray-500 font-semibold">{((m.value / summary.totalRev) * 100).toFixed(1)}%</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-2">
         {/* Trend Analysis */}
         <div className="lg:col-span-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
             <h3 className="text-base font-bold text-gray-800 mb-6 uppercase tracking-wider flex items-center"><BarChart2 size={18} className="mr-2 text-indigo-500" /> Monthly Revenue Trend</h3>
             <div className="h-64 w-full">
                <ResponsiveContainer>
                   <ComposedChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                      <YAxis yAxisId="left" tickFormatter={val => `${val/1000}k`} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                      <Tooltip formatter={(val) => formatCurrency(val)} cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar yAxisId="left" dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" barSize={36} />
                   </ComposedChart>
                </ResponsiveContainer>
             </div>
         </div>

         {/* Top Customers Panel */}
         <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[340px]">
             <h3 className="text-base font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center"><Users size={18} className="mr-2 text-rose-500" /> Top Customers Ranking</h3>
             <div className="overflow-y-auto flex-1 pr-2 space-y-3">
                {topCustomers.length > 0 ? topCustomers.map((c, i) => (
                   <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 group">
                      <div className="flex items-center gap-3 w-[65%]">
                         <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors">{i+1}</div>
                         <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{c.name}</p>
                            <p className="text-[10px] text-gray-500 truncate mt-0.5">{c.mainBranch} • {c.srv}</p>
                         </div>
                      </div>
                      <div className="text-right shrink-0">
                         <p className="text-sm font-black text-indigo-700">{formatCurrency(c.rev)}</p>
                      </div>
                   </div>
                )) : (
                   <p className="text-sm text-gray-400 text-center py-8">ไม่มีข้อมูลลูกค้า</p>
                )}
             </div>
         </div>
      </div>

      {/* Data Table: Geography / Branch Detail */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden z-20 relative">
         <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center flex-wrap gap-4">
            <div>
               <h3 className="text-lg font-bold text-gray-800 flex items-center"><MapPin className="mr-2 text-indigo-500" size={20} /> Location Performance Detail</h3>
               <p className="text-sm text-gray-500 mt-1 pl-7">รายได้และชิ้นงาน แยกตามจังหวัดและที่ทำการไปรษณีย์</p>
            </div>
         </div>
         <div className="overflow-x-auto max-h-[800px]">
            <table className="w-full text-left border-collapse min-w-[700px]">
               <thead className="sticky top-0 bg-white shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1)] z-10">
                  <tr className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200">
                     <th className="py-4 px-6 font-semibold">Province / Branch</th>
                     <th className="py-4 px-6 font-semibold text-right">Revenue (THB)</th>
                     <th className="py-4 px-6 font-semibold text-right">Volume (Pcs)</th>
                     <th className="py-4 px-6 font-semibold text-right">Avg Rev/Pc</th>
                     <th className="py-4 px-6 font-semibold text-center w-24">% Rev</th>
                  </tr>
               </thead>
               <tbody className="text-sm divide-y divide-gray-50">
                  {provData.length > 0 ? provData.map((prov, i) => (
                     <React.Fragment key={`prov-${i}`}>
                        {/* Province Row (Summary) */}
                        <tr className="bg-indigo-50/30 font-bold hover:bg-indigo-50/60 transition-colors">
                           <td className="py-3 px-6 text-gray-800">
                              <span className="text-indigo-700 mr-2">📍</span> {prov.name}
                              <span className="ml-2 text-xs text-gray-400 font-medium">({prov.branches.length} branches)</span>
                           </td>
                           <td className="py-3 px-6 text-right text-indigo-700">{formatCurrency(prov.rev)}</td>
                           <td className="py-3 px-6 text-right text-emerald-600">{formatNumber(prov.vol)}</td>
                           <td className="py-3 px-6 text-right text-gray-600">{formatCurrency(prov.vol ? prov.rev/prov.vol : 0)}</td>
                           <td className="py-3 px-6 text-center">
                              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black">
                                 {((prov.rev / summary.totalRev) * 100).toFixed(1)}%
                              </span>
                           </td>
                        </tr>
                        {/* Branch Rows */}
                        {prov.branches.map((b, j) => (
                           <tr key={`branch-${i}-${j}`} className="hover:bg-gray-50 transition-colors text-gray-600">
                              <td className="py-2.5 px-6 pl-12 text-sm font-medium">{b.name}</td>
                              <td className="py-2.5 px-6 text-right font-semibold text-gray-800">{formatCurrency(b.rev)}</td>
                              <td className="py-2.5 px-6 text-right">{formatNumber(b.vol)}</td>
                              <td className="py-2.5 px-6 text-right">{formatCurrency(b.vol ? b.rev/b.vol : 0)}</td>
                              <td className="py-2.5 px-6 text-center text-[10px] font-semibold text-gray-400">
                                 {((b.rev / summary.totalRev) * 100).toFixed(1)}%
                              </td>
                           </tr>
                        ))}
                     </React.Fragment>
                  )) : (
                     <tr>
                        <td colSpan="5" className="py-12 text-center text-gray-400 font-medium">No location data found matching your filters.</td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default FullReport;
