// Login flow + access code validation (Spanish)
const { useState, useEffect } = React;

function Auth({ codes, users, onLogin, addAudit }) {
  const [stage, setStage] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [validating, setValidating] = useState(false);
  const [step, setStep] = useState(0);
  const [returningUser, setReturningUser] = useState(null);
  const [authProfile, setAuthProfile] = useState(null);

  const D = window.INDISA_DATA;
  const registered = users || {};
  const cleanEmail = email.toLowerCase().trim();
  const localProfile = cleanEmail && registered[cleanEmail] ? registered[cleanEmail] : null;
  const existingUser = localProfile || authProfile;
  const isReturning = !!existingUser;

  useEffect(() => {
    let cancelled = false;
    setAuthProfile(null);

    if (!cleanEmail.includes("@")) return;
    if (localProfile) return;

    async function loadRemoteProfile() {
      const profile = await window.SUPABASE_AUTH?.loadProfileByEmail?.(cleanEmail);
      if (!cancelled) {
        setAuthProfile(profile);
      }
    }

    loadRemoteProfile().catch(() => {});
    return () => { cancelled = true; };
  }, [cleanEmail, localProfile]);

  async function submitLogin(e) {
    e.preventDefault();
    setErr("");

    if (!cleanEmail.includes("@")) {
      setErr("Ingresa un correo válido.");
      return;
    }
    if (password.length < 4) {
      setErr("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    if (existingUser) {
      const { error, data } = await window.SUPABASE_AUTH.signIn(cleanEmail, password);
      if (error) {
        setErr(error.message || "Correo o contraseña incorrectos.");
        addAudit({ action: `Login fallido · ${cleanEmail}`, user: cleanEmail, dept: null, level: "warn" });
        return;
      }

      const authUser = data?.user || await window.SUPABASE_AUTH.getUser();
      const profile = authUser ? await window.SUPABASE_AUTH.loadProfileById(authUser.id) : existingUser;
      if (!profile) {
        setErr("No se encontró el perfil de usuario en Supabase.");
        return;
      }

      setReturningUser(profile);
      setValidating(true);
      setStep(0);
      let i = 0;
      const iv = setInterval(() => {
        i++; setStep(i);
        if (i >= 3) {
          clearInterval(iv);
          const session = { email: cleanEmail, ...profile };
          addAudit({ action: `Login OK · ${cleanEmail} · ${profile.role}${profile.dept ? " · " + D.DEPT_BY_ID[profile.dept].name : ""}`, user: session.name, dept: profile.dept || null, level: "success" });
          onLogin(session, null);
        }
      }, 320);
      return;
    }

    if (!name.trim()) {
      setErr("Ingresa tu nombre completo.");
      return;
    }
    addAudit({ action: `Registro iniciado: ${cleanEmail} (${name.trim()})`, user: cleanEmail, dept: null, level: "info" });
    setStage("validate");
  }

  async function submitCode(e) {
    e.preventDefault();
    setErr("");
    const c = code.trim().toUpperCase();
    if (!c) {setErr("Ingresa tu código de acceso.");return;}
    const entry = codes.find((k) => k.code === c);
    if (!entry) {
      addAudit({ action: `Código inválido: ${c}`, user: email, dept: null, level: "warn" });
      setErr("Código inválido. Este intento fue registrado.");
      return;
    }
    if (entry.revoked) {
      addAudit({ action: `Código revocado intentado: ${c}`, user: email, dept: null, level: "warn" });
      setErr("Este código fue revocado.");
      return;
    }
    if (new Date(entry.expires) < new Date()) {
      addAudit({ action: `Código expirado intentado: ${c}`, user: email, dept: null, level: "warn" });
      setErr("Este código ha expirado.");
      return;
    }
    if (entry.uses >= entry.max) {
      addAudit({ action: `Código agotado intentado: ${c}`, user: email, dept: null, level: "warn" });
      setErr("Este código alcanzó su límite de uso.");
      return;
    }

    let authUser = null;
    const signUpResult = await window.SUPABASE_AUTH.signUp(cleanEmail, password);
    if (signUpResult.error) {
      const alreadyExists = signUpResult.error.message?.toLowerCase().includes("already registered") ||
                            signUpResult.error.message?.toLowerCase().includes("already been registered");
      if (!alreadyExists) {
        setErr(signUpResult.error.message || "No se pudo registrar el usuario.");
        return;
      }
      // Email exists in Auth but no profile — sign in and recover
      const signInResult = await window.SUPABASE_AUTH.signIn(cleanEmail, password);
      if (signInResult.error) {
        setErr("Este correo ya está registrado. Verifica tu contraseña o contacta al administrador.");
        return;
      }
      authUser = signInResult.data?.user || await window.SUPABASE_AUTH.getUser();
    } else {
      authUser = signUpResult.data?.user || await window.SUPABASE_AUTH.getUser();
    }

    if (!authUser) {
      setErr("No se pudo crear la cuenta en Supabase.");
      return;
    }

    const dept = entry.dept ? D.DEPT_BY_ID[entry.dept] : null;
    const profile = {
      id: authUser.id,
      email: cleanEmail,
      name: name.trim() || (entry.role === "owner" ? "Gerente General" : entry.role === "admin" ? `Admin ${dept?.name}` : `Viewer ${dept?.name}`),
      role: entry.role,
      dept: dept ? dept.id : null,
      dept_name: dept ? dept.name : "Todos los departamentos",
      code: entry.code,
      avatar_color: "#5E66FF",
    };

    await window.SUPABASE_AUTH.upsertProfile(profile);

    setValidating(true);
    setStep(0);
    const steps = 4;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setStep(i);
      if (i >= steps) {
        clearInterval(iv);
        const session = { email: cleanEmail, ...profile };
        addAudit({ action: `Login OK · ${entry.code} · ${entry.role}${dept ? " · " + dept.name : ""}`, user: session.name, dept: dept ? dept.id : null, level: "success" });
        onLogin(session, entry.code);
      }
    }, 380);
  }

  function quickCode(c) {setCode(c);setErr("");}

  // ===== Forgot password flow =====
  const [recCode, setRecCode] = useState("");
  const [recPwd, setRecPwd] = useState("");
  const [recConfirm, setRecConfirm] = useState("");
  const [recOk, setRecOk] = useState(false);

  async function submitRecover(e) {
    e.preventDefault();
    setErr("");
    const cleanEmail = email.toLowerCase().trim();
    const profile = registered[cleanEmail] || authProfile;
    if (!cleanEmail.includes("@")) { setErr("Ingresa tu correo."); return; }
    if (!profile) { setErr("No existe una cuenta con ese correo."); return; }
    if (recCode.trim().toUpperCase() !== (profile.code || "").toUpperCase()) {
      setErr("El código de acceso no coincide con esta cuenta.");
      addAudit({ action: `Recuperación fallida (código incorrecto): ${cleanEmail}`, user: cleanEmail, dept: null, level: "warn" });
      return;
    }
    const resetResult = await window.SUPABASE_AUTH.resetPassword(cleanEmail);
    if (resetResult.error) {
      setErr(resetResult.error.message || "No se pudo enviar el correo de recuperación.");
      return;
    }
    addAudit({ action: `Solicitud de recuperación enviada: ${cleanEmail}`, user: cleanEmail, dept: profile.dept || null, level: "info" });
    setRecOk(true);
    setErr("");
  }

  function backToLogin() {
    setStage("login");
    setErr(""); setRecCode(""); setRecPwd(""); setRecConfirm(""); setRecOk(false); setPassword("");
  }

  if (validating) {
    const isReturning = !!returningUser;
    const steps = isReturning
      ? ["Verificando credenciales", "Cargando tu workspace", "Redirigiendo al dashboard"]
      : ["Validando firma", "Resolviendo rol y permisos", "Cargando workspace del departamento", "Redirigiendo al dashboard"];
    return (
      <div className="auth">
        <ArtPanel />
        <div className="auth__form-wrap">
          <div className="auth__form fade-in">
            <div className="auth__step"><span className="dot" /> {isReturning ? "Bienvenido de vuelta" : "Autenticando"}</div>
            <h2>{isReturning ? `Hola, ${returningUser.name}` : "Asegurando tu sesión"}</h2>
            <p className="muted">{isReturning ? `Restaurando tu sesión como ${returningUser.role === "owner" ? "Gerente General" : returningUser.role === "admin" ? "Admin · " + returningUser.deptName : "Visualizador · " + returningUser.deptName}…` : "Código aceptado. Resolviendo tu perfil empresarial…"}</p>
            <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
              {steps.map((t, i) => <ValidateRow key={i} active={step === i} done={step > i} label={t} />)}
            </div>
          </div>
        </div>
      </div>);
  }

  return (
    <div className="auth">
      <ArtPanel />
      <div className="auth__form-wrap">
        <div className="auth__form fade-in" style={{ minHeight: "404px", width: "380px" }}>
          {stage === "login" ?
          <>
              <div className="auth__step"><span className="dot" /> {isReturning ? "Bienvenido de vuelta" : "Paso 1 · Credenciales"}</div>
              <h2>{isReturning ? `Hola, ${existingUser.name.split(" ")[0]}` : "Iniciar sesión en INDISA"}</h2>
              <p className="muted">{isReturning ? "Cuenta reconocida. Ingresa tu contraseña para continuar." : email && email.includes("@") ? "Nuevo en INDISA — completa tus datos para registrarte." : "Usa tu correo empresarial. Si es tu primera vez, te pediremos tu código de acceso en el siguiente paso."}</p>
              <form onSubmit={submitLogin}>
                <div className="field">
                  <label>Correo de trabajo</label>
                  <input className="input" type="email" placeholder="tu.correo@indisa.co" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
                </div>
                {!isReturning && email.includes("@") && (
                  <div className="field fade-in">
                    <label>Nombre completo</label>
                    <input className="input" type="text" placeholder="Ej. Carlos Mendoza" value={name} onChange={(e) => setName(e.target.value)}/>
                  </div>
                )}
                <div className="field">
                  <label>Contraseña</label>
                  <input className="input" type="password" placeholder={isReturning ? "Tu contraseña" : "Mínimo 4 caracteres"} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button className="btn btn--primary btn--full" type="submit">
                  {isReturning ? "Entrar" : "Continuar"} <Icon name="arrow" size={14} />
                </button>
                {err && <div className="auth__error">{err}</div>}
              </form>
              {isReturning && (
                <p style={{ marginTop: 14, fontSize: 12, textAlign: "center" }}>
                  <span style={{ cursor: "pointer", color: "var(--accent)", fontWeight: 500 }} onClick={() => { setStage("recover"); setErr(""); }}>
                    ¿Olvidaste tu contraseña?
                  </span>
                </p>
              )}
              <p className="muted" style={{ marginTop: isReturning ? 14 : 22, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="lock" size={12} /> Login con Google deshabilitado. Solo SSO empresarial.
              </p>
            </> : stage === "recover" ?
          <>
              <div className="auth__step"><span className="dot" /> Recuperar acceso</div>
              <h2>Restablecer contraseña</h2>
              {recOk ? (
                <>
                  <p className="muted">Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión con la nueva.</p>
                  <div className="alert alert--ok" style={{ marginTop: 16 }}>
                    <span className="ic-wrap"><Icon name="check" size={13} stroke={2.5} /></span>
                    <span>Contraseña restablecida para <b>{email.toLowerCase().trim()}</b>.</span>
                  </div>
                  <button className="btn btn--primary btn--full" style={{ marginTop: 18 }} onClick={backToLogin}>
                    Ir a iniciar sesión <Icon name="arrow" size={14} />
                  </button>
                </>
              ) : (
                <>
                  <p className="muted">Verifica tu identidad con tu código de acceso empresarial y define una nueva contraseña.</p>
                  <form onSubmit={submitRecover}>
                    <div className="field">
                      <label>Correo de trabajo</label>
                      <input className="input" type="email" placeholder="tu.correo@indisa.co" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
                    </div>
                    <div className="field">
                      <label>Tu código de acceso (verificación)</label>
                      <input className="input mono" style={{ fontSize: 13 }} placeholder="INDISA-XXX-XXX-XX" value={recCode} onChange={(e) => setRecCode(e.target.value.toUpperCase())} />
                    </div>
                    <div className="field">
                      <label>Nueva contraseña</label>
                      <input className="input" type="password" placeholder="Mínimo 4 caracteres" value={recPwd} onChange={(e) => setRecPwd(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Confirmar nueva contraseña</label>
                      <input className="input" type="password" placeholder="Repite la contraseña" value={recConfirm} onChange={(e) => setRecConfirm(e.target.value)} />
                    </div>
                    <button className="btn btn--primary btn--full" type="submit">
                      Restablecer contraseña <Icon name="arrow" size={14} />
                    </button>
                    {err && <div className="auth__error">{err}</div>}
                  </form>
                  <p className="muted" style={{ marginTop: 16, fontSize: 12, textAlign: "center" }}>
                    <span style={{ cursor: "pointer" }} onClick={backToLogin}>← Volver a iniciar sesión</span>
                  </p>
                </>
              )}
            </> :

          <>
              <div className="auth__step"><span className="dot" /> Paso 2 · Código de acceso</div>
              <h2>Ingresa tu código</h2>
              <p className="muted">Tu código asigna automáticamente tu rol, departamento, permisos y dashboard.</p>
              <form onSubmit={submitCode}>
                <div className="field">
                  <label>Código empresarial de acceso</label>
                  <input className="input mono" style={{ fontSize: 13 }} placeholder="INDISA-XXX-XXX-XX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoFocus />
                </div>
                <button className="btn btn--primary btn--full" type="submit">
                  Validar y entrar <Icon name="arrow" size={14} />
                </button>
                {err && <div className="auth__error">{err}</div>}
              </form>

<p className="muted" style={{ marginTop: 16, fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                <span><Icon name="shield" size={12} /> Códigos únicos, revocables y con expiración.</span>
                <span style={{ cursor: "pointer" }} onClick={() => setStage("login")}>← Volver</span>
              </p>
            </>
          }
        </div>
      </div>
    </div>);

}

function ValidateRow({ active, done, label }) {
  return (
    <div className="flex-c gap-10" style={{ padding: "10px 12px", borderRadius: 8, background: active ? "var(--accent-soft)" : "transparent", border: "1px solid " + (active ? "var(--accent-line)" : "transparent") }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", display: "grid", placeItems: "center",
        background: done ? "var(--accent)" : active ? "transparent" : "var(--bg-1)",
        border: "1px solid " + (done ? "var(--accent)" : active ? "var(--accent)" : "var(--line)")
      }}>
        {done ? <Icon name="check" size={11} stroke={2.5} className="" /> : active ? <div className="spin" style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid var(--accent)", borderTopColor: "transparent" }} /> : null}
      </div>
      <span style={{ fontSize: 13, color: done ? "var(--text)" : active ? "var(--text)" : "var(--text-2)" }}>{label}</span>
    </div>);

}

function ArtPanel() {
  return (
    <div className="auth__art">
      <div className="auth__grid" />
      <div className="auth__brand">
        <div className="auth__logo">I</div>
        <div>
          <div>INDISA</div>
          <div className="auth__tag">Enterprise OS · v2.4 · build 2026.05</div>
        </div>
      </div>
      <div className="auth__hero">
        <h1 className="auth__title" style={{ fontSize: "100px" }}>El sistema operativo de tu <em>organización escalable.</em></h1>
        <p className="auth__sub">Gestiona departamentos, proyectos, KPIs y plan operativo anual desde un solo workspace seguro. Construido sobre la metodología Scaling Up.</p>
      </div>
      <div>
        <div className="auth__stats">
          <div className="auth__stat"><div className="n">12</div><div className="l">Departamentos</div></div>
          <div className="auth__stat"><div className="n">184</div><div className="l">Colaboradores</div></div>
          <div className="auth__stat"><div className="n">99.94%</div><div className="l">Disponibilidad</div></div>
        </div>
        <div className="auth__ticker" style={{ marginTop: 18 }}>
          <span><span className="led" /> Todos los sistemas operativos</span>
          <span>SOC 2 · Tipo II</span>
          <span>RBAC activo</span>
          <span>Auditoría activa</span>
        </div>
      </div>
    </div>);

}

window.Auth = Auth;