import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCommissions } from '../hooks/useCommissions';
import { useServices } from '../hooks/useServices';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import './M10Canvas.css';

const SalonComissoesDashboard = () => {
  const { role, professionalId, hasAccess, loading: userLoading } = useCurrentUserRef();
  const canViewAll = role === 'admin' || role === 'manager' || hasAccess('team_view_all');
  
  const {
      commissions,
      professionalsStats,
      simulationData,
      pendingApprovals,
      executeSmartClosing,
      confirmPayment,
      batches,
      loading: commissionsLoading
  } = useCommissions(undefined, canViewAll ? undefined : (professionalId || undefined));
  
  const { services, loading: servicesLoading } = useServices();

  const loading = commissionsLoading || servicesLoading || userLoading;

  // Local State
  const [selectedPeriod, setSelectedPeriod] = useState('Mensal');
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedLote, setSelectedLote] = useState<any>(null);
  const [focusedBatchId, setFocusedBatchId] = useState<string | null>(null);
  const [checkedBatchIds, setCheckedBatchIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lotePeriodFilter, setLotePeriodFilter] = useState('Diário');
  const [loteProFilter, setLoteProFilter] = useState('all');
  const [processing, setProcessing] = useState(false);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [historyProId, setHistoryProId] = useState<string>('all');
  const [historyDate, setHistoryDate] = useState<string>(''); // Vazio = Todos
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState('Diário');
  const [expandedHistMonthId, setExpandedHistMonthId] = useState<string | null>(null);
  const [expandedHistQuinzenaId, setExpandedHistQuinzenaId] = useState<string | null>(null);
  const [expandedHistDayId, setExpandedHistDayId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Available years from data
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    (commissions || []).forEach(c => {
      if (c.date) {
        const d = new Date(c.date);
        if (!isNaN(d.getTime())) years.add(d.getFullYear());
      }
    });
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [commissions]);

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const daysInSelectedMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const STORAGE_KEY = 'noir-commissions-dashboard-layout';

  // Formatting helpers
  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const formatBRLSplit = (v: number) => {
      const parts = formatBRL(v).split(',');
      return [parts[0], parts[1] || '00'];
  };

  // Aggregated Data
  const filteredCommissions = useMemo(() => {
    let list = commissions || [];
    if (selectedPeriod === 'Todos') return list;
    return list.filter(c => {
      if (!c.date) return false;
      const cDate = new Date(c.date);
      if (isNaN(cDate.getTime())) return false;
      if (selectedPeriod === 'Diário') {
        return cDate.getDate() === selectedDay && cDate.getMonth() === selectedMonth && cDate.getFullYear() === selectedYear;
      }
      if (selectedPeriod === 'Mensal') {
        return cDate.getMonth() === selectedMonth && cDate.getFullYear() === selectedYear;
      }
      if (selectedPeriod === 'Anual') {
        return cDate.getFullYear() === selectedYear;
      }
      return true;
    });
  }, [commissions, selectedPeriod, selectedDay, selectedMonth, selectedYear]);

  const totalCommissions = useMemo(() => filteredCommissions.reduce((sum, c) => sum + c.commissionValue, 0), [filteredCommissions]);
  const grossVolume = useMemo(() => filteredCommissions.reduce((sum, c) => sum + c.serviceValue, 0), [filteredCommissions]);
  const netValue = grossVolume - totalCommissions;
  const marginPct = grossVolume > 0 ? (netValue / grossVolume) * 100 : 0;

  const topProfessionals = useMemo(() => {
     // Ranking stays cumulative (all time), unaffected by the period filter as requested
     const stats: Record<string, any> = {};
     commissions.forEach((c: any) => {
       if(!stats[c.professionalId]) {
         stats[c.professionalId] = { id: c.professionalId, name: c.professionalName, totalEarned: 0 };
       }
       stats[c.professionalId].totalEarned += (c.serviceValue || 0);
     });
     return Object.values(stats).sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 4);
  }, [commissions]);


  // Grouped Lotes for Table (Now using actual DB batches)
  const [expandedQuinzenaId, setExpandedQuinzenaId] = useState<string | null>(null);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);

  const enrichBatch = (b: any) => {
     let grossValue = 0;
     let professionalName = 'Profissional';
     let totalCommissionValue = 0;
     
     const cIds = b.data?.commissionIds || [];
     if (cIds.length > 0) {
         cIds.forEach((id: string) => {
             const c = commissions.find(comm => comm.id === id);
             if (c) {
                 grossValue += c.serviceValue;
                 totalCommissionValue += c.commissionValue;
                 professionalName = c.professionalName;
             }
         });
     } else {
         const pro = topProfessionals.find(p => p.id === b.data?.professionalId);
         if (pro) professionalName = pro.name;
     }
     
     const netValue = b.data?.amount || 0;
     let adjustments = totalCommissionValue - netValue;
     if (Math.abs(adjustments) < 0.01) adjustments = 0;
     
     // Smart ID Generation
      const initials = (professionalName || 'PR')
          .split(' ')
          .filter(n => n.length > 0)
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 3);
          
      const dateObj = new Date(b.data?.requestedAt || b.created_at || new Date());
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yy = String(dateObj.getFullYear()).substring(2);
      
      const periodRaw = b.period || b.data?.periodLabel || '';
      let pType = 'D'; // Default
      if (periodRaw.includes('Quinzena') || periodRaw.startsWith('Q')) pType = 'Q';
      else if (periodRaw.includes('202') && !periodRaw.includes('/')) pType = 'M'; // "MAIO 2026"
      
      const loteCode = `SAB-${initials}-${dd}${mm}${yy}-${pType}`;
     const rawDateStr = b.data?.requestedAt || b.created_at || new Date().toISOString();
     const periodLabel = b.period || b.data?.periodLabel || new Date(rawDateStr).toLocaleDateString('pt-BR');
     
     return {
         ...b,
         created_at: rawDateStr,
         data: {
             ...b.data,
             professionalName,
             grossValue,
             netValue,
             adjustments,
             loteCode,
             periodLabel
         }
     };
  };

  const pendingBatches = useMemo(() => {
     let list = batches.filter(b => b.status === 'pending_collaborator');
     if (loteProFilter !== 'all') {
        list = list.filter(b => b.data?.professionalId === loteProFilter);
     }
     return list.map(enrichBatch).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [batches, loteProFilter, commissions, topProfessionals]);

  const paidBatches = useMemo(() => {
     let list = batches.filter(b => b.status === 'paid');
     if (historyProId !== 'all') {
        list = list.filter(b => b.data?.professionalId === historyProId);
     }
     if (historyDate) {
         list = list.filter(b => (b.confirmed_at || b.data?.requestedAt || '').startsWith(historyDate));
     }
     return list.map(enrichBatch).sort((a, b) => new Date(b.confirmed_at || b.created_at).getTime() - new Date(a.confirmed_at || a.created_at).getTime());
  }, [batches, historyProId, historyDate, commissions, topProfessionals]);

  const groupedHistory = useMemo(() => {
    // Pegar todos os lotes que esto pagos ou pendentes
    const validBatches = (batches || []).filter((b: any) => b.status === 'paid' || b.status === 'pending_collaborator');
    
    // Filtrar pelo perodo selecionado
    const filteredBatches = validBatches.filter((b: any) => {
        const mode = b.data?.mode;
        const loteCode = b.data?.loteCode || '';
        const periodStr = b.period || '';
        
        // Usar o campo period (DD/MM/YYYY) para extrair a data real do lote,
        // pois confirmed_at pode estar em UTC e diferir do dia local.
        const periodParts = periodStr.split('/');
        let batchDay = 1, batchMonth = 0, batchYear = 2026;
        if (periodParts.length === 3) {
            batchDay = parseInt(periodParts[0], 10);
            batchMonth = parseInt(periodParts[1], 10) - 1; // 0-indexed
            batchYear = parseInt(periodParts[2], 10);
        } else {
            // Fallback para confirmed_at se o period não está no formato DD/MM/YYYY
            const batchDateStr = b.confirmed_at || b.created_at || b.data?.requestedAt || '';
            const batchDate = batchDateStr ? new Date(batchDateStr) : new Date();
            batchDay = batchDate.getDate();
            batchMonth = batchDate.getMonth();
            batchYear = batchDate.getFullYear();
        }

        if (historyPeriodFilter === 'Diário') {
            if (historyDate) {
                // historyDate é YYYY-MM-DD, period é DD/MM/YYYY — converter para comparar
                const [y, m, d] = historyDate.split('-');
                const historyDateFormatted = `${d}/${m}/${y}`;
                return periodStr === historyDateFormatted && (mode === 'Diário' || loteCode.endsWith('-D'));
            }
            return batchMonth === selectedMonth && batchYear === selectedYear && (mode === 'Diário' || loteCode.endsWith('-D'));
        }
        if (historyPeriodFilter === 'Quinzenal') {
            if (historyDate) {
                const filterDate = new Date(historyDate + 'T12:00:00');
                const filterMonth = filterDate.getMonth();
                const filterYear = filterDate.getFullYear();
                return batchMonth === filterMonth && batchYear === filterYear && (mode === 'Quinzenal' || loteCode.endsWith('-Q'));
            }
            return batchMonth === selectedMonth && batchYear === selectedYear && (mode === 'Quinzenal' || loteCode.endsWith('-Q'));
        }
        if (historyPeriodFilter === 'Mensal') {
            if (historyDate) {
                const filterDate = new Date(historyDate + 'T12:00:00');
                const filterMonth = filterDate.getMonth();
                const filterYear = filterDate.getFullYear();
                return batchMonth === filterMonth && batchYear === filterYear && (mode === 'Mensal' || loteCode.endsWith('-M'));
            }
            return batchMonth === selectedMonth && batchYear === selectedYear && (mode === 'Mensal' || loteCode.endsWith('-M'));
        }
        return true;
    });

    const groups: Record<string, any> = {};

    filteredBatches.forEach((batch: any) => {
        const commIds = batch.data?.commissionIds || [];
        const batchComms = (commissions || []).filter(c => commIds.includes(c.id));
        
        const proId = batch.data?.professionalId;
        if (historyProId !== 'all' && proId !== historyProId) return;

        // Filtrar por data do histórico caso historyDate esteja especificado
        if (historyDate) {
            const [y, m, d] = historyDate.split('-');
            const historyDateFormatted = `${d}/${m}/${y}`;
            const matchDate = batch.period === historyDateFormatted || batchComms.some((c: any) => c.date === historyDate);
            if (!matchDate) return;
        }

        const groupKey = batch.id;
        const proName = batch.data?.professionalName || (commissions || []).find(c => c.professionalId === proId)?.professionalName || 'Colaborador';
        const loteCode = batch.data?.loteCode || `SAB-${(proName).split(' ').filter((n: string) => n.length > 0).map((n: string) => n[0]).join('').toUpperCase().substring(0,3)}-OLD`;
        const periodLabel = batch.period || batch.data?.periodLabel || 'Período Desconhecido';
        
        // Inicializa o grupo com os dados consolidados do próprio lote salvos no banco como fallback de segurança
        groups[groupKey] = {
            id: groupKey,
            loteCode: loteCode,
            label: periodLabel,
            proName: proName,
            dateLabel: periodLabel.split(' - ')[1] || periodLabel,
            startTime: '',
            endTime: '',
            grossValue: batch.data?.grossValue || batch.data?.amount || 0,
            commissionValue: batch.data?.amount || 0,
            commissions: [],
            quinzenasMap: {},
            daysMap: {}
        };
        
        const g = groups[groupKey];
        
        if (batchComms.length > 0) {
            // Se as comissões individuais estão disponíveis em cache local, recalcula os valores exatos e detalha a árvore
            g.grossValue = 0;
            g.commissionValue = 0;

            batchComms.forEach(c => {
                if (!c.date) return;
                const dateObj = new Date(c.date + 'T12:00:00');
                if (isNaN(dateObj.getTime())) return;
                
                const day = dateObj.getDate();
                const month = dateObj.getMonth();
                const year = dateObj.getFullYear();
                const q = day <= 15 ? 'Q1' : 'Q2';

                if (historyPeriodFilter === 'Diário' && c.startTime) {
                    if (!g.startTime || c.startTime < g.startTime) g.startTime = c.startTime;
                    if (c.endTime && (!g.endTime || c.endTime > g.endTime)) g.endTime = c.endTime;
                }

                g.grossValue += (c.serviceValue || 0);
                g.commissionValue += (c.commissionValue || 0);
                g.commissions.push(c);

                if (historyPeriodFilter === 'Mensal') {
                    if (!g.quinzenasMap[q]) {
                        g.quinzenasMap[q] = {
                            id: `${groupKey}-${q}`,
                            label: q === 'Q1' ? '1ª Quinzena' : '2ª Quinzena',
                            grossValue: 0,
                            commissionValue: 0,
                            daysMap: {}
                        };
                    }
                    const qz = g.quinzenasMap[q];
                    qz.grossValue += (c.serviceValue || 0);
                    qz.commissionValue += (c.commissionValue || 0);
                    
                    const dKey = c.date;
                    if (!qz.daysMap[dKey]) {
                        qz.daysMap[dKey] = {
                            id: `${groupKey}-${q}-${dKey}`,
                            label: `${String(day).padStart(2, '0')}/${String(month+1).padStart(2, '0')}`,
                            grossValue: 0,
                            commissionValue: 0,
                            commissions: []
                        };
                    }
                    const d = qz.daysMap[dKey];
                    d.grossValue += (c.serviceValue || 0);
                    d.commissionValue += (c.commissionValue || 0);
                    d.commissions.push(c);
                } else if (historyPeriodFilter === 'Quinzenal') {
                    const dKey = c.date;
                    if (!g.daysMap[dKey]) {
                        g.daysMap[dKey] = {
                            id: `${groupKey}-${dKey}`,
                            label: `${String(day).padStart(2, '0')}/${String(month+1).padStart(2, '0')}`,
                            grossValue: 0,
                            commissionValue: 0,
                            commissions: []
                        };
                    }
                    const d = g.daysMap[dKey];
                    d.grossValue += (c.serviceValue || 0);
                    d.commissionValue += (c.commissionValue || 0);
                    d.commissions.push(c);
                }
            });
        }
    });

    return Object.values(groups).map((g: any) => ({
        ...g,
        quinzenas: Object.values(g.quinzenasMap).map((qz: any) => ({
            ...qz,
            days: Object.values(qz.daysMap).sort((a: any, b: any) => a.id.localeCompare(b.id))
        })),
        days: Object.values(g.daysMap).sort((a: any, b: any) => a.id.localeCompare(b.id))
    })).sort((a,b) => b.id.localeCompare(a.id));
  }, [commissions, batches, historyPeriodFilter, historyProId, historyDate, monthNames, selectedDay, selectedMonth, selectedYear]);


  const checkedTotals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let adjustments = 0;
    checkedBatchIds.forEach(id => {
       const lote = pendingBatches.find(l => l.id === id);
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
    applyAuto('p-table', 0, historyTop, cW, 374);
    
    // Sidebar: Starts right where p-comm ends
    const sideX = fullMainW - 1;
    
    let theadYAligned = tablesTop + 90; // fallback
    try {
       const lotesPanel = wrapperRef.current?.querySelector('#p-lotestable');
       const headerEl = lotesPanel?.querySelector('.panel-header') as HTMLElement;
       const filterEl = lotesPanel?.querySelector('.bg-amber-700\\/5') as HTMLElement;
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

  const loadLayout = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved || !wrapperRef.current) return false;
    try {
        const layout = JSON.parse(saved);
        Object.keys(layout).forEach(id => {
            const h = wrapperRef.current?.querySelector('#' + id) as HTMLElement;
            if (h) {
                const s = layout[id];
                h.style.left = s.left;
                h.style.top = s.top;
                h.style.width = s.width;
                h.style.height = s.height;
                h.style.zIndex = s.zIndex;
                if (s.isMinimized) h.classList.add('minimized');
                else h.classList.remove('minimized');
            }
        });
        return true;
    } catch (e) {
        return false;
    }
  };

  useEffect(() => {
    if(!wrapperRef.current || loading) return;
    
    let zCounter = 50;

    const activate = (id: string) => {
      const el = wrapperRef.current?.querySelector('#' + id) as HTMLElement;
      if(el) { 
        zCounter++;
        el.style.zIndex = String(zCounter); 
        wrapperRef.current?.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        el.classList.add('active');
      }
    };

    const startDrag = (e: MouseEvent, id: string) => {
      const target = e.target as HTMLElement;
      if (target.closest('.ctrl-btn') || target.closest('select') || target.closest('button')) return;
      
      const panel = wrapperRef.current?.querySelector('#' + id) as HTMLElement;
      if(!panel) return;

      activate(id);
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = panel.offsetLeft;
      const startTop = panel.offsetTop;
      
      panel.classList.add('dragging');

      const onMove = (ev: MouseEvent) => {
        const deltaX = ev.clientX - startX;
        const deltaY = ev.clientY - startY;
        panel.style.left = (startLeft + deltaX) + 'px';
        panel.style.top = (startTop + deltaY) + 'px';
      };

      const onUp = () => {
        panel.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    const startResize = (e: MouseEvent, id: string) => {
      activate(id);
      const panel = wrapperRef.current?.querySelector('#' + id) as HTMLElement;
      if(!panel) return;
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = panel.offsetWidth;
      const startH = panel.offsetHeight;

      const onMove = (ev: MouseEvent) => {
        panel.style.width = Math.max(220, startW + ev.clientX - startX) + 'px';
        panel.style.height = Math.max(120, startH + ev.clientY - startY) + 'px';
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      e.stopPropagation();
      e.preventDefault();
    };

    // Force zero-gap unified layout on mount and window resize
    const handleResize = () => {
        resetLayout();
    };

    window.addEventListener('resize', handleResize);
    resetLayout();

    return () => {
        window.removeEventListener('resize', handleResize);
    };
  }, [loading]);

  // Clear row selection when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.lote-row') && !target.closest('.batch-card') && !target.closest('.modal-overlay')) {
        setFocusedBatchId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLiquidation = async () => {
    setProcessing(true);
    let successCount = 0;
    
    // Se houver um lote selecionado individualmente mas não estiver no checked, adiciona
    const idsToProcess = [...checkedBatchIds];
    if (selectedLote && !idsToProcess.includes(selectedLote.id)) {
      idsToProcess.push(selectedLote.id);
    }

    try {
      for (const batchId of idsToProcess) {
          const res = await confirmPayment(batchId);
          if (res) successCount++;
      }
      
      if(successCount > 0) {
        setIsModalOpen(false);
        setCheckedBatchIds([]); 
        setSelectedLote(null);
        setToast({ message: `${successCount} lote(s) confirmado(s) com sucesso!`, type: 'success' });
      } else {
        setToast({ message: "Não foi possível confirmar o recebimento.", type: 'error' });
      }
    } catch (err) {
      console.error("Erro na liquidação:", err);
      setToast({ message: "Erro ao processar confirmação.", type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#080810]">
        <div className="text-emerald-500 font-bold tracking-widest animate-pulse">CARREGANDO CANVAS M10...</div>
      </div>
    );
  }

  return (
    <div className="m10-wrapper" ref={wrapperRef}>

      <div id="canvas">
        
        {/* FILTER BAR */}
        <div className="panel" id="p-filters">
          <div className="panel-header" style={{borderBottom: 'none', justifyContent: 'flex-start'}}>
            <div className="flex items-center gap-2">
              <div className="flex bg-black/40 rounded-sm p-0.5 border border-white/5">
                <button 
                  className={`px-3 py-1 text-[8px] font-bold uppercase tracking-widest transition-all ${selectedPeriod === 'Diário' ? 'bg-amber-700 text-black shadow-[0_0_10px_rgba(255,20,147,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                  onClick={() => setSelectedPeriod('Diário')}
                >Diário</button>
                <button 
                  className={`px-3 py-1 text-[8px] font-bold uppercase tracking-widest transition-all ${selectedPeriod === 'Mensal' ? 'bg-amber-700 text-black shadow-[0_0_10px_rgba(255,20,147,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                  onClick={() => setSelectedPeriod('Mensal')}
                >Mensal</button>
                <button 
                  className={`px-3 py-1 text-[8px] font-bold uppercase tracking-widest transition-all ${selectedPeriod === 'Anual' ? 'bg-amber-700 text-black shadow-[0_0_10px_rgba(255,20,147,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                  onClick={() => setSelectedPeriod('Anual')}
                >Anual</button>
              </div>
              {selectedPeriod === 'Diário' && (
                <select 
                  value={selectedDay} 
                  onChange={e => setSelectedDay(Number(e.target.value))}
                  className="bg-black/60 border border-white/10 text-white text-[8px] px-2 py-1 outline-none font-bold uppercase tracking-wider"
                >
                  {Array.from({length: daysInSelectedMonth}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
                  ))}
                </select>
              )}
              {(selectedPeriod === 'Diário' || selectedPeriod === 'Mensal') && (
                <select 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="bg-black/60 border border-white/10 text-white text-[8px] px-2 py-1 outline-none font-bold uppercase tracking-wider"
                >
                  {monthNames.map((m, i) => (
                    <option key={i} value={i}>{m.substring(0, 3).toUpperCase()}</option>
                  ))}
                </select>
              )}
              <select 
                value={selectedYear} 
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-black/60 border border-white/10 text-white text-[8px] px-2 py-1 outline-none font-bold uppercase tracking-wider"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* PANEL: GROSS VOLUME */}
        <div className="panel" id="p-fat">
          <div className="panel-header">
            <div className="panel-title"><span className="dot"></span>Faturamento Total</div>
            <div className="panel-controls">
              <button className="ctrl-btn ctrl-min">—</button>
            </div>
          </div>
          <div className="panel-body">
            <div className="kpi-label">Volume Bruto do Período</div>
            <div className="kpi-val">
              <strong>{formatBRLSplit(grossVolume)[0]}</strong>
              <span className="cents">,{formatBRLSplit(grossVolume)[1]}</span>
            </div>
            <div className="kpi-sub">Visão Histórica Completa</div>
          </div>
          <div className="resize-handle"></div>
        </div>

        {/* PANEL: COMMISSIONS */}
        <div className="panel" id="p-comm">
          <div className="panel-header">
            <div className="panel-title"><span className="dot"></span>Comissões Geradas</div>
            <div className="panel-controls">
              <button className="ctrl-btn ctrl-min">—</button>
            </div>
          </div>
          <div className="panel-body">
            <div className="kpi-label" style={{color: "rgba(255,20,147,.7)"}}>Total a Liquidar</div>
            <div className="kpi-val pink-val">
              <strong>{formatBRLSplit(totalCommissions)[0]}</strong>
              <span className="cents" style={{opacity: .5}}>,{formatBRLSplit(totalCommissions)[1]}</span>
            </div>
            <div className="kpi-sub">Saldo acumulado pendente</div>
          </div>
          <div className="resize-handle"></div>
        </div>

        {/* PANEL: NET VALUE */}
        <div className="panel" id="p-liquid">
          <div className="panel-header">
            <div className="panel-title"><span className="dot" style={{background: "var(--cyan)"}}></span>Valor Líquido do Salão</div>
            <div className="panel-controls">
              <button className="ctrl-btn ctrl-min">—</button>
            </div>
          </div>
          <div className="panel-body">
            <div className="flex justify-between items-start gap-3">
              <div style={{flex: 1}}>
                <div className="kpi-label" style={{color: "rgba(0,255,245,.7)"}}>Receita Retida pelo Salão</div>
                <div className="kpi-val cyan-val" style={{fontSize: "28px"}}>
                  <strong>{formatBRLSplit(netValue)[0]}</strong>
                  <span className="cents" style={{opacity: .5}}>,{formatBRLSplit(netValue)[1]}</span>
                </div>
                <div className="kpi-sub">Bruto − Comissões</div>
              </div>
              <div className="text-right text-[10px] text-[#5a5a78] leading-relaxed flex-shrink-0">
                <div className="text-white">{formatBRL(grossVolume)} <span className="opacity-50">(bruto)</span></div>
                <div className="text-amber-700">- {formatBRL(totalCommissions)} <span className="opacity-50">(com.)</span></div>
                <div className="border-t border-emerald-500/20 mt-1 pt-1 text-emerald-400 font-bold">= {formatBRL(netValue)}</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[9px] mb-1">
                <span className="text-[#5a5a78]">Margem Retida pelo Salão</span>
                <span className="text-emerald-400 font-bold">{marginPct.toFixed(1)}%</span>
              </div>
              <div className="h-1 bg-white/5 relative">
                <div className="h-full bg-emerald-500" style={{width: marginPct + '%'}}></div>
              </div>
            </div>
          </div>
          <div className="resize-handle"></div>
        </div>

        {/* PANEL: RANKING */}
        <div className="panel" id="p-rank">
          <div className="panel-header" style={{ height: '36px', padding: '0 14px', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(236,72,153,0.2)', backgroundColor: 'transparent' }}>
            <div className="panel-title"><span className="dot"></span>Ranking de Profissionais</div>
            <div className="panel-controls">
              <button className="ctrl-btn ctrl-min">—</button>
            </div>
          </div>
          <div className="panel-body overflow-auto">
            <div className="rank-list">
              {topProfessionals.map((pro, idx) => (
                <div className="rank-row" key={pro.id} style={{opacity: 1 - (idx * 0.15)}}>
                  <div className={"rank-num" + (idx === 0 ? " top" : "")}>{idx + 1}</div>
                  <div className="rank-info">
                    <div className="rank-name">{pro.name}</div>
                    <div className="rank-fat">{formatBRL(pro.totalEarned)} faturados</div>
                  </div>
                  <div className="rank-comm">{formatBRL(pro.totalEarned * 0.4)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="resize-handle"></div>
        </div>


        {/* PANEL: LOTES TABLE */}
        <div className="panel" id="p-lotestable">
           <div className="panel-header">
              <div className="panel-title"><span className="dot"></span>Tabela de Lotes de Pagamento</div>
              <div className="panel-controls">
                <button className="ctrl-btn ctrl-min">—</button>
              </div>
           </div>
           <div className="panel-body p-0 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-amber-700/5 flex-shrink-0">
                  <div className="period-group">
                    <button className={lotePeriodFilter === 'Diário' ? 'lt-btn lt-on' : 'lt-btn'} onClick={() => setLotePeriodFilter('Diário')}>Diário</button>
                    <button className={lotePeriodFilter === 'Quinzenal' ? 'lt-btn lt-on' : 'lt-btn'} onClick={() => setLotePeriodFilter('Quinzenal')}>Quinzenal</button>
                    <button className={lotePeriodFilter === 'Mensal' ? 'lt-btn lt-on' : 'lt-btn'} onClick={() => setLotePeriodFilter('Mensal')}>Mensal</button>
                  </div>
                  {canViewAll && (
                    <select 
                      value={loteProFilter} 
                      onChange={(e) => setLoteProFilter(e.target.value)}
                      className="bg-black/50 border border-white/10 text-white text-[10px] px-2 py-1 outline-none font-bold"
                    >
                      <option value="all">Todos Colaboradores</option>
                      {topProfessionals.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                  <div className="ml-auto text-amber-700 font-bold text-[10px] uppercase tracking-widest">{pendingBatches.length} Lotes</div>
              </div>

              <div className="flex-1 overflow-auto bg-black/20">
                 <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="px-3 py-2 border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0 w-8"></th>
                        <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-[#5a5a78] border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0">Lote</th>
                        <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-[#5a5a78] border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0">Data</th>
                        {canViewAll && <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-[#5a5a78] border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0">Colaborador</th>}
                        <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-[#5a5a78] border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0">Valor Bruto R$</th>
                        <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-[#5a5a78] border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0">Vale R$</th>
                        <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-amber-700 border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0">Valor Líquido R$</th>
                      </tr>
                    </thead>
                    <tbody>
                        {pendingBatches.map((lote: any) => (
                          <React.Fragment key={lote.id}>
                            <tr 
                              className={`lote-row ${focusedBatchId === lote.id ? 'selected' : ''}`}
                              onClick={() => setFocusedBatchId(lote.id)}
                            >
                               <td className="px-3 py-3 text-center">
                                 <input 
                                   type="checkbox" 
                                   checked={checkedBatchIds.includes(lote.id)} 
                                   onClick={(e) => e.stopPropagation()}
                                   onChange={(e) => {
                                     if (e.target.checked) setCheckedBatchIds(prev => [...prev, lote.id]);
                                     else setCheckedBatchIds(prev => prev.filter(id => id !== lote.id));
                                   }}
                                   className="accent-amber-700 w-3.5 h-3.5 cursor-pointer"
                                 />
                               </td>
                               <td className="px-3 py-3 pl-1">
                                   <div className="flex items-center justify-start gap-2">
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setExpandedBatchId(expandedBatchId === lote.id ? null : lote.id);
                                         if (expandedBatchId === lote.id) {
                                            setExpandedDayId(null);
                                            setExpandedQuinzenaId(null);
                                         }
                                       }}
                                       className={`w-5 h-5 flex items-center justify-center rounded-sm border transition-all duration-500 ${expandedBatchId === lote.id ? 'bg-amber-700/20 border-amber-700 text-amber-700 shadow-[0_0_15px_rgba(180,83,9,0.4)]' : 'bg-black/60 border-white/10 text-slate-500 hover:border-amber-700/50 hover:text-amber-600 hover:shadow-[0_0_10px_rgba(180,83,9,0.2)]'}`}
                                       title="Ver detalhes"
                                     >
                                       <svg className={`w-2.5 h-2.5 transition-transform duration-500 ${expandedBatchId === lote.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                       </svg>
                                     </button>
                                     <span className="font-bold text-white tracking-tight ml-1">
                                       {lote.data?.loteCode || `LOTE-${lote.id.substring(0,6).toUpperCase()}`}
                                     </span>
                                   </div>
                                </td>
                                <td className="px-3 py-3 text-muted text-center italic">{lote.data?.periodLabel || new Date(lote.created_at).toLocaleDateString('pt-BR')}</td>
                                {canViewAll && <td className={`px-3 py-3 font-bold text-center ${focusedBatchId === lote.id ? 'text-amber-700' : 'text-amber-600/80'}`}>{lote.data?.professionalName || 'Profissional'}</td>}
                                <td className="px-3 py-3 text-center text-muted">{formatBRL(lote.data?.grossValue || 0)}</td>
                                <td className="px-3 py-3 text-center text-red-500">{(lote.data?.adjustments || 0) !== 0 ? `- ${formatBRL(Math.abs(lote.data?.adjustments || 0))}` : '—'}</td>
                                <td className={`px-3 py-3 text-center font-bold ${focusedBatchId === lote.id ? 'text-amber-700' : 'text-white'}`}>{formatBRL(lote.data?.netValue || 0)}</td>
                             </tr>
                             
                             {/* LEVEL 1: Sub-table for Group */}
                             {expandedBatchId === lote.id && (
                               <tr className="bg-[#1f2937]/60 border-b border-amber-700/10">
                                 <td colSpan={7} className="p-0">
                                   <div className="py-4 px-12 bg-gradient-to-b from-amber-700/[0.02] to-transparent">
                                     
                                     {/* Since it's from db, we don't group by day/quinzena here, just show commissions directly to simplify the view of a batch */}
                                     <div className="border border-white/5 bg-black/20 rounded-sm overflow-hidden">
                                       <table className="w-full text-[10px]">
                                         <thead>
                                           <tr className="bg-white/[0.02] border-b border-white/5">
                                             <th className="text-center px-4 py-2.5 font-bold text-[#5a5a78] uppercase tracking-wider">Data</th>
                                             <th className="text-center px-4 py-2.5 font-bold text-[#5a5a78] uppercase tracking-wider">Serviço</th>
                                             <th className="text-center px-4 py-2.5 font-bold text-[#5a5a78] uppercase tracking-wider">Cliente</th>
                                             <th className="text-center px-4 py-2.5 font-bold text-[#5a5a78] uppercase tracking-wider">Valor Bruto</th>
                                             <th className="text-center px-4 py-2.5 font-bold text-amber-700 uppercase tracking-wider">Comissão</th>
                                           </tr>
                                         </thead>
                                         <tbody className="divide-y divide-white/[0.05]">
                                           {lote.data?.commissionIds?.map((cId: string, idx: number) => {
                                             const comm = commissions.find(c => c.id === cId);
                                             if (!comm) return null;
                                             return (
                                               <tr key={comm.id || idx} className="hover:bg-white/[0.03] transition-colors text-center">
                                                 <td className="px-4 py-2.5 text-slate-400">{new Date(comm.date).toLocaleDateString('pt-BR')}</td>
                                                 <td className="px-4 py-2.5 text-white font-semibold">{comm.service}</td>
                                                 <td className="px-4 py-2.5 text-slate-400 italic font-medium">{comm.client}</td>
                                                 <td className="px-4 py-2.5 text-slate-400">{formatBRL(comm.serviceValue)}</td>
                                                 <td className="px-4 py-2.5 text-amber-700 font-bold tracking-tighter">{formatBRL(comm.commissionValue)}</td>
                                               </tr>
                                             );
                                           })}
                                         </tbody>
                                       </table>
                                     </div>
                                   </div>
                                 </td>
                               </tr>
                             )}
                          </React.Fragment>
                        ))}
                    </tbody>
                 </table>
              </div>
           </div>
           <div className="resize-handle"></div>
        </div>

        {/* PANEL: HISTORY TABLE */}
        <div className="panel" id="p-table">
          <div className="panel-header" style={{flexWrap: 'nowrap', gap: '15px', height: '48px', minHeight: '48px', maxHeight: '48px', padding: '0 15px', alignItems: 'center', display: 'flex'}}>
            <div className="panel-title" style={{margin: 0}}><span className="dot" style={{background: 'var(--emerald)'}}></span>Histórico de Comissões Pagas</div>
            
            <div className="flex bg-black/40 rounded-sm p-0.5 border border-white/5 ml-4">
              <button 
                className={`px-2 py-1 text-[8px] font-bold uppercase tracking-widest transition-all ${historyPeriodFilter === 'Diário' ? 'bg-amber-700 text-black' : 'text-slate-500'}`} 
                onClick={() => setHistoryPeriodFilter('Diário')}
              >Diário</button>
              <button 
                className={`px-2 py-1 text-[8px] font-bold uppercase tracking-widest transition-all ${historyPeriodFilter === 'Quinzenal' ? 'bg-amber-700 text-black' : 'text-slate-500'}`} 
                onClick={() => setHistoryPeriodFilter('Quinzenal')}
              >Quinzenal</button>
              <button 
                className={`px-2 py-1 text-[8px] font-bold uppercase tracking-widest transition-all ${historyPeriodFilter === 'Mensal' ? 'bg-amber-700 text-black' : 'text-slate-500'}`} 
                onClick={() => setHistoryPeriodFilter('Mensal')}
              >Mensal</button>
            </div>

            <div className="flex items-center gap-4 ml-auto">
              {canViewAll && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-muted uppercase">Colaborador:</span>
                  <select 
                    className="bg-black/40 border border-white/10 text-[10px] text-white outline-none rounded-sm px-2 py-1"
                    value={historyProId}
                    onChange={(e) => setHistoryProId(e.target.value)}
                  >
                    <option value="all">TODOS</option>
                    {professionalsStats.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted uppercase">Data:</span>
                <input 
                  type="date" 
                  className="bg-black/40 border border-white/10 text-[10px] text-white outline-none rounded-sm px-2 py-1"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                />
                {(historyProId !== 'all' || historyDate !== '') && (
                  <button 
                    className="text-[9px] text-pink-500 uppercase font-bold hover:text-pink-400 ml-2"
                    onClick={() => { setHistoryProId('all'); setHistoryDate(''); }}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
            <div className="panel-controls">
              <button className="ctrl-btn ctrl-min">—</button>
            </div>
          </div>
          <div className="panel-body p-0 overflow-auto">
            <div className="tbl-wrap">
              <table className="w-full">
                <thead>
                  <tr>
                     <th className="pl-12 text-left">Lote</th>
                     <th className="text-left">Colaborador</th>
                     <th className="text-center">Data / Horário</th>
                     <th className="text-center">Volume Bruto</th>
                     <th className="text-center text-amber-700">Comissão Paga</th>
                     <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {groupedHistory.length > 0 ? groupedHistory.map((group) => (
                    <React.Fragment key={group.id}>
                        {/* NÍVEL 1: MENSAL / QUINZENAL / DIÁRIO */}
                        <tr className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${expandedHistMonthId === group.id ? 'bg-amber-700/5' : ''}`}
                            onClick={() => setExpandedHistMonthId(expandedHistMonthId === group.id ? null : group.id)}
                        >
                            <td className="py-4 pl-12">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 flex items-center justify-center rounded border transition-all ${expandedHistMonthId === group.id ? 'bg-amber-700 border-amber-700 text-black' : 'bg-black/40 border-white/10 text-white/40'}`}>
                                        <svg className={`w-3 h-3 transition-transform duration-300 ${expandedHistMonthId === group.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    <span className="text-[11px] font-black text-amber-600/80 tracking-tighter uppercase">{group.loteCode}</span>
                                </div>
                            </td>
                            <td className="py-4">
                                <div className="flex flex-col">
                                    <span className="text-[12px] font-black text-white uppercase tracking-wider">{group.proName}</span>
                                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{group.commissions.length} lançamentos</span>
                                </div>
                            </td>
                            <td className="text-center">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-white/80">{group.dateLabel}</span>
                                    {group.startTime && (
                                        <span className="text-[9px] font-bold text-amber-700/50 uppercase tracking-tighter">
                                            {group.startTime} - {group.endTime}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="text-center">
                                <span className="text-[11px] font-bold text-white/60">{formatBRL(group.grossValue)}</span>
                            </td>
                            <td className="text-center">
                                <span className="text-[12px] font-black text-amber-700">{formatBRL(group.commissionValue)}</span>
                            </td>
                            <td className="text-center">
                                <span className="inline-flex items-center px-3 py-1 rounded-sm text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                                    ✓ Lote Pago
                                </span>
                            </td>
                        </tr>

                        {/* EXPANSÃO NÍVEL 2 */}
                        {expandedHistMonthId === group.id && (
                            <tr className="bg-black/40">
                                <td colSpan={6} className="p-0 border-b border-white/5">
                                    <div className="flex flex-col gap-1 p-2 pl-12 bg-black/20">
                                        {historyPeriodFilter === 'Mensal' && group.quinzenas.map((qz: any) => (
                                            <div key={qz.id} className="border border-white/5 rounded-sm overflow-hidden mb-1">
                                                <div 
                                                    className={`flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors ${expandedHistQuinzenaId === qz.id ? 'bg-amber-700/5' : 'bg-[#111827]'}`}
                                                    onClick={(e) => { e.stopPropagation(); setExpandedHistQuinzenaId(expandedHistQuinzenaId === qz.id ? null : qz.id); }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 flex items-center justify-center rounded border transition-all ${expandedHistQuinzenaId === qz.id ? 'bg-amber-700/20 border-amber-700 text-amber-700' : 'bg-black/40 border-white/10 text-white/40'}`}>
                                                            <svg className={`w-2.5 h-2.5 transition-transform duration-300 ${expandedHistQuinzenaId === qz.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </div>
                                                        <span className="text-[13px] font-black text-white uppercase tracking-widest">{qz.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-6 pr-4">
                                                        <span className="text-[10px] font-bold text-white/30 tracking-tight">Bruto: {formatBRL(qz.grossValue)}</span>
                                                        <span className="text-[11px] font-black text-amber-700">PAGO: {formatBRL(qz.commissionValue)}</span>
                                                    </div>
                                                </div>

                                                {/* EXPANSÃO NÍVEL 3: Dias */}
                                                {expandedHistQuinzenaId === qz.id && (
                                                    <div className="bg-black/30 p-2 flex flex-col gap-1">
                                                        {qz.days.map((day: any) => (
                                                            <div key={day.id} className="border border-white/5 rounded-sm overflow-hidden">
                                                                <div 
                                                                    className={`flex items-center justify-between p-2 cursor-pointer hover:bg-white/5 transition-colors ${expandedHistDayId === day.id ? 'bg-amber-700/5' : 'bg-black/20'}`}
                                                                    onClick={(e) => { e.stopPropagation(); setExpandedHistDayId(expandedHistDayId === day.id ? null : day.id); }}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <svg className={`w-3 h-3 transition-transform ${expandedHistDayId === day.id ? 'rotate-90 text-amber-700' : 'text-white/20'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                                        </svg>
                                                                        <span className="text-[13px] font-black text-white/60 tracking-widest">{day.label}</span>
                                                                    </div>
                                                                    <span className="text-[13px] font-black text-amber-700/80 pr-4">{formatBRL(day.commissionValue)}</span>
                                                                </div>
                                                                {/* NÍVEL FINAL: Serviços */}
                                                                {expandedHistDayId === day.id && (
                                                                    <div className="bg-black/50 p-2">
                                                                        <table className="w-full text-[12px] border-collapse">
                                                                            <thead>
                                                                                <tr className="border-b border-white/5 text-white/30 uppercase font-black tracking-tighter">
                                                                                    <th className="py-2 pl-2 text-left">Serviço</th>
                                                                                    <th className="py-2 text-left">Cliente</th>
                                                                                    <th className="py-2 text-center">Horário</th>
                                                                                    <th className="py-2 text-right">Bruto</th>
                                                                                    <th className="py-2 text-right text-amber-700">Comissão</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {day.commissions.map((comm: any, cidx: number) => (
                                                                                    <tr key={comm.id || cidx} className="border-b border-white/[0.02] last:border-0">
                                                                                        <td className="py-2 pl-2 font-bold text-white/70 text-left">{comm.service}</td>
                                                                                        <td className="py-2 text-white/40 italic text-left">{comm.client}</td>
                                                                                        <td className="py-2 text-center text-white/30">{comm.startTime || '--:--'} - {comm.endTime || '--:--'}</td>
                                                                                        <td className="py-2 text-right text-white/30">{formatBRL(comm.serviceValue)}</td>
                                                                                        <td className="py-2 text-right font-black text-amber-700">{formatBRL(comm.commissionValue)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Se Diário: Exibe serviços diretamente */}
                                        {historyPeriodFilter === 'Diário' && (
                                            <div className="bg-black/50 p-2 pl-12">
                                                <table className="w-full text-[12px] border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-white/5 text-white/30 uppercase font-black tracking-tighter">
                                                            <th className="py-2 pl-2 text-left">Serviço</th>
                                                            <th className="py-2 text-left">Cliente</th>
                                                            <th className="py-2 text-center">Horário</th>
                                                            <th className="py-2 text-right">Bruto</th>
                                                            <th className="py-2 text-right text-amber-700">Comissão</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.commissions.map((comm: any, cidx: number) => (
                                                            <tr key={comm.id || cidx} className="border-b border-white/[0.02] last:border-0">
                                                                <td className="py-2 pl-2 font-bold text-white/70 text-left">{comm.service}</td>
                                                                <td className="py-2 text-white/40 italic text-left">{comm.client}</td>
                                                                <td className="py-2 text-center text-white/30">{comm.startTime || '--:--'} - {comm.endTime || '--:--'}</td>
                                                                <td className="py-2 text-right text-white/30">{formatBRL(comm.serviceValue)}</td>
                                                                <td className="py-2 text-right font-black text-amber-700">{formatBRL(comm.commissionValue)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* Se Quinzenal: Exibe dias que expandem para serviços */}
                                        {historyPeriodFilter === 'Quinzenal' && (
                                            <div className="flex flex-col gap-1">
                                                {group.days.map((day: any) => (
                                                    <div key={day.id} className="border border-white/5 rounded-sm overflow-hidden">
                                                        <div 
                                                            className={`flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors ${expandedHistDayId === day.id ? 'bg-amber-700/5' : 'bg-[#111827]'}`}
                                                            onClick={(e) => { e.stopPropagation(); setExpandedHistDayId(expandedHistDayId === day.id ? null : day.id); }}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-5 h-5 flex items-center justify-center rounded border transition-all ${expandedHistDayId === day.id ? 'bg-amber-700/20 border-amber-700 text-amber-700' : 'bg-black/40 border-white/10 text-white/40'}`}>
                                                                    <svg className={`w-2.5 h-2.5 transition-transform duration-300 ${expandedHistDayId === day.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                </div>
                                                                <span className="text-[13px] font-black text-white uppercase tracking-widest">{day.label}</span>
                                                            </div>
                                                            <div className="flex items-center gap-6 pr-4">
                                                                <span className="text-[10px] font-bold text-white/30">Bruto: {formatBRL(day.grossValue)}</span>
                                                                <span className="text-[11px] font-black text-amber-700">Comissão: {formatBRL(day.commissionValue)}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {expandedHistDayId === day.id && (
                                                            <div className="bg-black/50 p-2">
                                                                <table className="w-full text-[12px] border-collapse">
                                                                    <thead>
                                                                        <tr className="border-b border-white/5 text-white/30 uppercase font-black tracking-tighter">
                                                                            <th className="py-2 pl-2 text-left">Serviço</th>
                                                                            <th className="py-2 text-left">Cliente</th>
                                                                            <th className="py-2 text-center">Horário</th>
                                                                            <th className="py-2 text-right">Bruto</th>
                                                                            <th className="py-2 text-right text-amber-700">Comissão</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {day.commissions.map((comm: any, cidx: number) => (
                                                                            <tr key={comm.id || cidx} className="border-b border-white/[0.02] last:border-0">
                                                                                <td className="py-2 pl-2 font-bold text-white/70 text-left">{comm.service}</td>
                                                                                <td className="py-2 text-white/40 italic text-left">{comm.client}</td>
                                                                                <td className="py-2 text-center text-white/30">{comm.startTime || '--:--'} - {comm.endTime || '--:--'}</td>
                                                                                <td className="py-2 text-right text-white/30">{formatBRL(comm.serviceValue)}</td>
                                                                                <td className="py-2 text-right font-black text-amber-700">{formatBRL(comm.commissionValue)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                  )) : (
                    <tr><td colSpan={5} className="text-center py-10 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Nenhum histórico de comissões encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="resize-handle"></div>
        </div>

        <div className="panel" id="p-batch">
          <div className="panel-header">
            <div className="panel-title"><span className="dot"></span>Lotes de Pagamento</div>
            <div className="panel-controls">
              <button className="ctrl-btn ctrl-min">—</button>
            </div>
          </div>
          <div className="panel-body">
             <div className="batch-cards">
                {checkedBatchIds.length === 1 ? (
                  (() => {
                    const selectedId = checkedBatchIds[0];
                    const lote = pendingBatches.find((s: any) => s.id === selectedId);
                    if (!lote) return null;

                    return (
                      <div className="batch-card ready">
                        <span className="bc-status ok">✓ SELECIONADO PARA CONFIRMAÇÃO</span>
                        <div className="bc-name text-white font-bold text-xl mt-2">{lote.data?.professionalName || 'Profissional'}</div>
                        <div className="bc-period text-muted text-[10px]">{lote.data?.periodLabel || 'Lote'} - 1 lote selecionado</div>
                        <div className="bc-amount text-amber-700 text-4xl font-light mt-4">
                          {formatBRL(lote.data?.netValue || 0)}
                        </div>
                        <div className="bc-footer border-t border-white/5 mt-6 pt-4">
                          <div className="bc-note text-[10px] text-muted mb-4">Confirmar que recebeu o valor deste lote</div>
                          <button 
                            className="pay-btn bg-emerald-600 text-white font-bold uppercase py-3 tracking-widest text-[10px] transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] border-transparent hover:scale-105"
                            onClick={() => { setSelectedLote(lote); setIsModalOpen(true); }}
                          >
                            ✓ Confirmar Recebimento
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="batch-card ready">
                    <span className={`bc-status ${checkedBatchIds.length > 0 ? 'ok' : 'pending'}`}>
                      {checkedBatchIds.length > 0 ? '✓ PRONTO PARA FECHAMENTO' : '● AGUARDANDO SELEÇÃO'}
                    </span>
                    <div className="bc-name">
                      {checkedBatchIds.length > 0 ? 'Aprovação Coletiva' : 'Nenhum Lote Selecionado'}
                    </div>
                    <div className="bc-period">
                      {checkedBatchIds.length > 0 
                        ? `${checkedServicesCount} serviços em ${checkedBatchIds.length} profissionais` 
                        : 'Selecione os colaboradores na tabela para processar o pagamento'}
                    </div>
                    <div className={`bc-amount ${checkedBatchIds.length > 0 ? 'pink-val' : 'text-white/20'}`}>
                      {formatBRL(checkedTotal)}
                    </div>
                    <div className="bc-footer">
                      <div className="bc-note">
                        {checkedBatchIds.length > 0 
                          ? 'Soma total das comissões selecionadas' 
                          : 'Clique nos checkboxes da tabela para somar os valores'}
                      </div>
                      <button 
                        className={`pay-btn font-bold uppercase py-3 tracking-widest text-[10px] transition-all duration-300 ${checkedBatchIds.length > 0 ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border-transparent hover:scale-105' : 'bg-transparent text-muted border-white/10 opacity-50 cursor-not-allowed'}`}
                        onClick={() => { if(checkedBatchIds.length > 0) { setSelectedLote(null); setIsModalOpen(true); } }}
                        disabled={checkedBatchIds.length === 0}
                      >
                        {checkedBatchIds.length > 1 ? '✓ Confirmar Recebimento em Massa' : '✓ Aguardando Seleção'}
                      </button>
                    </div>
                  </div>
                )}
                {pendingApprovals.length > 0 && (
                   <div className="mt-4 p-3 bg-white/5 border border-white/5">
                      <div className="text-[9px] uppercase font-bold text-muted mb-2 tracking-widest">Ajustes / Vales Pendentes</div>
                      {pendingApprovals.slice(0,3).map(pa => (
                        <div key={pa.id} className="flex justify-between text-[11px] mb-1">
                          <span>{pa.professional}</span>
                          <span className="text-red-500 font-bold">{formatBRL(Math.abs(pa.value))}</span>
                        </div>
                      ))}
                   </div>
                )}
             </div>
          </div>
          <div className="resize-handle"></div>
        </div>

      </div>

      {/* LIQUIDATION MODAL (Refined) */}
      {isModalOpen && (
        <div className="modal-overlay">
           <div className="modal-content">
              <div className="modal-header">
                <div className="panel-title"><span className="dot"></span>DETALHES DA LIQUIDAÇÃO</div>
                <button className="btn-close" onClick={() => setIsModalOpen(false)}>×</button>
              </div>
              <div className="modal-body p-0">
                <div className="lote-card-mini">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-muted uppercase tracking-wider">Colaborador(es)</span>
                    <span className="text-[12px] text-amber-700 font-bold">{selectedLote ? selectedLote.data?.professionalName : 'Múltiplos Lotes'}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-muted uppercase tracking-wider">Período</span>
                    <span className="text-[12px] text-white">{selectedLote ? selectedLote.data?.periodLabel : 'Lotes Selecionados'}</span>
                  </div>
                  <div className="flex justify-between mb-2 border-t border-white/5 pt-2 mt-2">
                    <span className="text-[10px] text-muted uppercase tracking-wider">Bruto Calculado</span>
                    <span className="text-[12px] text-white">{formatBRL(selectedLote ? selectedLote.data?.grossValue : checkedTotals.gross)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-muted uppercase tracking-wider">Ajustes / Vales</span>
                    <span className="text-[12px] text-red-500">{formatBRL(selectedLote ? Math.abs(selectedLote.data?.adjustments || 0) : Math.abs(checkedTotals.adjustments))}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-amber-700/20 pt-4 mt-4">
                    <span className="text-[10px] text-muted uppercase tracking-wider">Total Líquido</span>
                    <span className="text-[24px] text-emerald-500 font-light">{formatBRL(selectedLote ? selectedLote.data?.netValue : checkedTotals.net)}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-[9px] text-muted uppercase block mb-2">Observações</label>
                  <textarea className="w-full bg-black/50 border border-white/10 text-white p-3 text-[12px] h-20 outline-none resize-none" placeholder="Opcional..."></textarea>
                </div>
                
                <div className="flex gap-3">
                  <button className="pb" style={{flex: 1, border: '1px solid var(--muted)'}} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                  <button 
                    className="confirm-pay-btn" style={{backgroundColor: 'var(--emerald)', borderColor: 'var(--emerald)'}}
                    onClick={handleLiquidation}
                    disabled={processing}
                  >
                    {processing ? 'CONFIRMANDO...' : 'CONFIRMAR RECEBIMENTO'}
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl transition-all duration-500 z-[10000] border flex items-center gap-3 animate-bounce-subtle ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/50 text-rose-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`}></div>
          <span className="text-xs font-bold uppercase tracking-widest">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default SalonComissoesDashboard;

