// POA — Plan Operativo Anual
const { useState, useEffect, useMemo, useRef } = React;

function POAPage({ session, deptScope, poa, setPoa, kpis, kpiWeekly, setKpiWeekly, projects, setProjects, tasks, addAudit, showToast }) {
  const D = window.INDISA_DATA;
  const role = session.role;
  const readOnly = role === "viewer";
  const effDept = role === "owner" ? deptScope : session.dept;
  const curYear = new Date().getFullYear();
  const curQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const groups = effDept
    ? (() => {
        const result = [[effDept, poa[effDept] || []]];
        Object.entries(poa).forEach(([did, goals]) => {
          if (did !== effDept) {
            const bhagsHere = (goals || []).filter(g => g.type === "bhag");
            if (bhagsHere.length) result.unshift([did, bhagsHere]);
          }
        });
        return result;
      })()
    : Object.entries(poa);

  const [addingGoal, setAddingGoal] = useState(false);
  const [deleteGoal, setDeleteGoal] = useState(null);
  const [creatingProject, setCreatingProject] = useState(null);
  const [creatingKpi, setCreatingKpi] = useState(null);

  // Auto-update goal progress from linked projects whenever projects change
  useEffect(() => {
    if (!projects) return;
    const allP = Object.values(projects).flat();
    setPoa(prev => {
      let changed = false;
      const out = {};
      for (const [did, goals] of Object.entries(prev)) {
        out[did] = (goals || []).map(g => {
          const linked = g.linked_projects || [];
          if (!linked.length) return g;
          const lp = allP.filter(p => linked.includes(p.id));
          if (!lp.length) return g;
          const newProg = Math.round(lp.filter(p => p.status === "done").length / lp.length * 100);
          if (newProg !== g.progress) { changed = true; return { ...g, progress: newProg }; }
          return g;
        });
      }
      return changed ? out : prev;
    });
  }, [projects]);

  function editGoalTitle(deptId, goalId, title) {
    setPoa(prev => {
      const out = { ...prev };
      out[deptId] = (out[deptId] || []).map(g => g.id === goalId ? { ...g, title } : g);
      return out;
    });
    addAudit({ action: `Meta POA renombrada · ${goalId}`, user: session.name, dept: deptId, level: "info" });
  }

  function removeGoal(deptId, goalId) {
    setPoa(prev => {
      const out = { ...prev };
      out[deptId] = (out[deptId] || []).filter(g => g.id !== goalId);
      return out;
    });
    addAudit({ action: `Meta POA eliminada · ${goalId}`, user: session.name, dept: deptId, level: "warn" });
    showToast("Meta eliminada");
    setDeleteGoal(null);
  }

  function addGoal(deptIds, title, type) {
    setPoa(prev => {
      const out = { ...prev };
      deptIds.forEach(deptId => {
        const id = "g" + Math.random().toString(36).slice(2, 6);
        out[deptId] = [...(out[deptId] || []), {
          id, type: type || "quarterly", title, owner: session.name, progress: 0,
          linked_projects: [], linked_kpis: [],
        }];
      });
      return out;
    });
    addAudit({ action: `Meta POA creada · ${title}`, user: session.name, dept: deptIds[0] || "gg", level: "success" });
    showToast(deptIds.length > 1 ? `Meta agregada a ${deptIds.length} departamentos` : "Meta agregada");
    setAddingGoal(false);
  }

  function createAndLinkProject(goalDeptId, goalId, projectData) {
    const targetDept = projectData.targetDept || goalDeptId;
    const newId = "n" + Math.random().toString(36).slice(2, 6);
    const np = { id: newId, ...projectData };
    setProjects(prev => ({ ...prev, [targetDept]: [...(prev[targetDept] || []), np] }));
    setPoa(prev => {
      const out = { ...prev };
      out[goalDeptId] = (out[goalDeptId] || []).map(g =>
        g.id !== goalId ? g : { ...g, linked_projects: [...new Set([...(g.linked_projects || []), newId])] }
      );
      return out;
    });
    addAudit({ action: `Proyecto creado y vinculado: ${projectData.title}`, user: session.name, dept: targetDept, level: "success" });
    showToast("Proyecto creado y vinculado a la meta");
    setCreatingProject(null);
  }

  function unlinkProject(deptId, goalId, projectId) {
    setPoa(prev => {
      const out = { ...prev };
      out[deptId] = (out[deptId] || []).map(g =>
        g.id !== goalId ? g : { ...g, linked_projects: (g.linked_projects || []).filter(id => id !== projectId) }
      );
      return out;
    });
  }

  function createAndLinkKpi(goalDeptId, goalId, kpiData) {
    const targetDept = kpiData.targetDept || goalDeptId;
    const k = `${targetDept}_${curYear}_${curQuarter}`;
    setKpiWeekly(prev => ({ ...prev, [k]: [...(prev[k] || []), kpiData] }));
    const ref = `${targetDept}:${kpiData.id}`;
    setPoa(prev => {
      const out = { ...prev };
      out[goalDeptId] = (out[goalDeptId] || []).map(g =>
        g.id !== goalId ? g : { ...g, linked_kpis: [...new Set([...(g.linked_kpis || []), ref])] }
      );
      return out;
    });
    addAudit({ action: `KPI creado y vinculado: ${kpiData.label}`, user: session.name, dept: targetDept, level: "success" });
    showToast("KPI creado y vinculado a la meta");
    setCreatingKpi(null);
  }

  function unlinkKpi(deptId, goalId, kpiRef) {
    setPoa(prev => {
      const out = { ...prev };
      out[deptId] = (out[deptId] || []).map(g =>
        g.id !== goalId ? g : { ...g, linked_kpis: (g.linked_kpis || []).filter(k => k !== kpiRef) }
      );
      return out;
    });
  }

  function exportPOA() {
    const _mn = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const _nd = new Date();
    const body = window.buildPOAReport(poa, D.DEPARTMENTS, D.DEPT_BY_ID, D.POA_TYPES, `${_mn[_nd.getMonth()]} ${_nd.getFullYear()}`);
    window.exportPDF("POA · Plan Operativo Anual", body, "POA_INDISA_2026.pdf");
    addAudit({ action: "POA exportado a PDF", user: session.name, dept: null, level: "info" });
    showToast("Generando PDF…");
  }

  function findKpiItem(kpiRef) {
    const [kDept, kId] = kpiRef.split(":");
    const sorted = Object.keys(kpiWeekly || {}).filter(k => k.startsWith(kDept + "_")).sort().reverse();
    for (const k of sorted) {
      const item = (kpiWeekly[k] || []).find(x => x.id === kId);
      if (item) return item;
    }
    return null;
  }

  const allGoals = Object.values(poa).flat();
  const avgProgress = allGoals.length ? Math.round(allGoals.reduce((s,g) => s + g.progress, 0) / allGoals.length) : 0;
  const allProjectsFlat = Object.values(projects || {}).flat();
  const totalLinked = allGoals.reduce((s,g) => s + (g.linked_projects || []).length, 0);
  const doneLinked  = allGoals.reduce((s,g) => s + (g.linked_projects || []).filter(id => allProjectsFlat.find(p => p.id === id)?.status === "done").length, 0);

  const SC = (s) => ({done:"var(--positive)",doing:"var(--accent)",review:"var(--warning)",todo:"var(--text-3)",backlog:"var(--text-3)"}[s] || "var(--text-3)");

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">POA · Plan Operativo Anual</h1>
          <p className="page__sub">Objetivos estratégicos, seguimiento trimestral, alineación entre departamentos</p>
        </div>
        <div className="page__actions">
          {readOnly && <span className="chip"><Icon name="lock" size={11}/> Solo lectura</span>}
          <button className="btn" onClick={exportPOA}><Icon name="doc" size={14}/> Exportar</button>
          {!readOnly && <button className="btn btn--primary" onClick={() => setAddingGoal(true)}><Icon name="plus" size={14}/> Nueva meta</button>}
        </div>
      </div>

      <div className="row row--4" style={{marginBottom: 14}}>
        <Card title="Avance del plan" sub="promedio empresa">
          <div className="flex-c gap-12">
            <div style={{fontSize: 32, fontFamily: "var(--ff-ui)", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--accent)"}}>{avgProgress}%</div>
            <div style={{flex: 1}}>
              <div className="deptperf__bar"><span style={{width: avgProgress + "%", background: "var(--accent)"}}/></div>
              <div className="dim" style={{fontSize: 11, marginTop: 6}}>meta 75% para fin de Q2</div>
            </div>
          </div>
        </Card>
        <Card title="Metas estratégicas" sub="activas">
          <div style={{fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em"}}>{allGoals.length}</div>
          <div className="dim" style={{fontSize: 11, marginTop: 6}}>en {Object.keys(poa).length} departamentos</div>
        </Card>
        <Card title="Proyectos vinculados" sub="completados">
          <div style={{fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em"}}>
            {doneLinked}<span className="dim" style={{fontSize: 18}}> / {totalLinked}</span>
          </div>
          <div className="dim" style={{fontSize: 11, marginTop: 6}}>{totalLinked ? Math.round(doneLinked/totalLinked*100) : 0}% completados</div>
        </Card>
        <Card title="Trimestre actual" sub="FY 2026">
          <div className="q-cols">
            {["Q1","Q2","Q3","Q4"].map((q, i) => (
              <div key={q} className="q" style={{borderColor: i+1 === curQuarter ? "var(--accent)" : "var(--line)", background: i+1 === curQuarter ? "var(--accent-soft)" : "var(--bg-1)"}}>
                <div className="l">{q}</div>
                <div className="v" style={{color: i+1 === curQuarter ? "var(--accent)" : i+1 < curQuarter ? "var(--positive)" : "var(--text-3)"}}>{i+1 < curQuarter ? "✓" : i+1 === curQuarter ? "·" : "—"}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="poa">
        {groups.map(([deptId, goals]) => (
          <div key={deptId}>
            <div className="flex-c gap-10" style={{margin: "12px 4px 8px"}}>
              <span style={{width: 8, height: 8, borderRadius: 2, background: D.DEPT_BY_ID[deptId]?.color || "#999"}}/>
              <span style={{fontSize: 11, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600}}>{D.DEPT_BY_ID[deptId]?.name || deptId}</span>
              <span className="dim" style={{fontSize: 11}}>· {goals.length} {goals.length === 1 ? "meta" : "metas"}</span>
            </div>
            {[...goals].sort((a, b) => (b.type === "bhag" ? 1 : 0) - (a.type === "bhag" ? 1 : 0)).map(g => {
              const isBhag = g.type === "bhag";
              const linkedProjects = (g.linked_projects || []).map(id => allProjectsFlat.find(p => p.id === id)).filter(Boolean);
              const linkedKpis = (g.linked_kpis || []).map(ref => {
                const item = findKpiItem(ref);
                if (!item) return null;
                const filled = item.semanas.filter(v => v !== null && v !== undefined);
                const lastVal = filled.length ? filled[filled.length - 1] : null;
                const pct = lastVal !== null && item.metaSemanal > 0 ? Math.round(lastVal / item.metaSemanal * 100) : null;
                return { ref, item, lastVal, pct };
              }).filter(Boolean);

              return (
                <div key={g.id} className="goal" style={{marginBottom: 10, overflow: "hidden", ...(isBhag ? { border: "2px solid #8b5cf6", boxShadow: "0 0 0 3px #8b5cf614, 0 8px 28px -6px #8b5cf650" } : {})}}>
                  {isBhag && (
                    <div style={{margin: "-1px -1px 12px", padding: "10px 16px", background: "linear-gradient(135deg,#7c3aed,#8b5cf6,#a78bfa)", color: "#fff", display: "flex", alignItems: "center", gap: 10}}>
                      <span style={{fontSize: 18}}>🏆</span>
                      <div>
                        <div style={{fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em"}}>BHAG · Meta Audaz a 10 Años</div>
                        <div style={{fontSize: 11, opacity: 0.85, marginTop: 1}}>Aplica a toda la empresa · Objetivo transformacional</div>
                      </div>
                    </div>
                  )}
                  <div className="goal__hd">
                    {g.type && D.POA_TYPES[g.type] && (
                      <select className="select" value={g.type} disabled={readOnly} onChange={e => {
                        setPoa(prev => { const out={...prev}; out[deptId]=(out[deptId]||[]).map(goal=>goal.id===g.id?{...goal,type:e.target.value}:goal); return out; });
                      }} style={{width:"auto",fontSize:10,textTransform:"uppercase",letterSpacing:".08em",fontWeight:600,padding:"3px 8px",borderRadius:999,background:D.POA_TYPES[g.type].color+"15",color:D.POA_TYPES[g.type].color,border:"1px solid "+D.POA_TYPES[g.type].color+"40"}}>
                        {Object.entries(D.POA_TYPES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    )}
                    <input className="cell-edit" style={{fontSize:15,fontWeight:600,flex:1,padding:"4px 6px"}}
                      defaultValue={g.title} onBlur={e => editGoalTitle(deptId, g.id, e.target.value)} disabled={readOnly}/>
                    <span className="goal__owner">{g.owner}</span>
                    <span className="goal__prog">{g.progress}%</span>
                    {!readOnly && <button className="btn btn--sm btn--danger" style={{marginLeft:8}} onClick={() => setDeleteGoal({deptId,goalId:g.id})} title="Eliminar meta"><Icon name="x" size={12}/></button>}
                  </div>
                  <div className="goal__bar"><span style={{width: g.progress + "%"}}/></div>

                  <div className="row row--2" style={{marginTop: 14}}>
                    {/* LEFT: Proyectos + KPIs vinculados */}
                    <div>
                      {/* Proyectos */}
                      <div style={{marginBottom: 18}}>
                        <div className="flex-c gap-8" style={{marginBottom: 8}}>
                          <div className="dim" style={{fontSize:10,textTransform:"uppercase",letterSpacing:".08em",fontWeight:500}}>Proyectos</div>
                          {!readOnly && <button className="btn btn--sm" style={{marginLeft:"auto"}} onClick={() => setCreatingProject({deptId,goalId:g.id,isBhag:g.type==="bhag"})}>
                            <Icon name="plus" size={11}/> Crear
                          </button>}
                        </div>
                        {linkedProjects.length === 0 ? (
                          <div style={{fontSize:12,color:"var(--text-3)",fontStyle:"italic",paddingLeft:2}}>Sin proyectos vinculados</div>
                        ) : linkedProjects.map(proj => {
                          const projTasks = (tasks||[]).filter(t => t.project_id === proj.id);
                          const comp = projTasks.filter(t => t.status === "completed").length;
                          const pct = projTasks.length ? Math.round(comp/projTasks.length*100) : (proj.status==="done"?100:0);
                          const sC = SC(proj.status);
                          return (
                            <div key={proj.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--line)"}}>
                              <span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:sC+"18",color:sC,fontWeight:600,textTransform:"uppercase",whiteSpace:"nowrap"}}>{proj.status}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{proj.title}</div>
                                <div style={{marginTop:3,height:3,background:"var(--line)",borderRadius:99,overflow:"hidden"}}>
                                  <div style={{width:pct+"%",height:"100%",background:sC,borderRadius:99}}/>
                                </div>
                              </div>
                              <span style={{fontSize:11,color:"var(--text-2)",fontFamily:"var(--ff-mono)"}}>{pct}%</span>
                              {!readOnly && <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--danger)",fontSize:15,padding:"0 2px",lineHeight:1}} onClick={() => unlinkProject(deptId,g.id,proj.id)}>×</button>}
                            </div>
                          );
                        })}
                      </div>

                      {/* KPIs */}
                      <div>
                        <div className="flex-c gap-8" style={{marginBottom: 8}}>
                          <div className="dim" style={{fontSize:10,textTransform:"uppercase",letterSpacing:".08em",fontWeight:500}}>KPIs</div>
                          {!readOnly && <button className="btn btn--sm" style={{marginLeft:"auto"}} onClick={() => setCreatingKpi({deptId,goalId:g.id,isBhag:g.type==="bhag"})}>
                            <Icon name="plus" size={11}/> Crear
                          </button>}
                        </div>
                        {linkedKpis.length === 0 ? (
                          <div style={{fontSize:12,color:"var(--text-3)",fontStyle:"italic",paddingLeft:2}}>Sin KPIs vinculados</div>
                        ) : linkedKpis.map(({ref,item,lastVal,pct}) => {
                          const kC = pct!==null?(pct>=100?"var(--positive)":pct>=80?"var(--warning)":"var(--danger)"):"var(--text-3)";
                          return (
                            <div key={ref} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--line)"}}>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</div>
                                <div style={{fontSize:11,color:"var(--text-2)"}}>Meta: {item.metaSemanal}/sem</div>
                                <div style={{marginTop:3,height:3,background:"var(--line)",borderRadius:99,overflow:"hidden"}}>
                                  <div style={{width:Math.min(100,pct||0)+"%",height:"100%",background:kC,borderRadius:99}}/>
                                </div>
                              </div>
                              <div style={{textAlign:"right",flexShrink:0}}>
                                <div style={{fontSize:13,fontWeight:700,fontFamily:"var(--ff-mono)",color:kC}}>{lastVal!==null?lastVal:"—"}</div>
                                {pct!==null&&<div style={{fontSize:10,color:kC}}>{pct}%</div>}
                              </div>
                              {!readOnly && <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--danger)",fontSize:15,padding:"0 2px",lineHeight:1}} onClick={() => unlinkKpi(deptId,g.id,ref)}>×</button>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT: auto-calculated tracking */}
                    <div>
                      <div style={{marginBottom: 14}}>
                        <div className="dim" style={{fontSize:10,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6,fontWeight:500,color:"var(--accent)"}}>KPIs · Score trimestral (0-10)</div>
                        <div className="q-cols">
                          {[1,2,3,4].map(q => {
                            const hasData = kpiWeekly && ((kpiWeekly[`${deptId}_${curYear}_${q}`]||[]).length>0);
                            const raw = hasData && window.computeKpiScore ? window.computeKpiScore(deptId,kpis,kpiWeekly,curYear,q) : null;
                            const val = raw!==null?(raw/10).toFixed(1):null;
                            return (
                              <div key={q} className="q" style={{background:hasData?"var(--accent-soft)":undefined,borderColor:hasData?"var(--accent-line)":undefined}}>
                                <div className="l" style={{color:hasData?"var(--accent)":undefined}}>Q{q}</div>
                                <div className="mono" style={{fontSize:14,fontWeight:700,textAlign:"center",color:val!==null?"var(--accent)":"var(--text-3)"}}>{val!==null?val:"—"}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="dim" style={{fontSize:10,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6,fontWeight:500,color:"var(--positive)"}}>Proyectos · Score trimestral (0-10)</div>
                        <div className="q-cols">
                          {[1,2,3,4].map(q => {
                            const isCur = q===curQuarter;
                            const raw = isCur&&projects&&tasks&&window.computeProjectScore ? window.computeProjectScore(deptId,projects,tasks) : null;
                            const val = raw!==null?(raw/10).toFixed(1):null;
                            return (
                              <div key={q} className="q" style={{background:isCur?"#10b98112":undefined,borderColor:isCur?"#10b98140":undefined}}>
                                <div className="l" style={{color:isCur?"var(--positive)":undefined}}>Q{q}</div>
                                <div className="mono" style={{fontSize:14,fontWeight:700,textAlign:"center",color:val!==null?"var(--positive)":"var(--text-3)"}}>{val!==null?val:"—"}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {addingGoal && <NewGoalModal effDept={effDept} onClose={() => setAddingGoal(false)} onAdd={addGoal}/>}

      {creatingProject && (
        <NewProjectInPOAModal
          session={session}
          deptId={creatingProject.deptId}
          isBhag={creatingProject.isBhag}
          onClose={() => setCreatingProject(null)}
          onCreate={data => createAndLinkProject(creatingProject.deptId, creatingProject.goalId, data)}
        />
      )}

      {creatingKpi && (
        <NewKpiInPOAModal
          deptId={creatingKpi.deptId}
          isBhag={creatingKpi.isBhag}
          curYear={curYear} curQuarter={curQuarter}
          onClose={() => setCreatingKpi(null)}
          onCreate={kpi => createAndLinkKpi(creatingKpi.deptId, creatingKpi.goalId, kpi)}
        />
      )}

      {deleteGoal && (
        <div className="modal-bg" onClick={() => setDeleteGoal(null)}>
          <div className="modal" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div className="modal__hd"><div className="modal__title">Eliminar meta</div><button className="iconbtn" onClick={()=>setDeleteGoal(null)}><span className="ic"><Icon name="x" size={14}/></span></button></div>
            <div className="modal__bd"><p style={{margin:0}}>¿Confirmas la eliminación de esta meta?</p></div>
            <div className="modal__ft">
              <button className="btn btn--ghost" onClick={()=>setDeleteGoal(null)}>Cancelar</button>
              <button className="btn btn--danger" onClick={()=>removeGoal(deleteGoal.deptId,deleteGoal.goalId)}>Eliminar meta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewProjectInPOAModal({ session, deptId, isBhag, onClose, onCreate }) {
  const D = window.INDISA_DATA;
  const [title, setTitle] = useState("");
  const [prio, setPrio] = useState("med");
  const [status, setStatus] = useState("todo");
  const [due, setDue] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 2); return d.toISOString().slice(0, 10); });
  const [tag, setTag] = useState("");
  const [targetDept, setTargetDept] = useState(isBhag ? (D.DEPARTMENTS[0]?.id || deptId) : deptId);
  const dept = D.DEPT_BY_ID[targetDept];

  function submit() {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), dept: targetDept, prio, status, due, tag: tag || "general", assignees: [initials(session.name)], targetDept });
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title">Nuevo proyecto{dept ? ` · ${dept.name}` : ""}</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          {isBhag && (
            <div className="field">
              <label>Departamento destino</label>
              <select className="select" value={targetDept} onChange={e=>setTargetDept(e.target.value)}>
                {D.DEPARTMENTS.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          <div className="field"><label>Título del proyecto</label><input className="input" placeholder="Ej. Rediseño del portal web" value={title} onChange={e=>setTitle(e.target.value)} autoFocus/></div>
          <div className="row row--2">
            <div className="field">
              <label>Etiqueta</label>
              <input className="input" placeholder="Ej. diseño, ops" value={tag} onChange={e=>setTag(e.target.value)}/>
            </div>
            <div className="field">
              <label>Fecha límite</label>
              <input className="input mono" type="date" value={due} onChange={e=>setDue(e.target.value)}/>
            </div>
          </div>
          <div className="row row--2">
            <div className="field">
              <label>Estado inicial</label>
              <select className="select" value={status} onChange={e=>setStatus(e.target.value)}>
                <option value="todo">Por hacer</option>
                <option value="doing">En curso</option>
              </select>
            </div>
            <div className="field">
              <label>Prioridad</label>
              <select className="select" value={prio} onChange={e=>setPrio(e.target.value)}>
                <option value="low">Baja</option>
                <option value="med">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" disabled={!title.trim()} onClick={submit} style={{opacity:!title.trim()?0.5:1}}>
            <Icon name="plus" size={14}/> Crear proyecto
          </button>
        </div>
      </div>
    </div>
  );
}

function NewKpiInPOAModal({ deptId, isBhag, curYear, curQuarter, onClose, onCreate }) {
  const D = window.INDISA_DATA;
  const [label, setLabel] = useState("");
  const [tipo, setTipo] = useState("Cantidad");
  const [meta, setMeta] = useState("");
  const [acumPrev, setAcumPrev] = useState("");
  const [targetDept, setTargetDept] = useState(isBhag ? (D.DEPARTMENTS[0]?.id || deptId) : deptId);
  const TIPOS = ["Cantidad", "Porcentaje", "Tiempo", "Moneda"];
  const dept = D.DEPT_BY_ID[targetDept];
  const canSubmit = label.trim() && meta !== "" && !isNaN(parseFloat(meta));

  function submit() {
    if (!canSubmit) return;
    const id = (label.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"").slice(0,15)||"kpi") + "_" + Date.now().toString(36).slice(-4);
    onCreate({ id, label: label.trim(), tipo, metaSemanal: parseFloat(meta), semanas: Array(13).fill(null), acumuladoPrevio: parseFloat(acumPrev)||0, targetDept });
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title">Nuevo KPI{dept ? ` · ${dept.name}` : ""}</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          {isBhag && (
            <div className="field">
              <label>Departamento destino</label>
              <select className="select" value={targetDept} onChange={e=>setTargetDept(e.target.value)}>
                {D.DEPARTMENTS.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>Nombre del indicador</label>
            <input className="input" placeholder="Ej. Producción Real" value={label} onChange={e=>setLabel(e.target.value)} autoFocus/>
          </div>
          <div className="row row--2">
            <div className="field">
              <label>Tipo de KPI</label>
              <select className="input" value={tipo} onChange={e=>setTipo(e.target.value)}>
                {TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Meta semanal</label>
              <input className="input mono" type="number" step="1" placeholder="0" value={meta} onChange={e=>setMeta(e.target.value)}/>
            </div>
          </div>
          <div className="field">
            <label>Acumulado trimestres anteriores <span className="dim">(opcional)</span></label>
            <input className="input mono" type="number" step="1" placeholder="0" value={acumPrev} onChange={e=>setAcumPrev(e.target.value)}/>
          </div>
          {label && meta && (
            <div style={{padding:"10px 12px",background:"var(--bg-1)",borderRadius:8,border:"1px solid var(--line)",marginTop:4,fontSize:12}}>
              <span style={{fontWeight:600}}>{label}</span>
              <span className="dim" style={{marginLeft:8}}>· {tipo} · Meta: {meta}/sem · Q{curQuarter} {curYear}</span>
            </div>
          )}
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" disabled={!canSubmit} onClick={submit} style={{opacity:canSubmit?1:0.5}}>
            <Icon name="plus" size={14}/> Crear KPI
          </button>
        </div>
      </div>
    </div>
  );
}

function NewGoalModal({ effDept, onClose, onAdd }) {
  const D = window.INDISA_DATA;
  const [title, setTitle] = useState("");
  const [type, setType] = useState("quarterly");
  const [depts, setDepts] = useState(effDept ? [effDept] : []);
  const isBhag = type === "bhag";

  function toggleDept(id) { setDepts(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]); }
  function handleTypeChange(k) { setType(k); if(k==="bhag") setDepts(["gg"]); else if(!effDept) setDepts([]); }
  const canSubmit = title.trim() && (isBhag || effDept || depts.length > 0);
  function submit() { if(!canSubmit) return; onAdd(isBhag?["gg"]:effDept?[effDept]:depts, title.trim(), type); }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal__hd"><div className="modal__title">Nueva meta estratégica</div><button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button></div>
        <div className="modal__bd">
          <div className="field">
            <label>Tipo de meta (Scaling Up)</label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
              {Object.entries(D.POA_TYPES).map(([k,v]) => (
                <div key={k} onClick={()=>handleTypeChange(k)} style={{padding:10,borderRadius:8,cursor:"pointer",border:"1px solid "+(type===k?v.color:"var(--line)"),background:type===k?v.color+"12":"var(--bg-1)",transition:"all .15s"}}>
                  <div style={{fontSize:11,fontWeight:600,color:v.color,textTransform:"uppercase",letterSpacing:".06em"}}>{v.label}</div>
                  <div className="dim" style={{fontSize:11,marginTop:2}}>{v.sub}</div>
                </div>
              ))}
            </div>
          </div>
          {isBhag && (
            <div className="field">
              <div style={{padding:"10px 14px",borderRadius:8,background:"var(--accent-soft)",border:"1px solid var(--accent-line)",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>🎯</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--accent)"}}>Meta única para toda la empresa</div>
                  <div className="dim" style={{fontSize:11,marginTop:2}}>El BHAG aplica a la organización completa.</div>
                </div>
              </div>
            </div>
          )}
          {!isBhag && !effDept && (
            <div className="field">
              <label>Departamentos <span className="dim" style={{fontWeight:400,fontSize:11}}>— selecciona uno o varios</span></label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>
                {D.DEPARTMENTS.map(d => {
                  const sel = depts.includes(d.id);
                  return (<div key={d.id} onClick={()=>toggleDept(d.id)} style={{padding:"5px 11px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:500,border:"1px solid "+(sel?d.color:"var(--line)"),background:sel?d.color+"15":"var(--bg-1)",color:sel?d.color:"var(--text-2)",transition:"all .12s",userSelect:"none"}}>{d.name}</div>);
                })}
              </div>
              {depts.length===0&&<div className="dim" style={{fontSize:11,marginTop:6,color:"var(--warning)"}}>Selecciona al menos un departamento</div>}
            </div>
          )}
          <div className="field">
            <label>Título de la meta</label>
            <input className="input" placeholder="Ej. Alcanzar $30M de ingresos anuales" value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoFocus/>
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" disabled={!canSubmit} onClick={submit} style={{opacity:!canSubmit?0.5:1}}><Icon name="plus" size={14}/> Crear meta</button>
        </div>
      </div>
    </div>
  );
}

window.POAPage = POAPage;
