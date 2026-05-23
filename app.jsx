// INDISA Enterprise OS — App router
const { useState: uS, useEffect: uE, useMemo: uM, useRef: uR } = React;

// Persistent state hook — syncs with localStorage, Supabase, and Supabase Realtime.
const LS_PREFIX = "indisa_v1_";
function usePersistentState(key, initial) {
  const [value, setValue] = uS(() => {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (raw != null) return JSON.parse(raw);
    } catch (e) {}
    return initial;
  });
  const [supabaseLoaded, setSupabaseLoaded] = uS(false);
  // Tracks the last value WE saved so realtime doesn't echo it back to us.
  const lastSavedRef = uR(undefined);

  // Sync to localStorage on every change
  uE(() => {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch (e) {}
  }, [key, value]);

  // Load from Supabase once on mount
  uE(() => {
    let cancelled = false;
    async function loadRemote() {
      const state = window.SUPABASE_STATE;
      if (!state || !window.SUPABASE?.client) {
        setSupabaseLoaded(true);
        return;
      }
      try {
        const remoteValue = await state.load(key, initial);
        if (!cancelled && remoteValue !== undefined) {
          setValue(remoteValue);
        }
      } catch (error) {
        console.warn("Supabase state load failed for", key, error);
      } finally {
        if (!cancelled) setSupabaseLoaded(true);
      }
    }
    loadRemote();
    return () => { cancelled = true; };
  }, [key, initial]);

  // Save to Supabase whenever value changes (after initial load)
  uE(() => {
    if (!supabaseLoaded) return;
    const state = window.SUPABASE_STATE;
    if (!state || !window.SUPABASE?.client) return;
    lastSavedRef.current = value; // mark as our own save before sending
    state.save(key, value).catch((error) => {
      console.warn("Supabase state save failed for", key, error);
    });
  }, [key, value, supabaseLoaded]);

  // Supabase Realtime — receive changes from other users without refresh
  uE(() => {
    if (!supabaseLoaded || !window.SUPABASE?.client) return;
    const client = window.SUPABASE.client;
    const channel = client
      .channel(`indisa_rt_${key}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_state',
        filter: `key=eq.${key}`,
      }, (payload) => {
        const incoming = payload.new?.value;
        if (incoming === undefined || incoming === null) return;
        // Skip our own saves — compare serialized to avoid false positives
        if (JSON.stringify(incoming) === JSON.stringify(lastSavedRef.current)) return;
        setValue(incoming);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(`Realtime channel error for key: ${key}`);
        }
      });
    return () => { client.removeChannel(channel); };
  }, [key, supabaseLoaded]);

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
  const [kpiWeekly, setKpiWeekly] = usePersistentState("kpiWeekly", D.INITIAL_KPI_WEEKLY);
  const [projects, setProjects] = usePersistentState("projects", D.INITIAL_PROJECTS);
  const [poa, setPoa] = usePersistentState("poa", D.INITIAL_POA);
  const [codes, setCodes] = usePersistentState("codes", D.INITIAL_CODES);
  const [audit, setAudit] = usePersistentState("audit", D.INITIAL_AUDIT);
  const [tasks, setTasks] = usePersistentState("tasks", D.INITIAL_TASKS || []);
  const [files, setFiles] = usePersistentState("files", D.INITIAL_FILES || []);
  const [events, setEvents] = usePersistentState("events", D.INITIAL_EVENTS || []);
  const [departments, setDepartments] = usePersistentState("departments", D.DEPARTMENTS);
  // Users always loaded fresh from profiles table — never persisted to app_state
  const [users, setUsers] = uS(() => {
    try { localStorage.removeItem("indisa_v1_users"); } catch (e) {}
    return {};
  });

  // Keep window.INDISA_DATA in sync with departments state so other modules see deletions
  uE(() => {
    window.INDISA_DATA.DEPARTMENTS = departments;
    window.INDISA_DATA.DEPT_BY_ID = Object.fromEntries(departments.map(d => [d.id, d]));
  }, [departments]);

  uE(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  // Auto-sync project status from linked tasks (always active, not just when modal is open)
  uE(() => {
    setProjects(prev => {
      let changed = false;
      const out = {};
      for (const dept of Object.keys(prev)) {
        out[dept] = prev[dept].map(p => {
          const pts = tasks.filter(t => t.project_id === p.id);
          if (!pts.length) return p;
          const comp = pts.filter(t => t.status === "completed").length;
          const auto = comp === pts.length ? "done"
            : pts.every(t => t.status === "pending") ? "todo"
            : "doing";
          if (auto !== p.status) { changed = true; return { ...p, status: auto }; }
          return p;
        });
      }
      return changed ? out : prev;
    });
  }, [tasks]);

  // Expose scope-switcher to nested components
  uE(() => { window.__indisaScopeTo = (d) => { setDeptScope(d); setView("dashboard"); }; }, []);

  uE(() => {
    let cancelled = false;
    let subscription = null;

    async function initAuth() {
      if (!window.SUPABASE_AUTH) return;
      const allProfiles = await window.SUPABASE_AUTH.loadAllProfiles?.() || [];
      if (!cancelled && allProfiles.length > 0) {
        const profileMap = {};
        allProfiles.forEach(p => { profileMap[p.email.toLowerCase()] = p; });
        setUsers(profileMap);
      }
      // Restore existing session on page load / refresh
      const existingSession = await window.SUPABASE_AUTH.getSession();
      if (!cancelled && existingSession?.user) {
        const profile = await window.SUPABASE_AUTH.loadProfileById(existingSession.user.id);
        if (!cancelled && profile) {
          setSession({ email: profile.email, ...profile });
        }
      }
      subscription = window.SUPABASE_AUTH.onAuthStateChange((event, session) => {
        if (!session?.user) {
          setSession(null);
        }
      });
    }

    initAuth();

    return () => {
      cancelled = true;
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function addAudit({ action, user, dept, level }) {
    const now = new Date().toISOString().slice(0, 10) + " " + new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" });
    setAudit(prev => [{ ts: now, action, user, dept, level: level || "info" }, ...prev]);
  }

  function login(s, codeUsed) {
    setSession(s);
    if (codeUsed) {
      // First-time login with code: register user and increment uses
      setCodes(prev => prev.map(c => c.code === codeUsed ? { ...c, uses: c.uses + 1 } : c));
    }
    setUsers(prev => ({ ...prev, [s.email.toLowerCase()]: {
      email: s.email,
      role: s.role,
      dept: s.dept,
      deptName: s.deptName,
      name: s.name,
      code: s.code || codeUsed,
      avatar_color: s.avatar_color || prev[s.email.toLowerCase()]?.avatar_color || "#5E66FF",
      registeredAt: new Date().toISOString().slice(0, 10),
    }}));
    setDeptScope(null);
    setView("dashboard");
  }

  function logout() {
    addAudit({ action: "Cierre de sesión", user: session.name, dept: session.dept, level: "info" });
    setSession(null);
  }


  if (!session) {
    return <Auth codes={codes} users={users} onLogin={login} addAudit={addAudit}/>;
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
      {effView === "dashboard" && <Dashboard session={session} deptScope={deptScope} kpis={kpis} setKpis={setKpis} kpiWeekly={kpiWeekly} projects={projects} addAudit={addAudit} showToast={showToast} setView={setView}/>}
      {effView === "kpis" && <KPIPage session={session} deptScope={deptScope} setDeptScope={setDeptScope} kpis={kpis} setKpis={setKpis} kpiWeekly={kpiWeekly} setKpiWeekly={setKpiWeekly} addAudit={addAudit} showToast={showToast}/>}
      {effView === "projects" && <ProjectsPage session={session} deptScope={deptScope} projects={projects} setProjects={setProjects} tasks={tasks} setTasks={setTasks} addAudit={addAudit} showToast={showToast}/>}
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
