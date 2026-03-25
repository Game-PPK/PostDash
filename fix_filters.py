import os

def replace_in_file(path, target, replacement):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if target in content:
        new_content = content.replace(target, replacement)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Success: Replaced in {os.path.basename(path)}")
    else:
        print(f"Fail: Target not found in {os.path.basename(path)}")

# Fix CustomerInfo.jsx agg branch
replace_in_file(
    r"c:\Users\nattawat.jy\Desktop\CC\dashboard\src\pages\CustomerInfo.jsx",
    "branch: filterBranch !== 'All' ? filterBranch : 'Multiple Branches',",
    "branch: filterBranch.length === 1 ? filterBranch[0] : (filterBranch.length > 1 ? 'Multiple Branches' : 'All Branches'),"
)

# Fix CustomerInfo.jsx agg province
replace_in_file(
    r"c:\Users\nattawat.jy\Desktop\CC\dashboard\src\pages\CustomerInfo.jsx",
    "province: filterProv !== 'All' ? filterProv : 'Multiple Provinces',",
    "province: filterProv.length === 1 ? filterProv[0] : (filterProv.length > 1 ? 'Multiple Provinces' : 'All Provinces'),"
)

# Fix CustomerInfo.jsx contract check at line 466
replace_in_file(
    r"c:\Users\nattawat.jy\Desktop\CC\dashboard\src\pages\CustomerInfo.jsx",
    "{filterContractEnd !== 'All' && (",
    "{filterContractEnd.length > 0 && ("
)
replace_in_file(
    r"c:\Users\nattawat.jy\Desktop\CC\dashboard\src\pages\CustomerInfo.jsx",
    "รายชื่อลูกค้าที่หมดสัญญาเดือน {filterContractEnd} ทั้งหมด",
    "รายชื่อลูกค้าที่หมดสัญญาเดือน {filterContractEnd.join(', ')} ทั้งหมด"
)

# Fix BranchReport.jsx handleProvChange
old_hpc = """  const handleProvChange = (selected) => {
      setSelectedProvs(selected || []);
      const provNames = (selected || []).map(p => p.value);
      if (provNames.length > 0) {
         const newValidBranches = selectedBranches.filter(b => provNames.includes(branchProvMap[b.value]));
         setSelectedBranches(newValidBranches);
      }
  };"""

new_hpc = """  const handleProvChange = (selected) => {
      setSelectedProvs(selected);
      if (selected.length > 0) {
         const newValidBranches = selectedBranches.filter(b => selected.includes(branchProvMap[b]));
         setSelectedBranches(newValidBranches);
      }
  };"""

replace_in_file(
    r"c:\Users\nattawat.jy\Desktop\CC\dashboard\src\pages\BranchReport.jsx",
    old_hpc,
    new_hpc
)
