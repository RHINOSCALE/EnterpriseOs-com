// INDISA Enterprise OS — App router
const { useState: uS, useEffect: uE, useMemo: uM } = React;

// Persistent state hook — syncs with localStorage so data survives reloads/logouts
const LS_PREFIX = "indisa_v1_";
function usePersistentState(key, initial) {
  const [value, setValue] = uS(() => {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (raw != null) return JSON.parse(raw);
    } catch (e) {}
    return initial;
  });
  uE(() => {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch (e) {}
  }, [key, value]);
  return [value, setValue];
}

function App() {
  const D = window.INDISA_DATA;
  // Session-scoped (not persisted)
  const [session, setSession] = uS(null);
  const [view, setView] = uS("dashboard");
  const [deptScope, setDeptScope] = uS(null);
  const [toast, setToast] = uS(null);
  // Persisted UI prefs + data
  const [theme, setTheme] = usePersistentState("theme", "light");
  const [kpis, setKpis] = usePersistentState("kpis", D.INITIAL_KPIS);
  const [projects, setProjects] = usePersistentState("projects", D.INITIAL_PROJECTS);
  const [poa, setPoa] = usePersistentState("poa", D.INITIAL_POA);
  const [codes, setCodes] = usePersistentState("codes", D.INITIAL_CODES);
  const [audit, setAudit] = usePersistentState("audit", D.INITIAL_AUDIT);
  const [tasks, setTasks] = usePersistentState("tasks", D.INITIAL_TASKS || []);
  const [files, setFiles] = usePersistentState("files", D.INITIAL_FILES || []);
  const [events, setEvents] = usePersistentState("events", D.INITIAL_EVENTS || []);
  const [departments, setDepartments] = usePersistentState("departments", D.DEPARTMENTS);
  // Registered users: email → { role, dept, deptName, name, code } — so they can re-login without re-entering the code
  const [users, setUsers] = usePersistentState("users", {});

  // Keep window.INDISA_DATA in sync with departments state so other modules see deletions
  uE(() => {
    window.INDISA_DATA.DEPARTMENTS = departments;
    window.INDISA_DATA.DEPT_BY_ID = Object.fromEntries(departments.map(d => [d.id, d]));
  }, [departments]);

  uE(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  // Expose scope-switcher to nested components
  uE(() => { window.__indisaScopeTo = (d) => { setDeptScope(d); setView("dashboard"); }; }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function addAudit({ action, user, dept, level }) {
    const now = "2026-05-14 " + new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" });
    setAudit(prev => [{ ts: now, action, user, dept, level: level || "info" }, ...prev]);
  }

  function login(s, codeUsed) {
    setSession(s);
    if (codeUsed) {
      // First-time login with code: register user and increment uses
      setCodes(prev => prev.map(c => c.code === codeUsed ? { ...c, uses: c.uses + 1 } : c));
      setUsers(prev => ({ ...prev, [s.email.toLowerCase()]: {
        role: s.role, dept: s.dept, deptName: s.deptName, name: s.name, code: codeUsed,
        password: s.password,
        registeredAt: "2026-05-14",
      }}));
    }
    setDeptScope(null);
    setView("dashboard");
  }

  function logout() {
    addAudit({ action: "Cierre de sesión", user: session.name, dept: session.dept, level: "info" });
    setSession(null);
  }

  function resetPassword(emailKey, newPassword) {
    setUsers(prev => ({ ...prev, [emailKey]: { ...prev[emailKey], password: newPassword } }));
    addAudit({ action: `Contraseña restablecida: ${emailKey}`, user: emailKey, dept: null, level: "warn" });
  }

  if (!session) {
    return <Auth codes={codes} users={users} onLogin={login} addAudit={addAudit} onResetPassword={resetPassword}/>;
  }

  const role = session.role;
  const canSee = {
    dashboard: true,
    kpis: true,
    projects: true,
    tasks: true,
    poa: true,
    calendar: true,
    files: true,
    departments: role === "owner",
    org: true,
    codes: role !== "viewer",
    audit: role !== "viewer",
    profile: true,
  };
  const effView = canSee[view] ? view : "dashboard";

  return (
    <Shell
      session={session} view={effView} setView={setView}
      deptScope={deptScope} setDeptScope={setDeptScope}
      theme={theme} setTheme={setTheme}
      onLogout={logout} toast={toast}
      departments={departments}
      profileColor={users[session.email.toLowerCase()]?.avatarColor}
      searchData={{ kpis, projects, tasks, users, poa, files }}
      audit={audit}
    >
      {effView === "dashboard" && <Dashboard session={session} deptScope={deptScope} kpis={kpis} setKpis={setKpis} projects={projects} addAudit={addAudit} showToast={showToast} setView={setView}/>}
      {effView === "kpis" && <KPIPage session={session} deptScope={deptScope} setDeptScope={setDeptScope} kpis={kpis} setKpis={setKpis} addAudit={addAudit} showToast={showToast}/>}
      {effView === "projects" && <ProjectsPage session={session} deptScope={deptScope} projects={projects} setProjects={setProjects} addAudit={addAudit} showToast={showToast}/>}
      {effView === "tasks" && <TasksPage session={session} deptScope={deptScope} tasks={tasks} setTasks={setTasks} projects={projects} addAudit={addAudit} showToast={showToast}/>}
      {effView === "poa" && <POAPage session={session} deptScope={deptScope} poa={poa} setPoa={setPoa} addAudit={addAudit} showToast={showToast}/>}
      {effView === "calendar" && <CalendarPage session={session} deptScope={deptScope} projects={projects} setProjects={setProjects} tasks={tasks} setTasks={setTasks} events={events} setEvents={setEvents} addAudit={addAudit} showToast={showToast}/>}
      {effView === "files" && <FilesPage session={session} deptScope={deptScope} files={files} setFiles={setFiles} addAudit={addAudit} showToast={showToast}/>}
      {effView === "departments" && <Departments session={session} kpis={kpis} projects={projects} departments={departments} setDepartments={setDepartments} setView={setView} setDeptScope={setDeptScope} showToast={showToast} addAudit={addAudit}/>}
      {effView === "org" && <OrgChart session={session} users={users} onSelectDept={(d) => { if (role === "owner") setDeptScope(d); }}/>}
      {effView === "codes" && <CodesPage session={session} codes={codes} setCodes={setCodes} addAudit={addAudit} showToast={showToast}/>}
      {effView === "audit" && <AuditPage session={session} audit={audit}/>}
      {effView === "profile" && <ProfilePage session={session} setSession={setSession} users={users} setUsers={setUsers} theme={theme} setTheme={setTheme} addAudit={addAudit} showToast={showToast}/>}
    </Shell>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
