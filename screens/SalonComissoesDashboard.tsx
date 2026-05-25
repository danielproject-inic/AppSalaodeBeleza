import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCommissions } from '../hooks/useCommissions';
import { useServices } from '../hooks/useServices';
import { useCurrentUserRef } from '../hooks/useCurrentUserRef';
import './M10Canvas.css';

const SalonComissoesDashboard = () => {
  const { role, professionalId, loading: userLoading } = useCurrentUserRef();
  const isAdmin = role === 'admin' || role === 'manager';

  const {
    commissions,
    professionalsStats,
    simulationData,
    pendingApprovals,
    executeSmartClosing,
    requestPayment,
    liquidateDirectly,
    batches,
    loading: commissionsLoading
  } = useCommissions(undefined, isAdmin ? undefined : (professionalId || undefined));

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
  const [liquidatedLoteIds, setLiquidatedLoteIds] = useState<string[]>([]);
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
      if (!stats[c.professionalId]) {
        stats[c.professionalId] = { id: c.professionalId, name: c.professionalName, totalEarned: 0 };
      }
      stats[c.professionalId].totalEarned += (c.serviceValue || 0);
    });
    return Object.values(stats).sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 4);
  }, [commissions]);


  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);

  // Grouped Lotes for Table
  const [expandedQuinzenaId, setExpandedQuinzenaId] = useState<string | null>(null);

  const groupedLotes = useMemo(() => {
    // Agora filtramos apenas o que é PENDENTE (não solicitado e não pago)
    let baseCommissions = (commissions || []).filter(c => c.status === 'pending');
    if (loteProFilter !== 'all') {
      baseCommissions = baseCommissions.filter(c => c.professionalId === loteProFilter);
    }

    const groups: Record<string, any> = {};
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    baseCommissions.forEach(c => {
      if (!c.date) return;
      const dateObj = new Date(c.date + 'T12:00:00');
      if (isNaN(dateObj.getTime())) return;

      const day = dateObj.getDate();
      const month = dateObj.getMonth();
      const year = dateObj.getFullYear();

      let groupKey = '';
      let periodLabel = '';
      let dateStr = c.date;
      const initials = (c.professionalName || (c as any).professional || 'PR')
        .split(' ')
        .filter(n => n.length > 0)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 3);
      const dd = String(day).padStart(2, '0');
      const mm = String(month + 1).padStart(2, '0');
      const yy = String(year).substring(2);
      const pType = lotePeriodFilter === 'Diário' ? 'D' : (lotePeriodFilter === 'Quinzenal' ? 'Q' : 'M');
      const loteCode = `SAB-${initials}-${dd}${mm}${yy}-${pType}`;
      const proName = (c.professionalName || (c as any).professional || '').substring(0, 3).toUpperCase();
      const q = day <= 15 ? 'Q1' : 'Q2';

      if (lotePeriodFilter === 'Diário') {
        groupKey = `${c.professionalId}-${dateStr}`;
        periodLabel = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
      } else if (lotePeriodFilter === 'Quinzenal') {
        groupKey = `${c.professionalId}-${year}-${month}-${q}`;
        periodLabel = `${q} ${String(month + 1).padStart(2, '0')}/${year}`;
      } else {
        groupKey = `${c.professionalId}-${year}-${month}`;
        periodLabel = `${String(month + 1).padStart(2, '0')}/${year}`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          loteCode,
          professionalId: c.professionalId,
          professionalName: c.professionalName || (c as any).professional || '',
          professionalRole: c.systemRole || 'profissional',
          periodLabel,
          grossValue: 0,
          netValue: 0,
          adjustments: 0,
          commissions: [],
          daysMap: {},
          quinzenasMap: {}
        };
      }

      const g = groups[groupKey];
      g.grossValue += (c.serviceValue || 0);
      g.netValue += (c.commissionValue || 0);
      g.commissions.push(c);

      if (lotePeriodFilter === 'Quinzenal') {
        if (!g.daysMap[dateStr]) {
          g.daysMap[dateStr] = {
            id: `${groupKey}-${dateStr}`,
            date: dateStr,
            label: `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
            grossValue: 0,
            netValue: 0,
            commissions: []
          };
        }
        const d = g.daysMap[dateStr];
        d.grossValue += (c.serviceValue || 0);
        d.netValue += (c.commissionValue || 0);
        d.commissions.push(c);
      } else if (lotePeriodFilter === 'Mensal') {
        if (!g.quinzenasMap[q]) {
          g.quinzenasMap[q] = {
            id: `${groupKey}-${q}`,
            label: `${q} ${monthNames[month]}`,
            grossValue: 0,
            netValue: 0,
            daysMap: {},
            commissions: []
          };
        }
        const qz = g.quinzenasMap[q];
        qz.grossValue += (c.serviceValue || 0);
        qz.netValue += (c.commissionValue || 0);
        qz.commissions.push(c);

        if (!qz.daysMap[dateStr]) {
          qz.daysMap[dateStr] = {
            id: `${qz.id}-${dateStr}`,
            date: dateStr,
            label: `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
            grossValue: 0,
            netValue: 0,
            commissions: []
          };
        }
        const d = qz.daysMap[dateStr];
        d.grossValue += (c.serviceValue || 0);
        d.netValue += (c.commissionValue || 0);
        d.commissions.push(c);
      }
    });

    const result = Object.values(groups).map((g: any) => {
      if (g.daysMap && Object.keys(g.daysMap).length > 0) {
        g.days = Object.values(g.daysMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
      }
      if (g.quinzenasMap && Object.keys(g.quinzenasMap).length > 0) {
        g.quinzenas = Object.values(g.quinzenasMap).sort((a: any, b: any) => a.id.localeCompare(b.id));
        g.quinzenas.forEach((qz: any) => {
          qz.days = Object.values(qz.daysMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
        });
      }
      return g;
    });

    result.sort((a, b) => b.id.localeCompare(a.id));

    // Optimistic removal: exclude lotes that were just liquidated and waiting for real-time sync
    if (liquidatedLoteIds.length > 0) {
      return result.filter(g => !liquidatedLoteIds.includes(g.id));
    }
    return result;
  }, [commissions, lotePeriodFilter, loteProFilter, liquidatedLoteIds]);

  const groupedHistory = useMemo(() => {
    // Pegar todos os lotes que estão pagos ou pendentes
    const validBatches = (batches || []).filter((b: any) => b.status === 'paid' || b.status === 'pending_collaborator');

    // Filtrar pelo período selecionado
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
      const proRole = batch.data?.professionalRole || (commissions || []).find(c => c.professionalId === proId)?.systemRole || '';
      const loteCode = batch.data?.loteCode || `SAB-${(proName).split(' ').filter((n: string) => n.length > 0).map((n: string) => n[0]).join('').toUpperCase().substring(0, 3)}-OLD`;
      const periodLabel = batch.period || batch.data?.periodLabel || 'Período Desconhecido';

      // Inicializa o grupo com os dados consolidados do próprio lote salvos no banco como fallback de segurança
      groups[groupKey] = {
        id: groupKey,
        loteCode: loteCode,
        label: periodLabel,
        proName: proName,
        proRole: proRole,
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
                label: `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
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
                label: `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
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
    })).sort((a, b) => b.id.localeCompare(a.id));
  }, [commissions, batches, historyPeriodFilter, historyProId, historyDate, monthNames, selectedDay, selectedMonth, selectedYear]);


  const checkedTotals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let adjustments = 0;
    checkedBatchIds.forEach(id => {
      const lote = groupedLotes.find(l => l.id === id);
      if (lote) {
        gross += lote.grossValue;
        net += lote.netValue;
        adjustments += (lote.adjustments || 0);
      }
    });
    return { gross, net, adjustments };
  }, [checkedBatchIds, groupedLotes]);

  // Selected Totals
  const checkedTotal = useMemo(() => {
    return groupedLotes
      .filter((sim: any) => checkedBatchIds.includes(sim.id))
      .reduce((sum: any, sim: any) => sum + sim.netValue, 0);
  }, [groupedLotes, checkedBatchIds]);

  const checkedServicesCount = useMemo(() => {
    let count = 0;
    groupedLotes.forEach((sim: any) => {
      if (checkedBatchIds.includes(sim.id)) {
        count += sim.commissions.length;
      }
    });
    return count;
  }, [groupedLotes, checkedBatchIds]);

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
      if (el) {
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
      const filterEl = lotesPanel?.querySelector('.bg-amber-700\\/5') as HTMLElement;
      if (headerEl && filterEl) {
        theadYAligned = tablesTop + headerEl.offsetHeight + filterEl.offsetHeight;
      }
    } catch (e) { }

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
    if (!wrapperRef.current || loading) return;

    let zCounter = 50;

    const activate = (id: string) => {
      const el = wrapperRef.current?.querySelector('#' + id) as HTMLElement;
      if (el) {
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
      if (!panel) return;

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
      if (!panel) return;

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
    if (processing) return;
    setProcessing(true);
    // Fecha o modal imediatamente para não travar a UI
    setIsModalOpen(false);

    // Immediately capture the lote(s) to process and clear UI selection
    let lotesToProcess: any[] = [];
    if (selectedLote) {
      lotesToProcess = [selectedLote];
      setCheckedBatchIds(prev => prev.filter(id => id !== selectedLote.id));
    } else {
      lotesToProcess = checkedBatchIds
        .map(id => groupedLotes.find(x => x.id === id))
        .filter(Boolean);
      setCheckedBatchIds([]);
    }

    // Optimistically hide these lotes from the table immediately
    const idsToHide = lotesToProcess.map((l: any) => l.id);
    setLiquidatedLoteIds(prev => [...prev, ...idsToHide]);

    try {
      let anySuccess = false;
      for (const lote of lotesToProcess) {
        const commIds = lote.commissions.map((c: any) => c.id);
        const s = await requestPayment(
          lote.professionalId,
          lote.netValue,
          commIds,
          lote.periodLabel,
          lote.loteCode,
          lotePeriodFilter
        );
        if (s) anySuccess = true;
      }
      
      setToast({
        message: anySuccess 
          ? (lotesToProcess.length === 1 ? 'Solicitação enviada! Notifique o colaborador.' : 'Solicitações enviadas com sucesso!')
          : 'Erro ao enviar solicitações.',
        type: anySuccess ? 'success' : 'error'
      });

      if (!anySuccess) {
        setLiquidatedLoteIds(prev => prev.filter(id => !idsToHide.includes(id)));
      }
    } catch (e) {
      setToast({ message: 'Erro ao processar fechamento.', type: 'error' });
      setLiquidatedLoteIds(prev => prev.filter(id => !idsToHide.includes(id)));
    } finally {
      setProcessing(false);
    }
  };

  const handleDirectLiquidation = async (lote: any) => {
    if (processing) return; // Prevent double-clicks
    setProcessing(true);

    // Immediately capture the lote(s) to process and clear UI selection
    let lotesToProcess: any[] = [];
    if (lote) {
      lotesToProcess = [lote];
      setCheckedBatchIds(prev => prev.filter(id => id !== lote.id));
    } else {
      // Capture current checked lotes before clearing
      lotesToProcess = checkedBatchIds
        .map(id => groupedLotes.find(x => x.id === id))
        .filter(Boolean);
      setCheckedBatchIds([]);
    }

    // Optimistically hide these lotes from the table immediately
    const idsToHide = lotesToProcess.map((l: any) => l.id);
    setLiquidatedLoteIds(prev => [...prev, ...idsToHide]);

    try {
      let anySuccess = false;
      for (const l of lotesToProcess) {
        const commIds = l.commissions.map((c: any) => c.id);
        const s = await liquidateDirectly(
          l.professionalId,
          l.netValue,
          commIds,
          l.periodLabel,
          l.loteCode,
          lotePeriodFilter
        );
        if (s) anySuccess = true;
      }
      setToast({
        message: anySuccess
          ? (lotesToProcess.length === 1 ? 'Liquidação direta realizada e enviada para o Histórico!' : 'Liquidação direta coletiva realizada com sucesso!')
          : 'Erro ao processar liquidação.',
        type: anySuccess ? 'success' : 'error'
      });
      if (!anySuccess) {
        // Rollback optimistic hide if nothing succeeded
        setLiquidatedLoteIds(prev => prev.filter(id => !idsToHide.includes(id)));
      }
    } catch (e) {
      setToast({ message: 'Erro ao processar fechamento direto.', type: 'error' });
      // Rollback optimistic hide
      setLiquidatedLoteIds(prev => prev.filter(id => !idsToHide.includes(id)));
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
          <div className="panel-header" style={{ borderBottom: 'none', justifyContent: 'flex-start' }}>
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
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(d => (
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
            <div className="panel-title"><span className="dot"></span>Faturamento Total — Salão</div>
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
            <div className="kpi-label" style={{ color: "rgba(255,20,147,.7)" }}>Total a Liquidar</div>
            <div className="kpi-val pink-val">
              <strong>{formatBRLSplit(totalCommissions)[0]}</strong>
              <span className="cents" style={{ opacity: .5 }}>,{formatBRLSplit(totalCommissions)[1]}</span>
            </div>
            <div className="kpi-sub">Saldo acumulado pendente</div>
          </div>
          <div className="resize-handle"></div>
        </div>

        {/* PANEL: NET VALUE */}
        <div className="panel" id="p-liquid">
          <div className="panel-header">
            <div className="panel-title"><span className="dot" style={{ background: "var(--cyan)" }}></span>Valor Líquido do Salão</div>
            <div className="panel-controls">
              <button className="ctrl-btn ctrl-min">—</button>
            </div>
          </div>
          <div className="panel-body">
            <div className="flex justify-between items-start gap-3">
              <div style={{ flex: 1 }}>
                <div className="kpi-label" style={{ color: "rgba(0,255,245,.7)" }}>Receita Retida pelo Salão</div>
                <div className="kpi-val cyan-val" style={{ fontSize: "28px" }}>
                  <strong>{formatBRLSplit(netValue)[0]}</strong>
                  <span className="cents" style={{ opacity: .5 }}>,{formatBRLSplit(netValue)[1]}</span>
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
                <div className="h-full bg-emerald-500" style={{ width: marginPct + '%' }}></div>
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
                <div className="rank-row" key={pro.id} style={{ opacity: 1 - (idx * 0.15) }}>
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
              <div className="ml-auto text-amber-700 font-bold text-[10px] uppercase tracking-widest">{groupedLotes.length} Lotes</div>
            </div>

            <div className="flex-1 overflow-auto bg-black/20">
              <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="px-3 py-2 border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0 w-8"></th>
                    <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-[#5a5a78] border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0">Lote</th>
                    <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-[#5a5a78] border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0">Data</th>
                    <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-[#5a5a78] border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0">Colaborador</th>
                    <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-[#5a5a78] border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0">Valor Bruto R$</th>
                    <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-[#5a5a78] border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0">Vale R$</th>
                    <th className="px-3 py-2 text-center text-[9px] uppercase tracking-widest text-amber-700 border-b border-amber-700/20 bg-[#1f2937]/90 sticky top-0">Valor Líquido R$</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedLotes.map((lote: any) => (
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
                              {lote.loteCode}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted text-center italic">{lote.periodLabel}</td>
                        <td className={`px-3 py-3 font-bold text-center ${focusedBatchId === lote.id ? 'text-amber-700' : 'text-amber-600/80'}`}>
                          {lote.professionalName} <span className="text-[9px] uppercase tracking-widest opacity-60">
                            ({(() => {
                              const r = (lote.professionalRole || '').toLowerCase();
                              if (r === 'manager' || r === 'gerente') return 'Gerente';
                              if (r === 'admin') return 'Admin';
                              if (r === 'recepcao' || r === 'reception') return 'Recepção';
                              return 'Profissional';
                            })()})
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-muted">{formatBRL(lote.grossValue)}</td>
                        <td className="px-3 py-3 text-center text-red-500">{lote.adjustments !== 0 ? `- ${formatBRL(Math.abs(lote.adjustments))}` : '—'}</td>
                        <td className={`px-3 py-3 text-center font-bold ${focusedBatchId === lote.id ? 'text-amber-700' : 'text-white'}`}>{formatBRL(lote.netValue)}</td>
                      </tr>

                      {/* LEVEL 1: Sub-table for Group */}
                      {expandedBatchId === lote.id && (
                        <tr className="bg-[#1f2937]/60 border-b border-amber-700/10">
                          <td colSpan={7} className="p-0">
                            <div className="py-4 px-12 bg-gradient-to-b from-amber-700/[0.02] to-transparent">

                              {lotePeriodFilter === 'Diário' ? (
                                // DIARIO: Show Commissions directly
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
                                      {lote.commissions.map((comm: any, idx: number) => (
                                        <tr key={comm.id || idx} className="hover:bg-white/[0.03] transition-colors text-center">
                                          <td className="px-4 py-2.5 text-slate-400 text-left">
                                            {comm.scheduledDate ? (
                                              <div className="flex flex-col gap-1 items-center">
                                                <div className="whitespace-nowrap"><span className="text-[#5a5a78] text-[9px] uppercase tracking-wider">Marcado:</span> <span className="text-white/80">{new Date(comm.scheduledDate).toLocaleDateString('pt-BR')} às {comm.startTime}</span></div>
                                                {comm.servicoIniciadoAt && comm.servicoTerminadoAt && (
                                                  <div className="whitespace-nowrap"><span className="text-[#5a5a78] text-[9px] uppercase tracking-wider">Realizado:</span> <span className="text-emerald-400/80">{new Date(comm.servicoIniciadoAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(comm.servicoTerminadoAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
                                                )}
                                              </div>
                                            ) : (
                                              new Date(comm.date).toLocaleDateString('pt-BR')
                                            )}
                                          </td>
                                          <td className="px-4 py-2.5 text-white font-semibold">{comm.service}</td>
                                          <td className="px-4 py-2.5 text-slate-400 italic font-medium">{comm.client}</td>
                                          <td className="px-4 py-2.5 text-slate-400">{formatBRL(comm.serviceValue)}</td>
                                          <td className="px-4 py-2.5 text-amber-700 font-bold tracking-tighter">{formatBRL(comm.commissionValue)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : lotePeriodFilter === 'Quinzenal' ? (
                                // QUINZENAL: Show Days
                                <div className="flex flex-col gap-2">
                                  {lote.days?.map((dayObj: any) => (
                                    <div key={dayObj.id} className="border border-white/5 bg-black/40 rounded-sm overflow-hidden">
                                      <div
                                        className="flex items-center justify-between p-2 cursor-pointer hover:bg-white/5 transition-colors"
                                        onClick={() => setExpandedDayId(expandedDayId === dayObj.id ? null : dayObj.id)}
                                      >
                                        <div className="flex items-center gap-3">
                                          <button className={`w-4 h-4 flex items-center justify-center rounded-sm border transition-all duration-300 ${expandedDayId === dayObj.id ? 'bg-amber-700/20 border-amber-700 text-amber-700' : 'bg-black/60 border-white/10 text-slate-500'}`}>
                                            <svg className={`w-2 h-2 transition-transform duration-300 ${expandedDayId === dayObj.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                            </svg>
                                          </button>
                                          <span className="text-[11px] font-bold text-white">{dayObj.label}</span>
                                          <span className="text-[9px] text-muted">({dayObj.commissions.length} serviços)</span>
                                        </div>
                                        <div className="flex items-center gap-6 text-[10px]">
                                          <div className="flex gap-2"><span className="text-muted">Bruto:</span> <span className="text-white">{formatBRL(dayObj.grossValue)}</span></div>
                                          <div className="flex gap-2"><span className="text-amber-700/70">Líquido:</span> <span className="text-amber-700 font-bold">{formatBRL(dayObj.netValue)}</span></div>
                                        </div>
                                      </div>

                                      {/* LEVEL 2: Show Commissions for that specific day */}
                                      {expandedDayId === dayObj.id && (
                                        <div className="border-t border-white/5 bg-black/20 p-2">
                                          <table className="w-full text-[12px]">
                                            <thead>
                                              <tr className="text-left text-[#5a5a78] uppercase tracking-wider">
                                                <th className="pb-2 pl-6">Serviço</th>
                                                <th className="pb-2">Cliente</th>
                                                <th className="pb-2 text-right">Bruto</th>
                                                <th className="pb-2 text-right text-amber-700">Comissão</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {dayObj.commissions.map((comm: any, idx: number) => (
                                                <tr key={comm.id || idx} className="hover:bg-white/[0.03]">
                                                  <td className="py-1.5 pl-6 text-white font-medium">{comm.service}</td>
                                                  <td className="py-1.5 text-slate-400 italic">{comm.client}</td>
                                                  <td className="py-1.5 text-slate-400 text-right">{formatBRL(comm.serviceValue)}</td>
                                                  <td className="py-1.5 text-amber-700 font-bold text-right">{formatBRL(comm.commissionValue)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                // MENSAL: Show Quinzenas -> Days -> Commissions
                                <div className="flex flex-col gap-2">
                                  {lote.quinzenas?.map((qzObj: any) => (
                                    <div key={qzObj.id} className="border border-white/10 bg-[#111827] rounded-md overflow-hidden">
                                      <div
                                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors border-b border-transparent"
                                        onClick={() => setExpandedQuinzenaId(expandedQuinzenaId === qzObj.id ? null : qzObj.id)}
                                      >
                                        <div className="flex items-center gap-3">
                                          <button className={`w-5 h-5 flex items-center justify-center rounded-sm border transition-all duration-300 ${expandedQuinzenaId === qzObj.id ? 'bg-amber-700/20 border-amber-700 text-amber-700' : 'bg-black/60 border-white/10 text-slate-500'}`}>
                                            <svg className={`w-3 h-3 transition-transform duration-300 ${expandedQuinzenaId === qzObj.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                            </svg>
                                          </button>
                                          <span className="text-[12px] font-bold text-white uppercase tracking-wider">{qzObj.label}</span>
                                          <span className="text-[9px] text-muted">({qzObj.commissions.length} serviços)</span>
                                        </div>
                                        <div className="flex items-center gap-6 text-[11px]">
                                          <div className="flex gap-2"><span className="text-muted">Bruto:</span> <span className="text-white">{formatBRL(qzObj.grossValue)}</span></div>
                                          <div className="flex gap-2"><span className="text-amber-700/70">Líquido:</span> <span className="text-amber-700 font-bold">{formatBRL(qzObj.netValue)}</span></div>
                                        </div>
                                      </div>

                                      {/* LEVEL 2: Show Days for that Quinzena */}
                                      {expandedQuinzenaId === qzObj.id && (
                                        <div className="border-t border-white/5 bg-black/40 p-2 flex flex-col gap-1">
                                          {qzObj.days?.map((dayObj: any) => (
                                            <div key={dayObj.id} className="border border-white/5 bg-black/40 rounded-sm overflow-hidden">
                                              <div
                                                className="flex items-center justify-between p-2 cursor-pointer hover:bg-white/5 transition-colors"
                                                onClick={() => setExpandedDayId(expandedDayId === dayObj.id ? null : dayObj.id)}
                                              >
                                                <div className="flex items-center gap-3">
                                                  <button className={`w-4 h-4 flex items-center justify-center rounded-sm border transition-all duration-300 ${expandedDayId === dayObj.id ? 'bg-amber-700/20 border-amber-700 text-amber-700' : 'bg-black/60 border-white/10 text-slate-500'}`}>
                                                    <svg className={`w-2 h-2 transition-transform duration-300 ${expandedDayId === dayObj.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                  </button>
                                                  <span className="text-[11px] font-bold text-white">{dayObj.label}</span>
                                                  <span className="text-[9px] text-muted">({dayObj.commissions.length} serviços)</span>
                                                </div>
                                                <div className="flex items-center gap-6 text-[10px]">
                                                  <div className="flex gap-2"><span className="text-muted">Bruto:</span> <span className="text-white">{formatBRL(dayObj.grossValue)}</span></div>
                                                  <div className="flex gap-2"><span className="text-amber-700/70">Líquido:</span> <span className="text-amber-700 font-bold">{formatBRL(dayObj.netValue)}</span></div>
                                                </div>
                                              </div>

                                              {/* LEVEL 3: Show Commissions for that specific day */}
                                              {expandedDayId === dayObj.id && (
                                                <div className="border-t border-white/5 bg-black/20 p-2">
                                                  <table className="w-full text-[12px]">
                                                    <thead>
                                                      <tr className="text-left text-[#5a5a78] uppercase tracking-wider">
                                                        <th className="pb-2 pl-6">Serviço</th>
                                                        <th className="pb-2">Cliente</th>
                                                        <th className="pb-2 text-right">Bruto</th>
                                                        <th className="pb-2 text-right text-amber-700">Comissão</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {dayObj.commissions.map((comm: any, idx: number) => (
                                                        <tr key={comm.id || idx} className="hover:bg-white/[0.03]">
                                                          <td className="py-1.5 pl-6 text-white font-medium">{comm.service}</td>
                                                          <td className="py-1.5 text-slate-400 italic">{comm.client}</td>
                                                          <td className="py-1.5 text-slate-400 text-right">{formatBRL(comm.serviceValue)}</td>
                                                          <td className="py-1.5 text-amber-700 font-bold text-right">{formatBRL(comm.commissionValue)}</td>
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
                                </div>
                              )}

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
        <div className="panel" id="p-table" style={{ overflow: 'visible' }}>
          <div className="panel-header" style={{ flexWrap: 'nowrap', gap: '15px', height: '48px', minHeight: '48px', maxHeight: '48px', padding: '0 15px', alignItems: 'center', display: 'flex' }}>
            <div className="panel-title" style={{ margin: 0 }}><span className="dot"></span>Histórico de Comissões Pagas</div>

            <div className="flex items-center gap-1 ml-4 bg-black/20 p-0.5 rounded-sm">
              {['Diário', 'Quinzenal', 'Mensal'].map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setHistoryPeriodFilter(p);
                    setExpandedHistMonthId(null);
                    setExpandedHistQuinzenaId(null);
                    setExpandedHistDayId(null);
                  }}
                  className={`px-3 py-1 rounded-sm text-[8px] font-black uppercase tracking-widest transition-all ${historyPeriodFilter === p ? 'bg-amber-700 text-black shadow-[0_0_10px_rgba(180,83,9,0.3)]' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 ml-auto">
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
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted uppercase">Data:</span>
                <input
                  type="date"
                  className="bg-black/40 border border-white/10 text-[10px] text-white outline-none rounded-sm px-2 py-1 [color-scheme:dark]"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                />
                {(historyProId !== 'all' || historyDate !== '') && (
                  <button
                    className="text-[9px] text-amber-700 uppercase font-bold hover:brightness-125 ml-2"
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
          <div className="panel-body p-0 overflow-auto custom-scrollbar">
            <div className="tbl-wrap">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-center">Lote</th>
                    <th className="text-center">Colaborador</th>
                    <th className="text-center">Data / Horário</th>
                    <th className="text-center">Volume Bruto</th>
                    <th className="text-center text-amber-700">Comissão Paga</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {groupedHistory.length > 0 ? groupedHistory.map((group) => (
                    <React.Fragment key={group.id}>
                      <tr className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${expandedHistMonthId === group.id ? 'bg-amber-700/5' : ''}`}
                        onClick={() => setExpandedHistMonthId(expandedHistMonthId === group.id ? null : group.id)}
                      >
                        <td className="py-4">
                          <div className="flex items-center justify-center gap-3">
                            <div className={`w-6 h-6 flex items-center justify-center rounded border transition-all ${expandedHistMonthId === group.id ? 'bg-amber-700 border-amber-700 text-black' : 'bg-black/40 border-white/10 text-white/40'}`}>
                              <svg className={`w-3 h-3 transition-transform duration-300 ${expandedHistMonthId === group.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                            <span className="text-[11px] font-black text-amber-600/80 tracking-tighter uppercase">{group.loteCode}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-col items-center text-center">
                            <span className="text-[12px] font-black text-white uppercase tracking-wider">
                                {group.proName}
                                <span className="text-[9px] uppercase tracking-widest opacity-60 ml-1">
                                    ({(() => {
                                        const role = group.proRole || group.commissions?.[0]?.systemRole || '';
                                        const r = role.toLowerCase();
                                        if (r === 'manager' || r === 'gerente') return 'Gerente';
                                        if (r === 'admin') return 'Admin';
                                        if (r === 'recepcao' || r === 'reception') return 'Recepção';
                                        return 'Profissional';
                                    })()})
                                </span>
                            </span>
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
                                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{qz.label}</span>
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
                                                    <th className="py-2 pl-2 text-center">Serviço</th>
                                                    <th className="py-2 text-center">Cliente</th>
                                                    <th className="py-2 text-center">Horário</th>
                                                    <th className="py-2 text-center">Bruto</th>
                                                    <th className="py-2 text-center text-amber-700">Comissão</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {day.commissions.map((comm: any, cidx: number) => (
                                                    <tr key={comm.id || cidx} className="border-b border-white/[0.02] last:border-0">
                                                      <td className="py-2 pl-2 font-bold text-white/70 text-center">{comm.service}</td>
                                                      <td className="py-2 text-white/40 italic text-center">{comm.client}</td>
                                                      <td className="py-2 text-center text-white/30">{comm.startTime || '--:--'} - {comm.endTime || '--:--'}</td>
                                                      <td className="py-2 text-center text-white/30">{formatBRL(comm.serviceValue)}</td>
                                                      <td className="py-2 text-center font-black text-amber-700">{formatBRL(comm.commissionValue)}</td>
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
                                        <th className="py-2 pl-2 text-center">Serviço</th>
                                        <th className="py-2 text-center">Cliente</th>
                                        <th className="py-2 text-center">Horário</th>
                                        <th className="py-2 text-center">Bruto</th>
                                        <th className="py-2 text-center text-amber-700">Comissão</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.commissions.map((comm: any, cidx: number) => (
                                        <tr key={comm.id || cidx} className="border-b border-white/[0.02] last:border-0">
                                          <td className="py-2 pl-2 font-bold text-white/70 text-center">{comm.service}</td>
                                          <td className="py-2 text-white/40 italic text-center">{comm.client}</td>
                                          <td className="py-2 text-center text-white/30">{comm.startTime || '--:--'} - {comm.endTime || '--:--'}</td>
                                          <td className="py-2 text-center text-white/30">{formatBRL(comm.serviceValue)}</td>
                                          <td className="py-2 text-center font-black text-amber-700">{formatBRL(comm.commissionValue)}</td>
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
                                                <th className="py-2 pl-2 text-center">Serviço</th>
                                                <th className="py-2 text-center">Cliente</th>
                                                <th className="py-2 text-center">Horário</th>
                                                <th className="py-2 text-center">Bruto</th>
                                                <th className="py-2 text-center text-amber-700">Comissão</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {day.commissions.map((comm: any, cidx: number) => (
                                                <tr key={comm.id || cidx} className="border-b border-white/[0.02] last:border-0">
                                                  <td className="py-2 pl-2 font-bold text-white/70 text-center">{comm.service}</td>
                                                  <td className="py-2 text-white/40 italic text-center">{comm.client}</td>
                                                  <td className="py-2 text-center text-white/30">{comm.startTime || '--:--'} - {comm.endTime || '--:--'}</td>
                                                  <td className="py-2 text-center text-white/30">{formatBRL(comm.serviceValue)}</td>
                                                  <td className="py-2 text-center font-black text-amber-700">{formatBRL(comm.commissionValue)}</td>
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
                    <tr><td colSpan={5} className="text-center py-20 text-slate-500 uppercase text-[10px] tracking-widest font-bold opacity-30">Nenhum dado disponível.</td></tr>
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
                  const lote = groupedLotes.find((s: any) => s.id === selectedId);
                  if (!lote) return null;

                  return (
                    <div className="batch-card ready">
                      <span className="bc-status ok">✓ SELECIONADO PARA PAGAMENTO</span>
                      <div className="bc-name text-white font-bold text-xl mt-2">{lote.professionalName}</div>
                      <div className="bc-period text-muted text-[10px]">{lote.periodLabel} - 1 lote selecionado</div>
                      <div className="bc-amount text-amber-700 text-4xl font-light mt-4">
                        {formatBRL(lote.netValue)}
                      </div>
                      <div className="bc-footer border-t border-white/5 mt-6 pt-4">
                        <div className="bc-note text-[10px] text-muted mb-4">Saldo líquido de comissões confirmadas</div>
                        <button
                          className={`pay-btn font-bold uppercase py-3 tracking-widest text-[10px] transition-all duration-300 border-transparent ${processing ? 'bg-amber-700/50 text-black/50 cursor-wait' : 'bg-amber-700 text-black shadow-[0_0_20px_rgba(255,20,147,0.4)] hover:scale-105'}`}
                          disabled={processing}
                          onClick={() => {
                            const proStat = professionalsStats.find(p => p.id === lote.professionalId);
                            const isGerente = proStat?.systemRole?.toLowerCase() === 'gerente' || proStat?.systemRole?.toLowerCase() === 'admin' || proStat?.systemRole?.toLowerCase() === 'manager';

                            if (isGerente) {
                              handleDirectLiquidation(lote);
                            } else {
                              setSelectedLote(lote);
                              setIsModalOpen(true);
                            }
                          }}
                        >
                          {processing ? 'PROCESSANDO...' : '⚡ Liquidar Agora'}
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
                      className={`pay-btn font-bold uppercase py-3 tracking-widest text-[10px] transition-all duration-300 ${checkedBatchIds.length > 0 && !processing ? 'bg-amber-700 text-black shadow-[0_0_20px_rgba(255,20,147,0.4)] border-transparent hover:scale-105' : 'bg-transparent text-muted border-white/10 opacity-50 cursor-not-allowed'}`}
                      onClick={() => {
                        if (checkedBatchIds.length > 0 && !processing) {
                          const allGerentes = checkedBatchIds.every(id => {
                            const lote = groupedLotes.find((l: any) => l.id === id);
                            const proStat = lote ? professionalsStats.find(p => p.id === lote.professionalId) : null;
                            return proStat?.systemRole?.toLowerCase() === 'gerente' || proStat?.systemRole?.toLowerCase() === 'admin' || proStat?.systemRole?.toLowerCase() === 'manager';
                          });

                          if (allGerentes) {
                            handleDirectLiquidation(null);
                          } else {
                            setSelectedLote(null);
                            setIsModalOpen(true);
                          }
                        }
                      }}
                      disabled={checkedBatchIds.length === 0 || processing}
                    >
                      {processing ? 'PROCESSANDO...' : (checkedBatchIds.length > 1 ? '⚡ Fechamento Inteligente' : '⚡ Aguardando Seleção')}
                    </button>
                  </div>
                </div>
              )}
              {pendingApprovals.length > 0 && (
                <div className="mt-4 p-3 bg-white/5 border border-white/5">
                  <div className="text-[9px] uppercase font-bold text-muted mb-2 tracking-widest">Ajustes / Vales Pendentes</div>
                  {pendingApprovals.slice(0, 3).map(pa => (
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
                  <span className="text-[12px] text-amber-700 font-bold">{selectedLote ? selectedLote.professional : 'Todos'}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] text-muted uppercase tracking-wider">Período</span>
                  <span className="text-[12px] text-white">Lotes Selecionados</span>
                </div>
                <div className="flex justify-between mb-2 border-t border-white/5 pt-2 mt-2">
                  <span className="text-[10px] text-muted uppercase tracking-wider">Bruto Calculado</span>
                  <span className="text-[12px] text-white">{formatBRL(selectedLote ? selectedLote.grossValue : checkedTotals.gross)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] text-muted uppercase tracking-wider">Ajustes / Vales</span>
                  <span className="text-[12px] text-red-500">{formatBRL(selectedLote ? Math.abs(selectedLote.adjustments) : Math.abs(checkedTotals.adjustments))}</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-amber-700/20 pt-4 mt-4">
                  <span className="text-[10px] text-muted uppercase tracking-wider">Total a Solicitar</span>
                  <span className="text-[24px] text-amber-700 font-light">{formatBRL(selectedLote ? selectedLote.netValue : checkedTotals.net)}</span>
                </div>
              </div>

              <div className="mb-6 bg-amber-700/5 p-3 border border-amber-700/10 rounded-sm">
                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest mb-1">Fluxo de Confirmação:</p>
                <ul className="text-[9px] text-white/40 space-y-1">
                  <li>1. Você solicita o pagamento aqui.</li>
                  <li>2. O colaborador recebe uma notificação no app e no WhatsApp.</li>
                  <li>3. Após ele confirmar o recebimento, o valor entra no Histórico.</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button className="pb" style={{ flex: 1, border: '1px solid var(--muted)' }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button
                  className="confirm-pay-btn"
                  onClick={handleLiquidation}
                  disabled={processing}
                >
                  {processing ? 'PROCESSANDO...' : 'SOLICITAR CONFIRMAÇÃO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl transition-all duration-500 z-[10000] border flex items-center gap-3 animate-bounce-subtle ${toast.type === 'success'
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


