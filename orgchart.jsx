// Organigrama
const { useState, useEffect, useMemo, useRef } = React;

function OrgChart({ session, users, onSelectDept }) {
  const D = window.INDISA_DATA;
  const tree = D.ORG_TREE;
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState(null);

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Group registered users by department + role
  const usersByDept = useMemo(() => {
    const out = {};
    Object.entries(users || {}).forEach(([email, u]) => {
      const key = u.dept || "_owner";
      if (!out[key]) out[key] = { admins: [], viewers: [], owners: [] };
      const entry = { email, ...u };
      if (u.role === "owner") out[key].owners.push(entry);
      else if (u.role === "admin") out[key].admins.push(entry);
      else if (u.role === "viewer") out[key].viewers.push(entry);
    });
    return out;
  }, [users]);

  // Real owner — prefer first registered owner
  const realOwner = (usersByDept._owner?.owners || [])[0];
  const ownerNode = realOwner
    ? { ...tree.owner, name: realOwner.name, code: realOwner.code, email: realOwner.email, registered: true }
    : { ...tree.owner, registered: false };

  function getInitials(name) {
    return (name || "").split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase() || "?";
  }

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">Organigrama</h1>
          <p className="page__sub">Owner → Admin → Viewer · {D.DEPARTMENTS.length} departamentos · {Object.keys(users || {}).length} {Object.keys(users || {}).length === 1 ? "miembro registrado" : "miembros registrados"}</p>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={() => {
            const body = window.buildOrgReport(D.ORG_TREE, D.DEPARTMENTS, D.DEPT_BY_ID, users);
            window.exportPDF("Organigrama INDISA", body, "Organigrama_INDISA.pdf");
          }}><Icon name="doc" size={14}/> Exportar</button>
          {session.role !== "viewer" && <button className="btn btn--primary"><Icon name="plus" size={14}/> Invitar</button>}
        </div>
      </div>

      <div className="row row--212">
        <Card title="Jerarquía" sub="clic en un nodo para inspeccionar · solo se muestran cuentas registradas">
          <div className="org-wrap">
            <div className="org">
              <div className={"org__node is-owner"} onClick={() => setSelected(ownerNode)}>
                <div className="role">Owner · Gerente General</div>
                <div className="nm">{ownerNode.registered ? ownerNode.name : <span style={{color: "var(--text-3)", fontStyle: "italic"}}>Sin registrar</span>}</div>
                <div className="dpt">{ownerNode.registered ? ownerNode.email : ownerNode.code}</div>
              </div>
              <div style={{width: 2, height: 28, background: "var(--line-strong)", marginTop: -32, position: "relative", top: 8}}/>
              <div className="org__row">
                {tree.admins.map((adm) => {
                  const dept = D.DEPT_BY_ID[adm.dept];
                  if (!dept) return null;
                  const deptUsers = usersByDept[adm.dept] || { admins: [], viewers: [] };
                  const admins = deptUsers.admins;
                  const viewers = deptUsers.viewers;
                  return (
                    <div key={adm.id} className="org__group">
                      {admins.length === 0 ? (
                        <div className="org__node" style={{opacity: 0.55, borderStyle: "dashed"}}>
                          <div style={{display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4}}>
                            <span style={{width: 6, height: 6, borderRadius: 2, background: dept.color}}/>
                            <div className="role">Admin · {dept.short}</div>
                          </div>
                          <div className="nm" style={{color: "var(--text-3)", fontStyle: "italic"}}>Sin admin</div>
                          <div className="dpt">{dept.name}</div>
                        </div>
                      ) : (
                        admins.map((a, idx) => (
                          <div key={a.email} className="org__node" onClick={() => { setSelected({ ...a, role: "admin" }); onSelectDept && onSelectDept(a.dept); }} style={idx > 0 ? {marginTop: 8} : {}}>
                            <div style={{display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4}}>
                              <span style={{width: 6, height: 6, borderRadius: 2, background: dept.color}}/>
                              <div className="role">Admin · {dept.short}</div>
                            </div>
                            <div className="flex-c gap-8" style={{justifyContent: "center"}}>
                              <span style={{width: 26, height: 26, borderRadius: "50%", background: a.avatarColor || "var(--accent)", color: "white", display: "grid", placeItems: "center", fontSize: 10, fontFamily: "var(--ff-mono)", fontWeight: 600}}>{getInitials(a.name)}</span>
                              <div className="nm">{a.name}</div>
                            </div>
                            <div className="dpt" style={{fontSize: 10}}>{a.email}</div>
                            {viewers.length > 0 && (
                              <div style={{marginTop: 8, fontSize: 11, color: "var(--accent)", cursor: "pointer", fontWeight: 500}} onClick={(e) => { e.stopPropagation(); toggle(adm.id); }}>
                                {expanded[adm.id] ? "Ocultar viewers" : `+ ${viewers.length} viewer${viewers.length === 1 ? "" : "s"}`}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      {expanded[adm.id] && viewers.length > 0 && (
                        <>
                          <div style={{width: 2, height: 16, background: "var(--line)"}}/>
                          <div style={{display: "flex", flexDirection: "column", gap: 6}}>
                            {viewers.map(v => (
                              <div key={v.email} className="org__node" onClick={() => setSelected({ ...v, role: "viewer" })} style={{minWidth: 160, padding: "8px 10px"}}>
                                <div className="role">Viewer</div>
                                <div className="flex-c gap-6" style={{justifyContent: "center", marginTop: 2}}>
                                  <span style={{width: 18, height: 18, borderRadius: "50%", background: v.avatarColor || "var(--accent)", color: "white", display: "grid", placeItems: "center", fontSize: 8, fontFamily: "var(--ff-mono)", fontWeight: 600}}>{getInitials(v.name)}</span>
                                  <div className="nm" style={{fontSize: 12}}>{v.name}</div>
                                </div>
                                <div className="dpt" style={{fontSize: 9}}>{v.email}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Empty state if no users registered at all */}
              {Object.values(usersByDept).every(d => d.admins.length === 0 && d.viewers.length === 0) && !realOwner && (
                <div className="dim" style={{textAlign: "center", padding: 40, fontSize: 13}}>
                  Aún no hay cuentas registradas. Cuando los usuarios se registren con sus códigos de acceso, aparecerán aquí.
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Inspector" sub={selected ? selected.name : "selecciona un nodo"}>
          {selected ? (
            <div style={{padding: 4}}>
              <div className="flex-c gap-10" style={{marginBottom: 12}}>
                <div style={{width: 46, height: 46, borderRadius: "50%", background: selected.avatarColor || "var(--accent)", color: "white", display: "grid", placeItems: "center", fontFamily: "var(--ff-mono)", fontSize: 13, fontWeight: 600}}>
                  {(selected.name || "").split(/\s+/).map(s => s[0]).slice(0,2).join("").toUpperCase() || "?"}
                </div>
                <div>
                  <div style={{fontWeight: 600, fontSize: 14}}>{selected.name || "Sin registrar"}</div>
                  <div className="dim" style={{fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2}}>
                    {selected.role === "owner" ? "Owner" : selected.role === "admin" ? "Admin" : "Viewer"}
                    {selected.dept ? " · " + D.DEPT_BY_ID[selected.dept].name : ""}
                  </div>
                </div>
              </div>
              <div className="divider"/>
              {selected.email && <Field label="Correo" value={<span className="mono" style={{fontSize: 12}}>{selected.email}</span>}/>}
              <Field label="Código de acceso" value={<span className="code-chip">{selected.code}</span>}/>
              <Field label="Departamento" value={selected.dept ? D.DEPT_BY_ID[selected.dept].name : "Todos"}/>
              {selected.position && <Field label="Cargo" value={selected.position}/>}
              {selected.phone && <Field label="Teléfono" value={<span className="mono">{selected.phone}</span>}/>}
              <Field label="Permisos" value={
                <div className="flex gap-6" style={{flexWrap: "wrap", marginTop: 2}}>
                  {permissionsFor(selected.role).map(p => <span key={p} className="chip" style={{fontSize: 10}}>{p}</span>)}
                </div>
              }/>
              {selected.registeredAt && <Field label="Registrado" value={<span className="mono dim">{selected.registeredAt}</span>}/>}
              {session.role !== "viewer" && (
                <div className="flex gap-6" style={{marginTop: 14}}>
                  <button className="btn btn--sm"><Icon name="edit" size={12}/> Editar</button>
                  <button className="btn btn--sm"><Icon name="key" size={12}/> Resetear código</button>
                  <button className="btn btn--sm btn--danger"><Icon name="x" size={12}/> Revocar</button>
                </div>
              )}
            </div>
          ) : (
            <div className="dim" style={{padding: 16, fontSize: 13}}>Haz clic en cualquier nodo del organigrama para ver el perfil, código y permisos.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, padding: "6px 0", alignItems: "flex-start"}}>
      <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", paddingTop: 2, fontWeight: 500}}>{label}</div>
      <div style={{fontSize: 13}}>{value}</div>
    </div>
  );
}

function permissionsFor(role) {
  switch (role) {
    case "owner": return ["todos-deptos", "crear-codigos", "gestionar-usuarios", "editar-todos-kpis", "ver-auditoría"];
    case "admin": return ["su-departamento", "crear-cod-viewer", "editar-kpis-depto", "gestionar-proyectos"];
    case "viewer": return ["leer-depto", "comentar-proyectos"];
    default: return [];
  }
}

window.OrgChart = OrgChart;
