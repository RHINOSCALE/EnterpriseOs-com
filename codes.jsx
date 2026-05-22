// Códigos de Acceso
const { useState, useEffect, useMemo, useRef } = React;

function CodesPage({ session, codes, setCodes, addAudit, showToast }) {
  const D = window.INDISA_DATA;
  const role = session.role;
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("active");

  const today = new Date();
  const all = codes.filter(c => role === "owner" ? true : c.dept === session.dept);
  const filtered = all.filter(c => {
    const expired = new Date(c.expires) < today;
    if (filter === "active") return !c.revoked && !expired && c.uses < c.max;
    if (filter === "revoked") return c.revoked;
    if (filter === "expired") return expired;
    return true;
  });

  function revoke(code) {
    setCodes(prev => prev.map(c => c.code === code ? { ...c, revoked: true } : c));
    addAudit({ action: `Código revocado · ${code}`, user: session.name, dept: session.dept || "gg", level: "warn" });
    showToast(`Código ${code} revocado`);
  }
  function copy(code) {
    navigator.clipboard?.writeText(code);
    showToast("Copiado al portapapeles");
  }
  function createCode(payload) {
    const newCode = { ...payload, uses: 0, revoked: false, createdBy: session.name, createdAt: new Date().toISOString().slice(0, 10) };
    setCodes(prev => [newCode, ...prev]);
    addAudit({ action: `Código creado · ${payload.code}`, user: session.name, dept: payload.dept || "gg", level: "success" });
    showToast(`Código ${payload.code} creado`);
    setFilter("all"); // switch filter so the new code is always visible
  }

  const filterLabels = { active: "activos", all: "todos", revoked: "revocados", expired: "expirados" };

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">Códigos de Acceso</h1>
          <p className="page__sub">{role === "owner" ? "Todos los códigos empresariales" : "Códigos que puedes crear como Admin"} · únicos · revocables · con expiración</p>
        </div>
        <div className="page__actions">
          <button className="btn"><Icon name="filter" size={14}/> {filterLabels[filter]}</button>
          <button className="btn btn--primary" onClick={() => setCreating(true)}><Icon name="plus" size={14}/> Nuevo código</button>
        </div>
      </div>

      <div className="row row--4" style={{marginBottom: 14}}>
        <Card title="Activos">
          <div style={{fontSize: 30, fontWeight: 600, color: "var(--positive)", letterSpacing: "-0.02em"}}>
            {all.filter(c => !c.revoked && new Date(c.expires) >= today && c.uses < c.max).length}
          </div>
        </Card>
        <Card title="Revocados">
          <div style={{fontSize: 30, fontWeight: 600, color: "var(--danger)", letterSpacing: "-0.02em"}}>
            {all.filter(c => c.revoked).length}
          </div>
        </Card>
        <Card title="Expirados">
          <div style={{fontSize: 30, fontWeight: 600, color: "var(--warning)", letterSpacing: "-0.02em"}}>
            {all.filter(c => new Date(c.expires) < today).length}
          </div>
        </Card>
        <Card title="Usados hoy">
          <div style={{fontSize: 30, fontWeight: 600, color: "var(--accent)", letterSpacing: "-0.02em"}}>3</div>
        </Card>
      </div>

      <div className="tabs">
        {["active", "all", "revoked", "expired"].map(f => (
          <div key={f} className={"tabs__tab " + (filter === f ? "is-active" : "")} onClick={() => setFilter(f)}>{filterLabels[f]}</div>
        ))}
      </div>

      <Card title="Códigos" sub={`${filtered.length} registros`}>
        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Rol</th>
              <th>Departamento</th>
              <th className="right">Uso</th>
              <th>Expira</th>
              <th>Estado</th>
              <th>Creado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const expired = new Date(c.expires) < today;
              const exhausted = c.uses >= c.max;
              const status = c.revoked ? "revoked" : expired ? "expired" : exhausted ? "exhausted" : "active";
              return (
                <tr key={c.code}>
                  <td><span className="code-chip">{c.code}</span></td>
                  <td><span className="chip" style={{textTransform: "capitalize", fontSize: 10}}>{c.role}</span></td>
                  <td className="dim">{c.dept ? D.DEPT_BY_ID[c.dept].name : "Todos"}</td>
                  <td className="right mono">{c.uses} / {c.max}</td>
                  <td className="mono dim" style={{fontSize: 12}}>{c.expires}</td>
                  <td>
                    {status === "active" && <span className="chip chip--ok"><span className="dot"/>activo</span>}
                    {status === "revoked" && <span className="chip chip--bad"><span className="dot"/>revocado</span>}
                    {status === "expired" && <span className="chip chip--warn"><span className="dot"/>expirado</span>}
                    {status === "exhausted" && <span className="chip chip--warn"><span className="dot"/>agotado</span>}
                  </td>
                  <td className="dim mono" style={{fontSize: 11}}>{c.createdAt} · {c.createdBy}</td>
                  <td className="right" style={{whiteSpace: "nowrap"}}>
                    <button className="btn btn--sm" onClick={() => copy(c.code)}><Icon name="copy" size={12}/></button>
                    {!c.revoked && (
                      <button className="btn btn--sm btn--danger" style={{marginLeft: 6}} onClick={() => revoke(c.code)}>Revocar</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {creating && <CreateCodeModal role={role} session={session} onClose={() => setCreating(false)} onCreate={(p) => { createCode(p); setCreating(false); }}/>}
    </div>
  );
}

function CreateCodeModal({ role, session, onClose, onCreate }) {
  const D = window.INDISA_DATA;
  const [r, setR] = useState(role === "owner" ? "admin" : "viewer");
  const [dept, setDept] = useState(session.dept || "mkt");
  const [max, setMax] = useState(5);
  const [exp, setExp] = useState(() => `${new Date().getFullYear()}-12-31`);
  const [singleUse, setSingleUse] = useState(false);
  const [prefix, setPrefix] = useState("INDISA");

  const code = `${prefix}-${r.toUpperCase()}-${D.DEPT_BY_ID[dept]?.short || "X"}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title">Crear código de acceso</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          <div style={{padding: 12, border: "1px dashed var(--accent-line)", borderRadius: 8, background: "var(--accent-soft)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between"}}>
            <span className="mono" style={{fontSize: 14, color: "var(--accent)", fontWeight: 600}}>{code}</span>
            <span className="dim" style={{fontSize: 11}}>vista previa</span>
          </div>
          <div className="row row--2">
            <div className="field">
              <label>Rol</label>
              <select className="select" value={r} onChange={e => setR(e.target.value)} disabled={role === "admin"}>
                {role === "owner" && <option value="admin">Admin</option>}
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="field">
              <label>Departamento</label>
              <select className="select" value={dept} onChange={e => setDept(e.target.value)} disabled={role !== "owner"}>
                {D.DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="row row--2">
            <div className="field">
              <label>Límite de uso</label>
              <input className="input mono" type="number" min="1" value={singleUse ? 1 : max} disabled={singleUse} onChange={e => setMax(parseInt(e.target.value) || 1)}/>
            </div>
            <div className="field">
              <label>Expira el</label>
              <input className="input mono" type="date" value={exp} onChange={e => setExp(e.target.value)}/>
            </div>
          </div>
          <label className="flex-c gap-8" style={{fontSize: 13, padding: "2px 2px"}}>
            <input type="checkbox" checked={singleUse} onChange={e => setSingleUse(e.target.checked)} style={{accentColor: "var(--accent)"}}/>
            Código de un solo uso (límite 1)
          </label>
          <div className="dim mono" style={{fontSize: 11, marginTop: 12, padding: 10, background: "var(--bg-1)", borderRadius: 6}}>
            <Icon name="shield" size={11}/> Los códigos se validan por firma, rol, departamento, expiración y límite de uso. Códigos reutilizados, expirados o revocados son bloqueados y registrados.
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={() => onCreate({ code, role: r, dept, max: singleUse ? 1 : max, expires: exp })}><Icon name="plus" size={14}/> Crear código</button>
        </div>
      </div>
    </div>
  );
}

window.CodesPage = CodesPage;
