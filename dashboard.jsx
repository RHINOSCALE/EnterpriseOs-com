// Dashboard Ejecutivo — matches the corporate mockup layout
const { useState, useEffect, useMemo, useRef } = React;

const MONTH_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTH_SHORT_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function Dashboard({ session, deptScope, kpis, setKpis, kpiWeekly, projects, addAudit, showToast, setView }) {
  const D = window.INDISA_DATA;
  const role = session.role;
  const effDept = role === "owner" ? deptScope : session.dept;
  const ctx = effDept ? D.DEPT_BY_ID[effDept].name : "INDISA";
  const _now = new Date();
  const curYear = _now.getFullYear();
  const curQuarter = Math.ceil((_now.getMonth() + 1) / 3);
  const [period, setPeriod] = useState(() => `${MONTH_ES[_now.getMonth()]} ${curYear}`);
  const [periodOpen, setPeriodOpen] = useState(false);

  function exportReport(deptScores, avgScore, totalProjects, totalTasks, kpisRed) {
    const lines = [
      "REPORTE EJECUTIVO INDISA",
      "=".repeat(50),
      `Periodo: ${period}`,
      `Generado: ${new Date().toLocaleString("es-CO")}`,
      `Por: ${session.name}`,
      "",
      "RESUMEN GLOBAL",
      "-".repeat(50),
      `Score global: ${avgScore}%`,
      `Proyectos activos: ${totalProjects}`,
      `Tareas pendientes: ${totalTasks}`,
      `KPIs en rojo: ${kpisRed}`,
      "",
      "PERFORMANCE POR DEPARTAMENTO",
      "-".repeat(50),
      "Departamento,Score,Proyectos,Tareas,KPIs Críticos,Estado",
      ...deptScores.map(d => `${d.name},${d.score}%,${d.open},${d.tasks},${d.critical},${d.score >= 85 ? "Óptimo" : d.score >= 70 ? "Regular" : "En Riesgo"}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `INDISA_Reporte_${period.replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    addAudit({ action: `Reporte ejecutivo exportado · ${period}`, user: session.name, dept: null, level: "info" });
    showToast(`Reporte ${period} descargado`);
  }

  // Compute department health scores from kpiWeekly (current quarter) with fallback to legacy kpis
  const deptScores = useMemo(() => {
    return D.DEPARTMENTS.map(d => {
      const key = `${d.id}_${curYear}_${curQuarter}`;
      const weeklyList = (kpiWeekly || {})[key] || [];
      let score, critical;
      if (weeklyList.length > 0) {
        const ratios = weeklyList.map(k => {
          const filled = k.semanas.filter(v => v !== null && v !== undefined);
          const last = filled.length ? filled[filled.length - 1] : null;
          return last !== null && k.metaSemanal > 0 ? Math.min(1, last / k.metaSemanal) : null;
        }).filter(r => r !== null);
        score = ratios.length ? Math.min(100, Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length * 100)) : 60;
        critical = weeklyList.filter(k => {
          const filled = k.semanas.filter(v => v !== null && v !== undefined);
          const last = filled.length ? filled[filled.length - 1] : null;
          return last !== null && k.metaSemanal > 0 && last / k.metaSemanal < 0.5;
        }).length;
      } else {
        const list = kpis[d.id] || [];
        score = list.length ? Math.min(100, Math.round(list.reduce((s, k) => s + Math.min(1.0, k.value / k.target), 0) / list.length * 100)) : 60;
        critical = list.filter(k => k.value / k.target < 0.5).length;
      }
      const open = (projects[d.id] || []).filter(p => p.status !== "done").length;
      const tasks = (projects[d.id] || []).length * 6 + Math.floor(d.color.charCodeAt(0) % 15);
      return { ...d, score, open, tasks, critical };
    });
  }, [kpis, kpiWeekly, projects]);

  const atRisk = deptScores.filter(d => d.score < 75);

  // Aggregate company-level numbers
  const totalProjects = Object.values(projects).flat().filter(p => p.status !== "done").length;
  const totalRisk     = Object.values(projects).flat().filter(p => p.status === "doing" && p.prio === "high").length;
  const totalTasks    = deptScores.reduce((s,d) => s + d.tasks, 0);
  const kpisRed       = deptScores.reduce((s,d) => s + d.critical, 0);
  const collaborators = (kpis.rh || []).find(k => k.id === "head")?.value || 184;

  const avgScore = Math.min(100, Math.round(deptScores.reduce((s,d) => s + d.score, 0) / deptScores.length));

  // Trend lines — three series (Proyectos, KPIs, Tareas)
  const trendData = useMemo(() => ({
    proyectos: [78, 76, 79, 82, 81, 84, 85, 87],
    kpis:      [82, 80, 81, 83, 82, 83, 85, 86],
    tareas:    [70, 72, 74, 75, 78, 80, 82, 83],
    months:    Array.from({length: 8}, (_, i) => MONTH_SHORT_ES[new Date(_now.getFullYear(), _now.getMonth() - 7 + i, 1).getMonth()]),
  }), []);

  // Radar dimensions (Scorecard Empresarial)
  const radar = useMemo(() => {
    return {
      axes: ["Proyectos", "KPIs", "Tareas", "Calidad", "Eficiencia", "Entregas"],
      values: [0.78, 0.85, 0.72, 0.68, 0.74, 0.80],
    };
  }, []);

  // === Render: Dept-scoped (drilled into a department) ===
  if (effDept) {
    return <DeptDashboard dept={D.DEPT_BY_ID[effDept]} kpis={kpis} setKpis={setKpis} projects={projects} session={session} addAudit={addAudit} showToast={showToast} setView={setView}/>;
  }

  // === Render: Executive overview (Owner all-departments) ===
  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">Dashboard Ejecutivo</h1>
          <p className="page__sub">Resumen global de operaciones INDISA — {period}</p>
        </div>
        <div className="page__actions">
          <div style={{position: "relative"}}>
            <button className="btn" style={{paddingRight: 14}} onClick={() => setPeriodOpen(o => !o)}>
              <Icon name="calendar" size={14}/> {period} <Icon name="chev" size={12}/>
            </button>
            {periodOpen && (
              <div style={{position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: 6, zIndex: 40, minWidth: 180, boxShadow: "var(--shadow-2)"}}>
                {[...MONTH_ES.slice(0, _now.getMonth() + 1).map(m => `${m} ${curYear}`), `Q1 ${curYear}`, `Q2 ${curYear}`, `Q3 ${curYear}`, `Q4 ${curYear}`, `YTD ${curYear}`].map(p => (
                  <div key={p} onClick={() => { setPeriod(p); setPeriodOpen(false); showToast(`Periodo: ${p}`); }}
                    style={{padding: "7px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, background: period === p ? "var(--accent-soft)" : "transparent", color: period === p ? "var(--accent)" : "var(--text)"}}>
                    {p}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn--primary" onClick={() => exportReport(deptScores, avgScore, totalProjects, totalTasks, kpisRed)}><Icon name="doc" size={14}/> Exportar Reporte</button>
        </div>
      </div>

      {atRisk.length > 0 && (
        <div className="alert alert--warn">
          <span className="ic-wrap"><Icon name="warn" size={13} stroke={2}/></span>
          <span><b>Atención requerida:</b> {atRisk.map(d => d.name).join(", ")} {atRisk.length === 1 ? "tiene score" : "tienen score"} por debajo de 75. Revisar KPIs críticos.</span>
        </div>
      )}

      {/* KPI strip — Score Global hero + 4 metric cards */}
      <div className="row row--5" style={{marginBottom: 14}}>
        <ScoreGlobalCard score={avgScore} deptCount={deptScores.length} curQuarter={curQuarter} curYear={curYear}/>
        <MetricCard label="Proyectos Activos" value={totalProjects} sub={`${totalRisk} en riesgo`} delta={+4} deltaLabel="vs mes ant." icon="folder"/>
        <MetricCard label="Tareas Pendientes" value={totalTasks} sub="" delta={-12} deltaLabel="esta semana" icon="checkbox" deltaIsBad={false}/>
        <MetricCard label="KPIs en Rojo" value={kpisRed} sub="" delta={0} deltaLabel="Sin cambio" icon="warn" valueColor={kpisRed > 0 ? "var(--danger)" : "var(--text)"}/>
        <MetricCard label="Colaboradores" value={collaborators} sub="" delta={+5} deltaLabel="este mes" icon="users2"/>
      </div>

      {/* Trend + Radar */}
      <div className="row row--212" style={{marginBottom: 14}}>
        <Card title="Tendencia de Performance Global" sub="Últimos 8 meses" headerExtra={
          <div className="legend">
            <span className="lg"><span className="sw" style={{background: "var(--accent)"}}/> Proyectos</span>
            <span className="lg"><span className="sw" style={{background: "var(--positive)"}}/> KPIs</span>
            <span className="lg"><span className="sw" style={{background: "var(--warning)"}}/> Tareas</span>
          </div>
        }>
          <LineChart
            series={[
              { name: "Proyectos", data: trendData.proyectos, color: "var(--accent)" },
              { name: "KPIs",      data: trendData.kpis,      color: "var(--positive)" },
              { name: "Tareas",    data: trendData.tareas,    color: "var(--warning)" },
            ]}
            labels={trendData.months}
            height={260}
            area
          />
        </Card>

        <Card title="Scorecard Empresarial" sub="Dimensiones de performance">
          <div style={{display: "grid", placeItems: "center", padding: 4}}>
            <RadarChart
              axes={radar.axes}
              series={[{ data: radar.values, color: "var(--accent)" }]}
              size={260}
            />
          </div>
        </Card>
      </div>

      {/* Performance por Departamento */}
      <Card title="Performance por Departamento" sub="Score, eficiencia y estado general" headerExtra={
        <div className="legend-pills">
          <span className="lp"><span className="sw" style={{background: "var(--positive)"}}/> ≥ 85</span>
          <span className="lp"><span className="sw" style={{background: "var(--warning)"}}/> 70-84</span>
          <span className="lp"><span className="sw" style={{background: "var(--danger)"}}/> &lt; 70</span>
        </div>
      }>
        <div className="deptlist" style={{margin: "0 -2px"}}>
          {deptScores.map(d => (
            <DeptPerfRow key={d.id} d={d} onClick={() => { /* setDeptScope is in App level */ window.__indisaScopeTo?.(d.id); }}/>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ===== Score Global hero KPI =====
function ScoreGlobalCard({ score, deptCount, curQuarter, curYear }) {
  // Animated ring value
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 800;
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / dur);
      setShown(Math.round(score * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const r = 28;
  const c = 2 * Math.PI * r;
  const off = c - (c * shown / 100);

  return (
    <div className="kpi kpi--hero">
      <div className="kpi__top">
        <div className="kpi__label">Score Global</div>
        <div className="kpi__ic">2026</div>
      </div>
      <div className="kpi__progress" style={{marginTop: 4}}>
        <svg className="kpi__ring" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6"/>
          <circle cx="32" cy="32" r={r} fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={off}
            transform="rotate(-90 32 32)" style={{transition: "stroke-dashoffset .8s"}}/>
          <text x="32" y="36" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff" fontFamily="var(--ff-ui)">{shown}</text>
        </svg>
        <div>
          <div className="kpi__value" style={{margin: 0, fontSize: 30}}>{shown}%</div>
          <div className="kpi__sub" style={{marginLeft: 0, fontSize: 12}}>Performance global</div>
          <div className="kpi__sub" style={{marginLeft: 0, fontSize: 11, marginTop: 4, opacity: 0.85}}>
            Promedio({deptCount || 12} deptos) · KPIs Q{curQuarter || 2} {curYear || new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Metric card =====
function MetricCard({ label, value, sub, delta, deltaLabel, icon, valueColor }) {
  const isUp = delta > 0;
  const isFlat = delta === 0;
  return (
    <div className="kpi">
      <div className="kpi__top">
        <div className="kpi__label">{label}</div>
        <div className="kpi__ic"><Icon name={icon} size={14}/></div>
      </div>
      <div className="kpi__value" style={{color: valueColor || "var(--text)"}}>{nice(value, 0)}</div>
      {sub && <div className="muted" style={{fontSize: 12, marginTop: 2}}>{sub}</div>}
      <div className={"kpi__delta " + (isFlat ? "kpi__delta--flat" : isUp ? "kpi__delta--up" : "kpi__delta--down")} style={{marginTop: 6}}>
        {!isFlat && <Icon name={isUp ? "up" : "down"} size={11} stroke={2.2}/>}
        {isFlat ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
        <span className="muted" style={{fontWeight: 400, color: "var(--text-2)"}}>{deltaLabel}</span>
      </div>
    </div>
  );
}

// ===== Performance row =====
function DeptPerfRow({ d, onClick }) {
  const score = d.score;
  const color = score >= 85 ? "var(--positive)" : score >= 70 ? "var(--warning)" : "var(--danger)";
  const status = score >= 85 ? { cls: "chip--ok", lbl: "Óptimo" }
              : score >= 70 ? { cls: "chip--warn", lbl: "Regular" }
              : { cls: "chip--bad", lbl: "En Riesgo" };
  return (
    <div className="deptperf" onClick={onClick}>
      <div className="deptperf__ic" style={{color: d.color, background: d.color + "12", borderColor: d.color + "30"}}>
        <Icon name="activity" size={14} stroke={2}/>
      </div>
      <div className="deptperf__nm">{d.name}</div>
      <div className="deptperf__bar"><span style={{width: Math.min(100, score) + "%", background: color}}/></div>
      <div className="deptperf__score">{score}</div>
      <div className="deptperf__meta">
        <span><span className="v">{d.open}</span><span className="l">Proyectos</span></span>
        <span><span className="v">{d.tasks}</span><span className="l">Tareas</span></span>
        <span><span className="v" style={{color: d.critical > 0 ? "var(--danger)" : "var(--text)"}}>{d.critical}</span><span className="l">KPIs Crít.</span></span>
      </div>
      <div className="deptperf__status">
        <span className={"chip " + status.cls}><span className="dot"/>{status.lbl}</span>
      </div>
    </div>
  );
}

// ===== Department-scoped dashboard =====
function DeptDashboard({ dept, kpis, setKpis, projects, session, addAudit, showToast, setView }) {
  const readOnly = session.role === "viewer";
  const PALETTE = ["var(--accent)","var(--positive)","var(--warning)","#8b5cf6","#0ea5e9","#ec4899","#14b8a6","#f97316","#ef4444","#6366f1"];
  const list = kpis[dept.id] || [];
  const ps = projects[dept.id] || [];
  const score = list.length ? Math.min(100, Math.round(list.reduce((s,k) => s + Math.min(1.0, k.value/k.target), 0) / list.length * 100)) : 60;

  function updateKpi(id, field, value) {
    setKpis(prev => {
      const newList = (prev[dept.id] || []).map(k => k.id === id ? { ...k, [field]: value } : k);
      return { ...prev, [dept.id]: newList };
    });
    addAudit({ action: `KPI editado · ${id}.${field} → ${value}`, user: session.name, dept: dept.id, level: "info" });
  }

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title flex-c gap-10">
            <span style={{width: 12, height: 12, borderRadius: 3, background: dept.color}}/>
            {dept.name}
          </h1>
          <p className="page__sub">Vista aislada · datos exclusivos del departamento</p>
        </div>
        <div className="page__actions">
          {readOnly && <span className="chip"><Icon name="lock" size={11}/> Solo lectura</span>}
          <button className="btn" onClick={() => setView && setView("kpis")}><Icon name="filter" size={14}/> Ver KPIs</button>
          {!readOnly && <button className="btn btn--primary" onClick={() => { showToast("Abriendo gestor de KPIs…"); setView && setView("kpis"); }}><Icon name="plus" size={14}/> Agregar widget</button>}
        </div>
      </div>

      {/* KPI strip for dept */}
      <div className="row row--5" style={{marginBottom: 14}}>
        <div className="kpi kpi--hero" style={{background: `linear-gradient(135deg, ${dept.color}, ${dept.color}dd)`, boxShadow: `0 8px 24px -8px ${dept.color}80`}}>
          <div className="kpi__top">
            <div className="kpi__label">Score Departamento</div>
            <div className="kpi__ic">{dept.short}</div>
          </div>
          <div className="kpi__value" style={{fontSize: 30}}>{score}%</div>
          <div className="kpi__sub" style={{marginLeft: 0, fontSize: 12}}>Performance del departamento</div>
        </div>
        {list.slice(0, 4).map(k => (
          <MetricCard key={k.id} label={k.label} value={k.value + (k.unit || "")} sub={`Meta ${nice(k.target, 0)}${k.unit}`}
            delta={Math.round(k.deltaPct * 10) / 10} deltaLabel="vs mes ant." icon="spark"/>
        ))}
      </div>

      <div className="row row--212" style={{marginBottom: 14}}>
        <Card title="Tendencia · Últimos 12 meses" sub={`${list.length} métricas`} headerExtra={
          <div className="legend" style={{maxWidth: 340, justifyContent: "flex-end"}}>
            {list.map((k, i) => (
              <span key={k.id} className="lg"><span className="sw" style={{background: PALETTE[i % PALETTE.length]}}/> {k.label}</span>
            ))}
          </div>
        }>
          <LineChart
            series={list.map((k, i) => ({ name: k.label, data: [...(k.trend || []).slice(0, -1), k.value], color: PALETTE[i % PALETTE.length] }))}
            labels={["Jun","Jul","Ago","Sep","Oct","Nov","Dic","Ene","Feb","Mar","Abr","May"]}
            height={260}
            area={false}
          />
        </Card>

        <Card title="Indicador principal" sub={list[0]?.label}>
          <div style={{display: "grid", placeItems: "center"}}>
            <GaugeChart value={list[0]?.value || 0} target={list[0]?.target || 100} unit={list[0]?.unit || ""} label={list[0]?.label || ""} size={220}/>
          </div>
        </Card>
      </div>

      <div className="row row--2">
        <Card title="KPIs del departamento" sub="editables">
          <table className="table">
            <thead><tr><th>Métrica</th><th className="right">Actual</th><th className="right">Meta</th><th>Progreso</th><th className="right">Δ</th></tr></thead>
            <tbody>
              {list.map(k => {
                const pct = Math.min(100, Math.round(k.value / k.target * 100));
                return (
                  <tr key={k.id}>
                    <td><b style={{fontWeight: 500}}>{k.label}</b></td>
                    <td className="right mono"><NumCell value={k.value} onCommit={v => updateKpi(k.id, "value", v)} readOnly={readOnly} style={{textAlign: "right", width: 70}}/></td>
                    <td className="right mono"><NumCell value={k.target} onCommit={v => updateKpi(k.id, "target", v)} readOnly={readOnly} style={{textAlign: "right", width: 70}}/></td>
                    <td style={{minWidth: 120}}>
                      <div className="deptperf__bar"><span style={{width: pct + "%", background: pct >= 85 ? "var(--positive)" : pct >= 70 ? "var(--warning)" : "var(--danger)"}}/></div>
                    </td>
                    <td className="right mono" style={{color: k.deltaPct >= 0 ? "var(--positive)" : "var(--danger)"}}>{k.deltaPct >= 0 ? "+" : ""}{k.deltaPct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title="Proyectos abiertos" sub={`${ps.filter(p => p.status !== "done").length} activos`} headerExtra={
          <button className="btn btn--sm" onClick={() => setView && setView("projects")}>Ver todos <Icon name="arrow" size={12}/></button>
        }>
          <table className="table">
            <thead><tr><th>Título</th><th>Estado</th><th>Prio</th><th>Fecha</th><th>Equipo</th></tr></thead>
            <tbody>
              {ps.map(p => (
                <tr key={p.id} style={{cursor: "pointer"}} onClick={() => setView && setView("projects")} title="Abrir en Proyectos">
                  <td>{p.title}</td>
                  <td><StatusChip status={p.status}/></td>
                  <td><span className={"prio prio--" + p.prio}/> <span style={{fontSize: 11, marginLeft: 4, textTransform: "capitalize"}}>{p.prio}</span></td>
                  <td className="mono dim" style={{fontSize: 11}}>{p.due.slice(5)}</td>
                  <td><Avatars list={p.assignees}/></td>
                </tr>
              ))}
              {ps.length === 0 && <tr><td colSpan={5} className="dim" style={{textAlign: "center", padding: 20}}>Sin proyectos en este departamento.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ===== Card primitive (with optional headerExtra) =====
function Card({ title, sub, actions, headerExtra, children, noPad }) {
  return (
    <div className="card">
      <div className="card__hd">
        <div>
          <div className="card__title">{title}</div>
          {sub && <div className="card__sub">{sub}</div>}
        </div>
        <div className="card__actions">
          {headerExtra}
          {actions}
        </div>
      </div>
      <div className="card__bd" style={noPad ? {padding: 0} : null}>{children}</div>
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    backlog: ["chip", "Backlog"],
    todo:    ["chip chip--info", "Por hacer"],
    doing:   ["chip chip--accent", "En curso"],
    review:  ["chip chip--warn", "Revisión"],
    done:    ["chip chip--ok", "Hecho"],
  };
  const [cls, lbl] = map[status] || ["chip", status];
  return <span className={cls}><span className="dot"/>{lbl}</span>;
}

function Avatars({ list }) {
  return (
    <div style={{display: "inline-flex"}}>
      {list.map((a, i) => (
        <span key={i} style={{width: 22, height: 22, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", border: "1.5px solid var(--panel)", display: "grid", placeItems: "center", fontSize: 9, fontFamily: "var(--ff-mono)", fontWeight: 600, marginLeft: i ? -6 : 0}}>{a}</span>
      ))}
    </div>
  );
}

Object.assign(window, { Dashboard, Card, MetricCard, DeptPerfRow, StatusChip, Avatars, ScoreGlobalCard });
