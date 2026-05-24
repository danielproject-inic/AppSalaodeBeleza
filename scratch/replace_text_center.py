import os

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    changed = False
    for i, line in enumerate(lines):
        if '<th className="py-2' in line or '<td className="py-2' in line:
            if 'text-left' in line or 'text-right' in line:
                new_line = line.replace('text-left', 'text-center').replace('text-right', 'text-center')
                lines[i] = new_line
                changed = True
                
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"Fixed {filepath}")
    else:
        print(f"No changes for {filepath}")

fix_file(r"c:\Users\ferna\Downloads\salon-suite-pro\AppSalaodeBeleza\screens\SalonComissoesDashboard.tsx")
fix_file(r"c:\Users\ferna\Downloads\salon-suite-pro\AppSalaodeBeleza\collaborator-app\src\screens\SalonComissoesDashboard.tsx")
