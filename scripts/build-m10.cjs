const fs = require('fs');

const htmlPath = './public/comissoes-futuro-m10.html';
const html = fs.readFileSync(htmlPath, 'utf8');

// 1. EXTRACT CSS
const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
let css = cssMatch ? cssMatch[1] : '';
css = `.m10-wrapper { width: 100%; height: 100%; position: relative; overflow: hidden; background: var(--bg); font-family: 'Inter', sans-serif; color: var(--white); user-select: none; }
.m10-wrapper * { box-sizing: border-box; }
.m10-wrapper {
  background-image:
    radial-gradient(circle at 0% 0%, rgba(255,20,147,.08) 0%, transparent 40%),
    radial-gradient(circle at 100% 100%, rgba(0,255,245,.05) 0%, transparent 40%),
    linear-gradient(rgba(255,20,147,.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,20,147,.025) 1px, transparent 1px);
  background-size: auto, auto, 32px 32px, 32px 32px;
}
.m10-wrapper::after {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.04) 2px, rgba(0,0,0,.04) 4px);
  pointer-events: none; z-index: 0;
}
` + css;

css = css.replace(/body/g, '.m10-wrapper');
css = css.replace(/100vh/g, '100%');
css = css.replace(/position:\s*fixed/g, 'position: absolute');
fs.writeFileSync('./screens/M10Canvas.css', css);

// 2. EXTRACT BODY
const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
let bodyContent = bodyMatch ? bodyMatch[1] : '';

bodyContent = bodyContent.replace(/<script>[\s\S]*?<\/script>/g, '');
bodyContent = bodyContent.replace(/<!--[\s\S]*?-->/g, ''); 

const convertStyles = (html) => {
    return html.replace(/style="([^"]*)"/g, (match, p1) => {
        let pairs = p1.split(';').filter(x => x.trim());
        let stObj = pairs.map(p => {
            let [k, v] = p.split(':');
            if(!v) return '';
            k = k.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            v = v.trim().replace(/'/g, '"');
            return k + ': "' + v + '"';
        }).filter(x=>x).join(', ');
        return 'style={{' + stObj + '}}';
    });
};

bodyContent = convertStyles(bodyContent);
bodyContent = bodyContent.replace(/class="/g, 'className="');
bodyContent = bodyContent.replace(/on(click|change|mousedown|mouseup|mousemove)="[^"]*"/gi, '');
bodyContent = bodyContent.replace(/<input(.*?)>/g, (m,p) => '<input'+p+'/>');

// REPLACEMENTS
bodyContent = bodyContent.replace(/<div className="kpi-val"><strong>R\$ 48\.520<\/strong><span className="cents">,00<\/span><\/div>/, 
    '<div className="kpi-val"><strong>{formatBRLSplit(grossVolume)[0]}</strong><span className="cents">,{formatBRLSplit(grossVolume)[1]}</span></div>');

bodyContent = bodyContent.replace(/<div className="kpi-val pink-val"><strong>R\$ 18\.250<\/strong><span className="cents" style={{opacity: ".5"}}>,00<\/span><\/div>/,
    '<div className="kpi-val pink-val"><strong>{formatBRLSplit(totalCommissions)[0]}</strong><span className="cents" style={{opacity: ".5"}}>,{formatBRLSplit(totalCommissions)[1]}</span></div>');

bodyContent = bodyContent.replace(/<strong id="liq-val">R\$ 30\.270<\/strong><span className="cents" style={{opacity: ".5"}}>,00<\/span>/,
    '<strong id="liq-val">{formatBRLSplit(netValue)[0]}</strong><span className="cents" style={{opacity: ".5"}}>,{formatBRLSplit(netValue)[1]}</span>');

bodyContent = bodyContent.replace(/<span style={{color: "var\(--cyan\)", fontWeight: "700"}}>62,4%<\/span>/,
    '<span style={{color: "var(--cyan)", fontWeight: "700"}}>{grossVolume > 0 ? ((netValue / grossVolume) * 100).toFixed(1) : "0"}%</span>');

bodyContent = bodyContent.replace(/<div className="rank-list">[\s\S]*?<\/div>/, `
      <div className="rank-list">
        {topProfessionals.map((pro, idx) => (
          <div className="rank-row" key={pro.id} style={{ opacity: idx === 0 ? 1 : idx === 1 ? 0.7 : idx === 2 ? 0.45 : 0.3 }}>
            <div className={"rank-num" + (idx === 0 ? " top" : "")}>{idx + 1}</div>
            <div className="rank-info">
              <div className="rank-name">{pro.name}</div>
              <div className="rank-fat">{formatBRL(pro.totalEarned)} faturados</div>
            </div>
            <div className="rank-comm" style={{color: idx === 0 ? 'var(--pink)' : 'var(--muted)'}}>{formatBRL(pro.totalEarned * 0.4)}</div>
          </div>
        ))}
      </div>
`);

bodyContent = bodyContent.replace(/<div className="chart-list">[\s\S]*?<\/div>/, `
      <div className="chart-list">
        {dynamicServiceStats.map((stat, idx) => (
          <div className="chart-row" key={idx}>
            <div className="chart-meta"><span className="chart-name">{stat.label}</span><span className="chart-pct">{Math.round(stat.value)}%</span></div>
            <div className="chart-track"><div className="chart-fill" style={{width: Math.round(stat.value) + '%'}}></div></div>
          </div>
        ))}
      </div>
`);

bodyContent = bodyContent.replace(/<tbody>[\s\S]*?<\/tbody>/, `
          <tbody>
            {commissions.length > 0 ? commissions.slice(0, 50).map((comm, idx) => (
              <tr key={comm.id || idx}>
                <td className="td-muted">{new Date(comm.date).toLocaleDateString('pt-BR')}</td>
                <td className="td-bold">{comm.clientName || 'Cliente'}</td>
                <td className="td-pink">{comm.professionalName}</td>
                <td>{comm.service}</td>
                <td style={{textAlign: "right"}}>{formatBRL(comm.serviceValue)}</td>
                <td className="td-pink" style={{textAlign: "right"}}>{formatBRL(comm.commissionValue)}</td>
                <td style={{textAlign: "center"}}>
                  <span className={comm.status === 'paid' ? 'td-muted' : 'td-pink'} style={{fontSize: "9px", fontWeight: "700", textTransform: "uppercase"}}>
                    {comm.status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} style={{textAlign: "center", padding: "40px", color: "var(--muted)"}}>Nenhum lançamento encontrado.</td>
              </tr>
            )}
          </tbody>
`);

bodyContent = bodyContent.replace(/fontFamily: ""Inter""/g, 'fontFamily: "Inter"');

const tsxPrefix = "import React, { useState, useEffect, useRef, useMemo } from 'react';\nimport { useCommissions } from '../hooks/useCommissions';\nimport { useServices } from '../hooks/useServices';\nimport { useCurrentUserRef } from '../hooks/useCurrentUserRef';\nimport './M10Canvas.css';\n\nconst SalonComissoesDashboard: React.FC = () => {\n  const { role, professionalId, loading: userLoading } = useCurrentUserRef();\n  const isAdmin = role === 'admin' || role === 'manager';\n  const {\n      commissions,\n      professionalsStats,\n      loading: commissionsLoading\n  } = useCommissions(undefined, isAdmin ? undefined : (professionalId || undefined));\n  const { services, loading: servicesLoading } = useServices();\n\n  const loading = commissionsLoading || servicesLoading || userLoading;\n\n  const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);\n  const formatBRLSplit = (v) => {\n      const parts = formatBRL(v).split(',');\n      return [parts[0], parts[1] || '00'];\n  };\n\n  const totalCommissions = useMemo(() => commissions.reduce((sum, c) => sum + c.commissionValue, 0), [commissions]);\n  const grossVolume = useMemo(() => commissions.reduce((sum, c) => sum + c.serviceValue, 0), [commissions]);\n  const netValue = grossVolume - totalCommissions;\n\n  const topProfessionals = useMemo(() => {\n     return [...professionalsStats].sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 4);\n  }, [professionalsStats]);\n\n  const dynamicServiceStats = useMemo(() => {\n    if (commissions.length === 0) return [];\n    const aggregated = commissions.reduce((acc, curr) => {\n        const title = curr.service;\n        acc[title] = (acc[title] || 0) + curr.serviceValue;\n        return acc;\n    }, {});\n    const sorted = Object.entries(aggregated).sort(([, a], [, b]) => b - a).slice(0, 6);\n    const totalValue = Object.values(aggregated).reduce((s, v) => s + v, 0) || 1;\n    return sorted.map(([title, val]) => ({\n      label: title,\n      value: (val / totalValue) * 100\n    }));\n  }, [commissions]);\n\n  const wrapperRef = useRef(null);\n\n  useEffect(() => {\n    if(!wrapperRef.current) return;\n    let zCounter = 10;\n    const activate = (id) => {\n      const el = wrapperRef.current.querySelector('#' + id);\n      if(el) { el.style.zIndex = ++zCounter; }\n    };\n    const startDrag = (e, id) => {\n      if (e.target.closest('.ctrl-btn') || e.target.closest('select')) return;\n      activate(id);\n      const panel = wrapperRef.current.querySelector('#' + id);\n      const rect = panel.getBoundingClientRect();\n      const wrapRect = wrapperRef.current.getBoundingClientRect();\n      const startX = e.clientX - (rect.left - wrapRect.left);\n      const startY = e.clientY - (rect.top - wrapRect.top);\n      const onMove = (ev) => {\n        panel.style.left = (ev.clientX - wrapRect.left - startX) + 'px';\n        panel.style.top = (ev.clientY - wrapRect.top - startY) + 'px';\n      };\n      const onUp = () => {\n        document.removeEventListener('mousemove', onMove);\n        document.removeEventListener('mouseup', onUp);\n      };\n      document.addEventListener('mousemove', onMove);\n      document.addEventListener('mouseup', onUp);\n    };\n    const startResize = (e, id) => {\n      activate(id);\n      const panel = wrapperRef.current.querySelector('#' + id);\n      const startX = e.clientX;\n      const startY = e.clientY;\n      const startW = panel.offsetWidth;\n      const startH = panel.offsetHeight;\n      const onMove = (ev) => {\n        panel.style.width = Math.max(220, startW + ev.clientX - startX) + 'px';\n        panel.style.height = Math.max(120, startH + ev.clientY - startY) + 'px';\n      };\n      const onUp = () => {\n        document.removeEventListener('mousemove', onMove);\n        document.removeEventListener('mouseup', onUp);\n      };\n      document.addEventListener('mousemove', onMove);\n      document.addEventListener('mouseup', onUp);\n    };\n    wrapperRef.current.querySelectorAll('.panel-header').forEach(h => {\n      const pId = h.closest('.panel').id;\n      h.addEventListener('mousedown', (e) => startDrag(e, pId));\n    });\n    wrapperRef.current.querySelectorAll('.resize-handle').forEach(h => {\n      const pId = h.closest('.panel').id;\n      h.addEventListener('mousedown', (e) => startResize(e, pId));\n    });\n    const resetLayout = () => {\n      const cW = wrapperRef.current.clientWidth || 1000;\n      const colW = Math.floor((cW - 260) / 3) - 14;\n      const apply = (id, l, t, w, h) => {\n        const el = wrapperRef.current.querySelector('#' + id);\n        if(el) { el.style.left = l+'px'; el.style.top = t+'px'; el.style.width = w+'px'; el.style.height = h+'px'; }\n      };\n      apply('p-fat', 20, 20, colW, 140);\n      apply('p-comm', 20+colW+10, 20, colW, 140);\n      apply('p-liquid', 20+2*(colW+10), 20, colW, 140);\n      apply('p-rank', 20, 178, colW, 290);\n      apply('p-chart', 20+colW+10, 178, colW*2, 290);\n      apply('p-table', 20, 486, cW-100, 320);\n      apply('p-batch', cW-250, 20, 230, 450);\n    };\n    resetLayout();\n  }, [loading]);\n\n  if (loading) return <div>Carregando...</div>;\n\n  return (\n    <div className=\"m10-wrapper\" ref={wrapperRef}>";

const tsxSuffix = "\n    </div>\n  );\n};\nexport default SalonComissoesDashboard;";

fs.writeFileSync('./screens/SalonComissoesDashboard.tsx', tsxPrefix + bodyContent + tsxSuffix);
console.log('Done.');
