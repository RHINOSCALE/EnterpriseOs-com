// Documentos / Archivos — con permisos por rol y compartido entre departamentos
const { useState, useEffect, useMemo, useRef } = React;

const FILE_KINDS = {
  doc:   { label: "Documento",   color: "#2563eb", ext: "docx" },
  sheet: { label: "Hoja",        color: "#10b981", ext: "xlsx" },
  slide: { label: "Presentación",color: "#f97316", ext: "pptx" },
  pdf:   { label: "PDF",         color: "#ef4444", ext: "pdf"  },
  image: { label: "Imagen",      color: "#8b5cf6", ext: "png"  },
  other: { label: "Archivo",     color: "#6b7280", ext: "bin"  },
};

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/(1024*1024)).toFixed(1) + " MB";
}

function inferKind(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (["docx","doc","odt","txt"].includes(ext)) return "doc";
  if (["xlsx","xls","csv","ods"].includes(ext)) return "sheet";
  if (["pptx","ppt","key"].includes(ext)) return "slide";
  if (["pdf"].includes(ext)) return "pdf";
  if (["png","jpg","jpeg","gif","svg","webp"].includes(ext)) return "image";
  return "other";
}

function FilesPage({ session, deptScope, files, setFiles, addAudit, showToast }) {
  const D = window.INDISA_DATA;
  const role = session.role;
  const readOnly = role === "viewer";
  const effDept = role === "owner" ? deptScope : session.dept;

  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterKind, setFilterKind] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [sharing, setSharing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [preview, setPreview] = useState(null);

  // Visibility rules:
  // - owner: sees ALL files (when no deptScope) or filtered to deptScope
  // - admin/viewer: sees files in their dept + files shared with their dept
  const visibleFiles = useMemo(() => {
    let list = files;
    if (role === "owner") {
      if (effDept) list = files.filter(f => f.dept === effDept || (f.sharedWith || []).includes(effDept));
    } else {
      const myDept = session.dept;
      list = files.filter(f => f.dept === myDept || (f.sharedWith || []).includes(myDept));
    }
    return list;
  }, [files, role, effDept, session.dept]);

  const filtered = visibleFiles.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "all" || f.dept === filterDept || (f.sharedWith || []).includes(filterDept);
    const matchKind = filterKind === "all" || f.kind === filterKind;
    return matchSearch && matchDept && matchKind;
  });

  function uploadFile(data) {
    const id = "f" + Math.random().toString(36).slice(2,6);
    const newFile = {
      id, ...data,
      kind: data.kind || inferKind(data.name),
      uploadedBy: session.name,
      uploadedAt: "2026-05-14",
      sharedWith: [],
    };
    setFiles(prev => [newFile, ...prev]);
    addAudit({ action: `Documento cargado: ${data.name}`, user: session.name, dept: data.dept, level: "success" });
    showToast("Documento cargado");
    setUploading(false);
  }

  function shareFile(fileId, depts) {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, sharedWith: depts } : f));
    addAudit({ action: `Documento compartido con ${depts.length} dpto(s)`, user: session.name, dept: session.dept || "gg", level: "info" });
    showToast(`Compartido con ${depts.length} departamentos`);
    setSharing(null);
  }

  function deleteFile(fid) {
    const f = files.find(x => x.id === fid);
    setFiles(prev => prev.filter(x => x.id !== fid));
    addAudit({ action: `Documento eliminado: ${f?.name}`, user: session.name, dept: f?.dept || "gg", level: "warn" });
    showToast("Documento eliminado");
    setDeleteId(null);
  }

  function canEdit(f) {
    if (role === "owner") return true;
    if (role === "admin" && f.dept === session.dept) return true;
    return false;
  }

  // Stats
  const totalSize = visibleFiles.reduce((s, f) => s + f.size, 0);
  const sharedCount = visibleFiles.filter(f => (f.sharedWith || []).length > 0).length;

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">Documentos</h1>
          <p className="page__sub">
            {role === "owner"
              ? (effDept ? `${D.DEPT_BY_ID[effDept].name} · ` : "Acceso total · ") + `${filtered.length} archivos`
              : `${D.DEPT_BY_ID[session.dept]?.name} + compartidos · ${filtered.length} archivos`}
          </p>
        </div>
        <div className="page__actions">
          <div className="tabs" style={{border: "none", margin: 0}}>
            <div className={"tabs__tab " + (view === "grid" ? "is-active" : "")} onClick={() => setView("grid")} style={{padding: "6px 10px"}}><Icon name="grid" size={14}/></div>
            <div className={"tabs__tab " + (view === "list" ? "is-active" : "")} onClick={() => setView("list")} style={{padding: "6px 10px"}}><Icon name="board" size={14}/></div>
          </div>
          {readOnly && <span className="chip"><Icon name="lock" size={11}/> Solo lectura</span>}
          {!readOnly && <button className="btn btn--primary" onClick={() => setUploading(true)}><Icon name="plus" size={14}/> Cargar documento</button>}
        </div>
      </div>

      {/* Banner: owner exclusive access */}
      {role === "owner" && (
        <div className="alert alert--info">
          <span className="ic-wrap"><Icon name="shield" size={13} stroke={2}/></span>
          <span><b>Acceso de Gerencia General:</b> ves todos los documentos de la organización, incluso los no compartidos. Los administradores y viewers solo ven los suyos y los que les fueron compartidos.</span>
        </div>
      )}

      {/* Stats */}
      <div className="row row--4" style={{marginBottom: 14}}>
        <Card title="Archivos">
          <div style={{fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em"}}>{visibleFiles.length}</div>
        </Card>
        <Card title="Tamaño total">
          <div style={{fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em"}}>{formatSize(totalSize)}</div>
        </Card>
        <Card title="Compartidos">
          <div style={{fontSize: 28, fontWeight: 600, color: "var(--accent)", letterSpacing: "-0.02em"}}>{sharedCount}</div>
        </Card>
        <Card title="Confidenciales">
          <div style={{fontSize: 28, fontWeight: 600, color: "var(--danger)", letterSpacing: "-0.02em"}}>{visibleFiles.filter(f => f.confidential).length}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex-c gap-10" style={{marginBottom: 14, flexWrap: "wrap"}}>
        <div className="tb__search" style={{minWidth: 280}}>
          <Icon name="search" size={14}/>
          <input placeholder="Buscar por nombre…" value={search} onChange={e => setSearch(e.target.value)} style={{flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13}}/>
        </div>
        <select className="select" style={{width: "auto"}} value={filterKind} onChange={e => setFilterKind(e.target.value)}>
          <option value="all">Todos los tipos</option>
          {Object.entries(FILE_KINDS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {role === "owner" && (
          <select className="select" style={{width: "auto"}} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="all">Todos los departamentos</option>
            {D.DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>

      {/* Files */}
      {view === "grid" ? (
        <div className="row row--4">
          {filtered.map(f => {
            const kind = FILE_KINDS[f.kind] || FILE_KINDS.other;
            const dept = D.DEPT_BY_ID[f.dept];
            const shared = (f.sharedWith || []).length;
            return (
              <div key={f.id} className="card" style={{padding: 14, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8}} onClick={() => setPreview(f)}>
                <div className="flex-c" style={{justifyContent: "space-between"}}>
                  <div style={{width: 40, height: 48, borderRadius: 6, background: kind.color + "18", color: kind.color, display: "grid", placeItems: "center", fontFamily: "var(--ff-mono)", fontSize: 11, fontWeight: 600, position: "relative"}}>
                    {kind.ext.toUpperCase()}
                    {f.confidential && <span style={{position: "absolute", top: -6, right: -6, width: 16, height: 16, borderRadius: "50%", background: "var(--danger)", color: "white", display: "grid", placeItems: "center"}}><Icon name="lock" size={10}/></span>}
                  </div>
                  {canEdit(f) && (
                    <button className="btn btn--sm" onClick={e => { e.stopPropagation(); setDeleteId(f.id); }} style={{color: "var(--danger)", border: "none", background: "transparent", padding: "2px 4px"}}><Icon name="x" size={14}/></button>
                  )}
                </div>
                <div style={{fontSize: 13, fontWeight: 500, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"}}>{f.name}</div>
                <div className="dim" style={{fontSize: 11}}>
                  <div className="flex-c gap-6">
                    <span style={{width: 6, height: 6, borderRadius: 2, background: dept?.color}}/>
                    {dept?.short || "—"}
                  </div>
                </div>
                <div className="flex-c" style={{justifyContent: "space-between", marginTop: "auto"}}>
                  <span className="dim mono" style={{fontSize: 10}}>{formatSize(f.size)}</span>
                  {shared > 0 && <span className="chip chip--accent" style={{fontSize: 10}}><Icon name="users2" size={10}/> {shared}</span>}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="card" style={{gridColumn: "1 / -1", padding: 40, textAlign: "center"}}>
              <Icon name="folder" size={32} className="dim"/>
              <div className="dim" style={{marginTop: 12}}>No hay documentos con esos filtros.</div>
            </div>
          )}
        </div>
      ) : (
        <Card title="Documentos" sub={`${filtered.length} archivos`}>
          <table className="table">
            <thead><tr><th>Nombre</th><th>Tipo</th><th>Depto</th><th>Compartido con</th><th>Tamaño</th><th>Subido</th><th></th></tr></thead>
            <tbody>
              {filtered.map(f => {
                const kind = FILE_KINDS[f.kind] || FILE_KINDS.other;
                const dept = D.DEPT_BY_ID[f.dept];
                return (
                  <tr key={f.id} style={{cursor: "pointer"}}>
                    <td onClick={() => setPreview(f)}>
                      <div className="flex-c gap-10">
                        <span style={{width: 28, height: 32, borderRadius: 4, background: kind.color + "18", color: kind.color, display: "grid", placeItems: "center", fontFamily: "var(--ff-mono)", fontSize: 9, fontWeight: 600}}>{kind.ext.toUpperCase()}</span>
                        <span>
                          {f.name}
                          {f.confidential && <span className="chip chip--bad" style={{fontSize: 9, marginLeft: 8}}><Icon name="lock" size={10}/> Confidencial</span>}
                        </span>
                      </div>
                    </td>
                    <td onClick={() => setPreview(f)}><span className="chip" style={{fontSize: 10}}>{kind.label}</span></td>
                    <td onClick={() => setPreview(f)}><span className="flex-c gap-6"><span style={{width: 6, height: 6, borderRadius: 2, background: dept?.color}}/>{dept?.name}</span></td>
                    <td onClick={() => setPreview(f)}>
                      {(f.sharedWith || []).length === 0
                        ? <span className="dim">—</span>
                        : (f.sharedWith || []).slice(0, 3).map(did => <span key={did} className="chip" style={{fontSize: 10, marginRight: 4}}>{D.DEPT_BY_ID[did]?.short}</span>)}
                      {(f.sharedWith || []).length > 3 && <span className="dim">+{f.sharedWith.length - 3}</span>}
                    </td>
                    <td className="mono dim" style={{fontSize: 12}} onClick={() => setPreview(f)}>{formatSize(f.size)}</td>
                    <td className="dim" style={{fontSize: 11}} onClick={() => setPreview(f)}><div>{f.uploadedAt}</div><div className="mono">{f.uploadedBy}</div></td>
                    <td className="right">
                      {canEdit(f) && (
                        <>
                          <button className="btn btn--sm" onClick={() => setSharing(f)}><Icon name="users2" size={12}/></button>
                          <button className="btn btn--sm btn--danger" style={{marginLeft: 4}} onClick={() => setDeleteId(f.id)}><Icon name="x" size={12}/></button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="dim" style={{textAlign: "center", padding: 24}}>No hay documentos con esos filtros.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {preview && <FilePreviewModal f={preview} canEdit={canEdit(preview)} onClose={() => setPreview(null)} onShare={() => { setSharing(preview); setPreview(null); }} onDelete={() => { setDeleteId(preview.id); setPreview(null); }} showToast={showToast}/>}
      {sharing && <ShareModal f={sharing} onClose={() => setSharing(null)} onShare={depts => shareFile(sharing.id, depts)}/>}
      {uploading && <UploadModal session={session} effDept={effDept} onClose={() => setUploading(false)} onUpload={uploadFile}/>}

      {deleteId && (
        <div className="modal-bg" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{maxWidth: 380}} onClick={e => e.stopPropagation()}>
            <div className="modal__hd"><div className="modal__title">Eliminar documento</div><button className="iconbtn" onClick={() => setDeleteId(null)}><span className="ic"><Icon name="x" size={14}/></span></button></div>
            <div className="modal__bd"><p style={{margin: 0}}>¿Confirmas la eliminación de este documento? Se removerá también de los departamentos con los que fue compartido.</p></div>
            <div className="modal__ft">
              <button className="btn btn--ghost" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="btn btn--danger" onClick={() => deleteFile(deleteId)}>Eliminar documento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function downloadFile(f) {
  const D = window.INDISA_DATA;
  const dept = D.DEPT_BY_ID[f.dept];
  let content = "";
  let mime = "text/plain";

  // Generate placeholder content based on kind
  const header = `INDISA Enterprise OS\n${"=".repeat(50)}\n\nDocumento: ${f.name}\nID: ${f.id}\nDepartamento: ${dept?.name || "—"}\nCargado por: ${f.uploadedBy}\nFecha: ${f.uploadedAt}\nTamaño: ${formatSize(f.size)}\n${f.confidential ? "CONFIDENCIAL\n" : ""}Compartido con: ${(f.sharedWith||[]).map(d => D.DEPT_BY_ID[d]?.name).join(", ") || "—"}\n\n${"=".repeat(50)}\n\n`;

  if (f.kind === "sheet") {
    mime = "text/csv";
    content = `# ${f.name}\n# Generado: ${new Date().toISOString()}\n# Departamento: ${dept?.name}\n\nMétrica,Q1,Q2,Q3,Q4,Total\nIngresos,4.1,5.6,0,0,9.7\nGastos,3.2,3.8,0,0,7.0\nMargen,0.9,1.8,0,0,2.7\nProyectos activos,12,15,0,0,27\nKPIs en meta,8,9,0,0,—\n`;
  } else if (f.kind === "image") {
    // 1x1 transparent PNG
    mime = "image/png";
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const bin = atob(png);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const blob = new Blob([arr], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  } else if (f.kind === "pdf") {
    // Minimal valid PDF with one page of text
    mime = "application/pdf";
    const text = header + "[Prototipo INDISA · contenido de demostración]\n\nEste archivo es un placeholder generado por el sistema. En producción, aquí se serviría el documento real almacenado en el bucket correspondiente.";
    const lines = text.split("\n").map(l => `(${l.replace(/[\\()]/g, c => "\\"+c)}) Tj 0 -14 Td`).join(" ");
    const stream = `BT /F1 11 Tf 50 780 Td ${lines} ET`;
    const pdf = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000095 00000 n\n0000000196 00000 n\n0000000${(290+stream.length).toString()} 00000 n\ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n${290+stream.length+50}\n%%EOF`;
    content = pdf;
  } else if (f.kind === "doc") {
    content = header + "[Contenido del documento]\n\nEste es un archivo de demostración generado por INDISA Enterprise OS.\nEn producción, el contenido real sería descargado desde almacenamiento.\n\nSecciones:\n  1. Introducción\n  2. Objetivos\n  3. Plan de acción\n  4. Métricas de éxito\n  5. Conclusiones\n";
  } else if (f.kind === "slide") {
    content = header + "[Presentación]\n\nSlide 1 — Portada\nSlide 2 — Agenda\nSlide 3 — Contexto\nSlide 4 — Propuesta\nSlide 5 — Próximos pasos\n";
  } else {
    content = header + "Contenido binario del archivo (placeholder).\n";
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = f.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function FilePreviewModal({ f, canEdit, onClose, onShare, onDelete, showToast }) {
  const D = window.INDISA_DATA;
  const kind = FILE_KINDS[f.kind] || FILE_KINDS.other;
  const dept = D.DEPT_BY_ID[f.dept];
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{width: 560}} onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="flex-c gap-10">
            <span style={{width: 36, height: 44, borderRadius: 6, background: kind.color + "18", color: kind.color, display: "grid", placeItems: "center", fontFamily: "var(--ff-mono)", fontSize: 11, fontWeight: 600}}>{kind.ext.toUpperCase()}</span>
            <div>
              <div className="modal__title" style={{lineHeight: 1.2}}>{f.name}</div>
              <div className="dim mono" style={{fontSize: 11, marginTop: 2}}>{f.id} · {formatSize(f.size)}</div>
            </div>
          </div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          <div style={{display: "grid", gap: 10}}>
            <Field label="Tipo" value={<span className="chip">{kind.label}</span>}/>
            <Field label="Departamento dueño" value={<span className="flex-c gap-6"><span style={{width: 8, height: 8, borderRadius: 2, background: dept?.color}}/>{dept?.name}</span>}/>
            <Field label="Cargado por" value={<span>{f.uploadedBy} <span className="dim mono" style={{fontSize: 11}}>· {f.uploadedAt}</span></span>}/>
            <Field label="Compartido con" value={
              (f.sharedWith || []).length === 0
                ? <span className="dim">No compartido</span>
                : (
                  <div className="flex" style={{flexWrap: "wrap", gap: 4}}>
                    {(f.sharedWith || []).map(did => <span key={did} className="chip"><span className="dot" style={{background: D.DEPT_BY_ID[did]?.color}}/>{D.DEPT_BY_ID[did]?.name}</span>)}
                  </div>
                )
            }/>
            {f.confidential && (
              <div className="alert alert--warn" style={{marginTop: 4}}>
                <span className="ic-wrap"><Icon name="lock" size={13}/></span>
                <span><b>Documento confidencial.</b> Acceso restringido — solo Gerencia General y los departamentos explícitamente autorizados.</span>
              </div>
            )}
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn" onClick={() => { downloadFile(f); showToast(`Descargando ${f.name}`); }}><Icon name="arrow" size={14}/> Descargar</button>
          {canEdit && <>
            <button className="btn" onClick={onShare}><Icon name="users2" size={14}/> Compartir</button>
            <button className="btn btn--danger" onClick={onDelete}><Icon name="x" size={14}/> Eliminar</button>
          </>}
        </div>
      </div>
    </div>
  );
}

function ShareModal({ f, onClose, onShare }) {
  const D = window.INDISA_DATA;
  const [selected, setSelected] = useState(f.sharedWith || []);

  function toggle(did) {
    setSelected(s => s.includes(did) ? s.filter(x => x !== did) : [...s, did]);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title">Compartir documento</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          <div className="flex-c gap-10" style={{padding: 10, background: "var(--bg-1)", borderRadius: 8, marginBottom: 14}}>
            <span style={{width: 28, height: 32, borderRadius: 4, background: (FILE_KINDS[f.kind]||FILE_KINDS.other).color + "18", color: (FILE_KINDS[f.kind]||FILE_KINDS.other).color, display: "grid", placeItems: "center", fontFamily: "var(--ff-mono)", fontSize: 9, fontWeight: 600}}>{(FILE_KINDS[f.kind]||FILE_KINDS.other).ext.toUpperCase()}</span>
            <span style={{fontWeight: 500}}>{f.name}</span>
          </div>
          <div className="dim" style={{fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8}}>Departamentos con acceso ({selected.length})</div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 280, overflowY: "auto"}}>
            {D.DEPARTMENTS.filter(d => d.id !== f.dept).map(d => {
              const isSel = selected.includes(d.id);
              return (
                <label key={d.id} className="flex-c gap-8" style={{padding: 8, borderRadius: 6, cursor: "pointer", background: isSel ? "var(--accent-soft)" : "var(--bg-1)", border: "1px solid " + (isSel ? "var(--accent-line)" : "var(--line)")}}>
                  <input type="checkbox" checked={isSel} onChange={() => toggle(d.id)} style={{accentColor: "var(--accent)"}}/>
                  <span style={{width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0}}/>
                  <span style={{fontSize: 12, fontWeight: isSel ? 500 : 400}}>{d.name}</span>
                </label>
              );
            })}
          </div>
          <div className="dim" style={{fontSize: 12, marginTop: 12, padding: 10, background: "var(--bg-1)", borderRadius: 6}}>
            <Icon name="shield" size={11}/> Los departamentos seleccionados podrán ver y descargar este documento. Gerencia General siempre tiene acceso total.
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          {selected.length > 0 && <button className="btn" onClick={() => setSelected([])}>Limpiar</button>}
          <button className="btn btn--primary" onClick={() => onShare(selected)}>
            <Icon name="check" size={14}/> Guardar permisos
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ session, effDept, onClose, onUpload }) {
  const D = window.INDISA_DATA;
  const [name, setName] = useState("");
  const [kind, setKind] = useState("doc");
  const [dept, setDept] = useState(effDept || session.dept || "gg");
  const [size, setSize] = useState(150_000);
  const [confidential, setConfidential] = useState(false);
  const fileRef = useRef();

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setName(file.name);
    setSize(file.size);
    setKind(inferKind(file.name));
  }

  function submit() {
    if (!name.trim()) return;
    onUpload({ name: name.trim(), kind, dept, size, confidential });
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title">Cargar documento</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          <div onClick={() => fileRef.current?.click()}
            style={{border: "2px dashed var(--line-2)", borderRadius: 10, padding: 24, textAlign: "center", cursor: "pointer", background: "var(--bg-1)", marginBottom: 14}}>
            <Icon name="folder" size={28} className="dim"/>
            <div style={{marginTop: 8, fontWeight: 500}}>Arrastra un archivo o haz clic para seleccionar</div>
            <div className="dim" style={{fontSize: 11, marginTop: 4}}>DOCX · XLSX · PDF · PNG · MAX 25MB</div>
            <input ref={fileRef} type="file" style={{display: "none"}} onChange={handleFileSelect}/>
          </div>
          <div className="field"><label>Nombre del documento</label><input className="input" placeholder="Ej. Política de calidad 2026.pdf" value={name} onChange={e => setName(e.target.value)}/></div>
          <div className="row row--2">
            <div className="field">
              <label>Tipo</label>
              <select className="select" value={kind} onChange={e => setKind(e.target.value)}>
                {Object.entries(FILE_KINDS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Departamento dueño</label>
              <select className="select" value={dept} onChange={e => setDept(e.target.value)} disabled={session.role !== "owner"}>
                {D.DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <label className="flex-c gap-8" style={{fontSize: 13, padding: "2px 2px"}}>
            <input type="checkbox" checked={confidential} onChange={e => setConfidential(e.target.checked)} style={{accentColor: "var(--danger)"}}/>
            <Icon name="lock" size={12}/> Marcar como confidencial (solo Gerencia General y departamentos autorizados)
          </label>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" disabled={!name.trim()} onClick={submit} style={{opacity: !name.trim() ? 0.5 : 1}}>
            <Icon name="plus" size={14}/> Cargar documento
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{display: "grid", gridTemplateColumns: "150px 1fr", gap: 10, padding: "4px 0", alignItems: "flex-start"}}>
      <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", paddingTop: 2, fontWeight: 500}}>{label}</div>
      <div style={{fontSize: 13}}>{value}</div>
    </div>
  );
}

window.FilesPage = FilesPage;
