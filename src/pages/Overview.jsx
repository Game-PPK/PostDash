import React, { useMemo, useState, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList, LineChart, Line, ComposedChart, ReferenceLine, Treemap, Label
} from 'recharts';
import { TrendingUp, Users, Package, DollarSign, Activity, Filter, RefreshCw, Download, PieChart as PieIcon } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import MultiSelectDropdown from '../components/MultiSelectDropdown';

// Common colors for charts
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#0088FE', '#00C49F', '#ffbb28', '#FF8042', '#00C49F'];


const mToNum = {'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12};

const Overview = ({ data }) => {
  const [filterYear, setFilterYear] = useState([]);
  const [filterProv, setFilterProv] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [filterBranch, setFilterBranch] = useState([]);
  const [filterMembership, setFilterMembership] = useState([]);
  const [filterCustType, setFilterCustType] = useState([]);
  const [filterMonth, setFilterMonth] = useState([]);
  const [selectedTrendMetric, setSelectedTrendMetric] = useState('revenue');
  const [membershipMetric, setMembershipMetric] = useState('revenue');
  const [trendChartType, setTrendChartType] = useState('bar');
  const [topLimit, setTopLimit] = useState(10);
  const dashboardRef = useRef(null);

  // Initialize defaults
  React.useEffect(() => {
    if (data && data.length > 0) {
      // Find latest year
      const years = Array.from(new Set(data.map(r => String(r['ปี'] || r.year || '2026')))).sort((a,b) => parseInt(b) - parseInt(a));
      const latestYear = years[0];
      if (latestYear) setFilterYear([latestYear]);

      // Find latest month for that year
      const monthsForYear = data.filter(r => String(r['ปี'] || r.year || '2026') === latestYear)
                                .map(r => r['เดือน'] || r.month)
                                .filter(Boolean);
      
      if (monthsForYear.length > 0) {
        // Sort months to find the latest
        const sortedMonths = Array.from(new Set(monthsForYear)).sort((a,b) => (mToNum[b] || 0) - (mToNum[a] || 0));
        const latestMonth = sortedMonths[0];
        if (latestMonth) setFilterMonth([latestMonth]);
      }
    }
  }, [data]);

  const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(val || 0);
  const formatNumber = (val) => new Intl.NumberFormat('th-TH').format(val || 0);
  const formatNumberCompact = (val) => new Intl.NumberFormat('th-TH', {notation: "compact", compactDisplay: "short"}).format(val || 0);

  const handleResetFilters = () => {
    setFilterYear([]);
    setFilterProv([]);
    setFilterType([]);
    setFilterBranch([]);
    setFilterMembership([]);
    setFilterCustType([]);
    setFilterMonth([]);
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
        data.filter(r => filterProv.length === 0 || filterProv.includes(r['จังหวัด']))
            .map(r => r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'])
            .filter(Boolean)
     )).sort()];
  }, [data, filterProv]);
  const memberships = useMemo(() => ['All', ...Array.from(new Set(data.map(r => r.membership).filter((v) => v && v !== '-'))).sort()], [data]);
  const custTypes = useMemo(() => ['All', ...Array.from(new Set(data.map(r => r.customerType).filter((v) => v && v !== '-'))).sort()], [data]);
  const yearsList = useMemo(() => {
     const set = new Set(data.map(r => r['ปี'] || r.year || '2026').filter(Boolean));
     return ['All', ...Array.from(set).sort((a,b) => parseInt(b) - parseInt(a))];
  }, [data]);
  const monthsList = useMemo(() => {
     const set = new Set(data.map(r => r['เดือน'] || r.month).filter(Boolean));
     return ['All', ...Array.from(set).sort((a,b) => (mToNum[a] || 0) - (mToNum[b] || 0))];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(r => {
      const y = String(r['ปี'] || r.year || '2026');
      if (filterYear.length > 0 && !filterYear.includes(y)) return false;
      const mn = r['เดือน'] || r.month;
      if (filterMonth.length > 0 && !filterMonth.includes(mn)) return false;
      if (filterProv.length > 0 && !filterProv.includes(r['จังหวัด'])) return false;
      if (filterType.length > 0 && !filterType.includes(r['ประเภทบริการ'])) return false;
      const b = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'];
      if (filterBranch.length > 0 && !filterBranch.includes(b)) return false;
      if (filterMembership.length > 0 && !filterMembership.includes(r.membership)) return false;
      if (filterCustType.length > 0 && !filterCustType.includes(r.customerType)) return false;
      return true;
    });
  }, [data, filterYear, filterMonth, filterProv, filterType, filterBranch, filterMembership, filterCustType]);

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

  const yoySummary = useMemo(() => {
     let targetYears = filterYear;
     if (targetYears.length === 0) {
        const maxYearStr = yearsList[1];
        if (maxYearStr) targetYears = [maxYearStr];
     }
     if (targetYears.length === 0) return null;
     
     const prevYears = targetYears.map(y => String(parseInt(y) - 1));
     
     const pData = data.filter(r => {
        const y = String(r['ปี'] || r.year || '2026');
        if (!prevYears.includes(y)) return false;
        
        const mn = r['เดือน'] || r.month;
        if (filterMonth.length > 0 && !filterMonth.includes(mn)) return false;
        if (filterProv.length > 0 && !filterProv.includes(r['จังหวัด'])) return false;
        if (filterType.length > 0 && !filterType.includes(r['ประเภทบริการ'])) return false;
        const b = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'];
        if (filterBranch.length > 0 && !filterBranch.includes(b)) return false;
        if (filterMembership.length > 0 && !filterMembership.includes(r.membership)) return false;
        if (filterCustType.length > 0 && !filterCustType.includes(r.customerType)) return false;
        return true;
     });

     let tRev = 0; let tVol = 0; const activeAccounts = new Set();
     pData.forEach(row => {
        tRev += row['รายได้'] || 0;
        tVol += row['ชิ้นงาน'] || 0;
        if (row['ชื่อบัญชี']) activeAccounts.add(row['ชื่อบัญชี']);
     });
     
     if (pData.length === 0) return null; 
     
     return {
        totalRev: tRev, totalVol: tVol, activeAccounts: activeAccounts.size, avgRev: tVol ? tRev / tVol : 0
     };
  }, [data, filterYear, filterMonth, filterProv, filterType, filterBranch, filterMembership, filterCustType, yearsList]);

  const moMSummary = useMemo(() => {
     let tYear, tMonthText;
     if (filterYear.length === 1 && filterMonth.length === 1) {
        tYear = parseInt(filterYear[0]);
        tMonthText = filterMonth[0];
     } else {
        let maxNum = 0;
        let latestRow = null;
        filteredData.forEach(r => {
           const y = parseInt(r['ปี'] || r.year || 2026);
           const m = mToNum[r['เดือน'] || r.month] || 0;
           if (y*100+m > maxNum) { maxNum = y*100+m; latestRow = r; }
        });
        if (!latestRow) return null;
        tYear = parseInt(latestRow['ปี'] || latestRow.year || 2026);
        tMonthText = latestRow['เดือน'] || latestRow.month;
     }
     
     const mNum = mToNum[tMonthText];
     if (!mNum) return null;
     
     let pYear = tYear;
     let pMonthNum = mNum - 1;
     if (pMonthNum === 0) {
        pMonthNum = 12;
        pYear -= 1;
     }
     const pMonthText = Object.keys(mToNum).find(k => mToNum[k] === pMonthNum);
     
     const pData = data.filter(r => {
        const y = parseInt(r['ปี'] || r.year || 2026);
        const mn = r['เดือน'] || r.month;
        if (y !== pYear || mn !== pMonthText) return false;
        if (filterProv.length > 0 && !filterProv.includes(r['จังหวัด'])) return false;
        if (filterType.length > 0 && !filterType.includes(r['ประเภทบริการ'])) return false;
        const b = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'];
        if (filterBranch.length > 0 && !filterBranch.includes(b)) return false;
        if (filterMembership.length > 0 && !filterMembership.includes(r.membership)) return false;
        if (filterCustType.length > 0 && !filterCustType.includes(r.customerType)) return false;
        return true;
     });

     let tRev = 0; let tVol = 0; const activeAccounts = new Set();
     pData.forEach(row => {
        tRev += row['รายได้'] || 0;
        tVol += row['ชิ้นงาน'] || 0;
        if (row['ชื่อบัญชี']) activeAccounts.add(row['ชื่อบัญชี']);
     });
     
     if (pData.length === 0) return null; 

     return {
        totalRev: tRev, totalVol: tVol, activeAccounts: activeAccounts.size, avgRev: tVol ? tRev / tVol : 0
     };
  }, [data, filterYear, filterMonth, filterProv, filterType, filterBranch, filterMembership, filterCustType, filteredData]);

  const trendData = useMemo(() => {
     let primaryYears = filterYear;
     if (primaryYears.length === 0) {
        const maxYearStr = yearsList[1];
        primaryYears = maxYearStr ? [maxYearStr] : ['2026'];
     }
     const prevYears = primaryYears.map(y => String(parseInt(y) - 1));

     // Always show all 12 months regardless of filterMonth
     const validMonths = Object.keys(mToNum);
     
     const mMap = {};
     validMonths.forEach(m => {
        mMap[m] = { name: m, revenue: 0, volume: 0, prevRevenue: 0, prevVolume: 0, activeSet: new Set(), prevActiveSet: new Set() };
     });

     let currYearTotalRev = 0;
     let currYearTotalVol = 0;

     data.forEach(r => {
        const m = r['เดือน'] || r.month;
        if (!m || !mMap[m]) return;
        
        if (filterProv.length > 0 && !filterProv.includes(r['จังหวัด'])) return;
        if (filterType.length > 0 && !filterType.includes(r['ประเภทบริการ'])) return;
        const b = r[' ชื่อที่ทำการไปรษณีย์'] || r['ชื่อที่ทำการไปรษณีย์'];
        if (filterBranch.length > 0 && !filterBranch.includes(b)) return;
        if (filterMembership.length > 0 && !filterMembership.includes(r.membership)) return;
        if (filterCustType.length > 0 && !filterCustType.includes(r.customerType)) return;
        
        const y = String(r['ปี'] || r.year || '2026');
        const rev = parseFloat(r['รายได้']) || parseFloat(String(r['รายได้']).replace(/,/g, '')) || 0;
        const vol = parseInt(r['ชิ้นงาน']) || parseInt(String(r['ชิ้นงาน']).replace(/,/g, '')) || 0;

        if (primaryYears.includes(y)) {
           mMap[m].revenue += rev;
           mMap[m].volume += vol;
           currYearTotalRev += rev;
           currYearTotalVol += vol;
           if (r['ชื่อบัญชี']) mMap[m].activeSet.add(r['ชื่อบัญชี']);
        } else if (prevYears.includes(y)) {
           mMap[m].prevRevenue += rev;
           mMap[m].prevVolume += vol;
           if (r['ชื่อบัญชี']) mMap[m].prevActiveSet.add(r['ชื่อบัญชี']);
        }
     });

     return {
       chartData: Object.values(mMap).map(m => ({ 
           ...m, 
           activeAccounts: m.activeSet.size, 
           prevActiveAccounts: m.prevActiveSet.size 
       })).sort((a,b) => (mToNum[a.name] || 0) - (mToNum[b.name] || 0)),
       summary: { totalRev: currYearTotalRev, totalVol: currYearTotalVol, year: primaryYears.join(', ') }
     };
  }, [data, filterYear, filterProv, filterType, filterBranch, filterMembership, filterCustType, yearsList]);

  const aiInsights = useMemo(() => {
     let current = null;
     let previous = null;
     
     const chartData = trendData.chartData;
     const populatedData = chartData.filter(d => d.revenue > 0 || d.volume > 0);
     if (populatedData.length === 0) return null;

     current = populatedData[populatedData.length - 1];
     const targetM = current.name;
     const currentMonthNum = mToNum[targetM];
     
     if (currentMonthNum > 1) {
        let pYear = parseInt(filterYear.length === 1 ? filterYear[0] : (yearsList[1] || '2026'));
        let pMonthNum = currentMonthNum - 1;
        const prevMonthName = Object.keys(mToNum).find(k => mToNum[k] === pMonthNum);
        previous = chartData.find(d => d.name === prevMonthName);
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

  const customerConcentrationData = useMemo(() => {
    const custMap = {};
    let totalRev = 0;
    filteredData.forEach(row => {
      const rev = row['รายได้'] || 0;
      if (rev <= 0) return;
      const name = row['ชื่อบัญชี'];
      if (!name || name === '-') return;
      
      if (!custMap[name]) custMap[name] = 0;
      custMap[name] += rev;
      totalRev += rev;
    });
    
    const sorted = Object.entries(custMap)
      .map(([name, value]) => ({ name, value, pct: ((value/(totalRev || 1))*100).toFixed(1) }))
      .sort((a,b) => b.value - a.value);
      
    if (sorted.length === 0) return [];
    
    const top = sorted.slice(0, 5);
    const topRev = top.reduce((s, c) => s + c.value, 0);
    
    if (sorted.length > 5) {
       top.push({ 
          name: 'ลูกค้ารายอื่นๆ รวมกัน (Others)', 
          value: totalRev - topRev, 
          pct: (((totalRev - topRev)/(totalRev || 1))*100).toFixed(1) 
       });
    }
    return top;
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
    return Object.values(accMap).sort((a,b) => b.revenue - a.revenue).slice(0, topLimit);
  }, [filteredData, topLimit]);

  return (
    <div className="space-y-6" ref={dashboardRef}>
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-gray-800">Business Summary</h2>
         <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">Updated: {latestDate}</span>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex items-center text-gray-500 font-medium mr-2"><Filter size={18} className="mr-2"/> Filters:</div>
        <MultiSelectDropdown label="Year" options={yearsList} selectedValues={filterYear} onChange={setFilterYear} width="w-[100px]" />
        <MultiSelectDropdown label="Month" options={monthsList} selectedValues={filterMonth} onChange={setFilterMonth} width="w-[120px]" />
        <MultiSelectDropdown label="Province" options={provinces} selectedValues={filterProv} onChange={setFilterProv} width="w-[120px]" />
        <MultiSelectDropdown label="Branch" options={branches} selectedValues={filterBranch} onChange={setFilterBranch} width="w-[120px]" />
        <MultiSelectDropdown label="Service" options={serviceTypes} selectedValues={filterType} onChange={setFilterType} width="w-[120px]" />
        <MultiSelectDropdown label="Membership" options={memberships} selectedValues={filterMembership} onChange={setFilterMembership} width="w-[120px]" />
        <MultiSelectDropdown label="Cust Type" options={custTypes} selectedValues={filterCustType} onChange={setFilterCustType} width="w-[120px]" />
        
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div onClick={() => setSelectedTrendMetric('revenue')} className={`cursor-pointer bg-white p-6 rounded-2xl shadow-sm border ${selectedTrendMetric === 'revenue' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-orange-100'} relative overflow-hidden group transition-all transform hover:-translate-y-1`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-2 rounded-lg ${selectedTrendMetric === 'revenue' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'}`}><DollarSign size={20} /></div>
            <h3 className="text-gray-500 font-medium select-none">Total Revenue</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800 mb-2">{formatCurrency(summary.totalRev)}</p>
          <div className="flex flex-row gap-1.5 flex-wrap">
             {moMSummary && (
               <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${summary.totalRev >= moMSummary.totalRev ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  MoM {summary.totalRev >= moMSummary.totalRev ? '+' : ''}{moMSummary.totalRev ? (((summary.totalRev - moMSummary.totalRev)/moMSummary.totalRev)*100).toFixed(1) : 0}%
               </div>
             )}
             {yoySummary && (
               <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${summary.totalRev >= yoySummary.totalRev ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                  YoY {summary.totalRev >= yoySummary.totalRev ? '+' : ''}{yoySummary.totalRev ? (((summary.totalRev - yoySummary.totalRev)/yoySummary.totalRev)*100).toFixed(1) : 0}%
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
          <p className="text-2xl font-bold text-gray-800 mb-2">{formatNumber(summary.totalVol)} pcs</p>
          <div className="flex flex-row gap-1.5 flex-wrap">
             {moMSummary && (
               <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${summary.totalVol >= moMSummary.totalVol ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  MoM {summary.totalVol >= moMSummary.totalVol ? '+' : ''}{moMSummary.totalVol ? (((summary.totalVol - moMSummary.totalVol)/moMSummary.totalVol)*100).toFixed(1) : 0}%
               </div>
             )}
             {yoySummary && (
               <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${summary.totalVol >= yoySummary.totalVol ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                  YoY {summary.totalVol >= yoySummary.totalVol ? '+' : ''}{yoySummary.totalVol ? (((summary.totalVol - yoySummary.totalVol)/yoySummary.totalVol)*100).toFixed(1) : 0}%
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
           <p className="text-2xl font-bold text-gray-800 mb-2">{formatCurrency(summary.avgRev)}</p>
           <div className="flex flex-row gap-1.5 flex-wrap">
             {moMSummary && (
               <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${summary.avgRev >= moMSummary.avgRev ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  MoM {summary.avgRev >= moMSummary.avgRev ? '+' : ''}{moMSummary.avgRev ? (((summary.avgRev - moMSummary.avgRev)/moMSummary.avgRev)*100).toFixed(1) : 0}%
               </div>
             )}
             {yoySummary && (
               <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${summary.avgRev >= yoySummary.avgRev ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                  YoY {summary.avgRev >= yoySummary.avgRev ? '+' : ''}{yoySummary.avgRev ? (((summary.avgRev - yoySummary.avgRev)/yoySummary.avgRev)*100).toFixed(1) : 0}%
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
          <p className="text-2xl font-bold text-gray-800 mb-2">{formatNumber(summary.activeAccounts)}</p>
          <div className="flex flex-row gap-1.5 flex-wrap">
             {moMSummary && (
               <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${summary.activeAccounts >= moMSummary.activeAccounts ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  MoM {summary.activeAccounts >= moMSummary.activeAccounts ? '+' : ''}{moMSummary.activeAccounts ? (((summary.activeAccounts - moMSummary.activeAccounts)/moMSummary.activeAccounts)*100).toFixed(1) : 0}%
               </div>
             )}
             {yoySummary && (
               <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${summary.activeAccounts >= yoySummary.activeAccounts ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                  YoY {summary.activeAccounts >= yoySummary.activeAccounts ? '+' : ''}{yoySummary.activeAccounts ? (((summary.activeAccounts - yoySummary.activeAccounts)/yoySummary.activeAccounts)*100).toFixed(1) : 0}%
               </div>
             )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 relative overflow-hidden group border-purple-100">
           <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
           <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><TrendingUp size={20} /></div>
            <h3 className="text-gray-500 font-medium">Domestic Share</h3>
          </div>
          <p className="text-3xl font-bold text-gray-800">{summary.domesticShare.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-2">Intl: {summary.intlShare.toFixed(1)}%</p>
        </div>
      </div>

      {/* Trend & AI Insights Combined Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-2">
         {/* Left: AI Intelligence Sidebar (Contextual) */}
         <div className="lg:col-span-4">
            <div className="bg-gradient-to-br from-indigo-700 to-slate-900 p-6 rounded-3xl shadow-xl h-full relative overflow-hidden group border border-white/10 text-white flex flex-col">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
               <div className="relative z-10 flex-1 text-left">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="bg-white/10 p-2 rounded-xl border border-white/10">
                        <Activity size={20} className="text-indigo-200" />
                     </div>
                     <div>
                        <h2 className="text-base font-black tracking-tight uppercase leading-none mb-1">AI Intelligence</h2>
                        <p className="text-indigo-300 text-[10px] font-black tracking-widest uppercase opacity-70">Focus: {selectedTrendMetric === 'revenue' ? 'Revenue' : 'Volume'} Trends</p>
                     </div>
                  </div>

                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5 mb-6 backdrop-blur-md">
                     <p className="text-indigo-50 text-sm leading-relaxed font-bold italic opacity-95">
                        ✨ {aiInsights?.overall}
                     </p>
                  </div>

                  <div className="space-y-4">
                     <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1 pl-1">Key Contextual Highlights</h3>
                     {aiInsights ? Object.entries(aiInsights).filter(([k]) => k !== 'overall').map(([key, item]) => (
                        <div key={key} className="flex items-start gap-4 group/item">
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0 group-hover/item:bg-emerald-400 transition-colors" />
                           <div className="flex-1">
                              <p className="text-white text-sm font-bold leading-tight group-hover/item:text-emerald-50 transition-colors">
                                 <span className="text-indigo-300 text-[9px] font-black uppercase tracking-widest mr-2 opacity-60 block mb-0.5">{item.label}</span>
                                 {item.insight}
                              </p>
                           </div>
                        </div>
                     )) : (
                        <div className="text-indigo-300 text-sm italic">No insights available</div>
                     )}
                  </div>
               </div>
            </div>
         </div>

         {/* Right: Trend Analysis Box */}
         <div className="lg:col-span-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-start gap-4">
                   <div>
                      <h3 className="text-xl font-bold text-gray-800">
                         {selectedTrendMetric === 'revenue' && 'Revenue Trend (รายได้)'}
                         {selectedTrendMetric === 'volume' && 'Volume Trend (ปริมาณงาน)'}
                         {selectedTrendMetric === 'accounts' && 'Active Accounts Trend (จำนวนลูกค้า)'}
                         {selectedTrendMetric === 'avgRev' && 'Avg Rev/Piece Trend (รายได้เฉลี่ยต่อชิ้น)'}
                      </h3>
                      <p className="text-sm text-gray-500">Compare monthly performance and growth rates</p>
                   </div>
                   {/* Integrated Summary Box in Header */}
                   {selectedTrendMetric === 'revenue' && (
                     <div className="flex gap-2 mt-1">
                        <div className="bg-indigo-50/80 backdrop-blur-sm border border-indigo-100 p-1.5 px-2.5 rounded-xl shadow-sm">
                           <p className="text-[9px] font-bold text-indigo-400 uppercase leading-none mb-1">Total Rev ({trendData.summary.year})</p>
                           <p className="text-sm font-black text-indigo-700 leading-none">{formatCurrency(trendData.summary.totalRev)}</p>
                        </div>
                        <div className="bg-emerald-50/80 backdrop-blur-sm border border-emerald-100 p-1.5 px-2.5 rounded-xl shadow-sm">
                           <p className="text-[9px] font-bold text-emerald-400 uppercase leading-none mb-1">Total Vol ({trendData.summary.year})</p>
                           <p className="text-sm font-black text-emerald-700 leading-none">{formatNumber(trendData.summary.totalVol)} pcs</p>
                        </div>
                     </div>
                   )}
                </div>
             
                <div className="flex items-center gap-3">
                   <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider hidden md:block">Visualization</span>
                   <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button onClick={() => setTrendChartType('line')} className={`text-xs px-4 py-1.5 rounded-lg font-bold transition-all ${trendChartType === 'line' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>Line</button>
                      <button onClick={() => setTrendChartType('bar')} className={`text-xs px-4 py-1.5 rounded-lg font-bold transition-all ${trendChartType === 'bar' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>Bar</button>
                   </div>
                </div>
             </div>
          
             <div className="h-80 w-full relative">
                <ResponsiveContainer>
                   <ComposedChart data={trendData.chartData} margin={{ top: 25, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 500}} dy={15} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} 
                          tickFormatter={val => selectedTrendMetric === 'revenue' ? `${val/1000}k` : selectedTrendMetric === 'avgRev' ? val.toFixed(0) : formatNumber(val)} />
                      <Tooltip 
                          content={({ active, payload, label }) => {
                             if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                let val = selectedTrendMetric === 'revenue' ? d.revenue : selectedTrendMetric === 'volume' ? d.volume : selectedTrendMetric === 'accounts' ? d.activeAccounts : (d.volume ? d.revenue/d.volume : 0);
                                let prevVal = selectedTrendMetric === 'revenue' ? d.prevRevenue : selectedTrendMetric === 'volume' ? d.prevVolume : selectedTrendMetric === 'accounts' ? d.prevActiveAccounts : (d.prevVolume ? d.prevRevenue/d.prevVolume : 0);
                                
                                let yoyPct = prevVal ? (((val - prevVal)/prevVal)*100).toFixed(1) : null;
                                let formattedVal = selectedTrendMetric === 'revenue' || selectedTrendMetric === 'avgRev' ? formatCurrency(val) : formatNumber(val);
                                let formattedPrevVal = selectedTrendMetric === 'revenue' || selectedTrendMetric === 'avgRev' ? formatCurrency(prevVal) : formatNumber(prevVal);
                                
                                const idx = trendData.chartData.findIndex(x => x.name === label);
                                const prevM = idx > 0 ? trendData.chartData[idx - 1] : null;
                                let prevMoMVal = prevM ? (selectedTrendMetric === 'revenue' ? prevM.revenue : selectedTrendMetric === 'volume' ? prevM.volume : selectedTrendMetric === 'accounts' ? prevM.activeAccounts : (prevM.volume ? prevM.revenue/prevM.volume : 0)) : null;
                                let momPct = prevMoMVal ? (((val - prevMoMVal)/prevMoMVal)*100).toFixed(1) : null;

                                return (
                                   <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 min-w-[200px]">
                                      <p className="font-bold text-gray-400 text-[10px] uppercase tracking-widest mb-3 border-b border-gray-50 pb-2">{label}</p>
                                      
                                      <div className="flex justify-between items-center mb-2">
                                         <span className="text-xs text-slate-500 font-medium">This Year</span>
                                         <span className="text-sm font-black text-gray-900">{formattedVal}</span>
                                      </div>
                                      
                                      <div className="flex justify-between items-center mb-3">
                                         <span className="text-xs text-slate-400">Last Year</span>
                                         <span className="text-xs font-bold text-slate-500">{formattedPrevVal}</span>
                                      </div>

                                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                                         {momPct !== null && (
                                            <div className="flex flex-col">
                                               <span className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">MoM</span>
                                               <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${momPct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                  {momPct >= 0 ? '▲' : '▼'} {Math.abs(momPct)}%
                                               </span>
                                            </div>
                                         )}
                                         {yoyPct !== null && (
                                            <div className="flex flex-col ml-auto text-right">
                                               <span className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">YoY</span>
                                               <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${yoyPct >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                                  {yoyPct >= 0 ? '▲' : '▼'} {Math.abs(yoyPct)}%
                                               </span>
                                            </div>
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
                         <>
                            <Line type="monotone" dataKey="prevRevenue" name="Last Year" stroke="#94a3b8" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                            <Line type="monotone" dataKey="revenue" name="This Year" stroke="#ff7f50" strokeWidth={4} dot={{r: 4, fill: '#ff7f50', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 7}}>
                               <LabelList dataKey="revenue" position="top" offset={15} formatter={(val) => formatNumberCompact(val)} style={{fill: '#ff7f50', fontSize: 10, fontWeight: 'bold'}} />
                            </Line>
                         </> : 
                         <>
                            <Bar dataKey="prevRevenue" name="Last Year" fill="#94a3b8" fillOpacity={0.5} radius={[6, 6, 0, 0]} barSize={20} />
                            <Bar dataKey="revenue" name="This Year" fill="#ff7f50" radius={[6, 6, 0, 0]} barSize={20}>
                               <LabelList dataKey="revenue" position="top" offset={10} formatter={(val) => formatNumberCompact(val)} style={{fill: '#ff7f50', fontSize: 10, fontWeight: 'bold'}} />
                            </Bar>
                         </>
                      )}
                      {selectedTrendMetric === 'revenue' && <ReferenceLine y={0} stroke="#e5e7eb" />}
                      
                      {selectedTrendMetric === 'volume' && (trendChartType === 'line' ? 
                         <>
                            <Line type="monotone" dataKey="prevVolume" name="Last Year" stroke="#94a3b8" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                            <Line type="monotone" dataKey="volume" name="This Year" stroke="#3b82f6" strokeWidth={4} dot={{r: 4}} activeDot={{r: 7}} />
                         </> : 
                         <>
                            <Bar dataKey="prevVolume" name="Last Year" fill="#94a3b8" fillOpacity={0.5} radius={[6, 6, 0, 0]} barSize={20} />
                            <Bar dataKey="volume" name="This Year" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={20}>
                               <LabelList dataKey="volume" position="top" offset={10} formatter={(val) => formatNumberCompact(val)} style={{fill: '#3b82f6', fontSize: 10, fontWeight: 'bold'}} />
                            </Bar>
                         </>
                      )}
                      
                      {selectedTrendMetric === 'accounts' && (trendChartType === 'line' ? 
                         <>
                            <Line type="monotone" dataKey="prevActiveAccounts" name="Last Year" stroke="#94a3b8" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                            <Line type="monotone" dataKey="activeAccounts" name="This Year" stroke="#10b981" strokeWidth={4} dot={{r: 4}} activeDot={{r: 7}}>
                               <LabelList dataKey="activeAccounts" position="top" offset={10} style={{fill: '#10b981', fontSize: 10, fontWeight: 'bold'}} />
                            </Line>
                         </> : 
                         <>
                            <Bar dataKey="prevActiveAccounts" name="Last Year" fill="#94a3b8" fillOpacity={0.5} radius={[6, 6, 0, 0]} barSize={20} />
                            <Bar dataKey="activeAccounts" name="This Year" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20}>
                                <LabelList dataKey="activeAccounts" position="top" offset={10} style={{fill: '#10b981', fontSize: 10, fontWeight: 'bold'}} />
                            </Bar>
                         </>
                      )}
                      
                      {selectedTrendMetric === 'avgRev' && (trendChartType === 'line' ? 
                         <Line type="monotone" dataKey={(d) => d.volume ? d.revenue/d.volume : 0} name="Avg Rev" stroke="#8b5cf6" strokeWidth={4} dot={{r: 4}} activeDot={{r: 7}}>
                            <LabelList dataKey={(d) => d.volume ? d.revenue/d.volume : 0} position="top" offset={10} formatter={(val) => val.toFixed(1)} style={{fill: '#8b5cf6', fontSize: 10, fontWeight: 'bold'}} />
                         </Line> : 
                         <Bar dataKey={(d) => d.volume ? d.revenue/d.volume : 0} name="Avg Rev" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40}>
                             <LabelList dataKey={(d) => d.volume ? d.revenue/d.volume : 0} position="top" offset={10} formatter={(val) => val.toFixed(1)} style={{fill: '#8b5cf6', fontSize: 10, fontWeight: 'bold'}} />
                         </Bar>
                      )}
                   </ComposedChart>
                </ResponsiveContainer>
             </div>
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
                <Tooltip formatter={(value, name) => [name === 'Revenue' ? formatCurrency(value) : formatNumber(value), name]} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="volume" name="Volume" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Concentration Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Customer Concentration</h3>
          <div className="h-80 w-full relative">
            <ResponsiveContainer>
              <PieChart>
                 <Pie
                   data={customerConcentrationData}
                   cx="40%"
                   cy="50%"
                   innerRadius={65}
                   outerRadius={95}
                   paddingAngle={2}
                   dataKey="value"
                   stroke="none"
                 >
                   {customerConcentrationData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                   <Label 
                     position="center"
                     content={({ viewBox: { cx, cy } }) => (
                       <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                         <tspan x={cx} dy="-0.3em" fontSize="16" fontWeight="bold" fill="#1f2937">Top 5</tspan>
                         <tspan x={cx} dy="1.2em" fontSize="10" fill="#6b7280">Dependence</tspan>
                       </text>
                     )}
                   />
                 </Pie>
                 <Tooltip formatter={(val) => formatCurrency(val)} />
                 <Legend 
                   layout="vertical" 
                   verticalAlign="middle" 
                   align="right"
                   wrapperStyle={{ fontSize: '11px', width: '45%' }}
                   formatter={(value, entry) => {
                     const t = value.length > 20 ? value.substring(0, 18) + '...' : value;
                     return <span className="text-gray-700" title={value}>{t} ({entry.payload?.pct}%)</span>;
                   }}
                 />
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
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Top Customers</h3>
            <div className="flex items-center gap-2">
               <span className="text-xs text-gray-400 font-bold uppercase">Show:</span>
               <select 
                  value={topLimit} 
                  onChange={(e) => setTopLimit(parseInt(e.target.value))}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 font-bold outline-none"
               >
                  <option value={10}>10 รายชื่อ</option>
                  <option value={20}>20 รายชื่อ</option>
                  <option value={50}>50 รายชื่อ</option>
                  <option value={100}>100 รายชื่อ</option>
               </select>
            </div>
         </div>
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
