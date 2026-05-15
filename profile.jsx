// Mi Perfil — editar datos del usuario
const { useState, useEffect, useMemo, useRef } = React;

const AVATAR_COLORS = [
  "#2563eb", "#f97316", "#10b981", "#8b5cf6", "#ef4444",
  "#0ea5e9", "#d946ef", "#14b8a6", "#f59e0b", "#6366f1",
];

function ProfilePage({ session, setSession, users, setUsers, theme, setTheme, addAudit, showToast }) {
  const D = window.INDISA_DATA;
  const dept = session.dept ? D.DEPT_BY_ID[session.dept] : null;
  const stored = users[session.email.toLowerCase()] || {};

  const [name, setName] = useState(session.name || "");
  const [email, setEmail] = useState(session.email || "");
  const [position, setPosition] = useState(stored.position || (session.role === "owner" ? "Gerente General" : session.role === "admin" ? "Administrador de departamento" : "Colaborador"));
  const [phone, setPhone] = useState(stored.phone || "");
  const [bio, setBio] = useState(stored.bio || "");
  const [avatarColor, setAvatarColor] = useState(stored.avatarColor || "#2563eb");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => { setDirty(true); setSaved(false); }, [name, position, phone, bio, avatarColor, email]);
  useEffect(() => { setDirty(false); }, []); // initial load

  function save() {
    const email = session.email.toLowerCase();
    const updated = {
      ...stored,
      role: session.role,
      dept: session.dept,
      deptName: session.deptName,
      code: stored.code,
      name, position, phone, bio, avatarColor,
    };
    setUsers(prev => ({ ...prev, [email]: updated }));
    setSession(prev => ({ ...prev, name }));
    addAudit({ action: "Perfil actualizado", user: name, dept: session.dept, level: "info" });
    showToast("Perfil guardado");
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  }

  function reset() {
    setName(session.name || "");
    setPosition(stored.position || "");
    setPhone(stored.phone || "");
    setBio(stored.bio || "");
    setAvatarColor(stored.avatarColor || "#2563eb");
    setDirty(false);
  }

  const initials = name.split(/\s+/).map(s => s[0]).slice(0,2).join("").toUpperCase();
  const roleLabel = session.role === "owner" ? "Gerente General" : session.role === "admin" ? "Administrador" : "Visualizador";

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">Mi perfil</h1>
          <p className="page__sub">Personaliza tu información, preferencias y apariencia</p>
        </div>
        <div className="page__actions">
          {dirty && <button className="btn" onClick={reset}>Descartar</button>}
          <button className="btn btn--primary" onClick={save} disabled={!dirty} style={{opacity: dirty ? 1 : 0.5}}>
            <Icon name="check" size={14}/> {saved ? "Guardado" : "Guardar cambios"}
          </button>
        </div>
      </div>

      <div className="row row--112">
        {/* Left: avatar + identity card */}
        <Card title="Identidad" sub="cómo te ven los demás">
          <div style={{display: "grid", placeItems: "center", padding: "12px 0 18px", gap: 14}}>
            <div style={{
              width: 96, height: 96, borderRadius: "50%",
              background: avatarColor, color: "white",
              display: "grid", placeItems: "center",
              fontFamily: "var(--ff-mono)", fontSize: 32, fontWeight: 600,
              boxShadow: `0 8px 24px -8px ${avatarColor}80`,
            }}>{initials || "—"}</div>
            <div style={{textAlign: "center"}}>
              <div style={{fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em"}}>{name || "Sin nombre"}</div>
              <div className="dim" style={{fontSize: 12, marginTop: 4}}>{position}</div>
              <div className="flex-c gap-6" style={{justifyContent: "center", marginTop: 10}}>
                <span className="chip chip--accent" style={{fontSize: 10}}><span className="dot"/>{roleLabel}</span>
                {dept && <span className="chip" style={{fontSize: 10}}><span className="dot" style={{background: dept.color}}/>{dept.name}</span>}
              </div>
            </div>
          </div>

          <div className="divider"/>
          <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10, fontWeight: 500}}>Color del avatar</div>
          <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
            {AVATAR_COLORS.map(c => (
              <button key={c} onClick={() => setAvatarColor(c)} style={{
                width: 28, height: 28, borderRadius: "50%",
                background: c, border: avatarColor === c ? "3px solid var(--text)" : "2px solid transparent",
                cursor: "pointer", padding: 0,
              }}/>
            ))}
            <label style={{position: "relative", width: 28, height: 28, borderRadius: "50%", border: "1px dashed var(--line-strong)", display: "grid", placeItems: "center", cursor: "pointer"}}>
              <Icon name="plus" size={12}/>
              <input type="color" value={avatarColor} onChange={e => setAvatarColor(e.target.value)} style={{position: "absolute", inset: 0, opacity: 0, cursor: "pointer"}}/>
            </label>
          </div>
        </Card>

        {/* Right: editable fields */}
        <Card title="Información personal" sub="solo tú puedes editarlo">
          <div className="row row--2">
            <div className="field">
              <label>Nombre completo</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre"/>
            </div>
            <div className="field">
              <label>Cargo · Puesto</label>
              <input className="input" value={position} onChange={e => setPosition(e.target.value)} placeholder="Ej. Líder de proyecto"/>
            </div>
          </div>
          <div className="row row--2">
            <div className="field">
              <label>Correo de trabajo</label>
              <div className="flex-c gap-8">
                <input className="input" value={session.email} disabled style={{flex: 1, opacity: 0.7, cursor: "not-allowed"}}/>
                <button className="btn" type="button" onClick={() => setChangingEmail(true)}><Icon name="edit" size={13}/> Cambiar</button>
              </div>
            </div>
            <div className="field">
              <label>Teléfono</label>
              <input className="input mono" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+57 300 000 0000"/>
            </div>
          </div>
          <div className="field">
            <label>Acerca de mí</label>
            <textarea className="textarea input" style={{minHeight: 90, resize: "vertical"}} placeholder="Una breve descripción profesional…" value={bio} onChange={e => setBio(e.target.value)}/>
          </div>

          <div className="divider"/>

          <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10, fontWeight: 500}}>Acceso y permisos</div>
          <div className="row row--2">
            <div>
              <div className="dim" style={{fontSize: 11, marginBottom: 4}}>Rol asignado</div>
              <div style={{fontWeight: 500, fontSize: 14}}>{roleLabel}</div>
              <div className="dim mono" style={{fontSize: 11, marginTop: 4}}>código: {stored.code || "—"}</div>
            </div>
            <div>
              <div className="dim" style={{fontSize: 11, marginBottom: 4}}>Departamento</div>
              <div style={{fontWeight: 500, fontSize: 14}}>{dept ? dept.name : "Todos los departamentos"}</div>
              {dept && <div className="dim mono" style={{fontSize: 11, marginTop: 4}}>{dept.short}</div>}
            </div>
          </div>
          <div className="dim" style={{fontSize: 11, marginTop: 10, padding: 10, background: "var(--bg-1)", borderRadius: 6, display: "flex", alignItems: "center", gap: 8}}>
            <Icon name="lock" size={12}/> Tu rol y departamento se asignan mediante el código de acceso. Solo el Gerente General puede modificarlos.
          </div>
        </Card>
      </div>

      <div className="row row--2" style={{marginTop: 14}}>
        <Card title="Preferencias" sub="se aplican solo a tu cuenta">
          <div className="flex-c" style={{justifyContent: "space-between", padding: "10px 0"}}>
            <div>
              <div style={{fontWeight: 500, fontSize: 13}}>Tema oscuro</div>
              <div className="dim" style={{fontSize: 11, marginTop: 2}}>Cambia el aspecto de toda la interfaz</div>
            </div>
            <button className={"btn " + (theme === "dark" ? "btn--primary" : "")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={14}/> {theme === "dark" ? "Oscuro" : "Claro"}
            </button>
          </div>
          <div className="divider"/>
          <div className="flex-c" style={{justifyContent: "space-between", padding: "10px 0"}}>
            <div>
              <div style={{fontWeight: 500, fontSize: 13}}>Notificaciones</div>
              <div className="dim" style={{fontSize: 11, marginTop: 2}}>Alertas en el navegador y por correo</div>
            </div>
            <span className="chip chip--ok"><span className="dot"/>activas</span>
          </div>
          <div className="divider"/>
          <div className="flex-c" style={{justifyContent: "space-between", padding: "10px 0"}}>
            <div>
              <div style={{fontWeight: 500, fontSize: 13}}>Idioma</div>
              <div className="dim" style={{fontSize: 11, marginTop: 2}}>Español (Colombia)</div>
            </div>
            <span className="chip"><span className="dot"/>ES-CO</span>
          </div>
        </Card>

        <Card title="Seguridad" sub="protege tu cuenta">
          <div className="flex-c" style={{justifyContent: "space-between", padding: "10px 0"}}>
            <div>
              <div style={{fontWeight: 500, fontSize: 13}}>Contraseña</div>
              <div className="dim" style={{fontSize: 11, marginTop: 2}}>Última actualización: 2026-04-10</div>
            </div>
            <button className="btn" onClick={() => setChangingPwd(true)}><Icon name="key" size={14}/> Cambiar</button>
          </div>
          <div className="divider"/>
          <div className="flex-c" style={{justifyContent: "space-between", padding: "10px 0"}}>
            <div>
              <div style={{fontWeight: 500, fontSize: 13}}>Autenticación de 2 factores</div>
              <div className="dim" style={{fontSize: 11, marginTop: 2}}>Capa extra de seguridad para tu cuenta</div>
            </div>
            <span className="chip chip--warn"><span className="dot"/>desactivado</span>
          </div>
          <div className="divider"/>
          <div className="flex-c" style={{justifyContent: "space-between", padding: "10px 0"}}>
            <div>
              <div style={{fontWeight: 500, fontSize: 13}}>Sesiones activas</div>
              <div className="dim" style={{fontSize: 11, marginTop: 2}}>1 dispositivo · este navegador</div>
            </div>
            <button className="btn" onClick={() => showToast("Funcionalidad próximamente")}>Gestionar</button>
          </div>
        </Card>

        <Card title="Zona de peligro" sub="acciones irreversibles">
          <div className="flex-c" style={{justifyContent: "space-between", padding: "10px 0", gap: 16}}>
            <div>
              <div style={{fontWeight: 500, fontSize: 13, color: "var(--danger)"}}>Eliminar cuenta</div>
              <div className="dim" style={{fontSize: 11, marginTop: 2}}>Borra permanentemente tu cuenta, perfil y credenciales. No se puede deshacer.</div>
            </div>
            <button className="btn btn--danger" style={{flexShrink: 0}} onClick={() => setDeletingAccount(true)}>
              <Icon name="x" size={13}/> Eliminar cuenta
            </button>
          </div>
        </Card>
      </div>

      {deletingAccount && (
        <DeleteAccountModal
          email={session.email}
          storedPassword={stored.password || ""}
          onClose={() => setDeletingAccount(false)}
          onConfirm={() => {
            const emailKey = session.email.toLowerCase();
            addAudit({ action: `Cuenta eliminada: ${emailKey}`, user: session.name, dept: session.dept, level: "warn" });
            setUsers(prev => { const out = { ...prev }; delete out[emailKey]; return out; });
            showToast("Cuenta eliminada");
            setTimeout(() => setSession(null), 600);
          }}
        />
      )}

      {changingPwd && (
        <ChangePasswordModal
          currentPassword={stored.password || ""}
          onClose={() => setChangingPwd(false)}
          onChange={(newPwd) => {
            const emailKey = session.email.toLowerCase();
            setUsers(prev => ({ ...prev, [emailKey]: { ...prev[emailKey], password: newPwd } }));
            setSession(prev => ({ ...prev, password: newPwd }));
            addAudit({ action: "Contraseña actualizada", user: session.name, dept: session.dept, level: "info" });
            showToast("Contraseña actualizada");
            setChangingPwd(false);
          }}
        />
      )}

      {changingEmail && (
        <ChangeEmailModal
          currentEmail={session.email}
          users={users}
          onClose={() => setChangingEmail(false)}
          onChange={(newEmail) => {
            const oldKey = session.email.toLowerCase();
            const newKey = newEmail.toLowerCase().trim();
            setUsers(prev => {
              const out = { ...prev };
              out[newKey] = { ...out[oldKey] };
              if (newKey !== oldKey) delete out[oldKey];
              return out;
            });
            setSession(prev => ({ ...prev, email: newKey }));
            addAudit({ action: `Correo actualizado: ${oldKey} → ${newKey}`, user: session.name, dept: session.dept, level: "info" });
            showToast("Correo actualizado");
            setChangingEmail(false);
          }}
        />
      )}
    </div>
  );
}

function ChangePasswordModal({ currentPassword, onClose, onChange }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  function submit() {
    setErr("");
    if (currentPassword && current !== currentPassword) { setErr("La contraseña actual es incorrecta."); return; }
    if (next.length < 4) { setErr("La nueva contraseña debe tener al menos 4 caracteres."); return; }
    if (next !== confirm) { setErr("Las contraseñas no coinciden."); return; }
    onChange(next);
  }

  // Password strength
  const strength = (() => {
    let s = 0;
    if (next.length >= 6) s++;
    if (next.length >= 10) s++;
    if (/[A-Z]/.test(next) && /[a-z]/.test(next)) s++;
    if (/\d/.test(next)) s++;
    if (/[^a-zA-Z0-9]/.test(next)) s++;
    return Math.min(4, s);
  })();
  const strengthLabels = ["Débil", "Débil", "Aceptable", "Buena", "Fuerte"];
  const strengthColors = ["var(--danger)", "var(--danger)", "var(--warning)", "var(--accent)", "var(--positive)"];

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title"><Icon name="key" size={14}/> Cambiar contraseña</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          {currentPassword && (
            <div className="field">
              <label>Contraseña actual</label>
              <input className="input" type="password" placeholder="Tu contraseña actual" value={current} onChange={e => setCurrent(e.target.value)} autoFocus/>
            </div>
          )}
          <div className="field">
            <label>Nueva contraseña</label>
            <input className="input" type="password" placeholder="Mínimo 4 caracteres" value={next} onChange={e => setNext(e.target.value)} autoFocus={!currentPassword}/>
            {next && (
              <div style={{marginTop: 8}}>
                <div className="flex" style={{gap: 4}}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{flex: 1, height: 4, borderRadius: 2, background: i < strength ? strengthColors[strength] : "var(--bg-3)"}}/>
                  ))}
                </div>
                <div className="dim" style={{fontSize: 11, marginTop: 4, color: strengthColors[strength]}}>Fortaleza: {strengthLabels[strength]}</div>
              </div>
            )}
          </div>
          <div className="field">
            <label>Confirmar nueva contraseña</label>
            <input className="input" type="password" placeholder="Repite la nueva contraseña" value={confirm} onChange={e => setConfirm(e.target.value)}/>
          </div>
          {err && <div className="auth__error">{err}</div>}
          <div className="dim" style={{fontSize: 12, marginTop: 12, padding: 10, background: "var(--bg-1)", borderRadius: 6, display: "flex", alignItems: "center", gap: 8}}>
            <Icon name="shield" size={12}/> Usa una contraseña única y segura. Las sesiones activas se mantendrán abiertas.
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={submit} disabled={!next || !confirm || (currentPassword && !current)} style={{opacity: (!next || !confirm || (currentPassword && !current)) ? 0.5 : 1}}>
            <Icon name="check" size={14}/> Actualizar contraseña
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangeEmailModal({ currentEmail, users, onClose, onChange }) {
  const [newEmail, setNewEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  function submit() {
    setErr("");
    const clean = newEmail.toLowerCase().trim();
    if (!clean.includes("@")) { setErr("Ingresa un correo válido."); return; }
    if (clean === currentEmail.toLowerCase()) { setErr("El nuevo correo es igual al actual."); return; }
    if (users[clean]) { setErr("Ya existe un usuario con ese correo."); return; }
    if (clean !== confirm.toLowerCase().trim()) { setErr("Los correos no coinciden."); return; }
    onChange(clean);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title"><Icon name="edit" size={14}/> Cambiar correo de trabajo</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          <div className="field">
            <label>Correo actual</label>
            <input className="input mono" value={currentEmail} disabled style={{opacity: 0.6, cursor: "not-allowed"}}/>
          </div>
          <div className="field">
            <label>Nuevo correo</label>
            <input className="input" type="email" placeholder="nuevo.correo@indisa.co" value={newEmail} onChange={e => setNewEmail(e.target.value)} autoFocus/>
          </div>
          <div className="field">
            <label>Confirmar nuevo correo</label>
            <input className="input" type="email" placeholder="Repite el nuevo correo" value={confirm} onChange={e => setConfirm(e.target.value)}/>
          </div>
          {err && <div className="auth__error">{err}</div>}
          <div className="dim" style={{fontSize: 12, marginTop: 12, padding: 10, background: "var(--bg-1)", borderRadius: 6, display: "flex", alignItems: "center", gap: 8}}>
            <Icon name="shield" size={12}/> Tu rol, departamento y código de acceso se mantendrán igual. Tendrás que usar el nuevo correo para iniciar sesión la próxima vez.
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={submit} disabled={!newEmail || !confirm} style={{opacity: (!newEmail || !confirm) ? 0.5 : 1}}>
            <Icon name="check" size={14}/> Actualizar correo
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteAccountModal({ email, storedPassword, onClose, onConfirm }) {
  const [confirmText, setConfirmText] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  function submit() {
    setErr("");
    if (storedPassword && pwd !== storedPassword) { setErr("Contraseña incorrecta."); return; }
    if (confirmText.trim().toUpperCase() !== "ELIMINAR") { setErr('Escribe "ELIMINAR" para confirmar.'); return; }
    onConfirm();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{maxWidth: 440}} onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title" style={{color: "var(--danger)"}}><Icon name="warn" size={14}/> Eliminar cuenta</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          <div className="alert alert--warn" style={{marginBottom: 16}}>
            <span className="ic-wrap"><Icon name="warn" size={13} stroke={2}/></span>
            <span><b>Esta acción es permanente.</b> Se eliminará tu cuenta <b>{email}</b>, tu perfil y tus credenciales. Tendrás que registrarte de nuevo con tu código de acceso.</span>
          </div>
          {storedPassword && (
            <div className="field">
              <label>Confirma tu contraseña</label>
              <input className="input" type="password" placeholder="Tu contraseña" value={pwd} onChange={e => setPwd(e.target.value)} autoFocus/>
            </div>
          )}
          <div className="field">
            <label>Escribe <b style={{color: "var(--danger)"}}>ELIMINAR</b> para confirmar</label>
            <input className="input mono" placeholder="ELIMINAR" value={confirmText} onChange={e => setConfirmText(e.target.value)} autoFocus={!storedPassword}/>
          </div>
          {err && <div className="auth__error">{err}</div>}
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--danger" onClick={submit}
            disabled={confirmText.trim().toUpperCase() !== "ELIMINAR" || (storedPassword && !pwd)}
            style={{opacity: (confirmText.trim().toUpperCase() !== "ELIMINAR" || (storedPassword && !pwd)) ? 0.5 : 1}}>
            <Icon name="x" size={14}/> Eliminar mi cuenta permanentemente
          </button>
        </div>
      </div>
    </div>
  );
}

window.ProfilePage = ProfilePage;
