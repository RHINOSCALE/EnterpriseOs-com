// Projects module: Kanban + Timeline + Calendar views
const { useState, useEffect, useMemo, useRef } = React;

const PROJ_TASK_STATUS = {
  pending:     { label: "Por hacer",  chip: "chip",        color: "var(--text-3)"   },
  in_progress: { label: "En curso",   chip: "chip--warn",  color: "var(--warning)"  },
  blocked:     { label: "Bloqueada",  chip: "chip--bad",   color: "var(--danger)"   },
  completed:   { label: "Hecho",      chip: "chip--ok",    color: "var(--positive)" },
};

function ProjectsPage({ session, deptScope, projects, setProjects, tasks, setTasks, addAudit, showToast }) {
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
  const [filter, setFilter] = useState({ prios: [], statuses: [] });
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

  const filtered = list.filter(p =>
    (filter.prios.length === 0 || filter.prios.includes(p.prio)) &&
    (filter.statuses.length === 0 || filter.statuses.includes(p.status))
  );
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
              <Icon name="filter" size={14}/> {(filter.prios.length + filter.statuses.length) > 0 ? `${filter.prios.length + filter.statuses.length} filtro${filter.prios.length + filter.statuses.length > 1 ? "s" : ""}` : "Filtrar"}
            </button>
            {showFilter && (
              <div style={{position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, zIndex: 40, minWidth: 220, boxShadow: "var(--shadow-2)", display: "grid", gap: 10}}>
                <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600}}>Prioridad</div>
                <div style={{display: "flex", flexWrap: "wrap", gap: 5}}>
                  {[["high","Alta","var(--danger)"],["med","Media","var(--warning)"],["low","Baja","var(--info)"]].map(([k,label,color]) => {
                    const sel = filter.prios.includes(k);
                    return (
                      <div key={k} onClick={() => setFilter(f => ({...f, prios: sel ? f.prios.filter(x => x !== k) : [...f.prios, k]}))}
                        style={{padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 500, userSelect: "none",
                          border: "1px solid " + (sel ? color : "var(--line)"),
                          background: sel ? color + "18" : "var(--bg-1)",
                          color: sel ? color : "var(--text-2)"}}>
                        {label}
                      </div>
                    );
                  })}
                </div>
                <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600}}>Estado</div>
                <div style={{display: "flex", flexWrap: "wrap", gap: 5}}>
                  {[["todo","Por hacer","var(--text-3)"],["doing","En curso","var(--accent)"],["review","Revisión","var(--warning)"],["done","Hecho","var(--positive)"]].map(([k,label,color]) => {
                    const sel = filter.statuses.includes(k);
                    return (
                      <div key={k} onClick={() => setFilter(f => ({...f, statuses: sel ? f.statuses.filter(x => x !== k) : [...f.statuses, k]}))}
                        style={{padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 500, userSelect: "none",
                          border: "1px solid " + (sel ? color : "var(--line)"),
                          background: sel ? color + "18" : "var(--bg-1)",
                          color: sel ? color : "var(--text-2)"}}>
                        {label}
                      </div>
                    );
                  })}
                </div>
                <button className="btn btn--sm" onClick={() => { setFilter({prios:[],statuses:[]}); setShowFilter(false); }}>Limpiar filtros</button>
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

      {open && <ProjectModal p={open} readOnly={readOnly} session={session} tasks={tasks} setTasks={setTasks} addAudit={addAudit} showToast={showToast}
        onClose={() => setOpen(null)}
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
  const isAdmin = session.role === "admin";
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState(isAdmin ? session.dept : (effDept || "ing"));
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
              {isAdmin ? (
                <input className="input" value={D.DEPT_BY_ID[dept]?.name || dept} readOnly style={{ background: "var(--bg-1)", cursor: "not-allowed" }}/>
              ) : (
                <select className="select" value={dept} onChange={e => setDept(e.target.value)}>
                  {D.DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
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
        <div style={{position: "relative", height: 22, borderBottom: "1px solid var(--line)", marginBottom: 6}}>
          {Array.from({length: 4}, (_, i) => {
            const mStart = new Date(_tnow.getFullYear(), _tnow.getMonth() + i, 1);
            const pct = ((mStart - start) / 86400000) / total * 100;
            return (
              <div key={i} className="dim mono" style={{position: "absolute", left: `${pct}%`, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap", lineHeight: "22px"}}>
                {mStart.toLocaleDateString("es-CO", {month: "long"})}
              </div>
            );
          })}
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
        const rawLeft = ((sd - start) / 86400000) / total * 100;
        const rawRight = ((dueDate - start) / 86400000) / total * 100;
        const left = Math.max(0, rawLeft);
        const width = Math.max(3, Math.min(100, rawRight) - left);
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

function ProjectModal({ p, onClose, onSave, onMove, onDelete, readOnly, tasks, setTasks, session, addAudit, showToast }) {
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
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState(session ? initials(session.name) : "");
  const [newTaskDue, setNewTaskDue] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); });
  const [newTaskPrio, setNewTaskPrio] = useState("medium");

  const budgetPct = budget > 0 ? Math.round(spent / budget * 100) : 0;
  const budgetColor = budgetPct >= 100 ? "var(--danger)" : budgetPct >= 85 ? "var(--warning)" : "var(--positive)";

  const projectTasks = useMemo(() => (tasks || []).filter(t => t.project_id === p.id), [tasks, p.id]);
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.status === "completed").length;
  const progressPct = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0;

  const autoStatus = useMemo(() => {
    if (!totalTasks) return p.status;
    if (completedTasks === totalTasks) return "done";
    if (projectTasks.every(t => t.status === "pending")) return "todo";
    return "doing";
  }, [projectTasks, totalTasks, completedTasks, p.status]);

  useEffect(() => {
    if (!readOnly && totalTasks > 0 && autoStatus !== p.status) onMove(autoStatus);
  }, [autoStatus]);

  function toggleTaskDone(tid) {
    if (readOnly) return;
    setTasks(prev => prev.map(t => t.id !== tid ? t : { ...t, status: t.status === "completed" ? "pending" : "completed" }));
  }
  function changeTaskStatus(tid, status) {
    if (readOnly) return;
    setTasks(prev => prev.map(t => t.id === tid ? { ...t, status } : t));
  }
  function deleteProjectTask(tid, taskTitle) {
    if (readOnly) return;
    setTasks(prev => prev.filter(t => t.id !== tid));
    addAudit?.({ action: `Tarea eliminada del proyecto: ${taskTitle}`, user: session?.name || "—", dept: p.dept, level: "warn" });
    showToast?.("Tarea eliminada");
  }
  function submitNewTask() {
    if (!newTaskTitle.trim()) return;
    const newId = "t" + Math.random().toString(36).slice(2, 6);
    setTasks(prev => [...prev, {
      id: newId, title: newTaskTitle.trim(), description: "",
      department: p.dept, project_id: p.id,
      priority: newTaskPrio, status: "pending",
      due_date: newTaskDue, assigned_to: newTaskAssignee || "—",
      tags: [], checklist: [],
    }]);
    addAudit?.({ action: `Tarea creada en proyecto ${p.id}: ${newTaskTitle}`, user: session?.name || "—", dept: p.dept, level: "success" });
    showToast?.("Tarea creada y vinculada al proyecto");
    setNewTaskTitle(""); setAddingTask(false);
  }

  const statusSteps = [
    { id: "todo",  label: "Por hacer" },
    { id: "doing", label: "En curso" },
    { id: "done",  label: "Hecho" },
  ];
  const stepIndex = { todo: 0, doing: 1, review: 1, done: 2 }[autoStatus] ?? 0;
  const progressColor = progressPct === 100 ? "var(--positive)" : progressPct > 0 ? "var(--accent)" : "var(--text-3)";

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{width: 720, maxHeight: "92vh", display: "flex", flexDirection: "column"}} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal__hd">
          <div className="flex-c gap-8">
            <StatusChip status={autoStatus}/>
            <span className="dim mono" style={{fontSize: 11}}>{p.id} · {D.DEPT_BY_ID[p.dept]?.short}</span>
          </div>
          <div className="flex-c gap-6">
            {readOnly && <span className="chip"><Icon name="lock" size={11}/> Solo lectura</span>}
            {!readOnly && <button className="btn btn--sm btn--danger" onClick={onDelete}><Icon name="x" size={12}/> Eliminar</button>}
            <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="modal__bd" style={{overflowY: "auto", flex: 1}}>

          <input className="input" style={{fontSize: 16, fontWeight: 500, padding: "8px 10px"}}
            value={title} onChange={e => setTitle(e.target.value)} onBlur={() => onSave({ title })} disabled={readOnly}/>

          <div className="row row--2" style={{marginTop: 14}}>
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
          </div>

          {/* ─── PROGRESS & AUTO-STATUS ─── */}
          <div className="divider"/>
          <div style={{padding: 16, border: "1px solid var(--line)", borderRadius: 10, background: "var(--bg-1)", marginBottom: 16}}>
            <div className="flex-c" style={{justifyContent: "space-between", marginBottom: 12}}>
              <div style={{fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-2)"}}>Progreso del Proyecto</div>
              <span style={{fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: progressColor}}>{progressPct}%</span>
            </div>
            <div style={{height: 8, borderRadius: 4, background: "var(--line)", overflow: "hidden", marginBottom: 8}}>
              <div style={{height: "100%", width: progressPct + "%", borderRadius: 4, background: progressColor, transition: "width .4s ease"}}/>
            </div>
            <div className="flex-c" style={{justifyContent: "space-between", marginBottom: 18}}>
              <span className="dim mono" style={{fontSize: 11}}>
                {totalTasks > 0 ? `${completedTasks} de ${totalTasks} tareas completadas` : "Sin tareas vinculadas aún"}
              </span>
            </div>

            {/* Status stepper */}
            <div style={{display: "flex", alignItems: "flex-start", position: "relative", paddingBottom: 4}}>
              <div style={{position: "absolute", left: "16.6%", right: "16.6%", top: 16, height: 2, background: "var(--line)", zIndex: 0}}/>
              {statusSteps.map((s, i) => {
                const isActive = i === stepIndex;
                const isPast = i < stepIndex;
                const dotBg = isActive ? "var(--accent)" : isPast ? "var(--positive)" : "var(--bg-2)";
                const dotBorder = isActive ? "var(--accent)" : isPast ? "var(--positive)" : "var(--line)";
                return (
                  <div key={s.id} style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1}}>
                    <div style={{width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center",
                      background: dotBg, border: "2px solid " + dotBorder, transition: "all .3s ease"}}>
                      {isPast
                        ? <span style={{color: "#fff", fontSize: 14, fontWeight: 700}}>✓</span>
                        : <span style={{width: 9, height: 9, borderRadius: "50%", background: isActive ? "#fff" : "var(--text-3)"}}/>}
                    </div>
                    <span style={{fontSize: 11, marginTop: 6, fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--accent)" : isPast ? "var(--positive)" : "var(--text-2)"}}>{s.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="dim" style={{fontSize: 11, textAlign: "center", marginTop: 10}}>
              El estado cambia automáticamente según el progreso de las tareas
            </div>
          </div>

          {/* ─── PROJECT TASKS ─── */}
          <div style={{marginBottom: 16}}>
            <div className="flex-c" style={{justifyContent: "space-between", marginBottom: 12}}>
              <div style={{fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-2)"}}>
                Tareas del Proyecto&nbsp;<span style={{fontWeight: 400, color: "var(--text-3)"}}>· {totalTasks}</span>
              </div>
              {!readOnly && (
                <button className="btn btn--sm btn--primary" onClick={() => setAddingTask(v => !v)}>
                  <Icon name="plus" size={12}/> Nueva tarea
                </button>
              )}
            </div>

            {/* Inline new-task form */}
            {addingTask && !readOnly && (
              <div style={{padding: 12, marginBottom: 10, border: "1.5px dashed var(--accent)", borderRadius: 8, background: "var(--accent-soft)"}}>
                <input className="input" placeholder="Título de la tarea…" value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitNewTask()} autoFocus
                  style={{fontWeight: 500, marginBottom: 8}}/>
                <div style={{display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, alignItems: "center"}}>
                  <input className="input mono" type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)}/>
                  <input className="input mono" placeholder="Resp." maxLength={3}
                    style={{textTransform: "uppercase", width: 70}}
                    value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value.toUpperCase())}/>
                  <select className="select" value={newTaskPrio} onChange={e => setNewTaskPrio(e.target.value)} style={{minWidth: 90}}>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                  <div className="flex-c gap-6">
                    <button className="btn btn--sm btn--primary" onClick={submitNewTask} disabled={!newTaskTitle.trim()} style={{opacity: !newTaskTitle.trim() ? 0.5 : 1}}>Agregar</button>
                    <button className="btn btn--sm btn--ghost" onClick={() => { setAddingTask(false); setNewTaskTitle(""); }}>✕</button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {totalTasks === 0 ? (
              <div style={{textAlign: "center", padding: "28px 20px", border: "1px dashed var(--line)", borderRadius: 8, background: "var(--bg-1)"}}>
                <div style={{fontSize: 13, color: "var(--text-2)", marginBottom: 6}}>Sin tareas vinculadas a este proyecto</div>
                {!readOnly && <div className="dim" style={{fontSize: 11}}>Usa "Nueva tarea" para agregar y rastrear el progreso automáticamente</div>}
              </div>
            ) : (
              <div style={{border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden"}}>
                {/* Table header */}
                <div style={{display: "grid", gridTemplateColumns: "32px 1fr 48px 120px 84px 34px", padding: "8px 12px",
                  borderBottom: "1px solid var(--line)", background: "var(--bg-1)"}}>
                  {["", "Tarea", "Resp.", "Estado", "Fecha", ""].map((h, i) => (
                    <div key={i} className="dim mono" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600}}>{h}</div>
                  ))}
                </div>
                {/* Rows */}
                {projectTasks.map((t, idx) => {
                  const st = PROJ_TASK_STATUS[t.status] || PROJ_TASK_STATUS.pending;
                  const isOverdue = t.status !== "completed" && t.due_date && new Date(t.due_date) < new Date();
                  const isDone = t.status === "completed";
                  return (
                    <div key={t.id} style={{
                      display: "grid", gridTemplateColumns: "32px 1fr 48px 120px 84px 34px",
                      padding: "10px 12px", alignItems: "center",
                      borderBottom: idx < projectTasks.length - 1 ? "1px solid var(--line)" : "none",
                      background: "var(--panel)", transition: "background .12s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-1)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--panel)"}>
                      <input type="checkbox" checked={isDone} onChange={() => toggleTaskDone(t.id)} disabled={readOnly}
                        style={{accentColor: "var(--positive)", width: 15, height: 15, cursor: readOnly ? "default" : "pointer"}}/>
                      <div style={{minWidth: 0, paddingRight: 8}}>
                        <div style={{fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          textDecoration: isDone ? "line-through" : "none", color: isDone ? "var(--text-2)" : "var(--text)"}}>
                          {t.title}
                        </div>
                      </div>
                      <div>
                        <span style={{width: 26, height: 26, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)",
                          display: "inline-grid", placeItems: "center", fontSize: 9, fontFamily: "var(--ff-mono)", fontWeight: 700}}>
                          {t.assigned_to}
                        </span>
                      </div>
                      <div>
                        {!readOnly ? (
                          <select style={{fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--line)",
                            background: "var(--bg-1)", color: st.color, fontWeight: 600, cursor: "pointer", width: "100%"}}
                            value={t.status} onChange={e => changeTaskStatus(t.id, e.target.value)}>
                            <option value="pending">Por hacer</option>
                            <option value="in_progress">En curso</option>
                            <option value="completed">Hecho</option>
                            <option value="blocked">Bloqueada</option>
                          </select>
                        ) : (
                          <span className={"chip " + st.chip} style={{fontSize: 10}}><span className="dot"/>{st.label}</span>
                        )}
                      </div>
                      <div className="mono" style={{fontSize: 11, color: isOverdue ? "var(--danger)" : "var(--text-2)"}}>
                        {t.due_date?.slice(5) || "—"}{isOverdue && " ⚠"}
                      </div>
                      <div style={{textAlign: "center"}}>
                        {!readOnly && (
                          <button style={{padding: "3px 5px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "var(--text-2)", lineHeight: 1}}
                            title="Eliminar tarea" onClick={() => deleteProjectTask(t.id, t.title)}
                            onMouseEnter={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "var(--danger-soft)"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-2)"; e.currentTarget.style.background = "transparent"; }}>
                            <Icon name="x" size={12}/>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── BUDGET ─── */}
          <div className="divider"/>
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

          {/* ─── COMMENTS ─── */}
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
                onKeyDown={e => { if (e.key === "Enter" && note.trim()) { setNotes([...notes, { user: initials(session?.name || "yo"), text: note, ts: "ahora" }]); setNote(""); } }}/>
              <button className="btn" onClick={() => { if (note.trim()) { setNotes([...notes, { user: initials(session?.name || "yo"), text: note, ts: "ahora" }]); setNote(""); } }}><Icon name="arrow" size={14}/></button>
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
