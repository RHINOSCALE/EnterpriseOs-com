// Dashboard Ejecutivo — matches the corporate mockup layout
const { useState, useEffect, useMemo, useRef } = React;

const MONTH_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTH_SHORT_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// Weighted multi-factor department performance score
// KPIs 50% · Projects 25% · Tasks 15% · POA 10%
// KPI score uses ONLY weekly data entered by users — no legacy seed fallback.
// Weights are redistributed proportionally when a component has no data.
function computeDeptScore(deptId, kpis, kpiWeekly, projects, tasks, poa, curYear, curQuarter) {
  // KPI score — 50% — only from weekly entries (no seed-data fallback)
  let kpiScore = null;
  const key = `${deptId}_${curYear}_${curQuarter}`;
  const weeklyList = (kpiWeekly || {})[key] || [];
  if (weeklyList.length > 0) {
    const ratios = weeklyList.flatMap(k => {
      const filled = k.semanas.filter(v => v !== null && v !== undefined);
      const last = filled.length ? filled[filled.length - 1] : null;
      return last !== null && k.metaSemanal > 0 ? [Math.min(1, last / k.metaSemanal)] : [];
    });
    if (ratios.length > 0) kpiScore = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  }
  // No legacy fallback — if no weekly KPI data exists, kpiScore stays null
  // and its 50% weight is redistributed to the other components.

  // Project score — 25%: completed / total (binary)
  let projectScore = null;
  const deptProjects = projects[deptId] || [];
  if (deptProjects.length > 0)
    projectScore = deptProjects.filter(p => p.status === "done").length / deptProjects.length;

  // Task score — 15%: completed / total (binary)
  let taskScore = null;
  if (tasks) {
    const deptTasks = tasks.filter(t => t.department === deptId);
    if (deptTasks.length > 0)
      taskScore = deptTasks.filter(t => t.status === "completed").length / deptTasks.length;
  }

  // POA score — 10%
  // poa is keyed by deptId: { gg: [goals...], ing: [goals...], ... }
  let poaScore = null;
  const deptPoaList = poa ? (poa[deptId] || []) : [];
  if (deptPoaList.length > 0)
    poaScore = deptPoaList.filter(g => g.progress === 100).length / deptPoaList.length;

  // Weighted average — redistribute weights among components that have real data
  const components = [
    { score: kpiScore,     weight: 0.50 },
    { score: projectScore, weight: 0.25 },
    { score: taskScore,    weight: 0.15 },
    { score: poaScore,     weight: 0.10 },
  ];
  const active = components.filter(c => c.score !== null);
  if (active.length === 0) return 0;
  const totalW = active.reduce((s, c) => s + c.weight, 0);
  return Math.min(100, Math.round(active.reduce((s, c) => s + c.score * (c.weight / totalW), 0) * 100));
}

// KPI-only score (0-100): uses ONLY weekly entries for the selected quarter.
// Returns 0 when no weekly KPI data has been entered — no seed-data fallback.
function computeKpiScore(deptId, kpis, kpiWeekly, curYear, curQuarter) {
  const key = `${deptId}_${curYear}_${curQuarter}`;
  const weeklyList = (kpiWeekly || {})[key] || [];
  if (weeklyList.length > 0) {
    const ratios = weeklyList.flatMap(k => {
      const filled = k.semanas.filter(v => v !== null && v !== undefined);
      const last = filled.length ? filled[filled.length - 1] : null;
      return last !== null && k.metaSemanal > 0 ? [Math.min(1, last / k.metaSemanal)] : [];
    });
    if (ratios.length > 0) return Math.min(100, Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length * 100));
  }
  return 0;
}

// Projects+Tasks score (0-100): done/total for projects, completed/total for tasks
function computeProjectScore(deptId, projects, tasks) {
  const deptProjects = projects[deptId] || [];
  const deptTasks = (tasks || []).filter(t => t.department === deptId);
  const projPct = deptProjects.length ? deptProjects.filter(p => p.status === "done").length / deptProjects.length : null;
  const taskPct = deptTasks.length ? deptTasks.filter(t => t.status === "completed").length / deptTasks.length : null;
  if (projPct === null && taskPct === null) return 0;
  if (projPct === null) return Math.round(taskPct * 100);
  if (taskPct === null) return Math.round(projPct * 100);
  return Math.round((projPct * 0.6 + taskPct * 0.4) * 100);
}

// Company-wide score: simple average of all department scores
function computeGlobalScore(kpis, kpiWeekly, projects, tasks, poa, curYear, curQuarter) {
  const depts = window.INDISA_DATA.DEPARTMENTS;
  if (!depts.length) return 0;
  const total = depts.reduce((s, d) => s + computeDeptScore(d.id, kpis, kpiWeekly, projects, tasks, poa, curYear, curQuarter), 0);
  return Math.min(100, Math.round(total / depts.length));
}

function Dashboard({ session, deptScope, kpis, setKpis, kpiWeekly, setKpiWeekly, projects, tasks, poa, departments, addAudit, showToast, setView }) {
  const D = window.INDISA_DATA;
  const role = session.role;
  const effDept = role === "owner" ? deptScope : session.dept;
  const ctx = effDept ? D.DEPT_BY_ID[effDept].name : "INDISA";
  const _now = new Date();
  const curYear = _now.getFullYear();
  const curQuarter = Math.ceil((_now.getMonth() + 1) / 3);
  const [period, setPeriod] = useState(() => `${MONTH_ES[_now.getMonth()]} ${curYear}`);
  const [periodOpen, setPeriodOpen] = useState(false);

  // Parse the selected period into a concrete year + quarter so score data follows it
  const [selYear, selQuarter] = useMemo(() => {
    const qm = period.match(/^Q(\d)\s+(\d{4})$/);
    if (qm) return [parseInt(qm[2]), parseInt(qm[1])];
    const ytdm = period.match(/^YTD\s+(\d{4})$/);
    if (ytdm) return [parseInt(ytdm[1]), curQuarter];
    const mm = period.match(/^(\S+)\s+(\d{4})$/);
    if (mm) {
      const mi = MONTH_ES.indexOf(mm[1]);
      if (mi >= 0) return [parseInt(mm[2]), Math.ceil((mi + 1) / 3)];
    }
    return [curYear, curQuarter];
  }, [period, curYear, curQuarter]);

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

  // Compute department health scores — driven by selYear/selQuarter so period picker affects data
  const deptScores = useMemo(() => {
    const deptList = departments && departments.length > 0 ? departments : D.DEPARTMENTS;
    return deptList.map(d => {
      const score = computeProjectScore(d.id, projects, tasks);
      const key = `${d.id}_${selYear}_${selQuarter}`;
      const weeklyList = (kpiWeekly || {})[key] || [];
      let critical;
      if (weeklyList.length > 0) {
        critical = weeklyList.filter(k => {
          const filled = k.semanas.filter(v => v !== null && v !== undefined);
          const last = filled.length ? filled[filled.length - 1] : null;
          return last !== null && k.metaSemanal > 0 && last / k.metaSemanal < 0.5;
        }).length;
      } else {
        critical = (kpis[d.id] || []).filter(k => k.value / k.target < 0.5).length;
      }
      const open = (projects[d.id] || []).length;
      const taskCount = (tasks || []).filter(t => t.department === d.id).length;
      return { ...d, score, open, tasks: taskCount, critical };
    });
  }, [kpis, kpiWeekly, projects, tasks, poa, departments, selYear, selQuarter]);

  const atRisk = deptScores.filter(d => d.score < 75);

  // Aggregate company-level numbers
  const totalProjects = Object.values(projects).flat().filter(p => p.status !== "done").length;
  const totalRisk     = Object.values(projects).flat().filter(p => p.status === "doing" && p.prio === "high").length;
  const totalTasks    = deptScores.reduce((s,d) => s + d.tasks, 0);
  const kpisRed       = deptScores.reduce((s,d) => s + d.critical, 0);
  const activeTasks   = (tasks||[]).filter(t => t.status !== "completed").length;

  const avgScore = Math.min(100, Math.round(deptScores.reduce((s,d) => s + d.score, 0) / deptScores.length));
  const avgKpiScore  = useMemo(() => {
    const deptList = departments && departments.length > 0 ? departments : D.DEPARTMENTS;
    return Math.min(100, Math.round(deptList.reduce((s, d) => s + computeKpiScore(d.id, kpis, kpiWeekly, selYear, selQuarter), 0) / deptList.length));
  }, [kpis, kpiWeekly, departments, selYear, selQuarter]);
  const avgProjScore = useMemo(() => {
    const deptList = departments && departments.length > 0 ? departments : D.DEPARTMENTS;
    return Math.min(100, Math.round(deptList.reduce((s, d) => s + computeProjectScore(d.id, projects, tasks), 0) / deptList.length));
  }, [projects, tasks, departments]);

  // Trend lines — real KPI weekly data; current scores for projects/tasks
  const trendData = useMemo(() => {
    const months = Array.from({length: 8}, (_, i) => MONTH_SHORT_ES[new Date(_now.getFullYear(), _now.getMonth() - 7 + i, 1).getMonth()]);
    const deptList = departments && departments.length > 0 ? departments : D.DEPARTMENTS;
    const taskTotal = (tasks||[]).length;
    const taskPct = taskTotal > 0 ? Math.round((tasks||[]).filter(t => t.status === "completed").length / taskTotal * 100) : 0;
    const kpiSeries = months.map((_, mi) => {
      const d = new Date(_now.getFullYear(), _now.getMonth() - 7 + mi, 1);
      const q = Math.ceil((d.getMonth() + 1) / 3);
      const yr = d.getFullYear();
      const monthInQ = d.getMonth() - (q - 1) * 3;
      const wStart = monthInQ * 4;
      const wEnd = Math.min(12, wStart + (monthInQ === 2 ? 4 : 3));
      const ratios = deptList.flatMap(dept => {
        const wl = (kpiWeekly || {})[`${dept.id}_${yr}_${q}`] || [];
        return wl.flatMap(item =>
          item.semanas.slice(wStart, wEnd + 1)
            .filter(v => v !== null && v !== undefined)
            .flatMap(v => item.metaSemanal > 0 ? [Math.min(1, v / item.metaSemanal)] : [])
        );
      });
      return ratios.length > 0 ? Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length * 100) : null;
    });
    const kpiFilled = kpiSeries.map(v => v !== null ? v : avgKpiScore);
    return { proyectos: months.map(() => avgProjScore), kpis: kpiFilled, tareas: months.map(() => taskPct), months };
  }, [kpiWeekly, avgProjScore, avgKpiScore, tasks, departments]);

  // Radar — real data from computed scores
  const radar = useMemo(() => {
    const taskTotal = (tasks||[]).length;
    const taskDone = (tasks||[]).filter(t => t.status === "completed").length;
    const allProjs = Object.values(projects).flat();
    const projDone = allProjs.length > 0 ? allProjs.filter(p => p.status === "done").length / allProjs.length : 0;
    const allGoals = Object.values(poa).flat();
    const goalProg = allGoals.length > 0 ? allGoals.filter(g => g.progress >= 80).length / allGoals.length : 0;
    const onTime = taskTotal > 0 ? (tasks||[]).filter(t => t.status === "completed" || new Date(t.due_date) >= _now).length / taskTotal : 0.5;
    return {
      axes: ["Proyectos", "KPIs", "Tareas", "POA", "Eficiencia", "Entregas"],
      values: [avgProjScore / 100, avgKpiScore / 100, taskTotal > 0 ? taskDone / taskTotal : 0, goalProg, onTime, projDone],
    };
  }, [avgProjScore, avgKpiScore, tasks, projects, poa]);

  // === Render: Dept-scoped (drilled into a department) ===
  if (effDept) {
    return <DeptDashboard dept={D.DEPT_BY_ID[effDept]} kpis={kpis} setKpis={setKpis} kpiWeekly={kpiWeekly} setKpiWeekly={setKpiWeekly} projects={projects} tasks={tasks} poa={poa} session={session} addAudit={addAudit} showToast={showToast} setView={setView}/>;
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

      {/* KPI strip — Score Global KPI + Score Global Proyectos + Actividad */}
      <div className="row row--3" style={{marginBottom: 14}}>
        <div className="kpi kpi--hero" style={{background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 8px 24px -8px #2563eb80"}}>
          <div className="kpi__top">
            <div className="kpi__label">Score Global KPI</div>
            <div className="kpi__ic">{curYear}</div>
          </div>
          <div className="kpi__progress" style={{marginTop: 4}}>
            <svg className="kpi__ring" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6"/>
              <circle cx="32" cy="32" r="28" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - avgKpiScore / 100)}
                transform="rotate(-90 32 32)" style={{transition: "stroke-dashoffset .8s"}}/>
              <text x="32" y="36" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff" fontFamily="var(--ff-ui)">{avgKpiScore}</text>
            </svg>
            <div>
              <div className="kpi__value" style={{margin: 0, fontSize: 28}}>{avgKpiScore}%</div>
              <div className="kpi__sub" style={{marginLeft: 0, fontSize: 12}}>Indicadores globales</div>
              <div className="kpi__sub" style={{marginLeft: 0, fontSize: 11, marginTop: 4, opacity: 0.85}}>Promedio({deptScores.length} deptos) · Q{selQuarter} {selYear}</div>
            </div>
          </div>
        </div>
        <div className="kpi kpi--hero" style={{background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 8px 24px -8px #05966980"}}>
          <div className="kpi__top">
            <div className="kpi__label">Score Global Proyectos</div>
            <div className="kpi__ic">{curYear}</div>
          </div>
          <div className="kpi__progress" style={{marginTop: 4}}>
            <svg className="kpi__ring" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6"/>
              <circle cx="32" cy="32" r="28" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - avgProjScore / 100)}
                transform="rotate(-90 32 32)" style={{transition: "stroke-dashoffset .8s"}}/>
              <text x="32" y="36" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff" fontFamily="var(--ff-ui)">{avgProjScore}</text>
            </svg>
            <div>
              <div className="kpi__value" style={{margin: 0, fontSize: 28}}>{avgProjScore}%</div>
              <div className="kpi__sub" style={{marginLeft: 0, fontSize: 12}}>Proyectos + Tareas</div>
              <div className="kpi__sub" style={{marginLeft: 0, fontSize: 11, marginTop: 4, opacity: 0.85}}>Ponderado por avance · {deptScores.length} deptos</div>
            </div>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__label">Actividad Global</div>
            <div className="kpi__ic"><Icon name="activity" size={14}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:14}}>
            <div>
              <div className="kpi__value" style={{fontSize:30}}>{totalProjects}</div>
              <div style={{fontSize:11,color:"var(--text-2)",marginTop:3}}>Proyectos activos</div>
            </div>
            <div>
              <div className="kpi__value" style={{fontSize:30}}>{activeTasks}</div>
              <div style={{fontSize:11,color:"var(--text-2)",marginTop:3}}>Tareas activas</div>
            </div>
          </div>
        </div>
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
        <span><span className="v" style={{color: d.critical > 0 ? "var(--danger)" : "var(--positive)"}}>{d.critical}</span><span className="l">KPIs Crít.</span></span>
      </div>
      <div className="deptperf__status">
        <span className={"chip " + status.cls}><span className="dot"/>{status.lbl}</span>
      </div>
    </div>
  );
}

// ===== Department-scoped dashboard =====
function DeptDashboard({ dept, kpis, setKpis, kpiWeekly, setKpiWeekly, projects, tasks, poa, session, addAudit, showToast, setView }) {
  const readOnly = session.role === "viewer";
  const PALETTE = ["var(--accent)","var(--positive)","var(--warning)","#8b5cf6","#0ea5e9","#ec4899","#14b8a6","#f97316","#ef4444","#6366f1"];
  const list = kpis[dept.id] || [];
  const ps = projects[dept.id] || [];
  const _now = new Date();
  const _yr = _now.getFullYear();
  const _qtr = Math.ceil((_now.getMonth() + 1) / 3);
  const score      = computeDeptScore(dept.id, kpis, kpiWeekly, projects, tasks, poa, _yr, _qtr);
  const kpiScoreV  = computeKpiScore(dept.id, kpis, kpiWeekly, _yr, _qtr);
  const projScoreV = computeProjectScore(dept.id, projects, tasks);
  const globalScoreV = computeGlobalScore(kpis, kpiWeekly, projects, tasks, poa, _yr, _qtr);

  // Weekly KPI helpers
  const dYear = _yr;
  const dQuarter = _qtr;
  const Q_LABELS_D = ["1ER","2DO","3ER","4TO"];
  const WEEKS_D = Array.from({length: 13}, (_, i) => `S${(dQuarter - 1) * 13 + i + 1}`);
  const kpiKey = `${dept.id}_${dYear}_${dQuarter}`;
  const weeklyList = (kpiWeekly || {})[kpiKey] || [];
  const _qStart = new Date(dYear, (dQuarter - 1) * 3, 1);
  const currentWeekIdx = Math.min(12, Math.max(-1, Math.floor((_now - _qStart) / 86400000 / 7)));

  function computeW(item) {
    const filled = item.semanas.filter(v => v !== null && v !== undefined);
    const lastVal = filled.length ? filled[filled.length - 1] : null;
    const total = filled.reduce((s, v) => s + v, 0);
    const varSem = lastVal !== null ? lastVal - item.metaSemanal : null;
    const pct = lastVal !== null && item.metaSemanal > 0 ? (lastVal / item.metaSemanal) * 100 : null;
    return { lastVal, total, varSem, pct };
  }
  function cellClsW(val, meta) {
    if (val === null || val === undefined || !meta) return "";
    const p = (val / meta) * 100;
    return p >= 100 ? "kpi-cell-green" : p >= 80 ? "kpi-cell-yellow" : "kpi-cell-red";
  }
  function fmtW(n) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    const a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (a >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return n % 1 !== 0 ? n.toFixed(1) : String(Math.round(n));
  }
  function updateWeekInDept(kpiId, wi, val) {
    if (!setKpiWeekly) return;
    setKpiWeekly(prev => ({
      ...prev,
      [kpiKey]: (prev[kpiKey] || []).map(item =>
        item.id !== kpiId ? item : { ...item, semanas: item.semanas.map((v, i) => i === wi ? val : v) }
      ),
    }));
    addAudit({ action: `KPI S${wi + 1} actualizado · ${kpiId}=${val}`, user: session.name, dept: dept.id, level: "info" });
  }
  function updateMetaInDept(kpiId, val) {
    if (!setKpiWeekly) return;
    setKpiWeekly(prev => ({
      ...prev,
      [kpiKey]: (prev[kpiKey] || []).map(item => item.id !== kpiId ? item : { ...item, metaSemanal: val }),
    }));
  }

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

      {/* Score strip — KPI · Proyectos · General empresa · 2 KPI metrics */}
      <div className="row row--5" style={{marginBottom: 14}}>
        <div className="kpi kpi--hero" style={{background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 8px 24px -8px #2563eb80"}}>
          <div className="kpi__top">
            <div className="kpi__label">Score KPI</div>
            <div className="kpi__ic">{dept.short}</div>
          </div>
          <div className="kpi__value" style={{fontSize: 30}}>{kpiScoreV}%</div>
          <div className="kpi__sub" style={{marginLeft: 0, fontSize: 12}}>Indicadores vs. meta</div>
        </div>
        <div className="kpi kpi--hero" style={{background: `linear-gradient(135deg, ${dept.color}, ${dept.color}bb)`, boxShadow: `0 8px 24px -8px ${dept.color}80`}}>
          <div className="kpi__top">
            <div className="kpi__label">Score Proyectos</div>
            <div className="kpi__ic">{dept.short}</div>
          </div>
          <div className="kpi__value" style={{fontSize: 30}}>{projScoreV}%</div>
          <div className="kpi__sub" style={{marginLeft: 0, fontSize: 12}}>Proyectos + Tareas</div>
        </div>
        <div className="kpi">
          <div className="kpi__top">
            <div className="kpi__label">Score General Empresa</div>
            <div className="kpi__ic">GG</div>
          </div>
          <div className="kpi__value" style={{fontSize: 28, color: globalScoreV >= 85 ? "var(--positive)" : globalScoreV >= 70 ? "var(--warning)" : "var(--danger)"}}>{globalScoreV}%</div>
          <div className="kpi__sub" style={{marginLeft: 0, fontSize: 12}}>Promedio todos los deptos</div>
          <div className="kpi__delta kpi__delta--flat" style={{marginTop: 6, fontSize: 11}}>
            {kpiScoreV > globalScoreV ? <span style={{color:"var(--positive)"}}>+{kpiScoreV - globalScoreV}pts vs. empresa</span> : kpiScoreV < globalScoreV ? <span style={{color:"var(--danger)"}}>{kpiScoreV - globalScoreV}pts vs. empresa</span> : <span>= empresa</span>}
          </div>
        </div>
        {weeklyList.length > 0
          ? weeklyList.slice(0, 2).map(k => {
              const { lastVal, varSem } = computeW(k);
              const delta = varSem !== null && k.metaSemanal > 0 ? Math.round(varSem / k.metaSemanal * 1000) / 10 : 0;
              return <MetricCard key={k.id} label={k.label} value={lastVal !== null ? fmtW(lastVal) : "—"} sub={`Meta ${k.metaSemanal}/sem`}
                delta={delta} deltaLabel="vs meta sem." icon="spark"/>;
            })
          : list.slice(0, 2).map(k => (
              <MetricCard key={k.id} label={k.label} value={k.value + (k.unit || "")} sub={`Meta ${nice(k.target, 0)}${k.unit}`}
                delta={Math.round(k.deltaPct * 10) / 10} deltaLabel="vs mes ant." icon="spark"/>
            ))
        }
      </div>

      <div className="row row--212" style={{marginBottom: 14}}>
        <Card title={`Tendencia KPIs · Q${dQuarter} ${dYear}`} sub={`${weeklyList.length} indicadores`} headerExtra={
          <div className="legend" style={{maxWidth: 340, justifyContent: "flex-end"}}>
            {weeklyList.map((k, i) => (
              <span key={k.id} className="lg"><span className="sw" style={{background: PALETTE[i % PALETTE.length]}}/> {k.label}</span>
            ))}
          </div>
        }>
          {weeklyList.length === 0 ? (
            <div style={{textAlign:"center",padding:"60px 0",color:"var(--text-3)",fontSize:13}}>
              Sin KPIs para este trimestre ·{" "}
              <span style={{color:"var(--accent)",cursor:"pointer"}} onClick={() => setView && setView("kpis")}>Agregar →</span>
            </div>
          ) : (
            <LineChart
              series={weeklyList.map((k, i) => ({
                name: k.label,
                data: k.semanas.map(v => v !== null && v !== undefined ? v : 0),
                color: PALETTE[i % PALETTE.length],
              }))}
              labels={WEEKS_D}
              height={260}
              area={false}
            />
          )}
        </Card>

        <PrivateTodoCard session={session}/>
      </div>

      <div style={{marginBottom: 14}}>
        <Card title={`KPIs semanales · ${Q_LABELS_D[dQuarter - 1]} Trimestre ${dYear}`} sub={`${weeklyList.length} indicadores · Score: ${score}%`} noPad headerExtra={
          <button className="btn btn--sm" onClick={() => setView && setView("kpis")}>Gestionar KPIs <Icon name="arrow" size={12}/></button>
        }>
          {weeklyList.length === 0 ? (
            <div style={{padding: "24px 16px", textAlign: "center", color: "var(--text-3)", fontSize: 13}}>
              Sin KPIs semanales para este trimestre.{" "}
              <span style={{color: "var(--accent)", cursor: "pointer"}} onClick={() => setView && setView("kpis")}>Agregar en el gestor →</span>
            </div>
          ) : (
            <div className="kpi-tbl-outer" style={{borderRadius: 0}}>
              <table className="kpi-tbl">
                <thead>
                  <tr>
                    <th className="kpi-th kpi-th-s2">Nombre KPI</th>
                    <th className="kpi-th kpi-th-s3">Tipo</th>
                    <th className="kpi-th kpi-th-s4">Meta Sem.</th>
                    {WEEKS_D.map((w, i) => (
                      <th key={i} className={"kpi-th kpi-th-wk" + (i === currentWeekIdx ? " kpi-th-wk-now" : "")}>{w}</th>
                    ))}
                    <th className="kpi-th kpi-th-calc">Var. Sem.</th>
                    <th className="kpi-th kpi-th-calc">Total Trim.</th>
                    <th className="kpi-th kpi-th-st">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyList.map(item => {
                    const c = computeW(item);
                    const st = c.pct === null ? { label: "Sin datos",       cls: "kpi-badge kpi-st-none"   }
                             : c.pct >= 100   ? { label: "Cumplido",         cls: "kpi-badge kpi-st-green"  }
                             : c.pct >= 80    ? { label: "En Riesgo",        cls: "kpi-badge kpi-st-yellow" }
                             :                  { label: "Bajo Desempeño",   cls: "kpi-badge kpi-st-red"    };
                    return (
                      <tr key={item.id} className="kpi-data-row">
                        <td className="kpi-td kpi-td-s2">
                          <TextCell value={item.label} onCommit={v => setKpiWeekly && setKpiWeekly(prev => ({
                            ...prev, [kpiKey]: (prev[kpiKey] || []).map(it => it.id !== item.id ? it : { ...it, label: v })
                          }))} readOnly={readOnly} style={{fontWeight: 500, fontSize: 12, width: "100%"}}/>
                        </td>
                        <td className="kpi-td kpi-td-s3"><span style={{fontSize: 11, color: "var(--text-2)"}}>{item.tipo}</span></td>
                        <td className="kpi-td kpi-td-s4">
                          <NumCell value={item.metaSemanal} onCommit={v => updateMetaInDept(item.id, v)} readOnly={readOnly}
                            style={{width: 72, textAlign: "right", fontSize: 12}}/>
                        </td>
                        {item.semanas.map((v, wi) => (
                          <td key={wi} className={"kpi-td kpi-td-wk " + cellClsW(v, item.metaSemanal) + (wi === currentWeekIdx ? " kpi-td-now" : "")}>
                            <NumCell value={v} onCommit={val => updateWeekInDept(item.id, wi, val)} readOnly={readOnly}
                              style={{width: 58, textAlign: "right", fontSize: 12}}/>
                          </td>
                        ))}
                        <td className={"kpi-td kpi-td-calc mono " + (c.varSem !== null ? (c.varSem >= 0 ? "kpi-pos" : "kpi-neg") : "")}>
                          {c.varSem !== null ? (c.varSem >= 0 ? "+" : "") + fmtW(c.varSem) : "—"}
                        </td>
                        <td className="kpi-td kpi-td-calc mono kpi-bold">{fmtW(c.total)}</td>
                        <td className="kpi-td kpi-td-st">
                          <span className={st.cls}>{st.label}</span>
                          {c.pct !== null && <div style={{fontSize: 10, color: "var(--text-3)", marginTop: 2}}>{Math.min(100, Math.round(c.pct))}%</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

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

// Private per-user to-do list — stored in localStorage only, never synced to Supabase
function PrivateTodoCard({ session }) {
  const storageKey = `indisa_todo_${session.email}`;
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || []; } catch { return []; }
  });
  const [input, setInput] = useState("");

  function persist(next) {
    setItems(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  }
  function add() {
    if (!input.trim()) return;
    persist([...items, { id: "td" + Date.now(), text: input.trim(), done: false }]);
    setInput("");
  }
  function toggle(id) { persist(items.map(it => it.id === id ? { ...it, done: !it.done } : it)); }
  function remove(id) { persist(items.filter(it => it.id !== id)); }

  const pending = items.filter(it => !it.done).length;

  return (
    <Card title="Lista personal" sub={`Privada · ${pending} pendiente${pending !== 1 ? "s" : ""}`}>
      <div style={{display:"grid",gap:2,marginBottom:10,maxHeight:220,overflowY:"auto"}}>
        {items.length === 0 && (
          <div style={{textAlign:"center",padding:"24px 0",color:"var(--text-3)",fontSize:13}}>Sin tareas pendientes</div>
        )}
        {items.map(it => (
          <div key={it.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 4px",borderBottom:"1px solid var(--line)"}}>
            <input type="checkbox" checked={it.done} onChange={() => toggle(it.id)} style={{accentColor:"var(--accent)",flexShrink:0,cursor:"pointer"}}/>
            <span style={{flex:1,fontSize:13,textDecoration:it.done?"line-through":"none",color:it.done?"var(--text-3)":"var(--text)"}}>{it.text}</span>
            <button onClick={() => remove(it.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-3)",fontSize:16,padding:"0 2px",lineHeight:1}} title="Eliminar">×</button>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input className="input" placeholder="Agregar tarea…" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()} style={{flex:1,fontSize:13}}/>
        <button className="btn btn--sm btn--primary" onClick={add} disabled={!input.trim()} style={{opacity:!input.trim()?0.5:1}}>
          <Icon name="plus" size={12}/>
        </button>
      </div>
    </Card>
  );
}

Object.assign(window, { Dashboard, Card, MetricCard, DeptPerfRow, StatusChip, Avatars, ScoreGlobalCard, computeDeptScore, computeKpiScore, computeProjectScore, computeGlobalScore });
