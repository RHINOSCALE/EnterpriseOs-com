// Calendario corporativo — aggregates projects, tasks, POA milestones + custom events
const { useState, useEffect, useMemo, useRef } = React;

const EVENT_TYPES = {
  project:   { label: "Proyecto",   color: "var(--accent)",   icon: "board" },
  task:      { label: "Tarea",      color: "var(--info)",     icon: "checkbox" },
  meeting:   { label: "Reunión",    color: "#8b5cf6",         icon: "users2" },
  milestone: { label: "Hito",       color: "var(--positive)", icon: "flame" },
  audit:     { label: "Auditoría",  color: "var(--danger)",   icon: "shield" },
  training:  { label: "Capacitación",color: "var(--warning)", icon: "people" },
  demo:      { label: "Demo",       color: "#0ea5e9",         icon: "spark" },
  kickoff:   { label: "Kick-off",   color: "#f97316",         icon: "flame" },
};
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const WEEK_ES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function CalendarPage({ session, deptScope, projects, setProjects, tasks, setTasks, events, setEvents, addAudit, showToast }) {
  const D = window.INDISA_DATA;
  const role = session.role;
  const readOnly = role === "viewer";
  const effDept = role === "owner" ? deptScope : session.dept;

  const [cursor, setCursor] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [selDay, setSelDay] = useState(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState({ kinds: Object.keys(EVENT_TYPES) });
  const [showFilter, setShowFilter] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Build unified events from projects + tasks + POA + custom
  const allEvents = useMemo(() => {
    const out = [];
    // Projects
    const projList = effDept ? (projects[effDept] || []) : Object.values(projects).flat();
    projList.forEach(p => out.push({
      id: "p_" + p.id, type: "project", title: p.title, date: p.due, time: "",
      dept: p.dept, refId: p.id, refType: "project",
    }));
    // Tasks
    (tasks || []).filter(t => !effDept || t.department === effDept).forEach(t => out.push({
      id: "t_" + t.id, type: "task", title: t.title, date: t.due_date, time: "",
      dept: t.department, refId: t.id, refType: "task", status: t.status,
    }));
    // Custom events
    (events || []).filter(e => !effDept || e.dept === effDept).forEach(e => out.push({
      id: e.id, ...e, refType: "event",
    }));
    return out;
  }, [projects, tasks, events, effDept]);

  const filtered = allEvents.filter(e => filter.kinds.includes(e.type));

  // Calendar grid
  const first = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const startDayOfWeek = first.getDay();
  const cells = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsForDay(d) {
    if (!d) return [];
    const ds = `${cursor.year}-${String(cursor.month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return filtered.filter(e => e.date === ds);
  }

  function nextMonth() { setCursor(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }); }
  function prevMonth() { setCursor(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }); }
  function today() { const n = new Date(); setCursor({ year: n.getFullYear(), month: n.getMonth() }); }

  function createEvent(data) {
    const id = "e" + Math.random().toString(36).slice(2,6);
    setEvents(prev => [...prev, { id, ...data }]);
    addAudit({ action: `Evento creado: ${data.title}`, user: session.name, dept: data.dept, level: "success" });
    showToast("Evento agregado al calendario");
    setAdding(false);
  }

  // deleteId is now the full event object so we know its source
  function deleteEvent(ev) {
    if (!ev) return;
    if (ev.refType === "event") {
      setEvents(prev => prev.filter(e => e.id !== ev.refId && e.id !== ev.id));
      addAudit({ action: `Evento eliminado: ${ev.title}`, user: session.name, dept: ev.dept || "all", level: "warn" });
      showToast("Evento eliminado");
    } else if (ev.refType === "project") {
      setProjects(prev => {
        const out = { ...prev };
        for (const did of Object.keys(out)) out[did] = out[did].filter(p => p.id !== ev.refId);
        return out;
      });
      addAudit({ action: `Proyecto eliminado desde calendario: ${ev.title}`, user: session.name, dept: ev.dept || "all", level: "warn" });
      showToast("Proyecto eliminado");
    } else if (ev.refType === "task") {
      setTasks(prev => prev.filter(t => t.id !== ev.refId));
      addAudit({ action: `Tarea eliminada desde calendario: ${ev.title}`, user: session.name, dept: ev.dept || "all", level: "warn" });
      showToast("Tarea eliminada");
    }
    setDeleteId(null);
    setSelDay(null);
  }

  // Quick stats
  const thisMonth = filtered.filter(e => e.date && e.date.startsWith(`${cursor.year}-${String(cursor.month+1).padStart(2,"0")}`));

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">Calendario</h1>
          <p className="page__sub">{effDept ? D.DEPT_BY_ID[effDept].name : "Vista global"} · {thisMonth.length} eventos este mes</p>
        </div>
        <div className="page__actions">
          <div style={{position: "relative"}}>
            <button className="btn" onClick={() => setShowFilter(f => !f)}>
              <Icon name="filter" size={14}/> {filter.kinds.length === Object.keys(EVENT_TYPES).length ? "Todos" : `${filter.kinds.length} tipos`}
            </button>
            {showFilter && (
              <div style={{position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, zIndex: 40, minWidth: 200, boxShadow: "var(--shadow-2)", display: "grid", gap: 6}}>
                <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4}}>Tipos de evento</div>
                {Object.entries(EVENT_TYPES).map(([k,v]) => (
                  <label key={k} className="flex-c gap-8" style={{padding: "4px 6px", cursor: "pointer", fontSize: 13}}>
                    <input type="checkbox" checked={filter.kinds.includes(k)}
                      onChange={() => setFilter(f => ({ kinds: f.kinds.includes(k) ? f.kinds.filter(x => x !== k) : [...f.kinds, k] }))}
                      style={{accentColor: v.color}}/>
                    <span style={{width: 8, height: 8, borderRadius: 2, background: v.color}}/>
                    {v.label}
                  </label>
                ))}
                <button className="btn btn--sm" style={{marginTop: 4}} onClick={() => setFilter({ kinds: Object.keys(EVENT_TYPES) })}>Todos</button>
              </div>
            )}
          </div>
          {readOnly && <span className="chip"><Icon name="lock" size={11}/> Solo lectura</span>}
          {!readOnly && <button className="btn btn--primary" onClick={() => setAdding(true)}><Icon name="plus" size={14}/> Nuevo evento</button>}
        </div>
      </div>

      {/* Month nav */}
      <div className="flex-c gap-10" style={{marginBottom: 14, justifyContent: "space-between"}}>
        <div className="flex-c gap-8">
          <button className="iconbtn" onClick={prevMonth}><span className="ic" style={{transform: "rotate(180deg)"}}><Icon name="arrow" size={14}/></span></button>
          <div style={{fontSize: 18, fontWeight: 600, minWidth: 180, textAlign: "center"}}>{MONTHS_ES[cursor.month]} {cursor.year}</div>
          <button className="iconbtn" onClick={nextMonth}><span className="ic"><Icon name="arrow" size={14}/></span></button>
          <button className="btn btn--sm" onClick={today}>Hoy</button>
        </div>
        <div className="legend">
          {Object.entries(EVENT_TYPES).slice(0,5).map(([k,v]) => (
            <span key={k} className="lg"><span className="sw" style={{background: v.color}}/>{v.label}</span>
          ))}
        </div>
      </div>

      {/* Calendar + side widgets */}
      <div style={{display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 14, alignItems: "start"}}>
      <Card noPad>
        <div style={{display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--line)"}}>
          {WEEK_ES.map(d => <div key={d} className="dim mono" style={{padding: "10px 12px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, textAlign: "center"}}>{d}</div>)}
        </div>
        <div style={{display: "grid", gridTemplateColumns: "repeat(7, 1fr)"}}>
          {cells.map((d, i) => {
            const evs = eventsForDay(d);
            const _now = new Date(); const isToday = cursor.year === _now.getFullYear() && cursor.month === _now.getMonth() && d === _now.getDate();
            const dateStr = d ? `${cursor.year}-${String(cursor.month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}` : null;
            return (
              <div key={i}
                onClick={() => d && setSelDay({ d, evs, dateStr })}
                style={{
                  minHeight: 110, padding: 8,
                  borderRight: ((i+1) % 7 !== 0) ? "1px solid var(--line)" : "none",
                  borderBottom: i < cells.length - 7 ? "1px solid var(--line)" : "none",
                  background: d ? "var(--panel)" : "var(--bg-1)",
                  cursor: d ? "pointer" : "default",
                  transition: "background .12s",
                  position: "relative",
                }}>
                {d && (
                  <>
                    <div className="mono" style={{
                      fontSize: 12,
                      color: isToday ? "var(--accent-ink)" : "var(--text-2)",
                      fontWeight: isToday ? 700 : 500,
                      background: isToday ? "var(--accent)" : "transparent",
                      width: isToday ? 22 : "auto",
                      height: isToday ? 22 : "auto",
                      borderRadius: "50%",
                      display: "inline-grid",
                      placeItems: "center",
                      padding: isToday ? 0 : "0 4px",
                      marginBottom: 6,
                    }}>{d}</div>
                    <div style={{display: "grid", gap: 3}}>
                      {evs.slice(0, 3).map(e => {
                        const type = EVENT_TYPES[e.type] || EVENT_TYPES.meeting;
                        return (
                          <div key={e.id} style={{
                            fontSize: 10, padding: "2px 6px", borderRadius: 4,
                            background: type.color + "18", color: type.color,
                            border: "1px solid " + type.color + "40",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {e.time ? `${e.time.slice(0,5)} · ` : ""}{e.title}
                          </div>
                        );
                      })}
                      {evs.length > 3 && <div className="dim" style={{fontSize: 10, padding: "1px 6px"}}>+{evs.length - 3} más</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Side widgets */}
      <div style={{display: "grid", gap: 14}}>
        <Card title="Próximos 7 días" sub="eventos agendados">
          <div style={{display: "grid", gap: 8}}>
            {filtered
              .filter(e => e.date)
              .filter(e => {
                const d = new Date(e.date); const now = new Date();
                return d >= now && d <= new Date(now.getTime() + 7*86400000);
              })
              .sort((a,b) => a.date.localeCompare(b.date))
              .slice(0, 6)
              .map(e => {
                const type = EVENT_TYPES[e.type] || EVENT_TYPES.meeting;
                return (
                  <div key={e.id} className="flex-c gap-10" style={{padding: 8, borderRadius: 6, background: "var(--bg-1)"}}>
                    <span style={{width: 4, height: 28, borderRadius: 2, background: type.color}}/>
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{e.title}</div>
                      <div className="dim mono" style={{fontSize: 11}}>{e.date}{e.time ? " · " + e.time.slice(0,5) : ""}</div>
                    </div>
                    <span className="chip" style={{fontSize: 10}}>{type.label}</span>
                  </div>
                );
              })}
          </div>
        </Card>
        <Card title="Distribución por tipo" sub="este mes">
          <div style={{display: "grid", gap: 6}}>
            {Object.entries(EVENT_TYPES).map(([k,v]) => {
              const count = thisMonth.filter(e => e.type === k).length;
              const max = Math.max(...Object.keys(EVENT_TYPES).map(kk => thisMonth.filter(e => e.type === kk).length), 1);
              return (
                <div key={k} className="flex-c gap-10">
                  <div style={{width: 100, fontSize: 12}}>{v.label}</div>
                  <div className="deptperf__bar" style={{flex: 1}}><span style={{width: count/max*100 + "%", background: v.color}}/></div>
                  <div className="mono dim" style={{fontSize: 12, minWidth: 22, textAlign: "right"}}>{count}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Hitos críticos" sub="auditorías y revisiones">
          <div style={{display: "grid", gap: 8}}>
            {filtered.filter(e => e.type === "audit" || e.type === "milestone")
              .sort((a,b) => (a.date||"").localeCompare(b.date||""))
              .slice(0, 5).map(e => (
                <div key={e.id} className="flex-c gap-10" style={{padding: 8, borderRadius: 6, background: "var(--bg-1)"}}>
                  <Icon name="warn" size={14}/>
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{e.title}</div>
                    <div className="dim mono" style={{fontSize: 11}}>{e.date}</div>
                  </div>
                </div>
              ))}
            {filtered.filter(e => e.type === "audit" || e.type === "milestone").length === 0 &&
              <div className="dim" style={{fontSize: 12, padding: 8}}>Sin hitos próximos</div>}
          </div>
        </Card>
      </div>
      </div>

      {selDay && (
        <div className="modal-bg" onClick={() => setSelDay(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__hd">
              <div className="modal__title">Eventos · {selDay.dateStr}</div>
              <button className="iconbtn" onClick={() => setSelDay(null)}><span className="ic"><Icon name="x" size={14}/></span></button>
            </div>
            <div className="modal__bd">
              {selDay.evs.length === 0 ? (
                <div className="dim" style={{padding: 12, textAlign: "center"}}>No hay eventos este día.</div>
              ) : (
                <div style={{display: "grid", gap: 8}}>
                  {selDay.evs.map(e => {
                    const type = EVENT_TYPES[e.type] || EVENT_TYPES.meeting;
                    return (
                      <div key={e.id} className="flex-c gap-10" style={{padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-1)"}}>
                        <span style={{width: 6, height: 36, borderRadius: 3, background: type.color}}/>
                        <div style={{flex: 1}}>
                          <div style={{fontWeight: 500}}>{e.title}</div>
                          <div className="dim mono" style={{fontSize: 11, marginTop: 2}}>
                            {e.time ? e.time + " · " : ""}{type.label}{e.dept ? " · " + D.DEPT_BY_ID[e.dept]?.short : ""}
                            {e.refType === "project" ? " · proyecto" : e.refType === "task" ? " · tarea" : ""}
                          </div>
                        </div>
                        {!readOnly && (
                          <button className="btn btn--sm btn--danger" onClick={() => setDeleteId(e)}><Icon name="x" size={11}/> Borrar</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal__ft">
              <button className="btn btn--ghost" onClick={() => setSelDay(null)}>Cerrar</button>
              {!readOnly && <button className="btn btn--primary" onClick={() => { setAdding({ date: selDay.dateStr }); setSelDay(null); }}>
                <Icon name="plus" size={14}/> Agregar evento
              </button>}
            </div>
          </div>
        </div>
      )}

      {adding && <NewEventModal session={session} effDept={effDept} initialDate={adding?.date} onClose={() => setAdding(false)} onCreate={createEvent}/>}

      {deleteId && (
        <div className="modal-bg" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{maxWidth: 380}} onClick={e => e.stopPropagation()}>
            <div className="modal__hd"><div className="modal__title">Eliminar {deleteId.refType === "project" ? "proyecto" : deleteId.refType === "task" ? "tarea" : "evento"}</div><button className="iconbtn" onClick={() => setDeleteId(null)}><span className="ic"><Icon name="x" size={14}/></span></button></div>
            <div className="modal__bd">
              <p style={{margin: "0 0 8px"}}>¿Confirmas la eliminación de <b>"{deleteId.title}"</b>?</p>
              {deleteId.refType === "project" && <div className="alert alert--warn" style={{margin: 0}}><span className="ic-wrap"><Icon name="warn" size={13}/></span><span>Esto eliminará el proyecto completo del módulo de Proyectos.</span></div>}
              {deleteId.refType === "task" && <div className="alert alert--warn" style={{margin: 0}}><span className="ic-wrap"><Icon name="warn" size={13}/></span><span>Esto eliminará la tarea completa del módulo de Tareas.</span></div>}
            </div>
            <div className="modal__ft">
              <button className="btn btn--ghost" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="btn btn--danger" onClick={() => deleteEvent(deleteId)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewEventModal({ session, effDept, initialDate, onClose, onCreate }) {
  const D = window.INDISA_DATA;
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [type, setType] = useState("meeting");
  const [dept, setDept] = useState(effDept || (session.dept || "gg"));

  function submit() {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), date, time, type, dept });
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title">Nuevo evento</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          <div className="field"><label>Título</label><input className="input" placeholder="Ej. Reunión semanal de operaciones" value={title} onChange={e => setTitle(e.target.value)} autoFocus/></div>
          <div className="row row--2">
            <div className="field"><label>Fecha</label><input className="input mono" type="date" value={date} onChange={e => setDate(e.target.value)}/></div>
            <div className="field"><label>Hora</label><input className="input mono" type="time" value={time} onChange={e => setTime(e.target.value)}/></div>
          </div>
          <div className="row row--2">
            <div className="field">
              <label>Tipo</label>
              <select className="select" value={type} onChange={e => setType(e.target.value)}>
                {Object.entries(EVENT_TYPES).filter(([k]) => !["project","task"].includes(k)).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Departamento</label>
              <select className="select" value={dept} onChange={e => setDept(e.target.value)} disabled={!!effDept && session.role !== "owner"}>
                {D.DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{padding: 10, background: "var(--bg-1)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, marginTop: 4}}>
            <span style={{width: 6, height: 28, borderRadius: 3, background: EVENT_TYPES[type].color}}/>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 500}}>{title || "Vista previa del evento"}</div>
              <div className="dim mono" style={{fontSize: 11}}>{date} · {time} · {EVENT_TYPES[type].label}</div>
            </div>
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" disabled={!title.trim()} onClick={submit} style={{opacity: !title.trim() ? 0.5 : 1}}>
            <Icon name="plus" size={14}/> Crear evento
          </button>
        </div>
      </div>
    </div>
  );
}

window.CalendarPage = CalendarPage;
