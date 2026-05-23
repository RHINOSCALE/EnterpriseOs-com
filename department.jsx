// Departments overview + KPI analytics page
const { useState, useEffect, useMemo, useRef } = React;

// ===== Departments overview =====
function Departments({ session, kpis, kpiWeekly, projects, tasks, poa, departments, setDepartments, setView, setDeptScope, showToast, addAudit }) {
  const D = window.INDISA_DATA;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  const [addingDept, setAddingDept] = useState(false);
  const [deleteDept, setDeleteDept] = useState(null);
  const _scoreNow = new Date();
  const _scoreYear = _scoreNow.getFullYear();
  const _scoreQuarter = Math.ceil((_scoreNow.getMonth() + 1) / 3);

  function handleAddDept(name, short, color) {
    const id = short.toLowerCase().slice(0, 4);
    if (departments.some(d => d.id === id)) {
      showToast("Ya existe un departamento con ese código");
      return;
    }
    setDepartments(prev => [...prev, { id, name, short, color }]);
    addAudit && addAudit({ action: `Departamento creado: ${name}`, user: session.name, dept: id, level: "success" });
    showToast(`Departamento "${name}" creado`);
    setAddingDept(false);
  }

  function handleDeleteDept(id) {
    const dept = departments.find(d => d.id === id);
    setDepartments(prev => prev.filter(d => d.id !== id));
    addAudit && addAudit({ action: `Departamento eliminado: ${dept?.name}`, user: session.name, dept: id, level: "warn" });
    showToast(`Departamento "${dept?.name}" eliminado`);
    setDeleteDept(null);
  }

  const displayed = departments.filter(d => {
    const score = window.computeDeptScore(d.id, kpis, kpiWeekly, projects, tasks, poa, _scoreYear, _scoreQuarter);
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.short.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || (filterStatus === "ok" && score >= 85) || (filterStatus === "warn" && score >= 70 && score < 85) || (filterStatus === "risk" && score < 70);
    return matchSearch && matchStatus;
  });

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">Departamentos</h1>
          <p className="page__sub">12 workspaces aislados · clic para entrar al scope de un departamento</p>
        </div>
        <div className="page__actions">
          <div style={{position: "relative"}}>
            <button className="btn" onClick={() => setShowFilter(f => !f)}><Icon name="filter" size={14}/> Filtrar {filterStatus !== "all" ? `· ${filterStatus}` : ""}</button>
            {showFilter && (
              <div style={{position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, zIndex: 40, minWidth: 180, boxShadow: "var(--shadow-2)", display: "grid", gap: 4}}>
                {[["all","Todos"],["ok","Óptimo (≥85)"],["warn","Regular (70-84)"],["risk","En Riesgo (<70)"]].map(([v,l]) => (
                  <div key={v} onClick={() => { setFilterStatus(v); setShowFilter(false); }}
                    style={{padding: "7px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, background: filterStatus === v ? "var(--accent-soft)" : "transparent", color: filterStatus === v ? "var(--accent)" : "var(--text)"}}>
                    {l}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn--primary" onClick={() => setAddingDept(true)}><Icon name="plus" size={14}/> Nuevo departamento</button>
        </div>
      </div>

      <div style={{marginBottom: 14}}>
        <div className="tb__search" style={{minWidth: 0, maxWidth: 360}}>
          <Icon name="search" size={14}/>
          <input placeholder="Buscar departamento…" value={search} onChange={e => setSearch(e.target.value)} style={{flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13}}/>
        </div>
      </div>

      <div className="row row--3">
        {displayed.map(d => {
          const score = window.computeDeptScore(d.id, kpis, kpiWeekly, projects, tasks, poa, _scoreYear, _scoreQuarter);
          const open = (projects[d.id] || []).filter(p => p.status !== "done").length;
          const barColor = score >= 85 ? "var(--positive)" : score >= 70 ? "var(--warning)" : "var(--danger)";
          const statusLbl = score >= 85 ? "Óptimo" : score >= 70 ? "Regular" : "En Riesgo";
          const statusCls = score >= 85 ? "chip--ok" : score >= 70 ? "chip--warn" : "chip--bad";
          return (
            <div key={d.id} className="card" style={{cursor: "pointer", position: "relative"}}>
              <div className="card__hd" style={{paddingBottom: 8}} onClick={() => { setDeptScope(d.id); setView("dashboard"); showToast(`Entrando a ${d.name}`); }}>
                <span style={{width: 10, height: 10, borderRadius: 3, background: d.color}}/>
                <div>
                  <div className="card__title">{d.name}</div>
                  <div className="card__sub mono" style={{fontSize: 10, marginTop: 2}}>{d.short}</div>
                </div>
                <div className="card__actions">
                  <button className="btn btn--sm btn--danger" onClick={e => { e.stopPropagation(); setDeleteDept(d); }} title="Eliminar departamento"><Icon name="x" size={12}/></button>
                  <Icon name="arrow" size={14}/>
                </div>
              </div>
              <div className="card__bd">
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12}}>
                  <div>
                    <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500}}>Score</div>
                    <div style={{fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: barColor}}>{score}%</div>
                  </div>
                  <span className={"chip " + statusCls}><span className="dot"/>{statusLbl}</span>
                </div>
                <div className="deptperf__bar"><span style={{width: Math.min(100, score) + "%", background: barColor}}/></div>
                <div className="flex-c gap-12" style={{marginTop: 12, fontSize: 12}}>
                  <span><b style={{fontWeight: 600}}>{open}</b> <span className="dim">proyectos</span></span>
                  <span><b style={{fontWeight: 600}}>{list.length}</b> <span className="dim">KPIs</span></span>
                  <span><b style={{fontWeight: 600}}>2</b> <span className="dim">viewers</span></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {addingDept && <NewDeptModal onClose={() => setAddingDept(false)} onAdd={handleAddDept}/>}

      {deleteDept && (
        <div className="modal-bg" onClick={() => setDeleteDept(null)}>
          <div className="modal" style={{maxWidth: 420}} onClick={e => e.stopPropagation()}>
            <div className="modal__hd">
              <div className="modal__title">Eliminar departamento</div>
              <button className="iconbtn" onClick={() => setDeleteDept(null)}><span className="ic"><Icon name="x" size={14}/></span></button>
            </div>
            <div className="modal__bd">
              <div className="alert alert--warn">
                <span className="ic-wrap"><Icon name="warn" size={13} stroke={2}/></span>
                <span><b>Acción destructiva.</b> Se eliminará "{deleteDept.name}" del organigrama y de la barra lateral. KPIs, proyectos y documentos asociados quedarán sin scope.</span>
              </div>
              <p style={{margin: "12px 0 0"}}>¿Confirmas la eliminación de <b>{deleteDept.name}</b>?</p>
            </div>
            <div className="modal__ft">
              <button className="btn btn--ghost" onClick={() => setDeleteDept(null)}>Cancelar</button>
              <button className="btn btn--danger" onClick={() => handleDeleteDept(deleteDept.id)}>Eliminar departamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewDeptModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [color, setColor] = useState("#2563eb");
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title">Nuevo departamento</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          <div className="field"><label>Nombre</label><input className="input" placeholder="Ej. Innovación" value={name} onChange={e => setName(e.target.value)} autoFocus/></div>
          <div className="row row--2">
            <div className="field"><label>Código corto</label><input className="input mono" placeholder="INN" maxLength={5} value={short} onChange={e => setShort(e.target.value.toUpperCase())}/></div>
            <div className="field"><label>Color</label><input type="color" value={color} onChange={e => setColor(e.target.value)} style={{width: "100%", height: 38, borderRadius: 8, border: "1px solid var(--line)", padding: 4, background: "var(--bg-2)", cursor: "pointer"}}/></div>
          </div>
          {name && short && (
            <div style={{padding: 10, background: "var(--bg-1)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, marginTop: 4}}>
              <span style={{width: 10, height: 10, borderRadius: 3, background: color}}/>
              <span style={{fontWeight: 500}}>{name}</span>
              <span className="chip mono" style={{fontSize: 10}}>{short}</span>
            </div>
          )}
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" disabled={!name || !short} onClick={() => onAdd(name, short, color)} style={{opacity: !name || !short ? 0.5 : 1}}>
            <Icon name="plus" size={14}/> Crear departamento
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== KPI Weekly Excel-format page =====
function KPIPage({ session, deptScope, setDeptScope, kpis, setKpis, kpiWeekly, setKpiWeekly, addAudit, showToast }) {
  const D = window.INDISA_DATA;
  const role = session.role;
  const readOnly = role === "viewer";
  const effDept = role === "owner" ? deptScope : session.dept;

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [quarter, setQuarter] = useState(() => Math.ceil((new Date().getMonth() + 1) / 3));
  const [addingKpi, setAddingKpi] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const Q_LABELS = ["1ER", "2DO", "3ER", "4TO"];
  const WEEKS = Array.from({ length: 13 }, (_, i) => `S${i + 1}`);

  const currentWeekIdx = useMemo(() => {
    const now = new Date();
    const qStart = new Date(year, (quarter - 1) * 3, 1);
    const days = Math.floor((now - qStart) / 86400000);
    if (days < 0 || days >= 91) return -1;
    return Math.min(12, Math.floor(days / 7));
  }, [year, quarter]);

  const deptGroups = useMemo(() => {
    if (effDept) return [D.DEPT_BY_ID[effDept]].filter(Boolean);
    return D.DEPARTMENTS;
  }, [effDept, D.DEPARTMENTS]);

  function kKey(deptId) { return `${deptId}_${year}_${quarter}`; }
  function getList(deptId) { return (kpiWeekly || {})[kKey(deptId)] || []; }

  function updateWeek(deptId, kpiId, wi, val) {
    const k = kKey(deptId);
    setKpiWeekly(prev => ({
      ...prev,
      [k]: (prev[k] || []).map(item =>
        item.id !== kpiId ? item : { ...item, semanas: item.semanas.map((v, i) => i === wi ? val : v) }
      ),
    }));
    addAudit({ action: `KPI S${wi + 1} actualizado · ${kpiId}=${val}`, user: session.name, dept: deptId, level: "info" });
  }

  function updateMeta(deptId, kpiId, val) {
    const k = kKey(deptId);
    setKpiWeekly(prev => ({
      ...prev,
      [k]: (prev[k] || []).map(item => item.id !== kpiId ? item : { ...item, metaSemanal: val }),
    }));
    addAudit({ action: `KPI meta actualizada · ${kpiId}=${val}`, user: session.name, dept: deptId, level: "info" });
  }

  function updateLabel(deptId, kpiId, val) {
    const k = kKey(deptId);
    setKpiWeekly(prev => ({
      ...prev,
      [k]: (prev[k] || []).map(item => item.id !== kpiId ? item : { ...item, label: val }),
    }));
  }

  function addKpi(deptId, kpi) {
    const k = kKey(deptId);
    setKpiWeekly(prev => ({ ...prev, [k]: [...(prev[k] || []), kpi] }));
    addAudit({ action: `KPI creado · ${kpi.label}`, user: session.name, dept: deptId, level: "success" });
    showToast("KPI agregado");
    setAddingKpi(null);
  }

  function deleteKpi(deptId, kpiId) {
    const k = kKey(deptId);
    setKpiWeekly(prev => ({ ...prev, [k]: (prev[k] || []).filter(item => item.id !== kpiId) }));
    addAudit({ action: `KPI eliminado · ${kpiId}`, user: session.name, dept: deptId, level: "warn" });
    showToast("KPI eliminado");
    setDeleteTarget(null);
  }

  function compute(item) {
    const filled = item.semanas.filter(v => v !== null && v !== undefined);
    const lastVal = filled.length ? filled[filled.length - 1] : null;
    const total = filled.reduce((s, v) => s + v, 0);
    const avg = filled.length ? total / filled.length : 0;
    const varSem = lastVal !== null ? lastVal - item.metaSemanal : null;
    const varTrim = filled.length ? total - item.metaSemanal * 13 : null;
    const acum = total + (item.acumuladoPrevio || 0);
    const pct = lastVal !== null && item.metaSemanal > 0 ? (lastVal / item.metaSemanal) * 100 : null;
    return { lastVal, total, avg, varSem, varTrim, acum, pct };
  }

  function statusInfo(pct) {
    if (pct === null) return { label: "Sin datos", cls: "kpi-badge kpi-st-none" };
    if (pct >= 100) return { label: "Cumplido", cls: "kpi-badge kpi-st-green" };
    if (pct >= 80) return { label: "En Riesgo", cls: "kpi-badge kpi-st-yellow" };
    return { label: "Bajo Desempeño", cls: "kpi-badge kpi-st-red" };
  }

  function cellCls(val, meta) {
    if (val === null || val === undefined || !meta) return "";
    const p = (val / meta) * 100;
    return p >= 100 ? "kpi-cell-green" : p >= 80 ? "kpi-cell-yellow" : "kpi-cell-red";
  }

  function fmtN(n) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    const a = Math.abs(n);
    if (a >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (a >= 1000) return (n / 1000).toFixed(1) + "k";
    return n % 1 !== 0 ? n.toFixed(1) : String(Math.round(n));
  }

  const colCount = readOnly ? 21 : 22;

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">KPIs & Analytics{effDept && D.DEPT_BY_ID[effDept] ? ` · ${D.DEPT_BY_ID[effDept].name}` : ""}</h1>
          <p className="page__sub">Reporte semanal de indicadores · {Q_LABELS[quarter - 1]} Trimestre {year}</p>
        </div>
        <div className="page__actions" style={{ gap: 6 }}>
          <div className="kpi-qtr-picker">
            {[1, 2, 3, 4].map(q => (
              <button key={q} className={"btn btn--sm" + (quarter === q ? " btn--primary" : "")} onClick={() => setQuarter(q)}>
                Q{q}
              </button>
            ))}
            <select className="input" value={year} onChange={e => setYear(+e.target.value)}
              style={{ width: 80, height: 32, fontSize: 12, padding: "0 6px" }}>
              {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {readOnly && <span className="chip"><Icon name="lock" size={11} /> Solo lectura</span>}
          {!readOnly && (
            <button className="btn btn--primary"
              onClick={() => setAddingKpi(effDept || deptGroups[0]?.id || "ope")}>
              <Icon name="plus" size={14} /> Agregar KPI
            </button>
          )}
        </div>
      </div>

      <div className="kpi-excel-wrap">
        {/* Corporate header */}
        <div className="kpi-corp-hd">
          <div className="kpi-corp-r1">
            INDISA{effDept && D.DEPT_BY_ID[effDept] ? ` · ${D.DEPT_BY_ID[effDept].name.toUpperCase()}` : ""}
            <span className="kpi-corp-yr">{year}</span>
          </div>
          <div className="kpi-corp-r2">
            Reporte Semanal de Indicadores y Rendición de Cuentas
            <span style={{ opacity: 0.75, marginLeft: 6 }}>({Q_LABELS[quarter - 1]} TRIMESTRE {year})</span>
          </div>
        </div>

        {/* Scrollable table */}
        <div className="kpi-tbl-outer">
          <table className="kpi-tbl">
            <thead>
              <tr>
                <th className="kpi-th kpi-th-s1">Departamento</th>
                <th className="kpi-th kpi-th-s2">Nombre KPI</th>
                <th className="kpi-th kpi-th-s3">Tipo</th>
                <th className="kpi-th kpi-th-s4">Meta Sem.</th>
                {WEEKS.map((w, i) => (
                  <th key={i} className={"kpi-th kpi-th-wk" + (i === currentWeekIdx ? " kpi-th-wk-now" : "")}>{w}</th>
                ))}
                <th className="kpi-th kpi-th-calc">Var. Sem.</th>
                <th className="kpi-th kpi-th-calc">Prom. Trim.</th>
                <th className="kpi-th kpi-th-calc">Total Trim.</th>
                <th className="kpi-th kpi-th-calc">Var. Trim.</th>
                <th className="kpi-th kpi-th-calc">Acum. Anual</th>
                <th className="kpi-th kpi-th-st">Estado</th>
                {!readOnly && <th className="kpi-th" style={{ width: 36 }} />}
              </tr>
            </thead>
            <tbody>
              {deptGroups.map(dept => {
                const list = getList(dept.id);
                return (
                  <React.Fragment key={dept.id}>
                    <tr className="kpi-sect-row">
                      <td colSpan={colCount}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: dept.color, display: "inline-block", marginRight: 8, verticalAlign: "middle" }} />
                        <strong>{dept.name}</strong>
                        <span style={{ opacity: 0.55, fontWeight: 400, fontSize: 11, marginLeft: 8 }}>
                          · Indicadores Métricos Cuantitativos · {Q_LABELS[quarter - 1]} Trim. {year}
                        </span>
                        {!readOnly && (
                          <button className="btn btn--sm" style={{ float: "right", opacity: 0.75 }}
                            onClick={() => setAddingKpi(dept.id)}>
                            <Icon name="plus" size={11} /> KPI
                          </button>
                        )}
                      </td>
                    </tr>
                    {list.length === 0 && (
                      <tr>
                        <td colSpan={colCount} style={{ textAlign: "center", padding: "18px 12px", color: "var(--text-3)", fontSize: 13 }}>
                          Sin KPIs para el {Q_LABELS[quarter - 1]} trimestre {year}.
                          {!readOnly && ' Pulse "+ KPI" para agregar.'}
                        </td>
                      </tr>
                    )}
                    {list.map(item => {
                      const c = compute(item);
                      const st = statusInfo(c.pct);
                      return (
                        <tr key={dept.id + "_" + item.id} className="kpi-data-row">
                          <td className="kpi-td kpi-td-s1">
                            <span className="kpi-dept-pill" style={{ background: dept.color + "22", color: dept.color }}>
                              {dept.short}
                            </span>
                          </td>
                          <td className="kpi-td kpi-td-s2">
                            <TextCell value={item.label} onCommit={v => updateLabel(dept.id, item.id, v)} readOnly={readOnly}
                              style={{ fontWeight: 500, fontSize: 12, width: "100%" }} />
                          </td>
                          <td className="kpi-td kpi-td-s3">
                            <span style={{ fontSize: 11, color: "var(--text-2)" }}>{item.tipo}</span>
                          </td>
                          <td className="kpi-td kpi-td-s4">
                            <NumCell value={item.metaSemanal} onCommit={v => updateMeta(dept.id, item.id, v)} readOnly={readOnly}
                              style={{ width: 72, textAlign: "right", fontSize: 12 }} />
                          </td>
                          {item.semanas.map((v, wi) => (
                            <td key={wi} className={"kpi-td kpi-td-wk " + cellCls(v, item.metaSemanal) + (wi === currentWeekIdx ? " kpi-td-now" : "")}>
                              <NumCell value={v} onCommit={val => updateWeek(dept.id, item.id, wi, val)} readOnly={readOnly}
                                style={{ width: 58, textAlign: "right", fontSize: 12 }} />
                            </td>
                          ))}
                          <td className={"kpi-td kpi-td-calc mono " + (c.varSem !== null ? (c.varSem >= 0 ? "kpi-pos" : "kpi-neg") : "")}>
                            {c.varSem !== null ? (c.varSem >= 0 ? "+" : "") + fmtN(c.varSem) : "—"}
                          </td>
                          <td className="kpi-td kpi-td-calc mono">{fmtN(Math.round(c.avg * 10) / 10)}</td>
                          <td className="kpi-td kpi-td-calc mono kpi-bold">{fmtN(c.total)}</td>
                          <td className={"kpi-td kpi-td-calc mono " + (c.varTrim !== null ? (c.varTrim >= 0 ? "kpi-pos" : "kpi-neg") : "")}>
                            {c.varTrim !== null ? (c.varTrim >= 0 ? "+" : "") + fmtN(c.varTrim) : "—"}
                          </td>
                          <td className="kpi-td kpi-td-calc mono kpi-bold">{fmtN(c.acum)}</td>
                          <td className="kpi-td kpi-td-st">
                            <span className={st.cls}>{st.label}</span>
                            {c.pct !== null && (
                              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2, fontFamily: "var(--ff-mono)" }}>
                                {Math.min(100, Math.round(c.pct))}%
                              </div>
                            )}
                          </td>
                          {!readOnly && (
                            <td className="kpi-td" style={{ textAlign: "center" }}>
                              <button className="iconbtn" style={{ width: 26, height: 26 }}
                                onClick={() => setDeleteTarget({ deptId: dept.id, kpiId: item.id })}
                                title="Eliminar KPI">
                                <span className="ic"><Icon name="x" size={12} /></span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {addingKpi !== null && (
        <AddKpiWeeklyModal
          deptId={addingKpi}
          deptName={D.DEPT_BY_ID[addingKpi]?.name}
          onClose={() => setAddingKpi(null)}
          onAdd={kpi => addKpi(addingKpi, kpi)}
        />
      )}
      {deleteTarget && (
        <div className="modal-bg" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal__hd">
              <div className="modal__title">Eliminar KPI</div>
              <button className="iconbtn" onClick={() => setDeleteTarget(null)}><span className="ic"><Icon name="x" size={14} /></span></button>
            </div>
            <div className="modal__bd">
              <p style={{ margin: 0 }}>¿Confirmas la eliminación de este KPI? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal__ft">
              <button className="btn btn--ghost" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn btn--danger" onClick={() => deleteKpi(deleteTarget.deptId, deleteTarget.kpiId)}>Eliminar KPI</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddKpiWeeklyModal({ deptId, deptName, onClose, onAdd }) {
  const [label, setLabel] = useState("");
  const [tipo, setTipo] = useState("Cantidad");
  const [meta, setMeta] = useState("");
  const [acumPrev, setAcumPrev] = useState("");
  const TIPOS = ["Cantidad", "Porcentaje", "Tiempo", "Moneda"];
  const id = (label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 15) || "kpi") + "_" + Date.now().toString(36).slice(-4);
  const canSubmit = label.trim() && meta !== "" && !isNaN(parseFloat(meta));

  function submit() {
    if (!canSubmit) return;
    onAdd({
      id,
      label: label.trim(),
      tipo,
      metaSemanal: parseFloat(meta),
      semanas: Array(13).fill(null),
      acumuladoPrevio: parseFloat(acumPrev) || 0,
    });
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title">Agregar KPI{deptName ? ` · ${deptName}` : ""}</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14} /></span></button>
        </div>
        <div className="modal__bd">
          <div className="field">
            <label>Nombre del indicador</label>
            <input className="input" placeholder="Ej. Producción Real" value={label} onChange={e => setLabel(e.target.value)} autoFocus />
          </div>
          <div className="row row--2">
            <div className="field">
              <label>Tipo de KPI</label>
              <select className="input" value={tipo} onChange={e => setTipo(e.target.value)}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Meta semanal</label>
              <input className="input mono" type="number" step="1" placeholder="0" value={meta} onChange={e => setMeta(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Acumulado trimestres anteriores <span className="dim">(opcional)</span></label>
            <input className="input mono" type="number" step="1" placeholder="0" value={acumPrev} onChange={e => setAcumPrev(e.target.value)} />
          </div>
          {label && meta && (
            <div style={{ padding: "10px 12px", background: "var(--bg-1)", borderRadius: 8, border: "1px solid var(--line)", marginTop: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{label}</span>
              <span className="dim" style={{ marginLeft: 8 }}>· {tipo} · Meta: {meta}/sem · 13 semanas vacías</span>
            </div>
          )}
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" disabled={!canSubmit} onClick={submit} style={{ opacity: canSubmit ? 1 : 0.5 }}>
            <Icon name="plus" size={14} /> Agregar KPI
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Departments, KPIPage });
