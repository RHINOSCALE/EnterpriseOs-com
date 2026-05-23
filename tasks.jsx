// Tasks module — independent from Projects, with checklists, assignees, priorities
const { useState, useEffect, useMemo, useRef } = React;

const TASK_STATUS = [
  { id: "pending",     label: "Pendiente",  color: "var(--text-3)",   chip: "chip" },
  { id: "in_progress", label: "En progreso",color: "var(--accent)",   chip: "chip--accent" },
  { id: "blocked",     label: "Bloqueada",  color: "var(--danger)",   chip: "chip--bad" },
  { id: "completed",   label: "Completada", color: "var(--positive)", chip: "chip--ok" },
];
const TASK_PRIO = {
  low:      { label: "Baja",     color: "var(--info)",     cls: "prio--low" },
  medium:   { label: "Media",    color: "var(--warning)",  cls: "prio--med" },
  high:     { label: "Alta",     color: "var(--danger)",   cls: "prio--high" },
  critical: { label: "Crítica",  color: "#7c2d12",         cls: "prio--high" },
};

function TasksPage({ session, deptScope, tasks, setTasks, projects, addAudit, showToast }) {
  const D = window.INDISA_DATA;
  const role = session.role;
  const readOnly = role === "viewer";
  const effDept = role === "owner" ? deptScope : session.dept;

  const list = useMemo(() => {
    return effDept ? tasks.filter(t => t.department === effDept) : tasks;
  }, [tasks, effDept]);

  const [view, setView] = useState("kanban");
  const [dragId, setDragId] = useState(null);
  const [filter, setFilter] = useState({ prios: [], statuses: [] });
  const [showFilter, setShowFilter] = useState(false);
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  function moveTask(tid, status) {
    setTasks(prev => prev.map(t => t.id === tid ? { ...t, status } : t));
    addAudit({ action: `Tarea movida ${tid} → ${status}`, user: session.name, dept: effDept || "all", level: "info" });
    showToast(`Tarea → ${status}`);
  }

  function updateTask(tid, patch) {
    setTasks(prev => prev.map(t => t.id === tid ? { ...t, ...patch } : t));
  }

  function toggleChecklistAndStatus(tid, cid) {
    setTasks(prev => prev.map(t => {
      if (t.id !== tid) return t;
      const checklist = t.checklist.map(c => c.id === cid ? { ...c, done: !c.done } : c);
      if (!checklist.length) return { ...t, checklist };
      const doneCount = checklist.filter(c => c.done).length;
      const status = doneCount === checklist.length ? "completed"
        : doneCount > 0 ? "in_progress"
        : "pending";
      return { ...t, checklist, status };
    }));
  }

  function addChecklist(tid, text) {
    setTasks(prev => prev.map(t => {
      if (t.id !== tid) return t;
      const cid = "c" + Math.random().toString(36).slice(2,5);
      return { ...t, checklist: [...t.checklist, { id: cid, text, done: false }] };
    }));
  }

  function removeChecklist(tid, cid) {
    setTasks(prev => prev.map(t => t.id === tid ? { ...t, checklist: t.checklist.filter(c => c.id !== cid) } : t));
  }

  function createTask(data) {
    const newId = "t" + Math.random().toString(36).slice(2,6);
    const newTask = { id: newId, ...data, checklist: [] };
    setTasks(prev => [newTask, ...prev]);
    addAudit({ action: `Tarea creada: ${data.title}`, user: session.name, dept: data.department, level: "success" });
    showToast("Tarea creada");
    setAdding(false);
  }

  function deleteTask(tid) {
    setTasks(prev => prev.filter(t => t.id !== tid));
    addAudit({ action: `Tarea eliminada ${tid}`, user: session.name, dept: effDept || "all", level: "warn" });
    showToast("Tarea eliminada");
    setDeleteId(null);
    if (open?.id === tid) setOpen(null);
  }

  const filtered = list.filter(t =>
    (filter.prios.length === 0 || filter.prios.includes(t.priority)) &&
    (filter.statuses.length === 0 || filter.statuses.includes(t.status))
  );

  // Stats
  const completed = filtered.filter(t => t.status === "completed").length;
  const inProgress = filtered.filter(t => t.status === "in_progress").length;
  const blocked = filtered.filter(t => t.status === "blocked").length;
  const overdue = filtered.filter(t => t.status !== "completed" && new Date(t.due_date) < new Date()).length;

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">Tareas</h1>
          <p className="page__sub">{effDept ? D.DEPT_BY_ID[effDept].name : "Todos los departamentos"} · {filtered.length} tareas</p>
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
                  {Object.entries(TASK_PRIO).map(([k,v]) => {
                    const sel = filter.prios.includes(k);
                    return (
                      <div key={k} onClick={() => setFilter(f => ({...f, prios: sel ? f.prios.filter(x => x !== k) : [...f.prios, k]}))}
                        style={{padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 500, userSelect: "none",
                          border: "1px solid " + (sel ? v.color : "var(--line)"),
                          background: sel ? v.color + "18" : "var(--bg-1)",
                          color: sel ? v.color : "var(--text-2)"}}>
                        {v.label}
                      </div>
                    );
                  })}
                </div>
                <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600}}>Estado</div>
                <div style={{display: "flex", flexWrap: "wrap", gap: 5}}>
                  {TASK_STATUS.map(s => {
                    const sel = filter.statuses.includes(s.id);
                    return (
                      <div key={s.id} onClick={() => setFilter(f => ({...f, statuses: sel ? f.statuses.filter(x => x !== s.id) : [...f.statuses, s.id]}))}
                        style={{padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 500, userSelect: "none",
                          border: "1px solid " + (sel ? s.color : "var(--line)"),
                          background: sel ? s.color + "18" : "var(--bg-1)",
                          color: sel ? s.color : "var(--text-2)"}}>
                        {s.label}
                      </div>
                    );
                  })}
                </div>
                <button className="btn btn--sm" onClick={() => { setFilter({prios:[],statuses:[]}); setShowFilter(false); }}>Limpiar filtros</button>
              </div>
            )}
          </div>
          {readOnly && <span className="chip"><Icon name="lock" size={11}/> Solo lectura</span>}
          {!readOnly && <button className="btn btn--primary" onClick={() => setAdding(true)}><Icon name="plus" size={14}/> Nueva tarea</button>}
        </div>
      </div>

      <div className="row row--4" style={{marginBottom: 14}}>
        <Card title="En progreso"><div style={{fontSize: 30, fontWeight: 600, color: "var(--accent)", letterSpacing: "-0.02em"}}>{inProgress}</div></Card>
        <Card title="Completadas"><div style={{fontSize: 30, fontWeight: 600, color: "var(--positive)", letterSpacing: "-0.02em"}}>{completed}</div></Card>
        <Card title="Bloqueadas"><div style={{fontSize: 30, fontWeight: 600, color: "var(--danger)", letterSpacing: "-0.02em"}}>{blocked}</div></Card>
        <Card title="Vencidas"><div style={{fontSize: 30, fontWeight: 600, color: "var(--warning)", letterSpacing: "-0.02em"}}>{overdue}</div></Card>
      </div>

      <div className="tabs">
        <div className={"tabs__tab " + (view === "kanban" ? "is-active" : "")} onClick={() => setView("kanban")}>Tablero</div>
        <div className={"tabs__tab " + (view === "list" ? "is-active" : "")} onClick={() => setView("list")}>Lista</div>
        <div className={"tabs__tab " + (view === "mine" ? "is-active" : "")} onClick={() => setView("mine")}>Asignadas a mí</div>
      </div>

      {view === "kanban" && (
        <div className="kanban">
          {TASK_STATUS.map(col => {
            const items = filtered.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="kcol"
                onDragOver={e => { if (!readOnly) e.preventDefault(); }}
                onDrop={() => { if (!readOnly && dragId) { moveTask(dragId, col.id); setDragId(null); } }}>
                <div className="kcol__hd">
                  <span className="prio" style={{background: col.color}}/>
                  <div className="kcol__title">{col.label}</div>
                  <div className="kcol__count" style={{marginLeft: "auto"}}>{items.length}</div>
                </div>
                <div className="kcol__bd">
                  {items.map(t => {
                    const checks = t.checklist.length;
                    const done = t.checklist.filter(c => c.done).length;
                    const isOverdue = t.status !== "completed" && new Date(t.due_date) < new Date();
                    return (
                      <div key={t.id}
                        className={"kcard " + (dragId === t.id ? "dragging" : "")}
                        draggable={!readOnly}
                        onDragStart={() => !readOnly && setDragId(t.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => setOpen(t)}>
                        <div className="kcard__tag">
                          <span style={{display:"inline-block", width:6, height:6, borderRadius:2, background: (D.DEPT_BY_ID[t.department]||{}).color || "#666"}}/>
                          {D.DEPT_BY_ID[t.department]?.short}{t.project_id ? " · " + t.project_id : ""}
                        </div>
                        <div className="kcard__title">{t.title}</div>
                        {checks > 0 && (
                          <div className="dim" style={{fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", gap: 4}}>
                            <Icon name="checkbox" size={11}/> {done}/{checks}
                          </div>
                        )}
                        <div className="kcard__meta" style={{marginTop: 6}}>
                          <span className={"prio " + TASK_PRIO[t.priority]?.cls}/> <span style={{textTransform: "capitalize"}}>{TASK_PRIO[t.priority]?.label}</span>
                          <span style={{marginLeft: 6}} className="mono dim" style={{color: isOverdue ? "var(--danger)" : "var(--text-3)", fontFamily: "var(--ff-mono)", fontSize: 11}}>· {t.due_date.slice(5)}</span>
                          <div className="kcard__avs">
                            <span className="avi">{t.assigned_to}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && <div className="dim" style={{padding: "20px 6px", fontSize: 12, textAlign: "center"}}>Sin tareas</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <Card title="Todas las tareas" sub={`${filtered.length} filas`}>
          <table className="table">
            <thead><tr><th>Título</th><th>Depto</th><th>Estado</th><th>Prio</th><th>Asignada</th><th>Fecha</th><th>Checklist</th><th></th></tr></thead>
            <tbody>
              {filtered.map(t => {
                const checks = t.checklist.length;
                const done = t.checklist.filter(c => c.done).length;
                const st = TASK_STATUS.find(s => s.id === t.status);
                return (
                  <tr key={t.id} style={{cursor: "pointer"}}>
                    <td onClick={() => setOpen(t)}>{t.title}</td>
                    <td className="dim" onClick={() => setOpen(t)}>{D.DEPT_BY_ID[t.department]?.name}</td>
                    <td onClick={() => setOpen(t)}><span className={"chip " + st.chip}><span className="dot"/>{st.label}</span></td>
                    <td onClick={() => setOpen(t)}><span className={"prio " + TASK_PRIO[t.priority]?.cls}/> <span style={{marginLeft: 6, fontSize: 12}}>{TASK_PRIO[t.priority]?.label}</span></td>
                    <td onClick={() => setOpen(t)}><span className="avi" style={{width: 22, height: 22, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", display: "inline-grid", placeItems: "center", fontSize: 10, fontFamily: "var(--ff-mono)", fontWeight: 600}}>{t.assigned_to}</span></td>
                    <td className="mono dim" style={{fontSize: 12}} onClick={() => setOpen(t)}>{t.due_date}</td>
                    <td onClick={() => setOpen(t)}>{checks > 0 ? <span className="chip" style={{fontSize: 11}}>{done}/{checks}</span> : <span className="dim">—</span>}</td>
                    <td>{!readOnly && <button className="btn btn--sm btn--danger" onClick={() => setDeleteId(t.id)}><Icon name="x" size={12}/></button>}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="dim" style={{textAlign: "center", padding: 24}}>No hay tareas con ese filtro.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {view === "mine" && (
        <Card title={`Asignadas a ${initials(session.name)}`} sub="incluye iniciales coincidentes">
          <table className="table">
            <thead><tr><th>Título</th><th>Depto</th><th>Estado</th><th>Prio</th><th>Fecha</th><th>Checklist</th></tr></thead>
            <tbody>
              {filtered.filter(t => t.assigned_to === initials(session.name)).map(t => {
                const checks = t.checklist.length;
                const done = t.checklist.filter(c => c.done).length;
                const st = TASK_STATUS.find(s => s.id === t.status);
                return (
                  <tr key={t.id} style={{cursor: "pointer"}} onClick={() => setOpen(t)}>
                    <td>{t.title}</td>
                    <td className="dim">{D.DEPT_BY_ID[t.department]?.name}</td>
                    <td><span className={"chip " + st.chip}><span className="dot"/>{st.label}</span></td>
                    <td><span className={"prio " + TASK_PRIO[t.priority]?.cls}/></td>
                    <td className="mono dim" style={{fontSize: 12}}>{t.due_date}</td>
                    <td>{checks > 0 ? `${done}/${checks}` : "—"}</td>
                  </tr>
                );
              })}
              {filtered.filter(t => t.assigned_to === initials(session.name)).length === 0 &&
                <tr><td colSpan={6} className="dim" style={{textAlign: "center", padding: 24}}>No tienes tareas asignadas con tus iniciales ({initials(session.name)}).</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {open && <TaskModal t={open} projects={projects} readOnly={readOnly} onClose={() => setOpen(null)}
        onSave={(patch) => { if (readOnly) return; updateTask(open.id, patch); setOpen({...open, ...patch}); }}
        onToggle={(cid) => {
          if (readOnly) return;
          toggleChecklistAndStatus(open.id, cid);
          setOpen(prev => {
            const checklist = prev.checklist.map(c => c.id === cid ? {...c, done: !c.done} : c);
            const doneCount = checklist.filter(c => c.done).length;
            const status = checklist.length
              ? (doneCount === checklist.length ? "completed" : doneCount > 0 ? "in_progress" : "pending")
              : prev.status;
            return {...prev, checklist, status};
          });
        }}
        onAddCheck={(text) => { if (readOnly) return; addChecklist(open.id, text); setOpen(prev => ({...prev, checklist: [...prev.checklist, {id:"c"+Math.random().toString(36).slice(2,5), text, done: false}]})); }}
        onRemoveCheck={(cid) => { if (readOnly) return; removeChecklist(open.id, cid); setOpen(prev => ({...prev, checklist: prev.checklist.filter(c => c.id !== cid)})); }}
        onDelete={() => { setDeleteId(open.id); setOpen(null); }}/>}

      {adding && <NewTaskModal session={session} effDept={effDept} projects={projects} onClose={() => setAdding(false)} onCreate={createTask}/>}

      {deleteId && (
        <div className="modal-bg" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{maxWidth: 380}} onClick={e => e.stopPropagation()}>
            <div className="modal__hd"><div className="modal__title">Eliminar tarea</div><button className="iconbtn" onClick={() => setDeleteId(null)}><span className="ic"><Icon name="x" size={14}/></span></button></div>
            <div className="modal__bd"><p style={{margin: 0}}>¿Confirmas la eliminación de esta tarea?</p></div>
            <div className="modal__ft">
              <button className="btn btn--ghost" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="btn btn--danger" onClick={() => deleteTask(deleteId)}>Eliminar tarea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskModal({ t, projects, onClose, onSave, onToggle, onAddCheck, onRemoveCheck, onDelete, readOnly }) {
  const D = window.INDISA_DATA;
  const [title, setTitle] = useState(t.title);
  const [desc, setDesc] = useState(t.description || "");
  const [prio, setPrio] = useState(t.priority);
  const [due, setDue] = useState(t.due_date);
  const [assignee, setAssignee] = useState(t.assigned_to);
  const [newCheck, setNewCheck] = useState("");
  const checks = t.checklist.length;
  const done = t.checklist.filter(c => c.done).length;

  // Find linked project
  const linkedProject = useMemo(() => {
    if (!t.project_id) return null;
    return Object.values(projects || {}).flat().find(p => p.id === t.project_id) || null;
  }, [t.project_id, projects]);

  const statusInfo = TASK_STATUS.find(s => s.id === t.status);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{width: 640}} onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="flex-c gap-8">
            <span className={"chip " + statusInfo?.chip}><span className="dot"/>{statusInfo?.label}</span>
            <span className="dim mono" style={{fontSize: 11}}>{t.id} · {D.DEPT_BY_ID[t.department]?.short}</span>
            {linkedProject && (
              <span className="chip chip--accent" style={{fontSize: 10, gap: 4}}>
                <Icon name="board" size={10}/> {linkedProject.title}
              </span>
            )}
          </div>
          <div className="flex-c gap-6">
            {readOnly && <span className="chip"><Icon name="lock" size={11}/> Solo lectura</span>}
            {!readOnly && <button className="btn btn--sm btn--danger" onClick={onDelete}><Icon name="x" size={12}/> Eliminar</button>}
            <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
          </div>
        </div>
        <div className="modal__bd">
          <input className="input" style={{fontSize: 16, fontWeight: 500, padding: "8px 10px"}} value={title} onChange={e => setTitle(e.target.value)} onBlur={() => onSave({ title })} disabled={readOnly}/>
          {linkedProject && (
            <div className="flex-c gap-6" style={{marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "var(--accent-soft)", border: "1px solid var(--accent-line)"}}>
              <Icon name="board" size={12} style={{color: "var(--accent)"}}/>
              <span style={{fontSize: 12, color: "var(--accent)", fontWeight: 500}}>Proyecto: {linkedProject.title}</span>
              <span className="dim mono" style={{fontSize: 10}}>· {D.DEPT_BY_ID[linkedProject.dept]?.short}</span>
            </div>
          )}
          <textarea className="textarea input" style={{marginTop: 10, minHeight: 60, resize: "vertical"}} placeholder="Descripción (opcional)" value={desc} onChange={e => setDesc(e.target.value)} onBlur={() => onSave({ description: desc })} disabled={readOnly}/>
          <div className="row row--3" style={{marginTop: 14}}>
            <div className="field">
              <label>Prioridad</label>
              <select className="select" value={prio} onChange={e => { setPrio(e.target.value); onSave({ priority: e.target.value }); }} disabled={readOnly}>
                {Object.entries(TASK_PRIO).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Fecha límite</label>
              <input className="input mono" type="date" value={due} onChange={e => { setDue(e.target.value); onSave({ due_date: e.target.value }); }} disabled={readOnly}/>
            </div>
            <div className="field">
              <label>Estado {checks > 0 && <span className="dim" style={{fontSize: 10, fontWeight: 400}}>(auto)</span>}</label>
              <select className="select" value={t.status} onChange={e => onSave({ status: e.target.value })} disabled={readOnly}>
                {TASK_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Asignada a (iniciales)</label>
            <input className="input mono" maxLength={3} style={{textTransform: "uppercase", maxWidth: 100}} value={assignee} onChange={e => setAssignee(e.target.value.toUpperCase())} onBlur={() => onSave({ assigned_to: assignee })} disabled={readOnly}/>
          </div>
          <div className="divider"/>
          <div className="flex-c gap-10" style={{justifyContent: "space-between", marginBottom: 10}}>
            <div className="dim" style={{fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em"}}>Checklist · {done}/{checks}</div>
            {checks > 0 && (
              <div className="deptperf__bar" style={{flex: 1, marginLeft: 12, maxWidth: 200}}>
                <span style={{width: (checks ? done/checks*100 : 0) + "%", background: "var(--positive)", transition: "width .3s ease"}}/>
              </div>
            )}
          </div>
          <div style={{display: "grid", gap: 4, marginBottom: 8}}>
            {t.checklist.map(c => (
              <div key={c.id} className="goal__obj" style={{gridTemplateColumns: "auto 1fr auto"}}>
                <input type="checkbox" checked={c.done} onChange={() => onToggle(c.id)} disabled={readOnly} style={{accentColor: "var(--accent)"}}/>
                <span style={{textDecoration: c.done ? "line-through" : "none", color: c.done ? "var(--text-2)" : "var(--text)"}}>{c.text}</span>
                {!readOnly && <button className="btn btn--sm" style={{color: "var(--danger)", border: "none", background: "transparent", padding: "2px 4px"}} onClick={() => onRemoveCheck(c.id)}><Icon name="x" size={11}/></button>}
              </div>
            ))}
          </div>
          {!readOnly && <div className="flex-c gap-8">
            <input className="input" placeholder="Agregar ítem al checklist…" value={newCheck} onChange={e => setNewCheck(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newCheck.trim()) { onAddCheck(newCheck.trim()); setNewCheck(""); } }}/>
            <button className="btn" onClick={() => { if (newCheck.trim()) { onAddCheck(newCheck.trim()); setNewCheck(""); } }}><Icon name="plus" size={14}/></button>
          </div>}
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cerrar</button>
          {!readOnly && <button className="btn btn--primary" onClick={() => { onSave({ title, description: desc }); onClose(); }}>Guardar cambios</button>}
        </div>
      </div>
    </div>
  );
}

function NewTaskModal({ session, effDept, projects, onClose, onCreate }) {
  const D = window.INDISA_DATA;
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dept, setDept] = useState(effDept || "ing");
  const [project, setProject] = useState("");
  const [prio, setPrio] = useState("medium");
  const [status, setStatus] = useState("pending");
  const [due, setDue] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); });
  const [assignee, setAssignee] = useState(initials(session.name));

  const projOptions = projects[dept] || [];

  function submit() {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), description: desc, department: dept, project_id: project || null, priority: prio, status, due_date: due, assigned_to: assignee, tags: [] });
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title">Nueva tarea</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          <div className="field"><label>Título</label><input className="input" placeholder="Ej. Redactar plan de comunicación" value={title} onChange={e => setTitle(e.target.value)} autoFocus/></div>
          <div className="field"><label>Descripción (opcional)</label><textarea className="textarea input" style={{minHeight: 60}} value={desc} onChange={e => setDesc(e.target.value)}/></div>
          <div className="row row--2">
            <div className="field">
              <label>Departamento</label>
              <select className="select" value={dept} onChange={e => { setDept(e.target.value); setProject(""); }}>
                {D.DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Proyecto (opcional)</label>
              <select className="select" value={project} onChange={e => setProject(e.target.value)}>
                <option value="">— sin proyecto —</option>
                {projOptions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>
          <div className="row row--3">
            <div className="field">
              <label>Prioridad</label>
              <select className="select" value={prio} onChange={e => setPrio(e.target.value)}>
                {Object.entries(TASK_PRIO).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Estado</label>
              <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
                {TASK_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="field"><label>Fecha límite</label><input className="input mono" type="date" value={due} onChange={e => setDue(e.target.value)}/></div>
          </div>
          <div className="field"><label>Asignada a (iniciales)</label><input className="input mono" maxLength={3} style={{textTransform: "uppercase", maxWidth: 100}} value={assignee} onChange={e => setAssignee(e.target.value.toUpperCase())}/></div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" disabled={!title.trim()} onClick={submit} style={{opacity: !title.trim() ? 0.5 : 1}}>
            <Icon name="plus" size={14}/> Crear tarea
          </button>
        </div>
      </div>
    </div>
  );
}

window.TasksPage = TasksPage;
