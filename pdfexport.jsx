// PDF export helper — renders a styled overlay iframe with print-to-PDF support
function exportPDF(title, bodyHTML, filename) {
  const today = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/>
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Geist", system-ui, -apple-system, sans-serif;
    color: #111827; background: #ffffff;
    margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    font-size: 11px; line-height: 1.45;
  }
  .mono { font-family: "JetBrains Mono", ui-monospace, monospace; font-feature-settings: "tnum" 1; }

  /* Hero header */
  .hero {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 60%, #1e40af 100%);
    color: white; padding: 28px 32px;
    border-radius: 14px;
    position: relative; overflow: hidden;
    margin-bottom: 24px;
  }
  .hero::before {
    content: ""; position: absolute; top: -40px; right: -40px;
    width: 220px; height: 220px; border-radius: 50%;
    background: rgba(255,255,255,0.08);
  }
  .hero::after {
    content: ""; position: absolute; bottom: -60px; right: 80px;
    width: 160px; height: 160px; border-radius: 50%;
    background: rgba(255,255,255,0.06);
  }
  .hero__brand { display: flex; align-items: center; gap: 10px; font-family: "JetBrains Mono"; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.85; margin-bottom: 12px; }
  .hero__logo { width: 24px; height: 24px; border-radius: 6px; background: white; color: #2563eb; display: inline-grid; place-items: center; font-weight: 700; }
  .hero__title { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 6px; position: relative; z-index: 1; }
  .hero__sub { font-size: 13px; opacity: 0.85; margin: 0; position: relative; z-index: 1; }
  .hero__meta { display: flex; gap: 24px; margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.2); position: relative; z-index: 1; }
  .hero__meta div { font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.08em; }
  .hero__meta div b { display: block; opacity: 1; font-family: "JetBrains Mono"; font-size: 14px; letter-spacing: 0; text-transform: none; margin-top: 2px; }

  /* Section */
  .section { margin-bottom: 22px; page-break-inside: avoid; }
  .section__h {
    display: flex; align-items: center; gap: 10px;
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: #6b7280; font-weight: 600;
    margin: 0 0 12px;
    padding-bottom: 8px; border-bottom: 1px solid #e6e8ee;
  }
  .section__h .num { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; background: #eef4ff; color: #2563eb; font-family: "JetBrains Mono"; font-weight: 600; font-size: 11px; letter-spacing: 0; }

  /* Stats row */
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
  .stat {
    padding: 14px 16px; border-radius: 10px;
    background: #f7f8fa; border: 1px solid #e6e8ee;
  }
  .stat__l { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }
  .stat__v { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; margin-top: 4px; font-family: "Geist"; }
  .stat--accent { background: #eef4ff; border-color: #c7d8ff; }
  .stat--accent .stat__v { color: #2563eb; }
  .stat--ok .stat__v { color: #10b981; }
  .stat--warn .stat__v { color: #f59e0b; }
  .stat--bad .stat__v { color: #ef4444; }

  /* Card */
  .card { background: white; border: 1px solid #e6e8ee; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; page-break-inside: avoid; }
  .card__hd { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .card__dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
  .card__t { font-weight: 600; font-size: 13px; flex: 1; }
  .card__sub { font-size: 10px; color: #6b7280; font-family: "JetBrains Mono"; }

  /* Pill */
  .pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 2px 8px; border-radius: 999px;
    font-size: 9px; font-weight: 500;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .pill--bhag    { background: #f3e8ff; color: #7c3aed; }
  .pill--annual  { background: #dbeafe; color: #1e40af; }
  .pill--quarterly { background: #cffafe; color: #0e7490; }
  .pill--rock    { background: #ffedd5; color: #c2410c; }
  .pill--ok      { background: #d1fae5; color: #047857; }
  .pill--warn    { background: #fef3c7; color: #92400e; }
  .pill--bad     { background: #fee2e2; color: #991b1b; }

  /* Progress bar */
  .bar { height: 6px; background: #eef0f4; border-radius: 999px; overflow: hidden; margin: 8px 0; }
  .bar > span { display: block; height: 100%; border-radius: 999px; background: #2563eb; }

  /* Objectives list */
  .objs { display: grid; gap: 4px; margin-top: 8px; }
  .obj { display: flex; align-items: center; gap: 8px; font-size: 11px; padding: 4px 0; }
  .obj__check { width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid #d8dce4; display: inline-grid; place-items: center; flex-shrink: 0; }
  .obj__check.done { background: #10b981; border-color: #10b981; color: white; }
  .obj.done .obj__t { color: #6b7280; text-decoration: line-through; }

  /* Quarter cells */
  .q-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 10px; }
  .q-cell { padding: 8px; border: 1px solid #e6e8ee; border-radius: 6px; text-align: center; background: #f7f8fa; }
  .q-cell__l { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; }
  .q-cell__v { font-family: "JetBrains Mono"; font-size: 13px; font-weight: 600; margin-top: 2px; }

  /* Org chart */
  .org { padding: 16px 0; }
  .org__owner {
    background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white;
    border-radius: 12px; padding: 14px 20px;
    text-align: center; margin: 0 auto 32px; max-width: 260px;
    position: relative;
    box-shadow: 0 6px 18px -6px rgba(37,99,235,0.45);
  }
  .org__owner::after {
    content: ""; position: absolute; bottom: -22px; left: 50%;
    transform: translateX(-50%); width: 2px; height: 22px; background: #c5cbd5;
  }
  .org__owner .role { font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.8; }
  .org__owner .name { font-size: 16px; font-weight: 600; margin: 4px 0; }
  .org__owner .code { font-family: "JetBrains Mono"; font-size: 10px; opacity: 0.85; }

  .org__row {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  }
  .org__admin {
    background: white; border: 1px solid #e6e8ee; border-radius: 10px;
    padding: 10px 12px; text-align: center;
    page-break-inside: avoid;
  }
  .org__admin .role-dot { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 4px; }
  .org__admin .role-dot .dot { width: 7px; height: 7px; border-radius: 2px; }
  .org__admin .role { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #9ca3af; }
  .org__admin .name { font-size: 12px; font-weight: 500; margin-top: 2px; }
  .org__admin .code { font-family: "JetBrains Mono"; font-size: 10px; color: #6b7280; margin-top: 2px; }
  .org__admin .viewers { font-size: 9px; color: #2563eb; margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f3f6; }

  /* Footer */
  .footer {
    margin-top: 36px;
    padding-top: 14px;
    border-top: 1px solid #e6e8ee;
    display: flex; justify-content: space-between;
    font-size: 9px; color: #9ca3af;
    letter-spacing: 0.06em; text-transform: uppercase;
  }

  /* Print tweaks */
  @media print {
    body { font-size: 10px; }
    .hero { background: #2563eb !important; }
    .no-print { display: none !important; }
    .section { break-inside: avoid; }
  }

  /* Print prompt button */
  .toolbar {
    position: fixed; top: 12px; right: 12px;
    display: flex; gap: 8px;
    background: white; border: 1px solid #e6e8ee;
    border-radius: 10px; padding: 6px;
    box-shadow: 0 8px 24px -8px rgba(0,0,0,0.15);
    z-index: 1000;
  }
  .toolbar button {
    border: none; background: #2563eb; color: white;
    padding: 8px 14px; border-radius: 8px;
    font-weight: 500; font-size: 12px; cursor: pointer;
    font-family: inherit;
  }
  .toolbar button.ghost { background: #f1f3f6; color: #111827; }
</style></head>
<body>
${bodyHTML}
<div class="footer">
  <span>INDISA Enterprise OS · ${today}</span>
  <span>Confidencial · uso interno</span>
</div>
</body></html>`;

  // Create overlay with iframe
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;flex-direction:column;animation:fadeIn .2s ease;";

  const bar = document.createElement("div");
  bar.style.cssText = "display:flex;align-items:center;gap:10px;padding:12px 20px;background:#11141a;color:#fff;border-bottom:1px solid #20252d;";
  bar.innerHTML = `
    <div style="font-weight:600;font-size:14px;">${title}</div>
    <div style="flex:1"></div>
    <button id="ipdf_print" style="background:#2563eb;color:#fff;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;display:flex;align-items:center;gap:6px;font-family:inherit;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><polyline points="14 3 14 8 19 8"/></svg>
      Imprimir / Guardar como PDF
    </button>
    <button id="ipdf_download" style="background:#1f2937;color:#fff;border:1px solid #353c47;padding:9px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;">Descargar HTML</button>
    <button id="ipdf_close" style="background:transparent;color:#fff;border:1px solid #353c47;padding:9px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;">✕ Cerrar</button>
  `;

  const frame = document.createElement("iframe");
  frame.style.cssText = "flex:1;border:none;background:#f1f3f6;width:100%;";
  frame.srcdoc = html;

  overlay.appendChild(bar);
  overlay.appendChild(frame);
  document.body.appendChild(overlay);

  bar.querySelector("#ipdf_close").onclick = () => overlay.remove();
  bar.querySelector("#ipdf_print").onclick = () => {
    try { frame.contentWindow.focus(); frame.contentWindow.print(); }
    catch (e) { alert("No se pudo abrir el diálogo de impresión. Usa 'Descargar HTML' como alternativa."); }
  };
  bar.querySelector("#ipdf_download").onclick = () => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (filename || title).replace(/\.pdf$/, "") + ".html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  // Click outside closes
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

window.exportPDF = exportPDF;

// ===== POA report builder =====
window.buildPOAReport = function buildPOAReport(poa, departments, deptById, poaTypes, periodLabel) {
  const allGoals = Object.values(poa).flat();
  const avgProgress = allGoals.length ? Math.round(allGoals.reduce((s,g) => s + g.progress, 0) / allGoals.length) : 0;
  const objs = allGoals.flatMap(g => g.objectives);
  const objDone = objs.filter(o => o.done).length;
  const objTotal = objs.length;
  const inRisk = allGoals.filter(g => g.progress < 40).length;

  const sections = Object.entries(poa)
    .filter(([, goals]) => goals.length > 0)
    .map(([deptId, goals]) => {
      const dept = deptById[deptId];
      if (!dept) return "";
      const goalsHTML = goals.map(g => {
        const type = poaTypes[g.type] || { label: "Meta", color: "#2563eb" };
        const pillClass = `pill--${g.type || "quarterly"}`;
        const barColor = g.progress >= 85 ? "#10b981" : g.progress >= 50 ? "#2563eb" : g.progress >= 25 ? "#f59e0b" : "#ef4444";
        const objList = g.objectives.map(o => `
          <div class="obj ${o.done ? "done" : ""}">
            <span class="obj__check ${o.done ? "done" : ""}">${o.done ? "<svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='5 12 10 17 19 7'/></svg>" : ""}</span>
            <span class="obj__t">${o.text}</span>
          </div>`).join("");
        const qCells = g.q.map((v, i) => `
          <div class="q-cell">
            <div class="q-cell__l">Q${i+1}</div>
            <div class="q-cell__v">${v === 0 ? "—" : v}</div>
          </div>`).join("");
        return `
          <div class="card">
            <div class="card__hd">
              <span class="pill ${pillClass}">${type.label}</span>
              <span class="card__t">${g.title}</span>
              <span class="card__sub">${g.progress}%</span>
            </div>
            <div class="bar"><span style="width: ${g.progress}%; background: ${barColor};"></span></div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Responsable: ${g.owner}</div>
            <div class="objs">${objList}</div>
            <div class="q-row">${qCells}</div>
          </div>`;
      }).join("");
      return `
        <div class="section">
          <div class="section__h">
            <span class="card__dot" style="width: 10px; height: 10px; border-radius: 3px; background: ${dept.color};"></span>
            ${dept.name} <span style="font-family: 'JetBrains Mono'; opacity: 0.7;">· ${dept.short}</span>
            <span style="margin-left: auto; text-transform: none; letter-spacing: 0; font-weight: 400;">${goals.length} ${goals.length === 1 ? "meta" : "metas"}</span>
          </div>
          ${goalsHTML}
        </div>`;
    }).join("");

  return `
    <div class="hero">
      <div class="hero__brand"><span class="hero__logo">I</span> INDISA · Enterprise OS</div>
      <h1 class="hero__title">Plan Operativo Anual</h1>
      <p class="hero__sub">Reporte ejecutivo · ${periodLabel}</p>
      <div class="hero__meta">
        <div>Avance global<b>${avgProgress}%</b></div>
        <div>Metas activas<b>${allGoals.length}</b></div>
        <div>Objetivos cumplidos<b>${objDone}/${objTotal}</b></div>
        <div>Metas en riesgo<b>${inRisk}</b></div>
      </div>
    </div>

    <div class="stats">
      <div class="stat stat--accent">
        <div class="stat__l">Avance del plan</div>
        <div class="stat__v">${avgProgress}%</div>
      </div>
      <div class="stat">
        <div class="stat__l">Metas estratégicas</div>
        <div class="stat__v">${allGoals.length}</div>
      </div>
      <div class="stat stat--ok">
        <div class="stat__l">Objetivos completos</div>
        <div class="stat__v">${objDone}<span style="font-size: 14px; color: #9ca3af;"> / ${objTotal}</span></div>
      </div>
      <div class="stat ${inRisk > 0 ? "stat--bad" : "stat--ok"}">
        <div class="stat__l">En riesgo</div>
        <div class="stat__v">${inRisk}</div>
      </div>
    </div>

    ${sections || '<div class="card"><div class="card__t" style="color: #9ca3af;">No hay metas registradas en el POA.</div></div>'}
  `;
};

// ===== Org chart report builder =====
window.buildOrgReport = function buildOrgReport(orgTree, departments, deptById, users) {
  const usersMap = users || {};
  // Group registered users by dept + role
  const byDept = {};
  Object.entries(usersMap).forEach(([email, u]) => {
    const key = u.dept || "_owner";
    if (!byDept[key]) byDept[key] = { admins: [], viewers: [], owners: [] };
    const entry = { email, ...u };
    if (u.role === "owner") byDept[key].owners.push(entry);
    else if (u.role === "admin") byDept[key].admins.push(entry);
    else if (u.role === "viewer") byDept[key].viewers.push(entry);
  });
  const realOwner = (byDept._owner?.owners || [])[0];
  const ownerName = realOwner ? realOwner.name : "Sin registrar";
  const ownerCode = realOwner ? realOwner.email : orgTree.owner.code;

  const adminsHTML = orgTree.admins.map(adm => {
    const dept = deptById[adm.dept];
    if (!dept) return "";
    const deptUsers = byDept[adm.dept] || { admins: [], viewers: [] };
    const adminsList = deptUsers.admins.length
      ? deptUsers.admins.map(a => `<div class="name">${a.name}</div><div class="code">${a.email}</div>`).join('<div style="height:6px"></div>')
      : `<div class="name" style="color:#9ca3af;font-style:italic">Sin admin</div>`;
    const viewers = deptUsers.viewers.length
      ? deptUsers.viewers.map(v => `<div style="font-family: 'JetBrains Mono'; font-size: 9px; color: #6b7280;">${v.name} · ${v.email}</div>`).join("")
      : `<div style="font-family: 'JetBrains Mono'; font-size: 9px; color: #9ca3af; font-style: italic;">Sin viewers</div>`;
    return `
      <div class="org__admin">
        <div class="role-dot">
          <span class="dot" style="background: ${dept.color};"></span>
          <span class="role">${dept.name}</span>
        </div>
        ${adminsList}
        <div class="viewers">
          <div style="font-weight: 600; color: #2563eb; margin-bottom: 4px;">${deptUsers.viewers.length} viewer${deptUsers.viewers.length === 1 ? "" : "s"}</div>
          ${viewers}
        </div>
      </div>`;
  }).filter(Boolean).join("");

  const totalMembers = Object.keys(usersMap).length;
  const totalAdmins = Object.values(usersMap).filter(u => u.role === "admin").length;
  const totalViewers = Object.values(usersMap).filter(u => u.role === "viewer").length;
  const totalOwners = Object.values(usersMap).filter(u => u.role === "owner").length;

  // Department legend
  const legend = departments.map(d => `
    <div style="display: flex; align-items: center; gap: 6px; font-size: 10px;">
      <span style="width: 10px; height: 10px; border-radius: 2px; background: ${d.color};"></span>
      <span style="font-weight: 500;">${d.name}</span>
      <span style="font-family: 'JetBrains Mono'; color: #9ca3af; margin-left: auto;">${d.short}</span>
    </div>`).join("");

  return `
    <div class="hero">
      <div class="hero__brand"><span class="hero__logo">I</span> INDISA · Enterprise OS</div>
      <h1 class="hero__title">Estructura Organizacional</h1>
      <p class="hero__sub">Jerarquía corporativa · ${departments.length} departamentos · ${totalMembers} miembros</p>
      <div class="hero__meta">
        <div>Gerencia<b>1 owner</b></div>
        <div>Admins<b>${orgTree.admins.length}</b></div>
        <div>Viewers<b>${orgTree.admins.reduce((s,a) => s + a.viewers.length, 0)}</b></div>
        <div>Total miembros<b>${totalMembers}</b></div>
      </div>
    </div>

    <div class="section">
      <div class="section__h"><span class="num">1</span> Jerarquía</div>
      <div class="org">
        <div class="org__owner">
          <div class="role">Owner · Gerente General</div>
          <div class="name">${orgTree.owner.name}</div>
          <div class="code">${orgTree.owner.code}</div>
        </div>
        <div class="org__row">${adminsHTML}</div>
      </div>
    </div>

    <div class="section">
      <div class="section__h"><span class="num">2</span> Departamentos</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">${legend}</div>
    </div>

    <div class="section">
      <div class="section__h"><span class="num">3</span> Resumen de permisos</div>
      <div class="card">
        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; font-size: 11px; padding: 4px 0;">
          <div style="font-weight: 600; color: #2563eb;">Owner</div>
          <div>Acceso total · gestiona todos los departamentos, crea códigos, modifica configuración global, ve auditoría.</div>
        </div>
        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; font-size: 11px; padding: 4px 0; border-top: 1px solid #e6e8ee; margin-top: 8px; padding-top: 10px;">
          <div style="font-weight: 600; color: #2563eb;">Admin</div>
          <div>Su departamento · crea códigos viewer, edita KPIs y proyectos del depto, gestiona equipo.</div>
        </div>
        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; font-size: 11px; padding: 4px 0; border-top: 1px solid #e6e8ee; margin-top: 8px; padding-top: 10px;">
          <div style="font-weight: 600; color: #2563eb;">Viewer</div>
          <div>Solo lectura · ve KPIs, proyectos y documentos compartidos de su depto.</div>
        </div>
      </div>
    </div>
  `;
};
