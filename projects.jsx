// Projects module: Kanban + Timeline + Calendar views
const { useState, useEffect, useMemo, useRef } = React;

function ProjectsPage({ session, deptScope, projects, setProjects, addAudit, showToast }) {
  const D = window.INDISA_DATA;
  const role = session.role;
  const readOnly = role === "viewer";
  const effDept = role === "owner" ? deptScope : session.dept;

  const list = useMemo(() => {
    if (effDept) return projects[effDept] || [];
    return Object.values(projects).flat();
  }, [projects, effDept]);

  const [view, setView] = useState("kanban");
  const [dragId, setDragId] = useState(null);
  const [filter, setFilter] = useState({ prio: "all" });
  const [showFilter, setShowFilter] = useState(false);
  const [open, setOpen] = useState(null);
  const [addingProject, setAddingProject] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const cols = [
    { id: "todo",   label: "Por hacer" },
    { id: "doing",  label: "En curso" },
    { id: "review", label: "Revisión" },
    { id: "done",   label: "Hecho" },
  ];

  function moveProject(pid, status) {
    setProjects(prev => {
      const out = { ...prev };
      for (const did of Object.keys(out)) {
        out[did] = out[did].map(p => p.id === pid ? { ...p, status } : p);
      }
      return out;
    });
    addAudit({ action: `Proyecto movido ${pid} → ${status}`, user: session.name, dept: effDept || "all", level: "info" });
    showToast(`Movido a ${status}`);
  }

  function updateProject(pid, patch) {
    setProjects(prev => {
      const out = { ...prev };
      for (const did of Object.keys(out)) {
        out[did] = out[did].map(p => p.id === pid ? { ...p, ...patch } : p);
      }
      return out;
    });
    addAudit({ action: `Proyecto editado ${pid}`, user: session.name, dept: effDept || "all", level: "info" });
  }

  function createProject(data) {
    const newId = "n" + Math.random().toString(36).slice(2, 6);
    const np = { id: newId, ...data };
    setProjects(prev => ({ ...prev, [data.dept]: [...(prev[data.dept] || []), np] }));
    addAudit({ action: `Proyecto creado: ${data.title}`, user: session.name, dept: data.dept, level: "success" });
    showToast("Proyecto creado");
    setAddingProject(false);
  }

  function deleteProject(pid) {
    setProjects(prev => {
      const out = { ...prev };
      for (const did of Object.keys(out)) out[did] = out[did].filter(p => p.id !== pid);
      return out;
    });
    addAudit({ action: `Proyecto eliminado ${pid}`, user: session.name, dept: effDept || "all", level: "warn" });
    showToast("Proyecto eliminado");
    setDeleteId(null);
    if (open?.id === pid) setOpen(null);
  }

  const filtered = list.filter(p => filter.prio === "all" || p.prio === filter.prio);
  const prioLabels = { all: "Todos", high: "Alta", med: "Media", low: "Baja" };

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">Proyectos</h1>
          <p className="page__sub">{effDept ? D.DEPT_BY_ID[effDept].name : "Todos los departamentos"} · {filtered.length} proyectos</p>
        </div>
        <div className="page__actions">
          <div style={{position: "relative"}}>
            <button className="btn" onClick={() => setShowFilter(f => !f)}>
              <Icon name="filter" size={14}/> {prioLabels[filter.prio]}
            </button>
            {showFilter && (
              <div style={{position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, zIndex: 40, minWidth: 160, boxShadow: "var(--shadow-2)", display: "grid", gap: 4}}>
                <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", padding: "4px 8px 2px"}}>Prioridad</div>
                {["all","high","med","low"].map(p => (
                  <div key={p} onClick={() => { setFilter({ prio: p }); setShowFilter(false); }}
                    style={{padding: "7px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                      background: filter.prio === p ? "var(--accent-soft)" : "transparent", color: filter.prio === p ? "var(--accent)" : "var(--text)"}}>
                    {p !== "all" && <span className={"prio prio--" + p}/>}
                    {prioLabels[p]}
                  </div>
                ))}
              </div>
            )}
          </div>
          {readOnly && <span className="chip"><Icon name="lock" size={11}/> Solo lectura</span>}
          {!readOnly && <button className="btn btn--primary" onClick={() => setAddingProject(true)}><Icon name="plus" size={14}/> Nuevo proyecto</button>}
        </div>
      </div>

      <div className="tabs">
        <div className={"tabs__tab " + (view === "kanban" ? "is-active" : "")} onClick={() => setView("kanban")}>Kanban</div>
        <div className={"tabs__tab " + (view === "timeline" ? "is-active" : "")} onClick={() => setView("timeline")}>Cronograma</div>
        <div className={"tabs__tab " + (view === "table" ? "is-active" : "")} onClick={() => setView("table")}>Tabla</div>
        <div className={"tabs__tab " + (view === "cal" ? "is-active" : "")} onClick={() => setView("cal")}>Calendario</div>
      </div>

      {view === "kanban" && (
        <div className="kanban">
          {cols.map(col => {
            const items = filtered.filter(p => (p.status === col.id) || (col.id === "todo" && p.status === "backlog"));
            return (
              <div key={col.id} className="kcol"
                onDragOver={e => { if (!readOnly) e.preventDefault(); }}
                onDrop={() => { if (!readOnly && dragId) { moveProject(dragId, col.id); setDragId(null); } }}>
                <div className="kcol__hd">
                  <span className="prio" style={{background: col.id === "done" ? "var(--positive)" : col.id === "doing" ? "var(--accent)" : col.id === "review" ? "var(--warning)" : col.id === "todo" ? "var(--info)" : "var(--text-3)"}}/>
                  <div className="kcol__title">{col.label}</div>
                  <div className="kcol__count" style={{marginLeft: "auto"}}>{items.length}</div>
                </div>
                <div className="kcol__bd">
                  {items.map(p => (
                    <div key={p.id}
                      className={"kcard " + (dragId === p.id ? "dragging" : "")}
                      draggable={!readOnly}
                      onDragStart={() => !readOnly && setDragId(p.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setOpen(p)}>
                      <div className="kcard__tag">
                        <span style={{display:"inline-block", width:6, height:6, borderRadius:2, background: (D.DEPT_BY_ID[p.dept]||{}).color || "#666"}}/>
                        {p.tag} · {D.DEPT_BY_ID[p.dept]?.short}
                      </div>
                      <div className="kcard__title">{p.title}</div>
                      <div className="kcard__meta">
                        <span className={"prio prio--" + p.prio}/> <span style={{textTransform: "capitalize"}}>{p.prio}</span>
                        <span style={{marginLeft: 6}} className="mono dim">· {p.due.slice(5)}</span>
                        <div className="kcard__avs">{p.assignees.map((a, i) => <span key={i} className="avi">{a}</span>)}</div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div className="dim" style={{padding: "20px 6px", fontSize: 12, textAlign: "center"}}>Arrastra proyectos aquí</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "timeline" && (
        <Card title={`Cronograma · Q${Math.ceil((new Date().getMonth()+1)/3)} ${new Date().getFullYear()}`} sub="duración estimada · 30 días por proyecto" headerExtra={
          <div className="legend-pills">
            <span className="lp"><span className="sw" style={{background: "var(--danger)"}}/> Alta</span>
            <span className="lp"><span className="sw" style={{background: "var(--warning)"}}/> Media</span>
            <span className="lp"><span className="sw" style={{background: "var(--info)"}}/> Baja</span>
          </div>
        }>
          <Timeline items={filtered} onOpen={setOpen}/>
        </Card>
      )}

      {view === "table" && (
        <Card title="Todos los proyectos" sub={`${filtered.length} filas`}>
          <table className="table">
            <thead><tr><th>Título</th><th>Depto</th><th>Estado</th><th>Prioridad</th><th>Etiqueta</th><th>Fecha</th><th>Equipo</th><th></th></tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{cursor: "pointer"}}>
                  <td onClick={() => setOpen(p)}>{p.title}</td>
                  <td className="dim" onClick={() => setOpen(p)}>{D.DEPT_BY_ID[p.dept]?.name}</td>
                  <td onClick={() => setOpen(p)}><StatusChip status={p.status}/></td>
                  <td onClick={() => setOpen(p)}><span className={"prio prio--" + p.prio}/> <span style={{textTransform: "capitalize", marginLeft: 6, fontSize: 12}}>{p.prio}</span></td>
                  <td onClick={() => setOpen(p)}><span className="chip" style={{fontSize: 10}}>{p.tag}</span></td>
                  <td className="mono dim" style={{fontSize: 12}} onClick={() => setOpen(p)}>{p.due}</td>
                  <td onClick={() => setOpen(p)}><Avatars list={p.assignees}/></td>
                  <td>{!readOnly && <button className="btn btn--sm btn--danger" onClick={() => setDeleteId(p.id)}><Icon name="x" size={12}/></button>}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="dim" style={{textAlign: "center", padding: 24}}>No hay proyectos con ese filtro.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {view === "cal" && (
        <Card title="Calendario · Mayo–Jul 2026">
          <Calendar items={filtered}/>
        </Card>
      )}

      {open && <ProjectModal p={open} readOnly={readOnly} onClose={() => setOpen(null)}
        onSave={(patch) => { if (readOnly) return; updateProject(open.id, patch); setOpen({...open, ...patch}); }}
        onMove={(s) => { if (readOnly) return; moveProject(open.id, s); setOpen({...open, status: s}); }}
        onDelete={() => { setDeleteId(open.id); setOpen(null); }}/>}

      {addingProject && <NewProjectModal session={session} effDept={effDept} onClose={() => setAddingProject(false)} onCreate={createProject}/>}

      {deleteId && (
        <div className="modal-bg" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{maxWidth: 380}} onClick={e => e.stopPropagation()}>
            <div className="modal__hd"><div className="modal__title">Eliminar proyecto</div><button className="iconbtn" onClick={() => setDeleteId(null)}><span className="ic"><Icon name="x" size={14}/></span></button></div>
            <div className="modal__bd"><p style={{margin: 0}}>¿Confirmas la eliminación de este proyecto? Esta acción no se puede deshacer.</p></div>
            <div className="modal__ft">
              <button className="btn btn--ghost" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="btn btn--danger" onClick={() => deleteProject(deleteId)}>Eliminar proyecto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewProjectModal({ session, effDept, onClose, onCreate }) {
  const D = window.INDISA_DATA;
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState(effDept || "ing");
  const [prio, setPrio] = useState("med");
  const [status, setStatus] = useState("todo");
  const [due, setDue] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 2); return d.toISOString().slice(0, 10); });
  const [tag, setTag] = useState("");

  function submit() {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), dept, prio, status, due, tag: tag || "general", assignees: [initials(session.name)] });
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title">Nuevo proyecto</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          <div className="field"><label>Título del proyecto</label><input className="input" placeholder="Ej. Rediseño del portal web" value={title} onChange={e => setTitle(e.target.value)} autoFocus/></div>
          <div className="row row--2">
            <div className="field">
              <label>Departamento</label>
              <select className="select" value={dept} onChange={e => setDept(e.target.value)}>
                {D.DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Etiqueta</label>
              <input className="input" placeholder="Ej. diseño, ops, seguridad" value={tag} onChange={e => setTag(e.target.value)}/>
            </div>
          </div>
          <div className="row row--3">
            <div className="field">
              <label>Estado inicial</label>
              <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="todo">Por hacer</option>
                <option value="doing">En curso</option>
              </select>
            </div>
            <div className="field">
              <label>Prioridad</label>
              <select className="select" value={prio} onChange={e => setPrio(e.target.value)}>
                <option value="low">Baja</option>
                <option value="med">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div className="field"><label>Fecha límite</label><input className="input mono" type="date" value={due} onChange={e => setDue(e.target.value)}/></div>
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" disabled={!title.trim()} onClick={submit} style={{opacity: !title.trim() ? 0.5 : 1}}>
            <Icon name="plus" size={14}/> Crear proyecto
          </button>
        </div>
      </div>
    </div>
  );
}

function Timeline({ items, onOpen }) {
  const D = window.INDISA_DATA;
  const _tnow = new Date();
  const start = new Date(_tnow.getFullYear(), _tnow.getMonth(), 1);
  const end = new Date(_tnow.getFullYear(), _tnow.getMonth() + 4, 0);
  const total = (end - start) / 86400000;
  const today = _tnow;
  const todayPct = ((today - start) / 86400000) / total * 100;
  const fmt = (d) => d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });

  const statusMap = {
    done:   { chip: "chip--ok",     lbl: "Hecho" },
    review: { chip: "chip--warn",   lbl: "Revisión" },
    doing:  { chip: "chip--accent", lbl: "En curso" },
    todo:   { chip: "chip--info",   lbl: "Por hacer" },
    backlog:{ chip: "chip--info",   lbl: "Por hacer" },
  };
  // Bar color is driven by PRIORITY
  const prioMap = {
    high: { c: "var(--danger)",  lbl: "Alta" },
    med:  { c: "var(--warning)", lbl: "Media" },
    low:  { c: "var(--info)",    lbl: "Baja" },
  };

  return (
    <div style={{padding: 6, overflowX: "auto"}}>
      {/* Header */}
      <div style={{display: "grid", gridTemplateColumns: `300px 1fr`, gap: 0, position: "relative", minWidth: 760}}>
        <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, paddingBottom: 8}}>Proyecto</div>
        <div style={{position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid var(--line)", paddingBottom: 6, marginBottom: 6}}>
          {Array.from({length: 4}, (_, i) => new Date(_tnow.getFullYear(), _tnow.getMonth() + i, 1).toLocaleDateString("es-CO", {month: "long"})).map(m => <div key={m} className="dim mono" style={{fontSize: 11, textAlign: "left", textTransform: "uppercase", letterSpacing: ".06em"}}>{m}</div>)}
        </div>
      </div>

      {[...items].sort((a, b) => {
        // Completed projects go to the end; others keep original order, then by due date
        const aDone = a.status === "done" ? 1 : 0;
        const bDone = b.status === "done" ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return new Date(a.due) - new Date(b.due);
      }).map(p => {
        const dueDate = new Date(p.due);
        const sd = new Date(dueDate); sd.setDate(sd.getDate() - 30);
        const left = Math.max(0, ((sd - start) / 86400000) / total * 100);
        const width = Math.max(3, ((dueDate - sd) / 86400000) / total * 100);
        const st = statusMap[p.status] || statusMap.todo;
        const pr = prioMap[p.prio] || prioMap.med;
        const dept = D.DEPT_BY_ID[p.dept];
        const daysLeft = Math.round((dueDate - today) / 86400000);
        const totalDays = Math.round((dueDate - sd) / 86400000);
        const elapsed = Math.max(0, Math.min(totalDays, Math.round((today - sd) / 86400000)));
        const progressPct = p.status === "done" ? 100 : Math.round(elapsed / totalDays * 100);
        const overdue = p.status !== "done" && daysLeft < 0;

        return (
          <div key={p.id} onClick={() => onOpen && onOpen(p)}
            style={{display: "grid", gridTemplateColumns: `300px 1fr`, gap: 0, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)", cursor: "pointer", minWidth: 760}}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-1)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

            {/* Left info column */}
            <div style={{paddingRight: 16, minWidth: 0}}>
              <div className="flex-c gap-8" style={{marginBottom: 4}}>
                <span style={{width: 7, height: 7, borderRadius: 2, background: dept?.color, flexShrink: 0}}/>
                <span style={{fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{p.title}</span>
              </div>
              <div className="flex-c gap-6" style={{flexWrap: "wrap"}}>
                <span className={"chip " + st.chip} style={{fontSize: 9}}><span className="dot"/>{st.lbl}</span>
                <span className="flex-c gap-6" style={{fontSize: 10, color: "var(--text-2)"}}>
                  <span className={"prio prio--" + p.prio}/> {p.prio === "high" ? "Alta" : p.prio === "med" ? "Media" : "Baja"}
                </span>
                <span className="dim mono" style={{fontSize: 10}}>· {dept?.short}</span>
                <span style={{display: "inline-flex", marginLeft: 2}}>
                  {p.assignees.map((a, i) => (
                    <span key={i} style={{width: 18, height: 18, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", border: "1.5px solid var(--panel)", display: "grid", placeItems: "center", fontSize: 8, fontFamily: "var(--ff-mono)", fontWeight: 600, marginLeft: i ? -5 : 0}}>{a}</span>
                  ))}
                </span>
              </div>
            </div>

            {/* Gantt bar */}
            <div style={{position: "relative", height: 38}}>
              <div style={{position: "absolute", left: 0, right: 0, top: 19, height: 1, background: "var(--line)"}}/>
              {/* Today marker */}
              {todayPct >= 0 && todayPct <= 100 && (
                <div style={{position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0, width: 1, borderLeft: "1.5px dashed var(--accent)", zIndex: 1}}>
                  <span style={{position: "absolute", top: -2, left: 3, fontSize: 8, color: "var(--accent)", fontFamily: "var(--ff-mono)", whiteSpace: "nowrap"}}>hoy</span>
                </div>
              )}
              {/* Bar with label */}
              <div style={{position: "absolute", left: `${left}%`, width: `${width}%`, top: 8, minWidth: 90}}>
                <div style={{
                  height: 22, borderRadius: 6,
                  background: pr.c,
                  opacity: 0.92, position: "relative", overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                  display: "flex", alignItems: "center", padding: "0 8px",
                }}>
                  {/* Progress overlay */}
                  <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: `${progressPct}%`, background: "rgba(255,255,255,0.22)"}}/>
                  <span style={{position: "relative", fontSize: 10, color: "#fff", fontFamily: "var(--ff-mono)", fontWeight: 600, whiteSpace: "nowrap"}}>
                    {fmt(sd)} → {fmt(dueDate)}
                  </span>
                </div>
                <div className="dim mono" style={{fontSize: 9, marginTop: 3, whiteSpace: "nowrap"}}>
                  {totalDays}d · {p.status === "done" ? "completado" : overdue ? <span style={{color: "var(--danger)", fontWeight: 600}}>vencido {Math.abs(daysLeft)}d</span> : `${daysLeft}d restantes`}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {items.length === 0 && <div className="dim" style={{textAlign: "center", padding: 30, fontSize: 13}}>No hay proyectos con ese filtro.</div>}
    </div>
  );
}

function Calendar({ items }) {
  const _cnow = new Date();
  const _cYr = _cnow.getFullYear();
  const _cMo = _cnow.getMonth();
  const month = new Date(_cYr, _cMo, 1);
  const days = new Date(_cYr, _cMo + 1, 0).getDate();
  const todayDay = _cnow.getDate();
  const yrStr = String(_cYr);
  const moStr = String(_cMo + 1).padStart(2, "0");
  const startDay = month.getDay();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return (
    <div>
      <div style={{display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4}}>
        {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(d => <div key={d} className="dim mono" style={{fontSize: 10, textTransform: "uppercase", textAlign: "center", padding: "4px 0"}}>{d}</div>)}
        {cells.map((d, i) => {
          const due = d ? items.filter(p => p.due === `${yrStr}-${moStr}-${String(d).padStart(2,"0")}`) : [];
          const today = d === todayDay;
          return (
            <div key={i} style={{minHeight: 84, padding: 6, border: "1px solid var(--line)", borderRadius: 6, background: d ? "var(--panel)" : "transparent"}}>
              {d && <div className="mono" style={{fontSize: 11, color: today ? "var(--accent)" : "var(--text-2)", fontWeight: today ? 600 : 400}}>
                {d}{today && <span style={{display: "inline-block", marginLeft: 4, width: 4, height: 4, borderRadius: "50%", background: "var(--accent)", verticalAlign: "middle"}}/>}
              </div>}
              <div style={{display: "grid", gap: 3, marginTop: 4}}>
                {due.map(p => <div key={p.id} style={{fontSize: 10, padding: "2px 4px", borderRadius: 3, background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent-line)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{p.title}</div>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectModal({ p, onClose, onSave, onMove, onDelete, readOnly }) {
  const D = window.INDISA_DATA;
  const [title, setTitle] = useState(p.title);
  const [prio, setPrio] = useState(p.prio);
  const [due, setDue] = useState(p.due);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([
    { user: "AM", text: "PoC del proveedor confirmado para el próximo sprint.", ts: "Ayer" },
  ]);
  const initialBudget = (D.PROJECT_BUDGETS || {})[p.id] || { budget: 0, spent: 0 };
  const [budget, setBudget] = useState(p.budget != null ? p.budget : initialBudget.budget);
  const [spent, setSpent]   = useState(p.spent  != null ? p.spent  : initialBudget.spent);
  const budgetPct = budget > 0 ? Math.round(spent / budget * 100) : 0;
  const budgetColor = budgetPct >= 100 ? "var(--danger)" : budgetPct >= 85 ? "var(--warning)" : "var(--positive)";
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{width: 640}} onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="flex-c gap-8">
            <StatusChip status={p.status}/>
            <span className="dim mono" style={{fontSize: 11}}>{p.id} · {window.INDISA_DATA.DEPT_BY_ID[p.dept]?.short}</span>
          </div>
          <div className="flex-c gap-6">
            {readOnly && <span className="chip"><Icon name="lock" size={11}/> Solo lectura</span>}
            {!readOnly && <button className="btn btn--sm btn--danger" onClick={onDelete}><Icon name="x" size={12}/> Eliminar</button>}
            <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
          </div>
        </div>
        <div className="modal__bd">
          <input className="input" style={{fontSize: 16, fontWeight: 500, padding: "8px 10px"}} value={title} onChange={e => setTitle(e.target.value)} onBlur={() => onSave({ title })} disabled={readOnly}/>
          <div className="row row--3" style={{marginTop: 14}}>
            <div className="field">
              <label>Prioridad</label>
              <select className="select" value={prio} onChange={e => { setPrio(e.target.value); onSave({ prio: e.target.value }); }} disabled={readOnly}>
                <option value="low">Baja</option>
                <option value="med">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div className="field">
              <label>Fecha límite</label>
              <input className="input mono" type="date" value={due} onChange={e => { setDue(e.target.value); onSave({ due: e.target.value }); }} disabled={readOnly}/>
            </div>
            <div className="field">
              <label>Estado</label>
              <select className="select" value={p.status === "backlog" ? "todo" : p.status} onChange={e => onMove(e.target.value)} disabled={readOnly}>
                <option value="todo">Por hacer</option>
                <option value="doing">En curso</option>
                <option value="review">Revisión</option>
                <option value="done">Hecho</option>
              </select>
            </div>
          </div>
          <div className="divider"/>
          {/* Budget tracking */}
          <div style={{padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-1)", marginBottom: 14}}>
            <div className="flex-c" style={{justifyContent: "space-between", marginBottom: 8}}>
              <div className="dim" style={{fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600}}>Presupuesto</div>
              <span className="mono" style={{fontSize: 13, fontWeight: 600, color: budgetColor}}>{budgetPct}% utilizado</span>
            </div>
            <div className="row row--2" style={{gap: 8, marginBottom: 8}}>
              <div className="field" style={{marginBottom: 0}}>
                <label>Presupuesto ($)</label>
                <input className="input mono" type="number" min="0" value={budget} onChange={e => setBudget(parseFloat(e.target.value) || 0)} onBlur={() => onSave({ budget })} disabled={readOnly}/>
              </div>
              <div className="field" style={{marginBottom: 0}}>
                <label>Gastado ($)</label>
                <input className="input mono" type="number" min="0" value={spent} onChange={e => setSpent(parseFloat(e.target.value) || 0)} onBlur={() => onSave({ spent })} disabled={readOnly}/>
              </div>
            </div>
            <div className="deptperf__bar"><span style={{width: Math.min(100, budgetPct) + "%", background: budgetColor}}/></div>
            <div className="dim mono" style={{fontSize: 11, marginTop: 6, display: "flex", justifyContent: "space-between"}}>
              <span>Gastado: ${spent.toLocaleString()}</span>
              <span>Disponible: ${Math.max(0, budget - spent).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex-c gap-10" style={{justifyContent: "space-between", marginBottom: 10}}>
            <div className="dim" style={{fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em"}}>Comentarios · {notes.length}</div>
            <div className="flex-c gap-8"><Avatars list={p.assignees}/></div>
          </div>
          <div style={{display: "grid", gap: 8}}>
            {notes.map((n, i) => (
              <div key={i} className="flex-c gap-10" style={{padding: 10, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-1)", alignItems: "flex-start"}}>
                <span style={{width: 22, height: 22, borderRadius: "50%", background: "var(--bg-3)", display: "grid", placeItems: "center", fontSize: 9, fontFamily: "var(--ff-mono)", flexShrink: 0}}>{n.user}</span>
                <div style={{flex: 1}}>
                  <div style={{fontSize: 13}}>{n.text}</div>
                  <div className="dim mono" style={{fontSize: 10, marginTop: 4}}>{n.ts}</div>
                </div>
              </div>
            ))}
            <div className="flex-c gap-8">
              <input className="input" placeholder="Escribe un comentario…" value={note} onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && note.trim()) { setNotes([...notes, { user: initials(session.name || "yo"), text: note, ts: "ahora" }]); setNote(""); } }}/>
              <button className="btn" onClick={() => { if (note.trim()) { setNotes([...notes, { user: "yo", text: note, ts: "ahora" }]); setNote(""); } }}><Icon name="arrow" size={14}/></button>
            </div>
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cerrar</button>
          {!readOnly && <button className="btn btn--primary" onClick={() => { onSave({ title }); onClose(); }}>Guardar cambios</button>}
        </div>
      </div>
    </div>
  );
}

window.ProjectsPage = ProjectsPage;
