import Papa from 'papaparse';

const CSV_URLS = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS3fF3Mc-CETdacthakabd8EjkrOEj7_SwCDmZxrnCj80Dan_bDMxrP7Nab0aQ_3dHYdu4JEEBS-TNA/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLAx8xzeiNYWMOI5au_gHccAwykLyEJAgZIuU1kMROcH2Wr6qGGv39Xrw_qTHxVzBPEB4H-d6BvMmI/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRu0yqc-c6N2AlOlpk4sK28D0R32BJZHLf0I9igwhVeYC0mY2UHiXL0fqiDwArGFyip-Em3obO5n9Dq/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQf-hItwHtextTRQRD3NGvOPtsy2quskiRFg9ojjjZN-4MxbHCcZgfpjgjhkJrGTia3Vwfj33jQXRkv/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTx5H72exk6-u92VNjsIdPaCdylSuV6Utkfcs7MUfP_QEfUhgwNq6o1ImjcEjEME4OkxTBnW3_Xw0Xu/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQvDSHHa4MkiOoRsJLQOm8YdMi68PdmA9kWyN1HiYKS_tE51bOEyTUHuvzZZF0lW7WMM1auSPiGhEPL/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBaXAAJDAsXM8pCuZ6mGhn8B-cHOmMbtDi1vgWkDJq6KVKeVAcG2KKUlLF0jPRDNct1LVAaTyB7qN6/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS5DUXfJGnMTXD07HDMk6m_d7-zQdHytoWmEP9mXmq4wtgmnVI4sbXkv1x22rgeIyeqJcDgaSCKTRGF/pub?output=csv'
];

export const fetchDashboardData = async () => {
  try {
    const allDataPromises = CSV_URLS.map(url => {
        return new Promise((resolve) => {
          Papa.parse(url, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const parsePcs = (val) => {
                if(!val) return 0;
                if(typeof val === 'number') return val;
                return parseInt(val.toString().replace(/,/g, ''), 10) || 0;
              };
              const parseRev = (val) => {
                if(!val) return 0;
                if(typeof val === 'number') return val;
                return parseFloat(val.toString().trim().replace(/,/g, '')) || 0;
              };

              const data = results.data.map(row => {
                return {
                  ...row,
                  'ชิ้นงาน': parsePcs(row['ชิ้นงาน']),
                  'รายได้': parseRev(row['รายได้']),
                  'month': row['เดือน'] || 'Unknown',
                  'year': row['ปี'] || 'Unknown',
                  'date': row['วันที่'] || 'N/A',
                  'contractEnd': row['วันสิ้นสุดสัญญา'] || 'N/A',
                  'customerType': row['ประเภทลูกค้า'] || '-',
                  'volumeCriteria': row['เกณฑ์ชิ้นงาน'] || '-',
                  'membership': row['ระดับสมาชิก'] || '-'
                };
              });
              resolve(data);
            },
            error: (err) => {
              console.error("Error parsing CSV:", url, err);
              resolve([]); // Prevent total failure if one province fails
            }
          });
        });
    });

    const allResults = await Promise.all(allDataPromises);
    const combinedData = allResults.flat();
    
    return combinedData;

  } catch (error) {
    console.error("Failed to load combined dashboard data", error);
    return [];
  }
};
