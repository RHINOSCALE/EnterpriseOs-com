// Departments overview + KPI analytics page
const { useState, useEffect, useMemo, useRef } = React;

// ===== Departments overview =====
function Departments({ session, kpis, projects, departments, setDepartments, setView, setDeptScope, showToast, addAudit }) {
  const D = window.INDISA_DATA;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  const [addingDept, setAddingDept] = useState(false);
  const [deleteDept, setDeleteDept] = useState(null);

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
    const list = kpis[d.id] || [];
    const score = list.length ? Math.min(100, Math.round(list.reduce((s,k) => s + Math.min(1.0, k.value/k.target), 0) / list.length * 100)) : 60;
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
          const list = kpis[d.id] || [];
          const score = list.length ? Math.min(100, Math.round(list.reduce((s,k) => s + Math.min(1.0, k.value/k.target), 0) / list.length * 100)) : 60;
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

// ===== KPI Analytics page =====
function KPIPage({ session, deptScope, setDeptScope, kpis, setKpis, addAudit, showToast }) {
  const D = window.INDISA_DATA;
  const role = session.role;
  const readOnly = role === "viewer";
  const effDept = role === "owner" ? deptScope : session.dept;
  const cardKpis = effDept ? (kpis[effDept] || []) : (kpis._company || []);
  const ctx = effDept ? D.DEPT_BY_ID[effDept].name : "Compañía";

  const [tab, setTab] = useState("table");
  const [addingKpi, setAddingKpi] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Groups to render: one group if scoped to a dept; otherwise Compañía + every department
  const groups = effDept
    ? [{ key: effDept, label: D.DEPT_BY_ID[effDept].name, color: D.DEPT_BY_ID[effDept].color, list: kpis[effDept] || [] }]
    : [
        { key: "_company", label: "Compañía (consolidado)", color: "var(--accent)", list: kpis._company || [] },
        ...D.DEPARTMENTS.map(d => ({ key: d.id, label: d.name, color: d.color, list: kpis[d.id] || [] })),
      ];

  function updateKpi(target, id, field, value) {
    setKpis(prev => {
      const list = (prev[target] || []).map(k => k.id === id ? { ...k, [field]: value } : k);
      return { ...prev, [target]: list };
    });
    addAudit({ action: `KPI editado · ${id}.${field} → ${value}`, user: session.name, dept: target, level: "info" });
  }

  function deleteKpi(target, id) {
    setKpis(prev => ({ ...prev, [target]: (prev[target] || []).filter(k => k.id !== id) }));
    addAudit({ action: `KPI eliminado · ${id}`, user: session.name, dept: target, level: "warn" });
    showToast("KPI eliminado");
    setDeleteId(null);
  }

  function addKpi(kpi) {
    const target = effDept || "_company";
    setKpis(prev => ({ ...prev, [target]: [...(prev[target] || []), kpi] }));
    addAudit({ action: `KPI creado · ${kpi.label}`, user: session.name, dept: target, level: "success" });
    showToast("KPI agregado");
    setAddingKpi(false);
  }

  function sync() {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); showToast("Datos sincronizados correctamente"); }, 1200);
  }

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">KPIs & Analytics · {ctx}</h1>
          <p className="page__sub">Métricas editables con metas y seguimiento de progreso</p>
        </div>
        <div className="page__actions">
          {readOnly && <span className="chip"><Icon name="lock" size={11}/> Solo lectura</span>}
          {!readOnly && <button className="btn" onClick={sync} disabled={syncing}>
            <Icon name="refresh" size={14} className={syncing ? "spin" : ""}/> {syncing ? "Sincronizando…" : "Sincronizar"}
          </button>}
          {!readOnly && <button className="btn btn--primary" onClick={() => setAddingKpi(true)}><Icon name="plus" size={14}/> Agregar KPI</button>}
        </div>
      </div>

      <div className="tabs">
        <div className={"tabs__tab " + (tab === "table" ? "is-active" : "")} onClick={() => setTab("table")}>Tabla editable</div>
        <div className={"tabs__tab " + (tab === "viz" ? "is-active" : "")} onClick={() => setTab("viz")}>Visualizaciones</div>
        <div className={"tabs__tab " + (tab === "comp" ? "is-active" : "")} onClick={() => setTab("comp")}>Comparaciones</div>
      </div>

      {tab === "table" && (
        <div style={{display: "grid", gap: 14}}>
          {groups.map(g => (
            <Card key={g.key} noPad>
              <div className="card__hd" style={{padding: "14px 16px", borderBottom: "1px solid var(--line)"}}>
                <span style={{width: 10, height: 10, borderRadius: 3, background: g.color}}/>
                <div className="card__title">{g.label}</div>
                <div className="card__sub mono" style={{marginLeft: 8}}>{g.list.length} KPIs</div>
                <div className="card__actions">
                  {!effDept && g.key !== "_company" && (
                    <button className="btn btn--sm" onClick={() => { if (role === "owner") { setDeptScope(g.key); } }}>
                      Entrar <Icon name="arrow" size={12}/>
                    </button>
                  )}
                </div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Métrica</th>
                    <th className="right">Actual</th>
                    <th className="right">Meta</th>
                    <th>Progreso</th>
                    <th className="right">Δ</th>
                    <th>Tendencia (12 m)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {g.list.map(k => {
                    const pct = Math.min(100, Math.round(k.value / k.target * 100));
                    const color = pct >= 100 ? "var(--positive)" : pct >= 70 ? "var(--accent)" : pct >= 40 ? "var(--warning)" : "var(--danger)";
                    return (
                      <tr key={g.key + "_" + k.id}>
                        <td>
                          <TextCell value={k.label} onCommit={v => updateKpi(g.key, k.id, "label", v)} readOnly={readOnly} style={{fontWeight: 500, width: "100%"}}/>
                          <div className="dim mono" style={{fontSize: 10, marginTop: 2}}>{k.id} · {k.unit || "n/a"}</div>
                        </td>
                        <td className="right mono">
                          <NumCell value={k.value} onCommit={v => updateKpi(g.key, k.id, "value", v)} readOnly={readOnly} style={{textAlign: "right", width: 80}}/>
                        </td>
                        <td className="right mono">
                          <NumCell value={k.target} onCommit={v => updateKpi(g.key, k.id, "target", v)} readOnly={readOnly} style={{textAlign: "right", width: 80}}/>
                        </td>
                        <td style={{minWidth: 160}}><div className="deptperf__bar"><span style={{width: pct + "%", background: color}}/></div></td>
                        <td className="right mono" style={{color: k.deltaPct >= 0 ? "var(--positive)" : "var(--danger)"}}>{k.deltaPct >= 0 ? "+" : ""}{k.deltaPct.toFixed(1)}%</td>
                        <td><Sparkline data={k.trend} width={120} height={28} color="var(--accent)"/></td>
                        <td className="right" style={{whiteSpace: "nowrap"}}>
                          <div style={{display: "inline-flex", gap: 6, alignItems: "center"}}>
                            {pct >= 100 ? <span className="chip chip--ok"><span className="dot"/>en meta</span> : pct >= 70 ? <span className="chip chip--accent"><span className="dot"/>en curso</span> : pct >= 40 ? <span className="chip chip--warn"><span className="dot"/>en riesgo</span> : <span className="chip chip--bad"><span className="dot"/>fuera</span>}
                            {!readOnly && <button className="btn btn--sm btn--danger" onClick={() => setDeleteId({ target: g.key, id: k.id })} title="Eliminar KPI"><Icon name="x" size={12}/></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {g.list.length === 0 && <tr><td colSpan={7} className="dim" style={{textAlign: "center", padding: 20}}>Sin KPIs en {g.label}.</td></tr>}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}

      {tab === "viz" && (
        <>
          {(() => {
            const PALETTE = ["var(--accent)","var(--positive)","var(--warning)","#8b5cf6","#0ea5e9","#ec4899","#14b8a6","#f97316","#ef4444","#6366f1"];
            return (
          <div className="row row--2" style={{marginBottom: 14}}>
            <Card title="Línea — métricas del scope" sub={`${cardKpis.length} métricas · últimos 12 meses`} headerExtra={
              <div className="legend" style={{maxWidth: 360, justifyContent: "flex-end"}}>
                {cardKpis.map((k, i) => (
                  <span key={k.id} className="lg"><span className="sw" style={{background: PALETTE[i % PALETTE.length]}}/> {k.label}</span>
                ))}
              </div>
            }>
              <LineChart series={cardKpis.map((k, i) => ({ name: k.label, data: k.trend, color: PALETTE[i % PALETTE.length] }))}
                labels={["J","J","A","S","O","N","D","E","F","M","A","M"]} height={260} area={false}/>
            </Card>
            <Card title="Radar — KPI vs meta" sub="normalizado">
              <div style={{display: "grid", placeItems: "center"}}>
                <RadarChart axes={cardKpis.map(k => k.label.split(" ")[0])} series={[{ data: cardKpis.map(k => Math.min(1.1, k.value/k.target)), color: "var(--accent)" }]}/>
              </div>
            </Card>
          </div>
            ); })()}
          <div className="row row--3">
            {cardKpis.map(k => (
              <Card key={k.id} title={k.label}>
                <div style={{display: "grid", placeItems: "center"}}>
                  <GaugeChart value={k.value} target={k.target} unit={k.unit} label={k.id} size={200}/>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "comp" && (
        <Card title="Comparación entre departamentos" sub="todos los departamentos · score normalizado">
          <table className="table">
            <thead><tr><th>Departamento</th>{cardKpis.slice(0,4).map(k => <th key={k.id} className="right">{k.label}</th>)}<th>Composito</th></tr></thead>
            <tbody>
              {D.DEPARTMENTS.map(d => {
                const list = kpis[d.id] || [];
                const composite = list.length ? Math.min(100, Math.round(list.reduce((s,k) => s + Math.min(1.0, k.value/k.target), 0) / list.length * 100)) : 60;
                const color = composite >= 85 ? "var(--positive)" : composite >= 70 ? "var(--warning)" : "var(--danger)";
                return (
                  <tr key={d.id}>
                    <td><span style={{display: "inline-block", width: 8, height: 8, borderRadius: 2, background: d.color, marginRight: 8}}/>{d.name}</td>
                    {[0,1,2,3].map(i => {
                      const v = (list[i] || {value: 0, target: 100});
                      const score = Math.round(v.value / v.target * 100);
                      return <td key={i} className="right mono dim" style={{fontSize: 12}}>{list[i] ? `${score}%` : "—"}</td>;
                    })}
                    <td style={{width: 200}}>
                      <div className="deptperf__bar"><span style={{width: Math.min(100, composite) + "%", background: color}}/></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {addingKpi && <AddKpiModal dept={effDept} onClose={() => setAddingKpi(false)} onAdd={addKpi}/>}
      {deleteId && (
        <div className="modal-bg" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{maxWidth: 380}} onClick={e => e.stopPropagation()}>
            <div className="modal__hd"><div className="modal__title">Eliminar KPI</div><button className="iconbtn" onClick={() => setDeleteId(null)}><span className="ic"><Icon name="x" size={14}/></span></button></div>
            <div className="modal__bd"><p style={{margin: 0}}>¿Confirmas la eliminación de este KPI? Esta acción no se puede deshacer.</p></div>
            <div className="modal__ft">
              <button className="btn btn--ghost" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="btn btn--danger" onClick={() => deleteKpi(deleteId.target, deleteId.id)}>Eliminar KPI</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddKpiModal({ dept, onClose, onAdd }) {
  const D = window.INDISA_DATA;
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState("%");
  const [value, setValue] = useState("");
  const [target, setTarget] = useState("");
  const id = label.toLowerCase().replace(/\s+/g, "_").slice(0, 12) || "kpi_new";

  function submit() {
    if (!label || !value || !target) return;
    const trend = Array.from({length: 12}, (_, i) => parseFloat(value) * (0.85 + i * 0.012 + (Math.random() - 0.5) * 0.08));
    onAdd({ id, label, unit, value: parseFloat(value), target: parseFloat(target), deltaPct: 0, trend });
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title">Agregar KPI{dept ? " · " + D.DEPT_BY_ID[dept]?.name : ""}</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          <div className="field"><label>Nombre del indicador</label><input className="input" placeholder="Ej. Satisfacción del cliente" value={label} onChange={e => setLabel(e.target.value)} autoFocus/></div>
          <div className="row row--3">
            <div className="field"><label>Unidad</label><input className="input mono" placeholder="%" value={unit} onChange={e => setUnit(e.target.value)}/></div>
            <div className="field"><label>Valor actual</label><input className="input mono" type="number" step="0.1" placeholder="0" value={value} onChange={e => setValue(e.target.value)}/></div>
            <div className="field"><label>Meta</label><input className="input mono" type="number" step="0.1" placeholder="100" value={target} onChange={e => setTarget(e.target.value)}/></div>
          </div>
          {label && value && target && (
            <div style={{padding: "10px 12px", background: "var(--bg-1)", borderRadius: 8, border: "1px solid var(--line)", marginTop: 4}}>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <span style={{fontWeight: 500}}>{label}</span>
                <span className="chip chip--accent"><span className="dot"/>{Math.round(parseFloat(value)/parseFloat(target)*100)}% de meta</span>
              </div>
              <div className="deptperf__bar" style={{marginTop: 8}}><span style={{width: Math.min(100, Math.round(parseFloat(value)/parseFloat(target)*100)) + "%", background: "var(--accent)"}}/></div>
            </div>
          )}
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" disabled={!label || !value || !target} onClick={submit} style={{opacity: !label || !value || !target ? 0.5 : 1}}>
            <Icon name="plus" size={14}/> Agregar KPI
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Departments, KPIPage });
