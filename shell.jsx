// App shell: sidebar + topbar (Spanish, light, blue corporate)
const { useState, useEffect, useMemo, useRef } = React;

function Shell({ session, view, setView, deptScope, setDeptScope, theme, setTheme, onLogout, toast, departments, profileColor, searchData, audit, children }) {
  const D = window.INDISA_DATA;
  const sections = D.NAV_SECTIONS;
  const role = session.role;
  const deptList = departments || D.DEPARTMENTS;
  const deptById = Object.fromEntries(deptList.map(d => [d.id, d]));

  // Effective dept scope
  const effDept = role === "owner" ? deptScope : session.dept;
  const deptObj = effDept ? deptById[effDept] : null;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sb__brand">
          <div className="sb__logo">I</div>
          <div>
            <div className="sb__name">INDISA</div>
            <div className="sb__role">Enterprise OS</div>
          </div>
        </div>

        {sections.map((sec, i) => (
          <div key={i} className="sb__section">
            <div className="sb__h">{sec.h}</div>
            {sec.items.filter(it => it.roles.includes(role)).map(it => (
              <div key={it.id} className={"sb__item " + (view === it.id && !effDept ? "is-active" : "")}
                   onClick={() => { setView(it.id); if (role === "owner" && it.id === "dashboard") setDeptScope(null); }}>
                <span className="sb__icon"><Icon name={it.icon} size={16}/></span>
                <span>{it.label}</span>
                {it.id === "audit" && <span className="sb__badge">12</span>}
                {it.id === "projects" && <span className="sb__badge">{countOpenProjects(role, effDept)}</span>}
              </div>
            ))}
          </div>
        ))}

        {/* Department shortcuts — colored dots, owner can switch; others see their dept only */}
        <div className="sb__section">
          <div className="sb__h">Departamentos</div>
          {role === "owner" ? (
            deptList.map(d => (
              <div key={d.id} className={"sb__dept " + (effDept === d.id ? "is-active" : "")}
                   onClick={() => { setDeptScope(d.id); setView("dashboard"); }}>
                <span className="dot" style={{background: d.color}}/>
                <span>{d.name}</span>
              </div>
            ))
          ) : (
            <div className="sb__dept is-active">
              <span className="dot" style={{background: deptObj?.color}}/>
              <span>{deptObj?.name}</span>
              <Icon name="lock" size={11} className="sb__icon" />
            </div>
          )}
        </div>

        <div className="sb__footer">
          <div className="sb__user" onClick={() => setView("profile")} title="Editar mi perfil">
            <div className="sb__avatar" style={profileColor ? {background: profileColor} : null}>{initials(session.name)}</div>
            <div style={{minWidth: 0, flex: 1}}>
              <div className="sb__user-name">{session.name}</div>
              <div className="sb__user-meta">{roleLabel(session.role)}</div>
            </div>
            <span onClick={e => { e.stopPropagation(); onLogout(); }} title="Cerrar sesión" className="iconbtn" style={{width: 28, height: 28}}>
              <span className="ic"><Icon name="logout" size={13}/></span>
            </span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            <span>{role === "owner" && !effDept ? "INDISA" : deptObj?.name || "INDISA"}</span>
            <span className="sep">/</span>
            <span className="now">{viewLabel(view)}</span>
            {role === "viewer" && <span className="chip" style={{marginLeft: 10}}><Icon name="lock" size={11}/> Solo lectura</span>}
          </div>
          {role === "owner" && (
            <DeptScopePicker deptList={deptList} effDept={effDept} setDeptScope={setDeptScope}/>
          )}
          <div className="tb__spacer"/>
          <GlobalSearch searchData={searchData} departments={deptList} role={role} setView={setView} setDeptScope={setDeptScope}/>
          <NotificationsBell audit={audit} searchData={searchData} departments={deptList} role={role} session={session} setView={setView}/>
          <button className="iconbtn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Cambiar tema">
            <span className="ic"><Icon name={theme === "dark" ? "sun" : "moon"} size={15}/></span>
          </button>
        </header>
        <div>
          {children}
        </div>
      </main>

      {toast && (
        <div className="toast"><span className="dot"/> {toast}</div>
      )}
    </div>
  );
}

function initials(name) { return name.split(/\s+/).map(s => s[0]).slice(0,2).join("").toUpperCase(); }
window.initials = initials;

function viewLabel(v) {
  return ({
    dashboard:    "Dashboard Ejecutivo",
    kpis:         "KPIs & Analytics",
    projects:     "Proyectos",
    tasks:        "Tareas",
    poa:          "POA · Plan Anual",
    calendar:     "Calendario",
    files:        "Documentos",
    departments:  "Departamentos",
    org:          "Organigrama",
    codes:        "Códigos de Acceso",
    audit:        "Registro de Auditoría",
  })[v] || v;
}
window.viewLabel = viewLabel;

function roleLabel(r) {
  return r === "owner" ? "Gerente General" : r === "admin" ? "Admin · Departamento" : "Visualizador";
}

function countOpenProjects(role, dept) {
  const all = window.INDISA_DATA.INITIAL_PROJECTS;
  if (role === "owner" && !dept) return Object.values(all).flat().filter(p => p.status !== "done").length;
  if (!dept) return 0;
  return (all[dept] || []).filter(p => p.status !== "done").length;
}

function DeptScopePicker({ deptList, effDept, setDeptScope }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = effDept ? deptList.find(d => d.id === effDept) : null;
  const filtered = deptList.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.short.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{position: "relative", marginLeft: 14}}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 10px", borderRadius: 8,
        border: "1px solid var(--line)",
        background: current ? "var(--accent-soft)" : "var(--bg-1)",
        color: current ? "var(--accent)" : "var(--text-1)",
        cursor: "pointer", fontSize: 13, fontWeight: 500,
      }}>
        {current ? <span style={{width: 7, height: 7, borderRadius: 2, background: current.color}}/> : <Icon name="stack" size={13}/>}
        <span>{current ? current.name : "Todos los departamentos"}</span>
        <Icon name="chev" size={12}/>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          background: "var(--panel)", border: "1px solid var(--line)",
          borderRadius: 10, boxShadow: "var(--shadow-2)",
          width: 280, zIndex: 50, padding: 8,
        }}>
          <div className="tb__search" style={{minWidth: 0, marginBottom: 6}}>
            <Icon name="search" size={13}/>
            <input autoFocus placeholder="Buscar departamento…" value={search} onChange={e => setSearch(e.target.value)} style={{flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13}}/>
          </div>
          <div style={{maxHeight: 320, overflowY: "auto", display: "grid", gap: 2}}>
            <div onClick={() => { setDeptScope(null); setOpen(false); }}
              style={{padding: "8px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 10,
                background: !effDept ? "var(--accent-soft)" : "transparent",
                color: !effDept ? "var(--accent)" : "var(--text)", fontWeight: !effDept ? 500 : 400}}>
              <Icon name="grid" size={13}/>
              <span>Todos los departamentos</span>
              {!effDept && <Icon name="check" size={13} stroke={2.5} className="" />}
            </div>
            <div style={{height: 1, background: "var(--line)", margin: "4px 0"}}/>
            {filtered.map(d => (
              <div key={d.id} onClick={() => { setDeptScope(d.id); setOpen(false); setSearch(""); }}
                style={{padding: "7px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 10,
                  background: effDept === d.id ? "var(--accent-soft)" : "transparent",
                  color: effDept === d.id ? "var(--accent)" : "var(--text)", fontWeight: effDept === d.id ? 500 : 400}}>
                <span style={{width: 7, height: 7, borderRadius: 2, background: d.color, flexShrink: 0}}/>
                <span style={{flex: 1}}>{d.name}</span>
                <span className="dim mono" style={{fontSize: 10}}>{d.short}</span>
              </div>
            ))}
            {filtered.length === 0 && <div className="dim" style={{padding: 12, fontSize: 12, textAlign: "center"}}>Sin coincidencias</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Global search =====
function GlobalSearch({ searchData, departments, role, setView, setDeptScope }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const D = window.INDISA_DATA;

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); ref.current?.querySelector("input")?.focus(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    }
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDoc); };
  }, []);

  const results = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term || !searchData) return [];
    const out = [];
    // Departments
    (departments || []).forEach(d => {
      if (d.name.toLowerCase().includes(term) || d.short.toLowerCase().includes(term))
        out.push({ type: "Departamento", icon: "stack", label: d.name, sub: d.short, color: d.color, go: () => { setDeptScope(d.id); setView("dashboard"); } });
    });
    // KPIs
    Object.entries(searchData.kpis || {}).forEach(([dept, list]) => {
      (list || []).forEach(k => {
        if (k.label.toLowerCase().includes(term))
          out.push({ type: "KPI", icon: "trending", label: k.label, sub: `${dept === "_company" ? "Compañía" : D.DEPT_BY_ID[dept]?.name || dept} · ${k.value}${k.unit || ""}`, go: () => { if (dept !== "_company" && role === "owner") setDeptScope(dept); setView("kpis"); } });
      });
    });
    // Projects
    Object.values(searchData.projects || {}).flat().forEach(p => {
      if (p.title.toLowerCase().includes(term) || (p.tag || "").toLowerCase().includes(term))
        out.push({ type: "Proyecto", icon: "board", label: p.title, sub: `${D.DEPT_BY_ID[p.dept]?.name || p.dept} · ${p.tag}`, go: () => { if (role === "owner") setDeptScope(p.dept); setView("projects"); } });
    });
    // Tasks
    (searchData.tasks || []).forEach(t => {
      if (t.title.toLowerCase().includes(term))
        out.push({ type: "Tarea", icon: "checkbox", label: t.title, sub: `${D.DEPT_BY_ID[t.department]?.name || t.department} · ${t.assigned_to}`, go: () => { if (role === "owner") setDeptScope(t.department); setView("tasks"); } });
    });
    // People (users)
    Object.entries(searchData.users || {}).forEach(([email, u]) => {
      if ((u.name || "").toLowerCase().includes(term) || email.includes(term))
        out.push({ type: "Persona", icon: "users2", label: u.name, sub: `${email} · ${u.role}`, go: () => setView("org") });
    });
    // Files
    (searchData.files || []).forEach(f => {
      if (f.name.toLowerCase().includes(term))
        out.push({ type: "Documento", icon: "folder", label: f.name, sub: D.DEPT_BY_ID[f.dept]?.name || f.dept, go: () => setView("files") });
    });
    return out.slice(0, 12);
  }, [q, searchData, departments, role]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div className="tb__search" onClick={() => setOpen(true)}>
        <Icon name="search" size={14}/>
        <input placeholder="Buscar KPIs, proyectos, personas…" value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} />
        <kbd>⌘K</kbd>
      </div>
      {open && q.trim() && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, width: 420, maxHeight: 420, overflowY: "auto", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-2)", zIndex: 60, padding: 6 }}>
          {results.length === 0 ? (
            <div className="dim" style={{ padding: 20, textAlign: "center", fontSize: 13 }}>Sin resultados para "{q}"</div>
          ) : results.map((r, i) => (
            <div key={i} onClick={() => { r.go(); setOpen(false); setQ(""); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-1)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: (r.color || "var(--accent)") + "1f", color: r.color || "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name={r.icon} size={14}/>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</div>
                <div className="dim" style={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</div>
              </div>
              <span className="chip" style={{ fontSize: 9, flexShrink: 0 }}>{r.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Notifications bell =====
function NotificationsBell({ audit, searchData, departments, role, session, setView }) {
  const [open, setOpen] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const ref = useRef(null);
  const D = window.INDISA_DATA;

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const notifications = useMemo(() => {
    const out = [];
    const today = new Date("2026-05-14");
    // Overdue tasks
    (searchData?.tasks || []).filter(t => t.status !== "completed" && new Date(t.due_date) < today)
      .slice(0, 4).forEach(t => out.push({ level: "bad", icon: "warn", title: `Tarea vencida: ${t.title}`, sub: `${D.DEPT_BY_ID[t.department]?.name} · venció ${t.due_date}`, go: () => setView("tasks") }));
    // At-risk departments (low KPI score)
    (departments || []).forEach(d => {
      const list = (searchData?.kpis || {})[d.id] || [];
      if (!list.length) return;
      const score = Math.round(list.reduce((s, k) => s + Math.min(1, k.value / k.target), 0) / list.length * 100);
      if (score < 70) out.push({ level: "warn", icon: "trending", title: `${d.name} en riesgo`, sub: `Score ${score}% — revisar KPIs críticos`, go: () => setView("kpis") });
    });
    // Recent audit warnings
    (audit || []).filter(a => a.level === "warn").slice(0, 3).forEach(a =>
      out.push({ level: "warn", icon: "shield", title: a.action, sub: `${a.user} · ${a.ts}`, go: () => setView("audit") }));
    // Recent successes
    (audit || []).filter(a => a.level === "success").slice(0, 2).forEach(a =>
      out.push({ level: "ok", icon: "check", title: a.action, sub: `${a.user} · ${a.ts}`, go: () => setView("audit") }));
    return out.slice(0, 10);
  }, [audit, searchData, departments]);

  const alertCount = notifications.filter(n => n.level === "bad" || n.level === "warn").length;
  const unread = Math.max(0, alertCount - readCount);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="iconbtn" title="Notificaciones" onClick={() => setOpen(o => !o)} style={{ position: "relative" }}>
        <span className="ic"><Icon name="bell" size={15}/></span>
        {unread > 0 && (
          <span style={{ position: "absolute", top: 4, right: 4, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 999, background: "var(--danger)", color: "#fff", fontSize: 9, fontWeight: 700, display: "grid", placeItems: "center", fontFamily: "var(--ff-mono)" }}>{unread}</span>
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 360, maxHeight: 440, overflowY: "auto", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-2)", zIndex: 60 }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Notificaciones</span>
            <div className="flex-c gap-8">
              {unread > 0 && (
                <button className="btn btn--sm" onClick={() => setReadCount(alertCount)} style={{ fontSize: 11 }}>
                  <Icon name="check" size={11}/> Marcar todas como leídas
                </button>
              )}
              <span className="chip" style={{ fontSize: 10 }}>{notifications.length}</span>
            </div>
          </div>
          <div style={{ padding: 6 }}>
            {notifications.length === 0 ? (
              <div className="dim" style={{ padding: 24, textAlign: "center", fontSize: 13 }}>Todo en orden — sin alertas.</div>
            ) : notifications.map((n, i) => {
              const c = n.level === "bad" ? "var(--danger)" : n.level === "warn" ? "var(--warning)" : "var(--positive)";
              return (
                <div key={i} onClick={() => { n.go(); setOpen(false); }}
                  style={{ display: "flex", gap: 10, padding: "10px", borderRadius: 6, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-1)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: c + "1f", color: c, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon name={n.icon} size={13}/>
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35 }}>{n.title}</div>
                    <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>{n.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

window.Shell = Shell;
window.DeptScopePicker = DeptScopePicker;
window.GlobalSearch = GlobalSearch;
window.NotificationsBell = NotificationsBell;
