import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine, PieChart, Pie, Cell, Legend, ComposedChart
} from 'recharts';
import { MapPin, Calendar, ArrowUpRight, TrendingDown, Package, TrendingUp, Download, Camera, RefreshCw, AlertTriangle, Info, Activity, DollarSign } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import Select from 'react-select';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#0088FE', '#00C49F'];

const CustomerInfo = ({ data }) => {
  const pageRef = useRef(null);
  const chartRef = useRef(null);

  // Utility formatters
  const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
  const formatNumberCompact = (val) => new Intl.NumberFormat('th-TH', {notation: "compact", compactDisplay: "short"}).format(val || 0);
  const formatNumberFull = (val) => new Intl.NumberFormat('th-TH').format(val || 0);


  const { customers, provinces, allBranchesParsed, branchProvMap, allCustTypes, allContractEnds, monthsList, yearsList } = useMemo(() => {
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
          name, branch, province: prov, contractEnd,
          volumeCriteria: row['volumeCriteria'] || row['เกณฑ์ชิ้นงาน'] || '-',
          membership: row['membership'] || row['ระดับสมาชิก'] || '-',
          totalRev: 0, totalVol: 0, services: {}, monthlyDataMap: {}, monthlyDataArr: [],
          typeRevMap: {}, custTypeRevMap: {}
        };
      } else {
        if (contractEnd && contractEnd !== '-') custMap[name].contractEnd = contractEnd;
        const vCrit = row['volumeCriteria'] || row['เกณฑ์ชิ้นงาน'];
        if (vCrit && vCrit !== '-' && vCrit !== '0') custMap[name].volumeCriteria = vCrit;
        const memb = row['membership'] || row['ระดับสมาชิก'];
        if (memb && memb !== '-') custMap[name].membership = memb;
      }
      
      const rev = parseFloat(row['รายได้']) || parseFloat(String(row['รายได้']).replace(/,/g, '')) || 0;
      const vol = parseInt(row['ชิ้นงาน']) || parseInt(String(row['ชิ้นงาน']).replace(/,/g, '')) || 0;
      
      custMap[name].totalRev += rev;
      custMap[name].totalVol += vol;
      
      const srv = row['ชื่อบริการ'];
      custMap[name].services[srv] = (custMap[name].services[srv] || 0) + rev;

      if (custType && custType !== '-') {
         custMap[name].custTypeRevMap[custType] = (custMap[name].custTypeRevMap[custType] || 0) + rev;
      }
      const type = row['ประเภทบริการ'];
      if (type && type !== '-') {
         custMap[name].typeRevMap[type] = (custMap[name].typeRevMap[type] || 0) + rev;
      }

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
        let maxType = '-';
        let maxTypeRev = -1;
        for (const [t, r] of Object.entries(cust.typeRevMap)) {
           if (r > maxTypeRev) { maxTypeRev = r; maxType = t; }
        }
        cust.type = maxType;

        let maxCustType = '-';
        let maxCustTypeRev = -1;
        for (const [ct, r] of Object.entries(cust.custTypeRevMap)) {
           if (r > maxCustTypeRev) { maxCustTypeRev = r; maxCustType = ct; }
        }
        cust.customerType = maxCustType;

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
      allContractEnds: ['All', ...Array.from(contractEndSet).sort()],
      yearsList: ['All', ...Array.from(new Set(sortedData.map(r => String(r['ปี'] || r.year || '2026')).filter(Boolean))).sort((a,b) => parseInt(b) - parseInt(a))],
      monthsList: ['All', ...Array.from(new Set(sortedData.map(r => r['เดือน'] || r.month).filter(Boolean))).sort((a,b) => (mToNum[a] || 0) - (mToNum[b] || 0))]
    };
  }, [data]);

  const [filterYear, setFilterYear] = useState([]);
  const [filterProv, setFilterProv] = useState([]);
  const [filterMonth, setFilterMonth] = useState([]);
  
  const allBranches = useMemo(() => {
     let available = allBranchesParsed;
     if (filterProv.length > 0) available = available.filter(b => filterProv.includes(branchProvMap[b]));
     return ['All', ...available];
  }, [allBranchesParsed, filterProv, branchProvMap]);

  const [filterBranch, setFilterBranch] = useState([]);
  const [filterCustType, setFilterCustType] = useState([]);
  const [filterContractEnd, setFilterContractEnd] = useState([]);
  
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
       if (filterProv.length > 0 && !filterProv.includes(c.province)) return false;
       if (filterBranch.length > 0 && !filterBranch.includes(c.branch)) return false;
       if (filterCustType.length > 0 && !filterCustType.includes(c.customerType)) return false;
       if (filterContractEnd.length > 0 && !filterContractEnd.includes(c.contractEnd)) return false;
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
    setFilterYear([]);
    setFilterProv([]);
    setFilterBranch([]);
    setFilterCustType([]);
    setFilterContractEnd([]);
    setFilterMonth([]);
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

  // 1. Core Derived Data (No dependencies)
  const targetCriteria = useMemo(() => {
     if(!cust || !cust.volumeCriteria || cust.volumeCriteria === '-') return null;
     const str = String(cust.volumeCriteria).replace(/,/g, '');
     const match = str.match(/\d+/);
     if (!match) return null;
     const parsed = parseInt(match[0], 10);
     return isNaN(parsed) || parsed === 0 ? null : parsed;
  }, [cust]);

  const filteredMetrics = useMemo(() => {
     if (!cust) return null;
     let targetYears = filterYear;
     if (targetYears.length === 0) {
        const maxYearStr = yearsList[1];
        targetYears = maxYearStr ? [maxYearStr] : ['2026'];
     }
     const prevYears = targetYears.map(y => String(parseInt(y) - 1));
     
     let rev = 0; let vol = 0;
     let prevRev = 0; let prevVol = 0;
     
     cust.monthlyDataArr.forEach(m => {
        if (filterMonth.length > 0 && !filterMonth.includes(m.mText)) return;
        if (targetYears.includes(m.yearText)) { rev += m.revenue; vol += m.volume; }
        else if (prevYears.includes(m.yearText)) { prevRev += m.revenue; prevVol += m.volume; }
     });
     
     return { rev, vol, avg: vol ? rev/vol : 0, prevRev, prevVol, prevAvg: prevVol ? prevRev/prevVol : 0 };
  }, [cust, filterYear, filterMonth, yearsList]);

  const trendData = useMemo(() => {
     if (!cust) return [];
     let targetYears = filterYear;
     if (targetYears.length === 0) {
        const maxYearStr = yearsList[1];
        targetYears = maxYearStr ? [maxYearStr] : ['2026'];
     }
     const prevYears = targetYears.map(y => String(parseInt(y) - 1));
     
     const mToNum = {'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12};
     const validMonths = filterMonth.length > 0 ? filterMonth : Object.keys(mToNum);
     
     const mMap = {};
     validMonths.forEach(m => {
        mMap[m] = { name: m, revenue: 0, volume: 0, prevRevenue: 0, prevVolume: 0 };
     });
     
     cust.monthlyDataArr.forEach(m => {
        if (!mMap[m.mText]) return;
        if (targetYears.includes(m.yearText)) { mMap[m.mText].revenue += m.revenue; mMap[m.mText].volume += m.volume; }
        else if (prevYears.includes(m.yearText)) { mMap[m.mText].prevRevenue += m.revenue; mMap[m.mText].prevVolume += m.volume; }
     });
     return Object.values(mMap).sort((a,b) => (mToNum[a.name] || 0) - (mToNum[b.name] || 0));
  }, [cust, filterYear, filterMonth, yearsList]);

  const chartData = cust ? cust.monthlyDataArr : [];
  const lastMonth = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  
  const revChangeLabel = lastMonth?.revChange ? `${lastMonth.revChange > 0 ? '+' : ''}${lastMonth.revChange.toFixed(1)}%` : '0%';
  const volChangeLabel = lastMonth?.volChange ? `${lastMonth.volChange > 0 ? '+' : ''}${lastMonth.volChange.toFixed(1)}%` : '0%';
  
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

    if (targetCriteria && lastMonth) {
       const refMonth = filterMonth.length === 0 ? lastMonth : (chartData.find(d => filterMonth.includes(d.mText)) || lastMonth);
       if (refMonth.volume < targetCriteria) {
          alerts.push(`ปริมาณงานปัจจุบัน (${refMonth.volume.toLocaleString()}) ยังไม่ถึงเกณฑ์เป้าหมาย (${targetCriteria.toLocaleString()})`);
       }
    }

    if (cust.membership === 'Customer') {
       alerts.push(`ลูกค้ายังไม่ได้เป็นสมาชิก Post Family (แนะนำให้ชวนสมัครเพื่อรักษาฐานลูกค้า)`);
    }
    
    return alerts;
  }, [cust, targetCriteria, lastMonth, filterMonth, chartData]);


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
     const res = Object.values(qMap).sort((a,b) => {
        const qToNum = {'Q1':1,'Q2':2,'Q3':3,'Q4':4};
        const partsA = a.name.split(' ');
        const partsB = b.name.split(' ');
        return (parseInt(partsA[1])*10 + qToNum[partsA[0]]) - (parseInt(partsB[1])*10 + qToNum[partsB[0]]);
     });

     for(let i = 0; i < res.length; i++) {
        if(i > 0) {
           const prev = res[i-1];
           const curr = res[i];
           curr.revChange = prev.revenue ? ((curr.revenue - prev.revenue)/prev.revenue)*100 : 0;
           curr.volChange = prev.volume ? ((curr.volume - prev.volume)/prev.volume)*100 : 0;
        } else {
           res[i].revChange = 0; res[i].volChange = 0;
        }
     }
     return res;
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
     const res = Object.values(yMap).sort((a,b) => parseInt(a.name) - parseInt(b.name));
     for(let i = 0; i < res.length; i++) {
        if(i > 0) {
           const prev = res[i-1];
           const curr = res[i];
           curr.revChange = prev.revenue ? ((curr.revenue - prev.revenue)/prev.revenue)*100 : 0;
           curr.volChange = prev.volume ? ((curr.volume - prev.volume)/prev.volume)*100 : 0;
        } else {
           res[i].revChange = 0; res[i].volChange = 0;
        }
     }
     return res;
  }, [cust]);

  const aiInsights = useMemo(() => {
    if (!cust || !cust.monthlyDataArr || cust.monthlyDataArr.length === 0) return null;
    
    const history = cust.monthlyDataArr;
    let current, previous;

    if (filterMonth.length === 0) {
       current = history[history.length - 1];
       previous = history.length > 1 ? history[history.length - 2] : null;
    } else {
       let idx = -1;
       for (let i = history.length - 1; i >= 0; i--) {
          if (filterMonth.includes(history[i].month)) {
             idx = i;
             break;
          }
       }
       if (idx === -1) {
          current = history[history.length - 1];
          previous = history.length > 1 ? history[history.length - 2] : null;
       } else {
          current = history[idx];
          previous = idx > 0 ? history[idx - 1] : null;
       }
    }

    const getInsight = (curr, prev, type) => {
       if (!prev) return { pct: null, insight: 'ข้อมูลเดือนแรก ยังไม่สามารถวิเคราะห์แนวโน้มได้' };
       const diff = curr - prev;
       const pct = prev !== 0 ? (diff / prev) * 100 : 0;
       const isUp = pct >= 0;
       const absPct = Math.abs(pct).toFixed(1);

       let insight = '';
       if (type === 'revenue') {
          if (pct > 10) insight = `รายได้เติบโตอย่างก้าวกระโดด (${absPct}%) เป็นลูกค้าระดับ High-Performance`;
          else if (pct >= 0) insight = `รักษายอดรายได้ได้มั่นคง (${absPct}%) มีความสม่ำเสมอในการใช้บริการ`;
          else if (pct > -10) insight = `ยอดส่งลดลงเล็กน้อย (${absPct}%) ควรสอบถามความพึงพอใจเพิ่มเติม`;
          else insight = `รายได้ตกฮวบ (${absPct}%) มีความเสี่ยงที่จะย้ายค่ายหรือเลิกใช้บริการ`;
       } else if (type === 'volume') {
          if (pct > 10) insight = `ปริมาณงานเพิ่มขึ้นชัดเจน (${absPct}%) สะท้อนความเชื่อมั่นในบริการ`;
          else if (pct >= 0) insight = `จำนวนชิ้นงานคงที่ (${absPct}%) เป็นไปตามเกณฑ์ปกติ`;
          else insight = `จำนวนชิ้นงานลดลง (${absPct}%) ระวังการสูญเสีย Market Share ในลูกค้ารายนี้`;
       } else if (type === 'avg') {
          if (pct > 2) insight = `ใช้บริการกลุ่มที่แพงขึ้น (${absPct}%) มีแนวโน้ม Upsell สำเร็จ`;
          else if (pct < -2) insight = `เน้นใช้บริการราคาประหยัดมากขึ้น (${absPct}%)`;
          else insight = `พฤติกรรมการเลือกบริการยังคงเดิม (${absPct}%)`;
       }

       return { pct: pct.toFixed(1), isUp, insight };
    };

    const currAvg = current.volume ? current.revenue / current.volume : 0;
    const prevAvg = previous?.volume ? previous.revenue / previous.volume : 0;

    const rev = getInsight(current.revenue, previous?.revenue, 'revenue');
    const vol = getInsight(current.volume, previous?.volume, 'volume');
    const eff = getInsight(currAvg, prevAvg, 'avg');

    let overall = "";
    if (!previous) {
       overall = "สรุปภาพรวม: ลูกค้ารายนี้เพิ่งเริ่มมีข้อมูลบันทึกในระบบ ยังไม่สามารถเปรียบเทียบแนวโน้มได้ แต่สถานะปัจจุบันถือว่ามีการเริ่มต้นใช้งานที่ดี";
    } else {
       overall = "วิเคราะห์เฉพาะราย: ";
       if (rev.isUp && vol.isUp) overall += `ลูกค้ารายนี้มีการใช้งานเพิ่มขึ้นอย่างมีนัยสำคัญทั้งรายได้และจำนวนงาน ${eff.isUp ? 'และมีการขยับไปใช้บริการระดับที่สูงขึ้นอีกด้วย' : 'เน้นการส่งปริมาณมากในบริการเดิม'}`;
       else if (rev.isUp && !vol.isUp) overall += `สามารถรีดรายได้จากลูกค้ารายนี้ได้เพิ่มขึ้นแม้จำนวนชิ้นจะลดลง แสดงถึงการ Upsell ที่มีประสิทธิภาพ`;
       else if (!rev.isUp && vol.isUp) overall += `ลูกค้าส่งงานเยอะขึ้นแต่รายได้ลดลง สะท้อนพฤติกรรมการเปลี่ยนไปใช้บริการกลุ่มประหยัด (Economy) หรือได้รับส่วนลดพิเศษ`;
       else overall += `สังเกตพบสัญญาณลบทั้งด้านรายได้และจำนวนชิ้นงาน ${targetCriteria && current.volume < targetCriteria ? 'และปัจจุบันยอดต่ำกว่าเกณฑ์ที่กำหนด' : ''} ควรพิจารณาติดต่อเพื่อทำกิจกรรมรักษาลูกค้า (Retention)`;
    }

    return {
       overall,
       revenue: { label: 'Revenue Growth', value: formatCurrency(current.revenue), ...rev },
       volume: { label: 'Volume Trend', value: formatNumberFull(current.volume) + ' pcs', ...vol },
       avgRev: { label: 'Efficiency Index', value: formatCurrency(currAvg), ...eff }
    };
  }, [cust, targetCriteria, filterMonth]);



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
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap xl:flex-nowrap items-center justify-between gap-4 relative z-30">
           <div className="flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-800 leading-tight">Customer View</h2>
              <p className="text-[10px] text-gray-500 font-medium">Filter & Select</p>
           </div>
           
           <div className="flex flex-wrap lg:flex-nowrap gap-2 items-end">
             <MultiSelectDropdown label="Year" options={yearsList} selectedValues={filterYear} onChange={setFilterYear} width="w-24" className="flex-shrink-0" />
             <MultiSelectDropdown label="Select Month" options={monthsList} selectedValues={filterMonth} onChange={setFilterMonth} width="w-32" className="flex-shrink-0" />
             <MultiSelectDropdown label="Province" options={provinces} selectedValues={filterProv} onChange={setFilterProv} width="w-28" className="flex-shrink-0" />
             <MultiSelectDropdown label="Branch" options={allBranches} selectedValues={filterBranch} onChange={setFilterBranch} width="w-28" className="flex-shrink-0" />
             <MultiSelectDropdown label="Type" options={allCustTypes} selectedValues={filterCustType} onChange={setFilterCustType} width="w-28" className="flex-shrink-0" />
             <MultiSelectDropdown label="Contract" options={allContractEnds} selectedValues={filterContractEnd} onChange={setFilterContractEnd} width="w-28" className="flex-shrink-0" />

              <button onClick={resetFilters} className="text-[11px] bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-200 h-[32px] font-bold mt-auto leading-none">
                Reset
             </button>
             <button onClick={captureFullPage} className="text-[11px] bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-lg text-indigo-700 hover:bg-indigo-100 h-[32px] font-bold mt-auto leading-none whitespace-nowrap">
                <Download size={12} className="inline mr-1" /> Export View
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

        {filterContractEnd.length > 0 && (
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
          <div className="space-y-6">
            {/* Quick Totals KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center group hover:border-orange-200 transition-colors">
                  <div className="bg-orange-50 p-4 rounded-2xl mr-5 group-hover:bg-orange-100 transition-colors">
                     <DollarSign size={24} className="text-orange-600" />
                  </div>
                  <div className="flex-1">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
                     <div className="flex items-end justify-between">
                        <p className="text-2xl font-black text-gray-800">{formatCurrency(filteredMetrics?.rev || 0)}</p>
                        {filteredMetrics && (
                           <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${filteredMetrics.rev >= filteredMetrics.prevRev ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                              YoY {filteredMetrics.rev >= filteredMetrics.prevRev ? '+' : ''}{filteredMetrics.prevRev ? (((filteredMetrics.rev - filteredMetrics.prevRev)/filteredMetrics.prevRev)*100).toFixed(1) : 0}%
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center group hover:border-blue-200 transition-colors">
                  <div className="bg-blue-50 p-4 rounded-2xl mr-5 group-hover:bg-blue-100 transition-colors">
                     <Package size={24} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Volume</p>
                     <div className="flex items-end justify-between">
                        <p className="text-2xl font-black text-gray-800">{formatNumberFull(filteredMetrics?.vol || 0)} pcs</p>
                        {filteredMetrics && (
                           <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${filteredMetrics.vol >= filteredMetrics.prevVol ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                              YoY {filteredMetrics.vol >= filteredMetrics.prevVol ? '+' : ''}{filteredMetrics.prevVol ? (((filteredMetrics.vol - filteredMetrics.prevVol)/filteredMetrics.prevVol)*100).toFixed(1) : 0}%
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center group hover:border-rose-200 transition-colors">
                  <div className="bg-rose-50 p-4 rounded-2xl mr-5 group-hover:bg-rose-100 transition-colors">
                     <Activity size={24} className="text-rose-600" />
                  </div>
                  <div className="flex-1">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Avg Revenue / Piece</p>
                     <div className="flex items-end justify-between">
                        <p className="text-2xl font-black text-gray-800">{formatCurrency(filteredMetrics?.avg || 0)}</p>
                        {filteredMetrics && (
                           <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${filteredMetrics.avg >= filteredMetrics.prevAvg ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                              YoY {filteredMetrics.avg >= filteredMetrics.prevAvg ? '+' : ''}{filteredMetrics.prevAvg ? (((filteredMetrics.avg - filteredMetrics.prevAvg)/filteredMetrics.prevAvg)*100).toFixed(1) : 0}%
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {/* Top AI Insight Box Removed */}

            {/* Performance Target & Growth Trends Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
                  <div className="flex items-center">
                     <div className="bg-emerald-50 p-3 rounded-2xl mr-4 group-hover:bg-emerald-100 transition-colors">
                        <Package size={20} className="text-emerald-600" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Performance Target</p>
                        <p className={`text-xl font-black ${targetCriteria ? 'text-gray-800' : 'text-gray-300'}`}>
                           {targetCriteria ? formatNumberFull(targetCriteria) : 'Not Definded'}
                        </p>
                     </div>
                  </div>
                  {targetCriteria && lastMonth && (
                     <div className="text-right">
                        <p className={`text-sm font-black ${lastMonth.volume >= targetCriteria ? 'text-emerald-600' : 'text-rose-500'}`}>
                           {((lastMonth.volume / targetCriteria) * 100).toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Completion</p>
                     </div>
                  )}
               </div>
               
               <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
                  <div className="flex items-center">
                     <div className="bg-indigo-50 p-3 rounded-2xl mr-4 group-hover:bg-indigo-100 transition-colors">
                        <TrendingUp size={20} className="text-indigo-600" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Growth Trend</p>
                        <p className={`text-xl font-black ${lastMonth?.revChange >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                           {revChangeLabel}
                        </p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-black text-gray-800 uppercase tracking-tighter">Revenue</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase">vs Prev Month</p>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
                  <div className="flex items-center">
                     <div className="bg-blue-50 p-3 rounded-2xl mr-4 group-hover:bg-blue-100 transition-colors">
                        <Activity size={20} className="text-blue-600" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Growth Trend</p>
                        <p className={`text-xl font-black ${lastMonth?.volChange >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                           {volChangeLabel}
                        </p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-black text-gray-800 uppercase tracking-tighter">Volume</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase">vs Prev Month</p>
                  </div>
               </div>
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
                <ComposedChart data={trendData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
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
                        let revPct = data.prevRevenue ? (((data.revenue - data.prevRevenue)/data.prevRevenue)*100).toFixed(1) : null;
                        let volPct = data.prevVolume ? (((data.volume - data.prevVolume)/data.prevVolume)*100).toFixed(1) : null;
                        
                        return (
                          <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 min-w-[220px]">
                            <p className="font-bold text-gray-500 text-[11px] uppercase tracking-widest mb-3 border-b border-gray-50 pb-2">{label}</p>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <p className="text-[#8884d8] text-xs font-bold mb-0.5">Revenue (รายได้)</p>
                                    <p className="text-gray-900 text-sm font-black">{formatCurrency(data.revenue)}</p>
                                    <p className="text-gray-400 text-[10px] font-medium">vs {formatCurrency(data.prevRevenue)}</p>
                                 </div>
                                 {revPct !== null && (
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${revPct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                       {revPct >= 0 ? '▲' : '▼'} {Math.abs(revPct)}%
                                    </span>
                                 )}
                              </div>

                              <div className="flex justify-between items-start pt-2 border-t border-gray-50">
                                 <div>
                                    <p className="text-[#82ca9d] text-xs font-bold mb-0.5">Volume (จำนวน)</p>
                                    <p className="text-gray-900 text-sm font-black">{formatNumberFull(data.volume)} pcs</p>
                                    <p className="text-gray-400 text-[10px] font-medium">vs {formatNumberFull(data.prevVolume)} pcs</p>
                                 </div>
                                 {volPct !== null && (
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${volPct >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                       {volPct >= 0 ? '▲' : '▼'} {Math.abs(volPct)}%
                                    </span>
                                 )}
                              </div>
                              
                              {targetCriteria && (
                                <p className={`font-semibold text-xs mt-2 pt-2 border-t border-gray-100 ${data.volume >= targetCriteria ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  Target: {((data.volume / targetCriteria) * 100).toFixed(1)}% ({data.volume >= targetCriteria ? 'Met!' : 'Missed'})
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend iconType="circle" />
                  
                  {/* Previous Year Overlay (Opacity Reduced) */}
                  <Bar yAxisId="right" dataKey="prevVolume" name="Last Year Vol" fill="#E8EAF6" fillOpacity={0.5} radius={[4, 4, 0, 0]} barSize={30} />
                  <Line yAxisId="left" type="monotone" dataKey="prevRevenue" name="Last Year Rev" stroke="#8884d8" strokeOpacity={0.3} strokeWidth={3} strokeDasharray="4 4" dot={false} activeDot={false} />
                  
                  {/* Current Year Primary Data */}
                  <Bar yAxisId="right" dataKey="volume" name="This Year Vol" fill="#82ca9d" radius={[4, 4, 0, 0]} barSize={30} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" name="This Year Rev" stroke="#8884d8" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                </ComposedChart>
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
                       <Tooltip 
                          content={({ active, payload, label }) => {
                             if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                   <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 min-w-[180px]">
                                      <p className="font-bold text-gray-800 mb-2 border-b pb-1">{label}</p>
                                      <div className="space-y-2">
                                         <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Rev</span>
                                            <div className="text-right">
                                               <p className="text-xs font-black text-indigo-600">{formatCurrency(data.revenue)}</p>
                                               <p className={`text-[9px] font-bold ${data.revChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                  {data.revChange >= 0 ? '▲' : '▼'} {Math.abs(data.revChange).toFixed(1)}%
                                               </p>
                                            </div>
                                         </div>
                                         <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Vol</span>
                                            <div className="text-right">
                                               <p className="text-xs font-black text-emerald-600">{formatNumberFull(data.volume)}</p>
                                               <p className={`text-[9px] font-bold ${data.volChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                  {data.volChange >= 0 ? '▲' : '▼'} {Math.abs(data.volChange).toFixed(1)}%
                                               </p>
                                            </div>
                                         </div>
                                      </div>
                                   </div>
                                );
                             }
                             return null;
                          }}
                        />
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
                       <Tooltip 
                          content={({ active, payload, label }) => {
                             if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                   <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 min-w-[180px]">
                                      <p className="font-bold text-gray-800 mb-2 border-b pb-1">{label}</p>
                                      <div className="space-y-2">
                                         <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Rev</span>
                                            <div className="text-right">
                                               <p className="text-xs font-black text-indigo-600">{formatCurrency(data.revenue)}</p>
                                               <p className={`text-[9px] font-bold ${data.revChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                  {data.revChange >= 0 ? '▲' : '▼'} {Math.abs(data.revChange).toFixed(1)}%
                                               </p>
                                            </div>
                                         </div>
                                         <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Vol</span>
                                            <div className="text-right">
                                               <p className="text-xs font-black text-emerald-600">{formatNumberFull(data.volume)}</p>
                                               <p className={`text-[9px] font-bold ${data.volChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                  {data.volChange >= 0 ? '▲' : '▼'} {Math.abs(data.volChange).toFixed(1)}%
                                               </p>
                                            </div>
                                         </div>
                                      </div>
                                   </div>
                                );
                             }
                             return null;
                          }}
                        />
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

            {/* AI Data Intelligence (Contextual Sidebar Integration) */}
            <div className="bg-gradient-to-br from-indigo-700 to-slate-900 p-5 rounded-3xl shadow-lg relative overflow-hidden group border border-white/10 text-white mb-2 text-left">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl opacity-50" />
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                     <Activity size={18} className="text-indigo-200" />
                     <h4 className="text-sm font-black tracking-tight uppercase leading-none">AI Intelligence</h4>
                  </div>
                  
                  <p className="text-indigo-50 text-sm leading-relaxed font-bold italic opacity-95 mb-5 border-l-2 border-emerald-400 pl-4">
                     ✨ {aiInsights?.overall}
                  </p>

                  <div className="space-y-4">
                     {aiInsights ? Object.entries(aiInsights).filter(([k]) => k !== 'overall').map(([key, item]) => (
                        <div key={key} className="flex items-start gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                           <p className="text-white text-[13px] font-bold leading-snug">
                              <span className="text-indigo-300 text-[9px] font-black uppercase tracking-widest mr-2 opacity-60 block mb-0.5">{item.label}</span>
                              {item.insight}
                           </p>
                        </div>
                     )) : null}
                  </div>
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
                    <Pie 
                      data={servicePieData} 
                      cx="50%" cy="50%" 
                      innerRadius={40} outerRadius={65} 
                      fill="#8884d8" 
                      paddingAngle={4} 
                      dataKey="value" 
                      stroke="none"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {servicePieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{fontSize: "10px", paddingTop: "20px"}}/>
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
