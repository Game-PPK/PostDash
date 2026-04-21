import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line, LabelList
} from 'recharts';
import { FileText, Calendar } from 'lucide-react';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import MultiSelectDropdown from '../components/MultiSelectDropdown';

const COLORS = ['#1f2937', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#4f46e5', '#818cf8', '#2dd4bf'];

const mToNum = {'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12};

const FullReport = ({ data }) => {
  const reportRef = useRef(null);

  // Filters State
  const [filterYear, setFilterYear] = useState([]);
  const [filterMonth, setFilterMonth] = useState([]);
  const [filterProv, setFilterProv] = useState([]);
  const [filterBranch, setFilterBranch] = useState([]);

  // Extract base options
  const { allYears, allMonths, allProvinces, allBranches } = useMemo(() => {
    const ySet = new Set();
    const mSet = new Set();
    const pSet = new Set();
    const bSet = new Set();
    data.forEach(r => {
      if (r['ปี'] || r.year) ySet.add(String(r['ปี'] || r.year || '2026'));
      if (r['เดือน'] || r.month) mSet.add(r['เดือน'] || r.month);
      if (r['จังหวัด']) pSet.add(r['จังหวัด']);
      
      const b = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'];
      if (b) bSet.add(b);
    });
    const filteredProvinces = filterProv.length > 0 ? filterProv : null;
    return {
      allYears: ['All', ...Array.from(ySet).sort((a,b) => parseInt(b) - parseInt(a))],
      allMonths: ['All', ...Array.from(mSet).sort((a,b) => (mToNum[a] || 0) - (mToNum[b] || 0))],
      allProvinces: ['All', ...Array.from(pSet).sort()],
      allBranches: ['All', ...Array.from(bSet).sort()]
    };
  }, [data]);

  // Branch options filtered by selected provinces
  const filteredBranchOptions = useMemo(() => {
    if (filterProv.length === 0) return allBranches;
    const bSet = new Set();
    data.forEach(r => {
      const prov = r['จังหวัด'];
      if (filterProv.includes(prov)) {
        const b = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'];
        if (b) bSet.add(b);
      }
    });
    return ['All', ...Array.from(bSet).sort()];
  }, [data, filterProv, allBranches]);

  // Clear branch selection when province changes
  useEffect(() => {
    setFilterBranch([]);
  }, [filterProv]);

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
      
      const b = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'];
      if (filterBranch.length > 0 && !filterBranch.includes(b)) return false;
      return true;
    });
  }, [data, filterYear, filterMonth, filterProv, filterBranch]);

  // Trend Filtered Data (Ignores Month Limit logically inside useMemo)
  const filteredDataTrend = useMemo(() => {
    return data.filter(r => {
      const y = String(r['ปี'] || r.year || '2026');
      if (filterYear.length > 0 && !filterYear.includes(y)) return false;
      if (filterProv.length > 0 && !filterProv.includes(r['จังหวัด'])) return false;
      
      const b = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'];
      if (filterBranch.length > 0 && !filterBranch.includes(b)) return false;
      return true; 
    });
  }, [data, filterYear, filterProv, filterBranch]);

  // Calculate Insights and Formulate Narrative Paragraphs
  const { summary, provData, geoPieData, geoTitle, isBranchView, membershipData, monthlyTrend, topCustomers, narratives } = useMemo(() => {
    let totalRev = 0;
    let totalVol = 0;
    const pMap = {};
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
      
      let memRaw = r.membership !== undefined && r.membership !== null ? String(r.membership) : '-';
      let mem = (memRaw === '-' || memRaw.trim() === 'None' || memRaw.trim().toLowerCase() === 'customer') ? 'ไม่ได้เป็นสมาชิก' : memRaw.trim();
      
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

    let geoPieData = [];
    let geoTitle = "สัดส่วนรายได้แยกตามจังหวัด";
    let isBranchView = false;

    if (provArr.length === 1) {
       isBranchView = true;
       geoTitle = `สัดส่วนสาขาใน ${provArr[0].name}`;
       const branches = provArr[0].branches;
       geoPieData = branches.slice(0, 5).map(b => ({ name: b.name, value: b.rev }));
       if (branches.length > 5) {
          let otherRev = branches.slice(5).reduce((sum, b) => sum + b.rev, 0);
          geoPieData.push({ name: 'สาขาอื่นๆ', value: otherRev });
       }
    } else {
       geoPieData = provArr.slice(0, 5).map(p => ({ name: p.name, value: p.rev }));
       if (provArr.length > 5) {
          let otherRev = provArr.slice(5).reduce((sum, p) => sum + p.rev, 0);
          geoPieData.push({ name: 'จังหวัดอื่นๆ', value: otherRev });
       }
    }

    const memArr = Object.values(mMap).sort((a,b) => b.value - a.value);
    const topCustArr = Object.values(custMap).sort((a,b) => b.rev - a.rev).slice(0, 20);
    const trendArr = Object.values(monthMap).sort((a,b) => (mToNum[a.name] || 0) - (mToNum[b.name] || 0));

    // Automated Narrative Engine
    const avgRev = totalVol ? totalRev / totalVol : 0;
    const topProv = provArr.length > 0 ? provArr[0] : null;
    const topMonth = [...trendArr].sort((a,b) => b.revenue - a.revenue)[0];

    let para1 = "พี่ยังไม่มีข้อมูลพอให้หนูสรุปได้เลย ลองเลือกข้อมูลใหม่ดูนะ";
    let para2 = ""; let para3 = "";

    if (totalRev > 0) {
      const pTopProvRev = topProv ? ((topProv.rev / totalRev)*100).toFixed(1) : 0;
      
      para1 = `รายงานชุดนี้ดึงยอดสะสมมาทั้งหมด ${totalRev.toLocaleString('th-TH', {maximumFractionDigits:0})} บาท จากงานที่ส่งรวม ${totalVol.toLocaleString('th-TH')} ชิ้น (เฉลี่ยแล้วรายได้ตกอยู่ที่ ${avgRev.toLocaleString('th-TH',{maximumFractionDigits:1})} บาทต่อชิ้น) ถ้าย้อนดูผลงานแต่ละเดือน จะเห็นว่า "เดือน${topMonth ? topMonth.name : 'นึง'}" เป็นช่วงที่ทำรายได้สูงที่สุด กวาดตัวเลขไปถึง ${topMonth ? topMonth.revenue.toLocaleString('th-TH',{maximumFractionDigits:0}) : 0} บาท ถือเป็นช่วงพีกที่สุดของข้อมูลชุดนี้เลยครับ`;

      para2 = `พอเรามาดูว่ารายได้ส่วนใหญ่มันมาจากที่ไหน ความจริงแล้ว${isBranchView && geoPieData.length > 0 ? `สาขา "${geoPieData[0].name}" เป็นตัวเดอะแบกของพื้นที่นี้เลย โดยทำยอดกินสัดส่วนถึง ${((geoPieData[0].value/totalRev)*100).toFixed(1)}% ของทั้งหมด` : `จังหวัด "${topProv ? topProv.name : ''}" เป็นหัวหอกสำคัญ นำยอดเข้ากระเป๋าถึง ${pTopProvRev}% ของรายได้ทั้งหมด`} นอกจากนี้ ลูกค้าประจำในกลุ่ม Membership ก็ยังเป็นฐานเสียงที่ชัวร์ๆ ที่คอยสร้างรายได้ให้เราอย่างสม่ำเสมอในระยะยาวครับ`;

      const topCustNames = topCustArr.slice(0,3).map(c=>c.name).join(', และ ');
      para3 = `ในเรื่องของลูกค้าคนสำคัญ (Key Accounts) ที่เปรียบเหมือน "เส้นเลือดหลัก" เลี้ยงพื้นที่${filterProv.length>0 ? filterProv.join(' ') : 'เหล่านี้'} ก็คือกลุ่มบริษัทอย่าง ${topCustNames ? topCustNames : 'ลูกค้าหน้าร้านทั่วไป'} ลูกค้ากลุ่มนี้จะส่งของผ่านสาขาประจำเยอะและบ่อยมาก ดังนั้นการแวะไปเยี่ยมเยียนดูแลลูกค้า VIP พวกนี้ และรักษามาตรฐานสาขาที่รองรับเค้า จึงเป็นสิ่งที่ต้องโฟกัสที่สุดครับ`;
    }

    return { 
      summary: { totalRev, totalVol, avgRev },
      provData: provArr,
      geoPieData: geoPieData,
      geoTitle: geoTitle,
      isBranchView: isBranchView,
      membershipData: memArr,
      monthlyTrend: trendArr,
      topCustomers: topCustArr,
      narratives: { p1: para1, p2: para2, p3: para3 }
    };
  }, [filteredData, filteredDataTrend]);

  // Formatters
  const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val || 0);
  const formatNumber = (val) => new Intl.NumberFormat('th-TH').format(val || 0);


  // Exports
  const handleExportPDF = async () => {
    if (reportRef.current === null) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let yPos = 0;
      pdf.addImage(imgData, 'JPEG', 0, yPos, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        yPos -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, yPos, imgW, imgH);
        heightLeft -= pageH;
      }
      const ts = new Date();
      const filename = `InsightReport_${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}.pdf`;
      pdf.save(filename);
    } catch (e) {
      console.error('PDF Export Error:', e);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF กรุณาลองใหม่อีกครั้ง');
    }
  };


  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
     const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
     const x = cx + radius * Math.cos(-midAngle * RADIAN);
     const y = cy + radius * Math.sin(-midAngle * RADIAN);
     return percent > 0.05 ? (
       <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
         {`${(percent * 100).toFixed(0)}%`}
       </text>
     ) : null;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 pt-4">
      
      {/* Configuration Strip */}
      <div className="bg-white p-6 shadow-sm border border-gray-200 relative z-30 mx-auto max-w-[1000px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Calendar className="mr-2 text-indigo-600" size={24} />
              Customize Report Document
            </h2>
          </div>
          <div className="flex gap-2">
             <button onClick={handleExportPDF} className="flex items-center text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 shadow-sm px-4 py-2 transition-colors">
                <FileText size={16} className="mr-2" /> Download Report (PDF)
             </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <MultiSelectDropdown label="Year" options={allYears} selectedValues={filterYear} onChange={setFilterYear} width="w-28" />
          <MultiSelectDropdown label="Month" options={allMonths} selectedValues={filterMonth} onChange={setFilterMonth} width="w-32" />
          <MultiSelectDropdown label="Province" options={allProvinces} selectedValues={filterProv} onChange={setFilterProv} width="w-48" />
          <MultiSelectDropdown label="Branch" options={filteredBranchOptions} selectedValues={filterBranch} onChange={setFilterBranch} width="w-48" />
          <button 
             onClick={() => { setFilterYear([]); setFilterMonth([]); setFilterProv([]); setFilterBranch([]); }} 
             className="text-[11px] bg-gray-100 border border-gray-200 px-3 py-1.5 text-gray-600 hover:bg-gray-200 h-[32px] font-bold mt-auto mb-[2px] leading-none">
             Reset Data
          </button>
        </div>
      </div>

      {/* PAPER NARRATIVE REPORT CONTAINER */}
      <div 
        ref={reportRef}
        className="max-w-[1000px] mx-auto bg-white border border-gray-300 min-h-[1400px]"
        style={{ fontFamily: "'Sarabun', 'Taviraj', serif" }} // Inject formal-looking font hints dynamically
      >
         <div className="p-12 md:p-16 lg:p-20 text-gray-900 leading-relaxed">
            
            {/* Header Document */}
            <div className="text-center mb-12">
               <h1 className="text-2xl lg:text-3xl font-bold uppercase tracking-wide border-b-2 border-gray-900 pb-6 mb-6 inline-block w-full">
                  รายงานวิเคราะห์เชิงลึกและทิศทางธุรกิจ (Insight Report)
               </h1>
               <div className="flex justify-center items-center gap-6 text-sm mt-4 border-y border-gray-200 py-3 mx-auto w-max px-8 rounded-full bg-gray-50/50">
                  <p><span className="text-gray-500 font-medium mr-2">รอบเวลา (Period):</span><span className="font-bold text-gray-900">{filterMonth.length > 0 ? filterMonth.join(', ') : 'ตลอดปี'} {filterYear.length > 0 ? filterYear.join(', ') : ''}</span></p>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-200"></div>
                  <p><span className="text-gray-500 font-medium mr-2">พื้นที่ (Region):</span><span className="font-bold text-gray-900">{filterProv.length > 0 ? filterProv.join(', ') : filterBranch.length > 0 ? filterBranch.join(', ') : 'ทุกจังหวัด'}</span></p>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-200"></div>
                  <p><span className="text-gray-500 font-medium mr-2">วันที่ออก (Date):</span><span className="font-bold text-gray-900">{new Date().toLocaleDateString('th-TH')}</span></p>
               </div>
            </div>

            {/* Paragraph 1 */}
            <div className="mb-10 text-justify">
               <h2 className="text-lg font-bold mb-3 border-l-4 border-gray-900 pl-3">ส่วนที่ 1: ภาพรวมผลประกอบการแบบเจาะลึก (Overall Performance)</h2>
               <p className="indent-10 text-[15px] mb-8">{narratives.p1}</p>
               
               {/* Figure 1: Monthly Trend */}
               <div className="my-6 border border-gray-100 bg-gray-50/30 p-6 rounded" style={{ pageBreakInside: 'avoid' }}>
                  <p className="text-center font-bold text-sm mb-4">ภาพประกอบที่ 1: กราฟรายได้และชิ้นงานตลอดทั้งปี</p>
                  <div className="h-64 w-full max-w-2xl mx-auto">
                     <ResponsiveContainer>
                        <ComposedChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} />
                           <YAxis yAxisId="left" tickFormatter={val => `${(val/1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 11}} />
                           <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ borderRadius: '0px' }} />
                           <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#1f2937" strokeWidth={2} dot={{r: 4}} name="รายได้ (บ.)">
                              <LabelList dataKey="revenue" position="top" formatter={(val) => val > 0 ? (val/1000).toFixed(0)+'k' : ''} fill="#4b5563" fontSize={11} fontWeight="bold" offset={10} />
                           </Line>
                           <Bar yAxisId="left" dataKey="volume" fill="#d1d5db" barSize={16} name="ปริมาณงาน (ชิ้น)" />
                        </ComposedChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>

            {/* Paragraph 2 */}
            <div className="mb-10 text-justify">
               <h2 className="text-lg font-bold mb-3 border-l-4 border-gray-900 pl-3">ส่วนที่ 2: การกระจายตัวของพื้นที่ขายและระบบสมาชิก (Geographic & Membership)</h2>
               <p className="indent-10 text-[15px] mb-8">{narratives.p2}</p>

               {/* Figure 2: Pies */}
               <div className="my-6 flex flex-col md:flex-row justify-center items-center gap-12" style={{ pageBreakInside: 'avoid' }}>
                  <div className="w-full md:w-1/2 flex flex-col items-center">
                     <p className="text-center font-bold text-[13px] mb-2 text-gray-700">ภาพประกอบที่ 2.1: {geoTitle}</p>
                     <div className="h-48 w-full max-w-[200px]">
                        <ResponsiveContainer>
                           <PieChart>
                              <Pie data={geoPieData} cx="50%" cy="50%" innerRadius={0} outerRadius={70} dataKey="value" labelLine={false} label={renderCustomizedLabel}>
                                 {geoPieData.map((entry, index) => <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(val) => formatCurrency(val)} />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="w-full max-w-[250px] mt-4 text-xs space-y-1">
                        {geoPieData.slice(0, 4).map((m, i) => (
                           <div key={i} className="flex justify-between border-b border-gray-100 pb-1">
                              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>{m.name}</span>
                              <span className="font-bold">{((m.value / summary.totalRev) * 100).toFixed(1)}%</span>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="w-full md:w-1/2 flex flex-col items-center">
                     <p className="text-center font-bold text-[13px] mb-2 text-gray-700">ภาพประกอบที่ 2.2: สัดส่วนระบบ Membership</p>
                     <div className="h-48 w-full max-w-[200px]">
                        <ResponsiveContainer>
                           <PieChart>
                              <Pie data={membershipData} cx="50%" cy="50%" innerRadius={0} outerRadius={70} dataKey="value" labelLine={false} label={renderCustomizedLabel}>
                                 {membershipData.map((entry, index) => <Cell key={`m-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(val) => formatCurrency(val)} />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="w-full max-w-[250px] mt-4 text-xs space-y-1">
                        {membershipData.slice(0, 4).map((m, i) => (
                           <div key={i} className="flex justify-between border-b border-gray-100 pb-1">
                              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[(i+4) % COLORS.length]}}></div>{m.name}</span>
                              <span className="font-bold">{((m.value / summary.totalRev) * 100).toFixed(1)}%</span>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* Paragraph 3 */}
            <div className="mb-10 text-justify">
               <h2 className="text-lg font-bold mb-3 border-l-4 border-gray-900 pl-3">ส่วนที่ 3: ภูมิศาสตร์และลูกค้าสำคัญ (Strategic Locations & Key Accounts)</h2>
               <p className="indent-10 text-[15px] mb-8">{narratives.p3}</p>
               
               {/* Figure 3: Tables */}
               <div className="flex flex-col gap-10 mt-6 text-sm" style={{ pageBreakInside: 'avoid' }}>
                  
                  {/* Top 10 customer list formatted as a professional table */}
                  <div className="w-full">
                     <p className="font-bold text-sm mb-2 text-gray-800">ตารางที่ 1: รายชื่อ 10 ลูกค้าสำคัญ (Top Key Accounts)</p>
                     <table className="w-full text-left border-collapse border border-gray-400">
                        <thead className="bg-gray-100">
                           <tr className="border-b border-gray-400">
                              <th className="py-2 px-3 border-r border-gray-300 w-12 text-center">ลำดับ</th>
                              <th className="py-2 px-3 border-r border-gray-300">ชื่อลูกค้าบัญชี/องค์กร</th>
                              <th className="py-2 px-3 border-r border-gray-300">สาขาหลักที่ใช้งาน</th>
                              <th className="py-2 px-3 text-right">ยอดรายได้ (บาท)</th>
                           </tr>
                        </thead>
                        <tbody>
                           {topCustomers.slice(0, 10).map((c, i) => (
                              <tr key={i} className="border-b border-gray-300 text-[13px] hover:bg-gray-50">
                                 <td className="py-2 px-3 border-r border-gray-300 text-center font-bold text-gray-500">{i+1}</td>
                                 <td className="py-2 px-3 border-r border-gray-300 font-semibold">{c.name}</td>
                                 <td className="py-2 px-3 border-r border-gray-300 text-gray-600">{c.mainBranch}</td>
                                 <td className="py-2 px-3 text-right font-bold text-indigo-900">{formatCurrency(c.rev)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* Top Provinces details */}
                  <div className="w-full" style={{ pageBreakBefore: 'auto' }}>
                     <p className="font-bold text-sm mb-2 text-gray-800">ตารางที่ 2: ข้อมูลรายได้จัดแบ่งตามพื้นที่และสาขา (Location Performance)</p>
                     <table className="w-full text-left border-collapse border border-gray-400">
                        <thead className="bg-gray-100">
                           <tr className="border-b border-gray-400">
                              <th className="py-2 px-3 border-r border-gray-300">{isBranchView ? 'ที่ทำการ (สาขา)' : 'จังหวัด'}</th>
                              <th className="py-2 px-3 border-r border-gray-300 text-right">{isBranchView ? 'ปริมาณงานสาขา (ชิ้น)' : 'จำนวนสาขา'}</th>
                              <th className="py-2 px-3 border-r border-gray-300 text-right">{isBranchView ? 'รายได้เฉลี่ย/ชิ้น' : 'ปริมาณจัดส่ง (ชิ้น)'}</th>
                              <th className="py-2 px-3 text-right">รายได้สะสม (บาท)</th>
                           </tr>
                        </thead>
                        <tbody>
                           {!isBranchView ? (
                              provData.slice(0, 10).map((prov, i) => (
                                 <tr key={`p-${i}`} className="border-b border-gray-300 text-[13px] hover:bg-gray-50">
                                    <td className="py-2 px-3 border-r border-gray-300 font-semibold">{prov.name}</td>
                                    <td className="py-2 px-3 border-r border-gray-300 text-right text-gray-600">{prov.branches?.length || 0}</td>
                                    <td className="py-2 px-3 border-r border-gray-300 text-right text-gray-600">{formatNumber(prov.vol)}</td>
                                    <td className="py-2 px-3 text-right font-bold text-indigo-900">{formatCurrency(prov.rev)}</td>
                                 </tr>
                              ))
                           ) : (
                              (provData[0]?.branches || []).slice(0, 15).map((b, i) => (
                                 <tr key={`b-${i}`} className="border-b border-gray-300 text-[13px] hover:bg-gray-50">
                                    <td className="py-2 px-3 border-r border-gray-300 font-semibold">{b.name}</td>
                                    <td className="py-2 px-3 border-r border-gray-300 text-right text-gray-600">{formatNumber(b.vol)}</td>
                                    <td className="py-2 px-3 border-r border-gray-300 text-right text-gray-600">{formatCurrency(b.vol ? b.rev/b.vol : 0)}</td>
                                    <td className="py-2 px-3 text-right font-bold text-indigo-900">{formatCurrency(b.rev)}</td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  </div>

               </div>
            </div>

            {/* End of Report */}
            <div className="mt-16 pt-8 border-t border-gray-400 text-center text-xs font-bold text-gray-400 uppercase tracking-widest pb-4">
               --- End of Insight Report ---
            </div>

         </div>
      </div>
    </div>
  );
};

export default FullReport;
