import React, { useMemo, useState, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList, LineChart, Line, ComposedChart, ReferenceLine
} from 'recharts';
import { TrendingUp, Users, Package, DollarSign, Activity, Filter, RefreshCw, Download } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

// Common colors for charts
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#0088FE', '#00C49F'];

const mToNum = {'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12};

const Overview = ({ data }) => {
  const [filterProv, setFilterProv] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterMembership, setFilterMembership] = useState('All');
  const [filterCustType, setFilterCustType] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');
  const [selectedTrendMetric, setSelectedTrendMetric] = useState('revenue');
  const [membershipMetric, setMembershipMetric] = useState('revenue');
  const [trendChartType, setTrendChartType] = useState('line');
  const dashboardRef = useRef(null);

  const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(val);
  const formatNumber = (val) => new Intl.NumberFormat('th-TH').format(val);

  const handleResetFilters = () => {
    setFilterProv('All');
    setFilterType('All');
    setFilterBranch('All');
    setFilterMembership('All');
    setFilterCustType('All');
    setFilterMonth('All');
  };

  const handleExportImage = () => {
    if (dashboardRef.current === null) return;
    htmlToImage.toPng(dashboardRef.current, { cacheBust: true, backgroundColor: '#f9fafb' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `dashboard-export-${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Failed to export image', err);
      });
  };

  const provinces = useMemo(() => ['All', ...Array.from(new Set(data.map(r => r['จังหวัด']).filter(Boolean))).sort()], [data]);
  const serviceTypes = useMemo(() => ['All', ...Array.from(new Set(data.map(r => r['ประเภทบริการ']).filter(Boolean))).sort()], [data]);
  const branches = useMemo(() => {
     return ['All', ...Array.from(new Set(
        data.filter(r => filterProv === 'All' || r['จังหวัด'] === filterProv)
            .map(r => r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'])
            .filter(Boolean)
     )).sort()];
  }, [data, filterProv]);
  const memberships = useMemo(() => ['All', ...Array.from(new Set(data.map(r => r.membership).filter((v) => v && v !== '-'))).sort()], [data]);
  const custTypes = useMemo(() => ['All', ...Array.from(new Set(data.map(r => r.customerType).filter((v) => v && v !== '-'))).sort()], [data]);
  const monthsList = useMemo(() => {
     const set = new Set(data.map(r => r['เดือน'] || r.month).filter(Boolean));
     return ['All', ...Array.from(set).sort((a,b) => (mToNum[a] || 0) - (mToNum[b] || 0))];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(r => {
      const mn = r['เดือน'] || r.month;
      if (filterMonth !== 'All' && mn !== filterMonth) return false;
      if (filterProv !== 'All' && r['จังหวัด'] !== filterProv) return false;
      if (filterType !== 'All' && r['ประเภทบริการ'] !== filterType) return false;
      const b = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'];
      if (filterBranch !== 'All' && b !== filterBranch) return false;
      if (filterMembership !== 'All' && r.membership !== filterMembership) return false;
      if (filterCustType !== 'All' && r.customerType !== filterCustType) return false;
      return true;
    });
  }, [data, filterMonth, filterProv, filterType, filterBranch, filterMembership, filterCustType]);

  // --- Calculations ---
  const latestDate = useMemo(() => {
    if(!data || data.length === 0) return 'ล่าสุด';
    let maxNum = 0;
    let maxDate = 'ล่าสุด';
    data.forEach(r => {
       const y = parseInt(r.year || 2026);
       const m = mToNum[r.month] || 0;
       const val = y * 100 + m;
       if (val >= maxNum && r.date && r.date !== 'N/A') {
          maxNum = val;
          maxDate = r.date;
       }
    });
    return maxDate;
  }, [data]);

  const summary = useMemo(() => {
    let totalRev = 0;
    let totalVol = 0;
    const activeAccounts = new Set();
    let domesticRev = 0;
    let intlRev = 0;

    filteredData.forEach(row => {
      const rev = row['รายได้'] || 0;
      const vol = row['ชิ้นงาน'] || 0;
      
      totalRev += rev;
      totalVol += vol;
      
      if (row['ชื่อบัญชี']) {
        activeAccounts.add(row['ชื่อบัญชี']);
      }

      if (row['ประเภทบริการ'] === 'ในประเทศ') {
        domesticRev += rev;
      } else if (row['ประเภทบริการ'] === 'ระหว่างประเทศ') {
        intlRev += rev;
      }
    });

    return {
      totalRev,
      totalVol,
      activeAccounts: activeAccounts.size,
      domesticShare: totalRev ? (domesticRev / totalRev) * 100 : 0,
      intlShare: totalRev ? (intlRev / totalRev) * 100 : 0,
      avgRev: totalVol ? (totalRev / totalVol) : 0,
    };
  }, [filteredData]);

  const prevSummary = useMemo(() => {
    if (filterMonth === 'All') return null;
    const currentIdx = monthsList.indexOf(filterMonth);
    if (currentIdx <= 1) return null; // No previous month available in list
    const prevMonthName = monthsList[currentIdx - 1];

    const prevFilteredData = data.filter(r => {
      const mn = r['เดือน'] || r.month;
      if (mn !== prevMonthName) return false;
      if (filterProv !== 'All' && r['จังหวัด'] !== filterProv) return false;
      if (filterType !== 'All' && r['ประเภทบริการ'] !== filterType) return false;
      const b = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'];
      if (filterBranch !== 'All' && b !== filterBranch) return false;
      if (filterMembership !== 'All' && r.membership !== filterMembership) return false;
      if (filterCustType !== 'All' && r.customerType !== filterCustType) return false;
      return true;
    });

    let totalRev = 0; let totalVol = 0; const activeAccounts = new Set();
    prevFilteredData.forEach(row => {
      totalRev += parseFloat(row['รายได้']) || parseFloat(String(row['รายได้']).replace(/,/g, '')) || 0;
      totalVol += parseInt(row['ชิ้นงาน']) || parseInt(String(row['ชิ้นงาน']).replace(/,/g, '')) || 0;
      if (row['ชื่อบัญชี']) activeAccounts.add(row['ชื่อบัญชี']);
    });
    
    return {
      totalRev, totalVol, activeAccounts: activeAccounts.size, avgRev: totalVol ? totalRev / totalVol : 0
    };
  }, [data, filterMonth, filterProv, filterType, filterBranch, filterMembership, filterCustType, monthsList]);

  const trendData = useMemo(() => {
     const mMap = {};
     filteredData.forEach(r => {
        const m = r['เดือน'] || r.month;
        if (!m) return;
        if (!mMap[m]) mMap[m] = { name: m, revenue: 0, volume: 0, activeSet: new Set() };
        mMap[m].revenue += parseFloat(r['รายได้']) || parseFloat(String(r['รายได้']).replace(/,/g, '')) || 0;
        mMap[m].volume += parseInt(r['ชิ้นงาน']) || parseInt(String(r['ชิ้นงาน']).replace(/,/g, '')) || 0;
        if (r['ชื่อบัญชี']) mMap[m].activeSet.add(r['ชื่อบัญชี']);
     });
     return Object.values(mMap).map(m => ({ ...m, activeAccounts: m.activeSet.size })).sort((a,b) => (mToNum[a.name] || 0) - (mToNum[b.name] || 0));
  }, [filteredData]);

  const aiInsights = useMemo(() => {
     let current = null;
     let previous = null;
     
     if (filterMonth === 'All') {
        const sorted = trendData;
        if (sorted.length >= 1) current = sorted[sorted.length - 1];
        if (sorted.length >= 2) previous = sorted[sorted.length - 2];
     } else {
        const currentIdx = monthsList.indexOf(filterMonth);
        current = trendData.find(d => d.name === filterMonth);
        
        if (currentIdx > 1) {
           const prevMonthName = monthsList[currentIdx - 1];
           const prevData = data.filter(r => {
              const mn = r['เดือน'] || r.month;
              if (mn !== prevMonthName) return false;
              if (filterProv !== 'All' && r['จังหวัด'] !== filterProv) return false;
              if (filterType !== 'All' && r['ประเภทบริการ'] !== filterType) return false;
              const b = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'];
              if (filterBranch !== 'All' && b !== filterBranch) return false;
              return true;
           });
           
           let pRev = 0; let pVol = 0; let pAccSet = new Set();
           prevData.forEach(r => {
              pRev += parseFloat(r['รายได้']) || 0;
              pVol += parseInt(r['ชิ้นงาน']) || 0;
              if (r['ชื่อบัญชี']) pAccSet.add(r['ชื่อบัญชี']);
           });
           previous = { revenue: pRev, volume: pVol, activeAccounts: pAccSet.size };
        }
     }

     if (!current) return null;

     const getInsight = (curr, prev, type) => {
        if (!prev) return { pct: null, insight: 'ข้อมูลเดือนแรก ยังไม่สามารถวิเคราะห์แนวโน้มได้' };
        const diff = curr - prev;
        const pct = prev !== 0 ? (diff / prev) * 100 : 0;
        const isUp = pct >= 0;
        const absPct = Math.abs(pct).toFixed(1);

        let insight = '';
        if (type === 'revenue') {
           if (pct > 5) insight = `เติบโตเด่นชัด (${absPct}%) สัญญาณบวกแข็งแกร่ง`;
           else if (pct >= 0) insight = `รายได้คงที่ (${absPct}%) รักษามาตรฐานได้ดี`;
           else if (pct > -5) insight = `ชะลอตัวเล็กน้อย (${absPct}%) ควรจับตามอง`;
           else insight = `ลดลงอย่างมีนัยสำคัญ (${absPct}%) เร่งตรวจสอบสาเหตุ`;
        } else if (type === 'volume') {
           if (pct > 5) insight = `งานเพิ่มขึ้นมาก (${absPct}%) ความต้องการสูงขึ้น`;
           else if (pct >= 0) insight = `ปริมาณงานคงที่ (${absPct}%) ปกติตามฤดูกาล`;
           else insight = `งานลดลง (${absPct}%) ระวังลูกค้าลดการส่ง`;
        } else if (type === 'avg') {
           if (pct > 2) insight = `มูลค่าต่อชิ้นสูงขึ้น (${absPct}%) ลูกค้าใช้บริการ Premium`;
           else if (pct < -2) insight = `มูลค่าต่อชิ้นลดลง (${absPct}%) ลูกค้าเน้นราคาประหยัด`;
           else insight = `มูลค่าต่อชิ้นคงที่ (${absPct}%) โครงสร้างเดิม`;
        } else if (type === 'cust') {
           if (pct > 0) insight = `ฐานลูกค้าขยายตัว (${absPct}%) พบลูกค้ากลุ่มใหม่`;
           else if (pct === 0) insight = `รักษาฐานลูกค้าเดิมได้ครบ (${absPct}%)`;
           else insight = `สูญเสียลูกค้าบางส่วน (${absPct}%) ควรเร่งรักษาฐาน`;
        }

        return { pct: pct.toFixed(1), isUp, insight };
     };

     const currAvg = current.volume ? current.revenue / current.volume : 0;
     const prevAvg = previous?.volume ? previous.revenue / previous.volume : 0;

     const rev = getInsight(current.revenue, previous?.revenue, 'revenue');
     const vol = getInsight(current.volume, previous?.volume, 'volume');
     const eff = getInsight(currAvg, prevAvg, 'avg');
     const ret = getInsight(current.activeAccounts, previous?.activeAccounts, 'cust');

     let overall = "";
     if (!previous) {
        overall = "สรุปภาพรวม: ข้อมูลเริ่มต้นเดือนแรก ยังไม่สามารถเปรียบเทียบแนวโน้มย้อนหลังได้ อย่างไรก็ตามประสิทธิภาพในปัจจุบันถือเป็นฐานที่ดีสำหรับการติดตามผลในเดือนถัดไป";
     } else {
        overall = "สรุปภาพรวม: ";
        if (rev.isUp && vol.isUp) overall += `เดือนนี้เป็นช่วงขาขึ้นที่ชัดเจน ทั้งรายได้และปริมาณงานเติบโตควบคู่กัน ${ret.isUp ? 'ยอดเยี่ยมที่มีการขยายฐานลูกค้าเพิ่มขึ้นด้วย' : 'เน้นการเติบโตจากกลุ่มลูกค้าเดิมเป็นหลัก'}`;
        else if (rev.isUp && !vol.isUp) overall += `รายได้ประคองตัวได้ดีแม้ปริมาณงานจะลดลงเฉลี่ย แสดงให้เห็นว่าสามารถรักษากลุ่มลูกค้าที่มีมูลค่าสูงได้สำเร็จ`;
        else if (!rev.isUp && vol.isUp) overall += `ปริมาณงานเพิ่มขึ้นแต่รายได้กลับลดลง สะท้อนถึงการใช้บริการในกลุ่มราคาประหยัดที่มากขึ้น หรือสัดส่วนกำไรต่อชิ้นงานเริ่มลดลง`;
        else overall += `ภาพรวมมีการชะลอตัวลง ทั้งในด้านรายได้และปริมาณงาน ควรเร่งตรวจสอบสาเหตุและจัดกิจกรรมส่งเสริมการขายเพื่อกระตุ้นยอดในเดือนถัดไป`;
        
        if (eff.isUp && rev.isUp) overall += " เสริมด้วยกลยุทธ์การเน้นบริการมูลค่าสูงที่เริ่มเห็นผลลัพธ์ที่น่าพอใจ";
     }

     return {
        overall,
        revenue: { label: 'Revenue Insight', value: formatCurrency(current.revenue), ...rev },
        volume: { label: 'Volume Insight', value: formatNumber(current.volume) + ' ชิ้น', ...vol },
        avgRev: { label: 'Effectiveness Insight', value: formatCurrency(currAvg), ...eff },
        customers: { label: 'Retention Insight', value: formatNumber(current.activeAccounts) + ' ราย', ...ret }
     };
  }, [trendData, data, filterMonth, filterProv, filterType, filterBranch, monthsList]);

  const rawProvData = useMemo(() => {
    const provinceMap = {};
    filteredData.forEach(row => {
      const p = row['จังหวัด'];
      if(!p) return;
      if (!provinceMap[p]) {
        provinceMap[p] = { name: p, revenue: 0, volume: 0 };
      }
      provinceMap[p].revenue += row['รายได้'] || 0;
      provinceMap[p].volume += row['ชิ้นงาน'] || 0;
    });
    return Object.values(provinceMap).sort((a,b) => b.revenue - a.revenue);
  }, [filteredData]);

  const serviceTypeData = useMemo(() => {
    const typeMap = {};
    filteredData.forEach(row => {
      let t = row['ชื่อบริการ'];
      if (!t) return;
      
      // Simplify service name for display
      if (t.includes('Package')) {
         t = 'EMS Package';
      } else if (t.includes('EMSในฯ') || t.includes('EMS ในฯ')) {
         t = 'EMS Domestic';
      } else if (t === 'ระหว่างประเทศ') {
         t = 'International';
      }

      if (!typeMap[t]) typeMap[t] = { name: t, value: 0 };
      typeMap[t].value += row['รายได้'] || 0;
    });
    return Object.values(typeMap);
  }, [filteredData]);

  const membershipData = useMemo(() => {
    const memMap = {};
    filteredData.forEach(row => {
      let t = row.membership || '-';
      if (!memMap[t]) memMap[t] = { name: t, value: 0, activeSet: new Set() };
      if (membershipMetric === 'revenue') {
         memMap[t].value += parseFloat(row['รายได้']) || parseFloat(String(row['รายได้']).replace(/,/g, '')) || 0;
      } else {
         if (row['ชื่อบัญชี']) memMap[t].activeSet.add(row['ชื่อบัญชี']);
      }
    });
    
    if (membershipMetric !== 'revenue') {
       Object.values(memMap).forEach(m => m.value = m.activeSet.size);
    }
    
    return Object.values(memMap).sort((a,b) => b.value - a.value);
  }, [filteredData, membershipMetric]);

  const topCustomers = useMemo(() => {
    const accMap = {};
    filteredData.forEach(row => {
      const acc = row['ชื่อบัญชี'];
      if(!acc) return;
      if (!accMap[acc]) accMap[acc] = { 
        name: acc, 
        revenue: 0, 
        volume: 0, 
        type: row['ประเภทบริการ'],
        branch: row[' ชื่อที่ทำการไปรษณีย์'] || row['ชื่อที่ทำการไปรษณีย์']
      };
      accMap[acc].revenue += row['รายได้'] || 0;
      accMap[acc].volume += row['ชิ้นงาน'] || 0;
    });
    return Object.values(accMap).sort((a,b) => b.revenue - a.revenue).slice(0, 100);
  }, [filteredData]);

  return (
    <div className="space-y-6" ref={dashboardRef}>
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-gray-800">Business Summary</h2>
         <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">Updated: {latestDate}</span>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center text-gray-500 font-medium mr-2"><Filter size={18} className="mr-2"/> Filters:</div>
        <select className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-4 rounded-xl outline-none min-w-[150px]" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          {monthsList.map(p => <option key={p} value={p}>{p === 'All' ? 'All Months' : p}</option>)}
        </select>
        <select className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-4 rounded-xl outline-none min-w-[150px]" value={filterProv} onChange={e => setFilterProv(e.target.value)}>
          {provinces.map(p => <option key={p} value={p}>{p === 'All' ? 'All Provinces' : p}</option>)}
        </select>
        <select className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-4 rounded-xl outline-none min-w-[150px]" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
          {branches.map(b => <option key={b} value={b}>{b === 'All' ? 'All Branches' : b}</option>)}
        </select>
        <select className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-4 rounded-xl outline-none min-w-[150px]" value={filterType} onChange={e => setFilterType(e.target.value)}>
          {serviceTypes.map(t => <option key={t} value={t}>{t === 'All' ? 'All Services' : t}</option>)}
        </select>
        <select className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-4 rounded-xl outline-none min-w-[150px]" value={filterMembership} onChange={e => setFilterMembership(e.target.value)}>
          {memberships.map(t => <option key={t} value={t}>{t === 'All' ? 'All Memberships' : t}</option>)}
        </select>
        <select className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-4 rounded-xl outline-none min-w-[150px]" value={filterCustType} onChange={e => setFilterCustType(e.target.value)}>
          {custTypes.map(t => <option key={t} value={t}>{t === 'All' ? 'All Cust Types' : t}</option>)}
        </select>
        
        <div className="flex-1"></div> {/* Spacer to push buttons to right */}
        
        <button 
          onClick={handleResetFilters}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-medium text-sm"
        >
          <RefreshCw size={16} />
          <span>Reset</span>
        </button>
        
         <button 
          onClick={handleExportImage}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-sm shadow-indigo-200 font-medium text-sm"
        >
          <Download size={16} />
          <span>Export Image</span>
        </button>
      </div>

      <div className="bg-gradient-to-br from-indigo-700 to-slate-900 p-8 rounded-3xl shadow-xl border border-white/5 overflow-hidden relative group text-white">
         {/* Decorative background element */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>

         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10">
            <div className="flex items-center mb-4 md:mb-0">
               <div className="bg-indigo-500/30 p-3 rounded-2xl mr-4 backdrop-blur-md border border-white/10 shadow-lg shadow-indigo-900/20">
                  <Activity size={24} className="text-indigo-100" />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-white">Performance Intelligence</h3>
                  <p className="text-sm text-indigo-200/70">AI-driven business analysis and trend forecasting</p>
               </div>
            </div>
            <div className="flex gap-2">
               <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-500/30 tracking-widest uppercase">Live Analysis</span>
            </div>
         </div>

         {aiInsights?.overall && (
            <div className="bg-white/10 p-5 rounded-2xl border border-white/5 mb-8 backdrop-blur-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative z-10">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <TrendingUp size={48} className="text-white" />
               </div>
               <p className="text-base font-medium text-white leading-relaxed max-w-4xl relative z-10">
                  ✨ {aiInsights.overall}
               </p>
            </div>
         )}

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {aiInsights ? Object.entries(aiInsights).filter(([k]) => k !== 'overall').map(([key, item]) => (
               <div key={key} className="bg-white/5 p-4 rounded-2xl border border-white/10 transition-all hover:bg-white/10 hover:shadow-xl hover:-translate-y-1 group/item">
                  <div className="flex justify-between items-start mb-3">
                     <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest group-hover/item:text-white transition-colors">{item.label}</span>
                     {item.pct !== null && (
                        <div className={`flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${item.isUp ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
                           {item.isUp ? '▲' : '▼'} {Math.abs(item.pct)}%
                        </div>
                     )}
                  </div>
                  <p className="text-sm font-bold text-white mb-3 leading-snug">{item.insight}</p>
                  <div className="pt-2 border-t border-white/5 flex justify-between items-baseline">
                     <span className="text-lg font-black text-white">{item.value}</span>
                     <span className="text-[10px] text-white/40 font-bold uppercase italic">Current</span>
                  </div>
               </div>
            )) : (
               <div className="col-span-4 text-center py-6 text-indigo-300 text-sm italic">ไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์</div>
            )}
         </div>
      </div>



      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div onClick={() => setSelectedTrendMetric('revenue')} className={`cursor-pointer bg-white p-6 rounded-2xl shadow-sm border ${selectedTrendMetric === 'revenue' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-orange-100'} relative overflow-hidden group transition-all transform hover:-translate-y-1`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-2 rounded-lg ${selectedTrendMetric === 'revenue' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'}`}><DollarSign size={20} /></div>
            <h3 className="text-gray-500 font-medium select-none">Total Revenue</h3>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-gray-800">{formatCurrency(summary.totalRev)}</p>
            {prevSummary && (
               <div className={`text-xs font-bold px-2 py-1 rounded-md mb-1 ${summary.totalRev >= prevSummary.totalRev ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {summary.totalRev >= prevSummary.totalRev ? '+' : ''}{prevSummary.totalRev ? (((summary.totalRev - prevSummary.totalRev)/prevSummary.totalRev)*100).toFixed(1) : 0}%
               </div>
            )}
          </div>
        </div>

        <div onClick={() => setSelectedTrendMetric('volume')} className={`cursor-pointer bg-white p-6 rounded-2xl shadow-sm border ${selectedTrendMetric === 'volume' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-100'} relative overflow-hidden group transition-all transform hover:-translate-y-1`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
           <div className="flex items-center space-x-3 mb-4">
            <div className={`p-2 rounded-lg ${selectedTrendMetric === 'volume' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}><Package size={20} /></div>
            <h3 className="text-gray-500 font-medium select-none">Total Volume</h3>
          </div>
          <div className="flex items-end justify-between">
             <p className="text-3xl font-bold text-gray-800">{formatNumber(summary.totalVol)} pcs</p>
             {prevSummary && (
               <div className={`text-xs font-bold px-2 py-1 rounded-md mb-1 ${summary.totalVol >= prevSummary.totalVol ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {summary.totalVol >= prevSummary.totalVol ? '+' : ''}{prevSummary.totalVol ? (((summary.totalVol - prevSummary.totalVol)/prevSummary.totalVol)*100).toFixed(1) : 0}%
               </div>
             )}
          </div>
        </div>

        <div onClick={() => setSelectedTrendMetric('avgRev')} className={`cursor-pointer bg-white p-6 rounded-2xl shadow-sm border ${selectedTrendMetric === 'avgRev' ? 'border-rose-500 ring-2 ring-rose-200' : 'border-rose-100'} relative overflow-hidden group transition-all transform hover:-translate-y-1`}>
           <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
           <div className="flex items-center space-x-3 mb-4">
             <div className={`p-2 rounded-lg ${selectedTrendMetric === 'avgRev' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600'}`}><Activity size={20} /></div>
             <h3 className="text-gray-500 font-medium select-none">Avg Rev/Piece</h3>
           </div>
           <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-800">{formatCurrency(summary.avgRev)}</p>
              {prevSummary && (
                 <div className={`text-xs font-bold px-2 py-1 rounded-md mb-1 ${summary.avgRev >= prevSummary.avgRev ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {summary.avgRev >= prevSummary.avgRev ? '+' : ''}{prevSummary.avgRev ? (((summary.avgRev - prevSummary.avgRev)/prevSummary.avgRev)*100).toFixed(1) : 0}%
                 </div>
              )}
           </div>
        </div>

        <div onClick={() => setSelectedTrendMetric('accounts')} className={`cursor-pointer bg-white p-6 rounded-2xl shadow-sm border ${selectedTrendMetric === 'accounts' ? 'border-green-500 ring-2 ring-green-200' : 'border-green-100'} relative overflow-hidden group transition-all transform hover:-translate-y-1`}>
           <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
           <div className="flex items-center space-x-3 mb-4">
            <div className={`p-2 rounded-lg ${selectedTrendMetric === 'accounts' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'}`}><Users size={20} /></div>
            <h3 className="text-gray-500 font-medium select-none">Active Accounts</h3>
          </div>
          <div className="flex items-end justify-between">
             <p className="text-3xl font-bold text-gray-800">{formatNumber(summary.activeAccounts)}</p>
             {prevSummary && (
                 <div className={`text-xs font-bold px-2 py-1 rounded-md mb-1 ${summary.activeAccounts >= prevSummary.activeAccounts ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {summary.activeAccounts >= prevSummary.activeAccounts ? '+' : ''}{prevSummary.activeAccounts ? (((summary.activeAccounts - prevSummary.activeAccounts)/prevSummary.activeAccounts)*100).toFixed(1) : 0}%
                 </div>
              )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
           <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><TrendingUp size={20} /></div>
            <h3 className="text-gray-500 font-medium">Domestic Share</h3>
          </div>
          <p className="text-3xl font-bold text-gray-800">{summary.domesticShare.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-2">Intl: {summary.intlShare.toFixed(1)}%</p>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
               <h3 className="text-xl font-bold text-gray-800">
                  {selectedTrendMetric === 'revenue' && 'Revenue Trend (รายได้)'}
                  {selectedTrendMetric === 'volume' && 'Volume Trend (ปริมาณงาน)'}
                  {selectedTrendMetric === 'accounts' && 'Active Accounts Trend (จำนวนลูกค้า)'}
                  {selectedTrendMetric === 'avgRev' && 'Avg Rev/Piece Trend (รายได้เฉลี่ยต่อชิ้น)'}
               </h3>
               <p className="text-sm text-gray-500">Compare monthly performance and growth rates</p>
            </div>
            
            <div className="flex items-center gap-3">
               <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider hidden md:block">Visualization</span>
               <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button onClick={() => setTrendChartType('line')} className={`text-xs px-4 py-1.5 rounded-lg font-bold transition-all ${trendChartType === 'line' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>Line</button>
                  <button onClick={() => setTrendChartType('bar')} className={`text-xs px-4 py-1.5 rounded-lg font-bold transition-all ${trendChartType === 'bar' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>Bar</button>
               </div>
            </div>
         </div>
         
         <div className="h-80 w-full">
            <ResponsiveContainer>
               <ComposedChart data={trendData} margin={{ top: 25, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 500}} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} 
                      tickFormatter={val => selectedTrendMetric === 'revenue' ? `${val/1000}k` : selectedTrendMetric === 'avgRev' ? val.toFixed(0) : formatNumber(val)} />
                  <Tooltip 
                      content={({ active, payload, label }) => {
                         if (active && payload && payload.length) {
                            const idx = trendData.findIndex(d => d.name === label);
                            const prev = idx > 0 ? trendData[idx - 1] : null;
                            let val = payload[0].value;
                            let prevVal = prev ? (selectedTrendMetric === 'revenue' ? prev.revenue : selectedTrendMetric === 'volume' ? prev.volume : selectedTrendMetric === 'accounts' ? prev.activeAccounts : (prev.volume ? prev.revenue/prev.volume : 0)) : null;
                            let pct = prevVal ? (((val - prevVal)/prevVal)*100).toFixed(1) : null;
                            let formattedVal = selectedTrendMetric === 'revenue' || selectedTrendMetric === 'avgRev' ? formatCurrency(val) : formatNumber(val);
                            return (
                               <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
                                  <p className="font-bold text-gray-400 text-[10px] uppercase tracking-widest mb-2 border-b border-gray-50 pb-2">{label}</p>
                                  <div className="flex items-center gap-3">
                                     <span className="text-lg font-black text-gray-900">{formattedVal}</span>
                                     {pct !== null && (
                                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${pct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                           {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}%
                                        </span>
                                     )}
                                  </div>
                               </div>
                            );
                         }
                         return null;
                      }}
                      cursor={{fill: '#f8fafc'}}
                  />
                  <Legend iconType="circle" />
                  {selectedTrendMetric === 'revenue' && (trendChartType === 'line' ? 
                     <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#ff7f50" strokeWidth={4} dot={{r: 4, fill: '#ff7f50', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 7}}>
                        <LabelList dataKey="revenue" position="top" offset={15} formatter={(val) => formatNumberCompact(val)} style={{fill: '#ff7f50', fontSize: 10, fontWeight: 'bold'}} />
                     </Line> : 
                     <Bar dataKey="revenue" name="Revenue" fill="#ff7f50" radius={[6, 6, 0, 0]} barSize={40}>
                        <LabelList dataKey="revenue" position="top" offset={10} formatter={(val) => formatNumberCompact(val)} style={{fill: '#ff7f50', fontSize: 10, fontWeight: 'bold'}} />
                     </Bar>
                  )}
                  {selectedTrendMetric === 'revenue' && <ReferenceLine y={0} stroke="#e5e7eb" />}
                  
                  {selectedTrendMetric === 'volume' && (trendChartType === 'line' ? 
                     <Line type="monotone" dataKey="volume" name="Volume" stroke="#3b82f6" strokeWidth={4} dot={{r: 4}} activeDot={{r: 7}} /> : 
                     <Bar dataKey="volume" name="Volume" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                  )}
                  
                  {selectedTrendMetric === 'accounts' && (trendChartType === 'line' ? 
                     <Line type="monotone" dataKey="activeAccounts" name="Accounts" stroke="#10b981" strokeWidth={4} dot={{r: 4}} activeDot={{r: 7}} /> : 
                     <Bar dataKey="activeAccounts" name="Accounts" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                  )}
                  
                  {selectedTrendMetric === 'avgRev' && (trendChartType === 'line' ? 
                     <Line type="monotone" dataKey={(d) => d.volume ? d.revenue/d.volume : 0} name="Avg Rev" stroke="#8b5cf6" strokeWidth={4} dot={{r: 4}} activeDot={{r: 7}} /> : 
                     <Bar dataKey={(d) => d.volume ? d.revenue/d.volume : 0} name="Avg Rev" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
                  )}
               </ComposedChart>
            </ResponsiveContainer>
         </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Province Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Revenue by Province</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <BarChart data={rawProvData.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 60, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
                <XAxis type="number" tickFormatter={(val) => `${val / 1000}k`} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value, name) => [name === 'revenue' ? formatCurrency(value) : formatNumber(value), name === 'revenue' ? 'Revenue' : 'Volume']} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="volume" name="Volume" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Service Types Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Rev Share: Service Types</h3>
          <div className="h-80 w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={serviceTypeData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} fill="#8884d8" paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {serviceTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Membership Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-semibold text-gray-800">Rev Share: Memberships</h3>
             <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setMembershipMetric('revenue')} className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${membershipMetric === 'revenue' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>Revenue</button>
                <button onClick={() => setMembershipMetric('accounts')} className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${membershipMetric === 'accounts' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>จำนวนสมาชิก</button>
             </div>
          </div>
          <div className="h-80 w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={membershipData.filter(d=>d.name!=='-')} cx="50%" cy="50%" innerRadius={80} outerRadius={110} fill="#82ca9d" paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {membershipData.filter(d=>d.name!=='-').map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => membershipMetric === 'revenue' ? formatCurrency(value) : formatNumber(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performers Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
         <h3 className="text-lg font-semibold text-gray-800 mb-6">Top Customers</h3>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 px-4 font-semibold text-gray-500">Customer Name</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500">Branch</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500">Service Type</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-right">Volume</th>
                  <th className="pb-3 px-4 font-semibold text-gray-500 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 font-medium text-gray-800">{c.name}</td>
                    <td className="py-4 px-4 text-gray-600">{c.branch}</td>
                    <td className="py-4 px-4 text-gray-600">
                       <span className={`px-2 py-1 rounded-md text-xs font-medium ${c.type === 'ในประเทศ' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {c.type}
                       </span>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-600">{formatNumber(c.volume)}</td>
                    <td className="py-4 px-4 text-right font-semibold text-gray-800">{formatCurrency(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default Overview;
