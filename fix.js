const fs = require('fs');
const path = 'c:\\Users\\ferna\\Downloads\\salon-suite-pro\\AppSalaodeBeleza\\collaborator-app\\src\\screens\\SalonComissoesDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `  }, [commissions, batches, historyPeriodFilter, historyProId, historyDate, monthNames, selectedDay, selectedMonth, selectedYear]);
    }
  };

  const loadLayout = () => {`;

const missingCode = `  }, [commissions, batches, historyPeriodFilter, historyProId, historyDate, monthNames, selectedDay, selectedMonth, selectedYear]);

  const checkedTotals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let adjustments = 0;
    checkedBatchIds.forEach(id => {
       const lote = pendingBatches.find((l: any) => l.id === id);
       if (lote && lote.data) {
         gross += (lote.data.grossValue || 0);
         net += (lote.data.netValue || 0);
         adjustments += (lote.data.adjustments || 0);
       }
    });
    return { gross, net, adjustments };
  }, [checkedBatchIds, pendingBatches]);

  const checkedTotal = checkedTotals.net;

  const checkedServicesCount = useMemo(() => {
      let count = 0;
      pendingBatches.forEach((sim: any) => {
         if (checkedBatchIds.includes(sim.id) && sim.data?.commissionIds) {
            count += sim.data.commissionIds.length;
         }
      });
      return count;
  }, [pendingBatches, checkedBatchIds]);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Drag, Resize and Layout Logic
  const resetLayout = () => {
    if (!wrapperRef.current) return;
    const cW = wrapperRef.current.clientWidth || 1000;
    const cH = wrapperRef.current.clientHeight || 800;
    const sideW = 300; 
    const mainW = cW - sideW;
    const colW = Math.floor((mainW + 2) / 3);
    
    const applyAuto = (id: string, l: number, t: number, w: number, h: number) => {
      const el = wrapperRef.current?.querySelector('#' + id) as HTMLElement;
      if(el) {
        el.style.left = l + 'px';
        el.style.top = t + 'px';
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        el.classList.remove('minimized');
      }
    };
    
    // Filter bar at the top
    const filterH = 36;
    const fullMainW = (3 * colW) - 2;
    applyAuto('p-filters', 0, 0, fullMainW, filterH);
    
    // Row 1: Metrics (190px height to fit content without scrollbar)
    const kpiH = 190;
    const kpiTop = filterH - 1;
    applyAuto('p-fat', 0, kpiTop, colW, kpiH);
    applyAuto('p-liquid', colW - 1, kpiTop, colW, kpiH);
    applyAuto('p-comm', (2 * colW) - 2, kpiTop, colW, kpiH);
    
    // Main Area: Tables
    const tablesTop = kpiTop + kpiH - 1;
    applyAuto('p-lotestable', 0, tablesTop, fullMainW, 380);
    
    // Histórico expands to full width as requested
    const historyTop = tablesTop + 380 - 1;
    const historyH = Math.max(300, cH - historyTop);
    applyAuto('p-table', 0, historyTop, cW, historyH);
    
    // Sidebar: Starts right where p-comm ends
    const sideX = fullMainW - 1;
    
    let theadYAligned = tablesTop + 90; // fallback
    try {
       const lotesPanel = wrapperRef.current?.querySelector('#p-lotestable');
       const headerEl = lotesPanel?.querySelector('.panel-header') as HTMLElement;
       const filterEl = lotesPanel?.querySelector('.bg-amber-700\\\\/5') as HTMLElement;
       if (headerEl && filterEl) {
           theadYAligned = tablesTop + headerEl.offsetHeight + filterEl.offsetHeight;
       }
    } catch(e) {}
    
    applyAuto('p-batch', sideX, 0, cW - sideX, theadYAligned + 1);
    // Rank now ends where History starts
    applyAuto('p-rank', sideX, theadYAligned - 1, cW - sideX, historyTop - (theadYAligned - 1) + 1);
    
    localStorage.removeItem(STORAGE_KEY);
  };

  const saveLayout = () => {
    const panels = wrapperRef.current?.querySelectorAll('.panel');
    const layout: Record<string, any> = {};
    panels?.forEach(p => {
        const h = p as HTMLElement;
        layout[h.id] = {
            left: h.style.left,
            top: h.style.top,
            width: h.style.width,
            height: h.style.height,
            zIndex: h.style.zIndex,
            isMinimized: h.classList.contains('minimized')
        };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));

    const toast = document.getElementById('toast');
    if (toast) {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  };

  const loadLayout = () => {`;

if (content.includes(target)) {
    content = content.replace(target, missingCode);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed collaborator app completely');
} else {
    // try removing carriage returns
    const targetNoCR = target.replace(/\\r/g, '');
    const contentNoCR = content.replace(/\\r/g, '');
    if (contentNoCR.includes(targetNoCR)) {
        content = contentNoCR.replace(targetNoCR, missingCode);
        fs.writeFileSync(path, content, 'utf8');
        console.log('Fixed collaborator app completely (CRLF handled)');
    } else {
        console.log('Target string not found!');
    }
}
