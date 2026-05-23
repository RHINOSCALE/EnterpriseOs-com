// POA — Plan Operativo Anual
const { useState, useEffect, useMemo, useRef } = React;

function POAPage({ session, deptScope, poa, setPoa, kpis, kpiWeekly, projects, tasks, addAudit, showToast }) {
  const D = window.INDISA_DATA;
  const role = session.role;
  const curYear = new Date().getFullYear();
  const curQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const readOnly = role === "viewer";
  const effDept = role === "owner" ? deptScope : session.dept;

  const groups = effDept ? [[effDept, poa[effDept] || []]] : Object.entries(poa);

  const [addingGoal, setAddingGoal] = useState(false);
  const [deleteGoal, setDeleteGoal] = useState(null); // { deptId, goalId }
  const [deleteObj, setDeleteObj] = useState(null);   // { deptId, goalId, objId }

  function toggleObj(deptId, goalId, objId) {
    setPoa(prev => {
      const out = { ...prev };
      out[deptId] = (out[deptId] || []).map(g => {
        if (g.id !== goalId) return g;
        const objs = g.objectives.map(o => o.id === objId ? { ...o, done: !o.done } : o);
        const done = objs.filter(o => o.done).length;
        const progress = Math.round(done / objs.length * 100);
        return { ...g, objectives: objs, progress };
      });
      return out;
    });
    addAudit({ action: `Objetivo POA actualizado · ${goalId}/${objId}`, user: session.name, dept: deptId, level: "info" });
  }

  function editGoalTitle(deptId, goalId, title) {
    setPoa(prev => {
      const out = { ...prev };
      out[deptId] = (out[deptId] || []).map(g => g.id === goalId ? { ...g, title } : g);
      return out;
    });
    addAudit({ action: `Meta POA renombrada · ${goalId}`, user: session.name, dept: deptId, level: "info" });
  }

  function editObjText(deptId, goalId, objId, text) {
    setPoa(prev => {
      const out = { ...prev };
      out[deptId] = (out[deptId] || []).map(g => {
        if (g.id !== goalId) return g;
        return { ...g, objectives: g.objectives.map(o => o.id === objId ? { ...o, text } : o) };
      });
      return out;
    });
  }

  function addObjective(deptId, goalId) {
    const objId = "o" + Math.random().toString(36).slice(2, 6);
    setPoa(prev => {
      const out = { ...prev };
      out[deptId] = (out[deptId] || []).map(g => {
        if (g.id !== goalId) return g;
        const objectives = [...g.objectives, { id: objId, text: "Nuevo objetivo", done: false }];
        return { ...g, objectives };
      });
      return out;
    });
    showToast("Objetivo agregado");
  }

  function removeObjective(deptId, goalId, objId) {
    setPoa(prev => {
      const out = { ...prev };
      out[deptId] = (out[deptId] || []).map(g => {
        if (g.id !== goalId) return g;
        const objectives = g.objectives.filter(o => o.id !== objId);
        const done = objectives.filter(o => o.done).length;
        const progress = objectives.length ? Math.round(done / objectives.length * 100) : 0;
        return { ...g, objectives, progress };
      });
      return out;
    });
    addAudit({ action: `Objetivo eliminado · ${goalId}/${objId}`, user: session.name, dept: deptId, level: "warn" });
    showToast("Objetivo eliminado");
    setDeleteObj(null);
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
          id, type: type || "quarterly", title, owner: session.name, progress: 0, q: [0,0,0,0],
          objectives: [{ id: "o1", text: "Primer objetivo", done: false }],
        }];
      });
      return out;
    });
    addAudit({ action: `Meta POA creada · ${title}`, user: session.name, dept: deptIds[0] || "gg", level: "success" });
    showToast(deptIds.length > 1 ? `Meta agregada a ${deptIds.length} departamentos` : "Meta agregada");
    setAddingGoal(false);
  }

  function exportPOA() {
    const _mn = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const _nd = new Date();
    const body = window.buildPOAReport(poa, D.DEPARTMENTS, D.DEPT_BY_ID, D.POA_TYPES, `${_mn[_nd.getMonth()]} ${_nd.getFullYear()}`);
    window.exportPDF("POA · Plan Operativo Anual", body, "POA_INDISA_2026.pdf");
    addAudit({ action: "POA exportado a PDF", user: session.name, dept: null, level: "info" });
    showToast("Generando PDF…");
  }

  const allGoals = Object.values(poa).flat();
  const avgProgress = allGoals.length ? Math.round(allGoals.reduce((s,g) => s + g.progress, 0) / allGoals.length) : 0;
  const objDone  = allGoals.flatMap(g => g.objectives).filter(o => o.done).length;
  const objTotal = allGoals.flatMap(g => g.objectives).length;

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
        <Card title="Objetivos cumplidos" sub="del total">
          <div style={{fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em"}}>
            {objDone}<span className="dim" style={{fontSize: 18}}> / {objTotal}</span>
          </div>
          <div className="dim" style={{fontSize: 11, marginTop: 6}}>{Math.round(objDone / Math.max(1, objTotal) * 100)}% de progreso</div>
        </Card>
        <Card title="Trimestre actual" sub="FY 2026">
          <div className="q-cols">
            {["Q1","Q2","Q3","Q4"].map((q, i) => (
              <div key={q} className="q" style={{borderColor: i === 1 ? "var(--accent)" : "var(--line)", background: i === 1 ? "var(--accent-soft)" : "var(--bg-1)"}}>
                <div className="l">{q}</div>
                <div className="v" style={{color: i === 1 ? "var(--accent)" : i === 0 ? "var(--positive)" : "var(--text-3)"}}>{i === 0 ? "✓" : i === 1 ? "·" : "—"}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="poa">
        {groups.map(([deptId, goals]) => (
          <div key={deptId}>
            <div className="flex-c gap-10" style={{margin: "12px 4px 8px"}}>
              <span style={{width: 8, height: 8, borderRadius: 2, background: D.DEPT_BY_ID[deptId].color}}/>
              <span style={{fontSize: 11, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600}}>{D.DEPT_BY_ID[deptId].name}</span>
              <span className="dim" style={{fontSize: 11}}>· {goals.length} {goals.length === 1 ? "meta" : "metas"}</span>
            </div>
            {goals.map(g => {
              const isBhag = g.type === "bhag";
              return (
              <div key={g.id} className="goal" style={{marginBottom: 10, overflow: "hidden", ...(isBhag ? { border: "2px solid #8b5cf6", boxShadow: "0 0 0 3px #8b5cf614, 0 8px 28px -6px #8b5cf650" } : {})}}>
                {isBhag && (
                  <div style={{margin: "-1px -1px 12px", padding: "10px 16px", background: "linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)", color: "#fff", display: "flex", alignItems: "center", gap: 10}}>
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
                      setPoa(prev => {
                        const out = { ...prev };
                        out[deptId] = (out[deptId] || []).map(goal => goal.id === g.id ? { ...goal, type: e.target.value } : goal);
                        return out;
                      });
                    }} style={{
                      width: "auto",
                      fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600,
                      padding: "3px 8px", borderRadius: 999,
                      background: D.POA_TYPES[g.type].color + "15",
                      color: D.POA_TYPES[g.type].color,
                      border: "1px solid " + D.POA_TYPES[g.type].color + "40",
                    }}>
                      {Object.entries(D.POA_TYPES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  )}
                  <input
                    className="cell-edit"
                    style={{fontSize: 15, fontWeight: 600, flex: 1, padding: "4px 6px"}}
                    defaultValue={g.title}
                    onBlur={e => editGoalTitle(deptId, g.id, e.target.value)}
                    disabled={readOnly}
                  />
                  <span className="goal__owner">{g.owner}</span>
                  <span className="goal__prog">{g.progress}%</span>
                  {!readOnly && <button className="btn btn--sm btn--danger" style={{marginLeft: 8}} onClick={() => setDeleteGoal({ deptId, goalId: g.id })} title="Eliminar meta">
                    <Icon name="x" size={12}/>
                  </button>}
                </div>
                <div className="goal__bar"><span style={{width: g.progress + "%"}}/></div>
                <div className="row row--2" style={{marginTop: 14}}>
                  <div>
                    <div className="flex-c gap-8" style={{marginBottom: 6}}>
                      <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 500}}>Objetivos</div>
                      {!readOnly && <button className="btn btn--sm" style={{marginLeft: "auto"}} onClick={() => addObjective(deptId, g.id)}>
                        <Icon name="plus" size={11}/> Agregar
                      </button>}
                    </div>
                    <div className="goal__sub">
                      {g.objectives.map(o => (
                        <div key={o.id} className="goal__obj">
                          <span style={{display: "flex", alignItems: "center", gap: 10}}>
                            <input type="checkbox" checked={o.done} onChange={() => toggleObj(deptId, g.id, o.id)} disabled={readOnly} style={{accentColor: "var(--accent)"}}/>
                            <input
                              className="cell-edit"
                              defaultValue={o.text}
                              style={{textDecoration: o.done ? "line-through" : "none", color: o.done ? "var(--text-2)" : "var(--text)", flex: 1}}
                              onBlur={e => editObjText(deptId, g.id, o.id, e.target.value)}
                              disabled={readOnly}
                            />
                          </span>
                          <span className={"chip " + (o.done ? "chip--ok" : "")} style={{fontSize: 10}}>{o.done ? "Hecho" : "Abierto"}</span>
                          {!readOnly && <button className="btn btn--sm" style={{color: "var(--danger)", border: "none", background: "transparent", padding: "2px 4px"}}
                            onClick={() => setDeleteObj({ deptId, goalId: g.id, objId: o.id })} title="Eliminar objetivo">
                            <Icon name="x" size={12}/>
                          </button>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6, fontWeight: 500}}>Seguimiento trimestral</div>
                    <div className="q-cols">
                      {g.q.map((v, i) => (
                        <div key={i} className="q">
                          <div className="l">Q{i+1}</div>
                          <input
                            className="cell-edit mono"
                            style={{textAlign: "center", width: "100%", fontSize: 14, fontWeight: 600}}
                            defaultValue={v === 0 ? "" : v}
                            placeholder="—"
                            disabled={readOnly}
                            onBlur={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setPoa(prev => {
                                const out = { ...prev };
                                out[deptId] = (out[deptId] || []).map(goal => {
                                  if (goal.id !== g.id) return goal;
                                  const q = [...goal.q]; q[i] = val; return { ...goal, q };
                                });
                                return out;
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    {/* KPI tracking row */}
                    <div style={{marginTop: 14}}>
                      <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6, fontWeight: 500, color: "var(--accent)"}}>KPIs · Score trimestral (0-10)</div>
                      <div className="q-cols">
                        {[1,2,3,4].map(q => {
                          const hasData = kpiWeekly && ((kpiWeekly[`${deptId}_${curYear}_${q}`] || []).length > 0);
                          const raw = hasData && window.computeKpiScore ? window.computeKpiScore(deptId, kpis, kpiWeekly, curYear, q) : null;
                          const val = raw !== null ? (raw / 10).toFixed(1) : null;
                          return (
                            <div key={q} className="q" style={{background: hasData ? "var(--accent-soft)" : undefined, borderColor: hasData ? "var(--accent-line)" : undefined}}>
                              <div className="l" style={{color: hasData ? "var(--accent)" : undefined}}>Q{q}</div>
                              <div className="mono" style={{fontSize: 14, fontWeight: 700, textAlign: "center", color: val !== null ? "var(--accent)" : "var(--text-3)"}}>{val !== null ? val : "—"}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Projects tracking row */}
                    <div style={{marginTop: 14}}>
                      <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6, fontWeight: 500, color: "var(--positive)"}}>Proyectos · Score trimestral (0-10)</div>
                      <div className="q-cols">
                        {[1,2,3,4].map(q => {
                          const isCur = q === curQuarter;
                          const raw = isCur && projects && tasks && window.computeProjectScore ? window.computeProjectScore(deptId, projects, tasks) : null;
                          const val = raw !== null ? (raw / 10).toFixed(1) : null;
                          return (
                            <div key={q} className="q" style={{background: isCur ? "#10b98112" : undefined, borderColor: isCur ? "#10b98140" : undefined}}>
                              <div className="l" style={{color: isCur ? "var(--positive)" : undefined}}>Q{q}</div>
                              <div className="mono" style={{fontSize: 14, fontWeight: 700, textAlign: "center", color: val !== null ? "var(--positive)" : "var(--text-3)"}}>{val !== null ? val : "—"}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="dim" style={{fontSize: 11, marginTop: 8}}>última actualización: 2026-05-12</div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ))}
      </div>

      {addingGoal && <NewGoalModal effDept={effDept} onClose={() => setAddingGoal(false)} onAdd={addGoal}/>}

      {deleteGoal && (
        <div className="modal-bg" onClick={() => setDeleteGoal(null)}>
          <div className="modal" style={{maxWidth: 380}} onClick={e => e.stopPropagation()}>
            <div className="modal__hd"><div className="modal__title">Eliminar meta</div><button className="iconbtn" onClick={() => setDeleteGoal(null)}><span className="ic"><Icon name="x" size={14}/></span></button></div>
            <div className="modal__bd"><p style={{margin: 0}}>¿Confirmas la eliminación de esta meta y todos sus objetivos?</p></div>
            <div className="modal__ft">
              <button className="btn btn--ghost" onClick={() => setDeleteGoal(null)}>Cancelar</button>
              <button className="btn btn--danger" onClick={() => removeGoal(deleteGoal.deptId, deleteGoal.goalId)}>Eliminar meta</button>
            </div>
          </div>
        </div>
      )}

      {deleteObj && (
        <div className="modal-bg" onClick={() => setDeleteObj(null)}>
          <div className="modal" style={{maxWidth: 380}} onClick={e => e.stopPropagation()}>
            <div className="modal__hd"><div className="modal__title">Eliminar objetivo</div><button className="iconbtn" onClick={() => setDeleteObj(null)}><span className="ic"><Icon name="x" size={14}/></span></button></div>
            <div className="modal__bd"><p style={{margin: 0}}>¿Confirmas la eliminación de este objetivo?</p></div>
            <div className="modal__ft">
              <button className="btn btn--ghost" onClick={() => setDeleteObj(null)}>Cancelar</button>
              <button className="btn btn--danger" onClick={() => removeObjective(deleteObj.deptId, deleteObj.goalId, deleteObj.objId)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewGoalModal({ effDept, onClose, onAdd }) {
  const D = window.INDISA_DATA;
  const [title, setTitle] = useState("");
  const [type, setType] = useState("quarterly");
  const [depts, setDepts] = useState(effDept ? [effDept] : []);

  const isBhag = type === "bhag";

  function toggleDept(id) {
    setDepts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleTypeChange(k) {
    setType(k);
    if (k === "bhag") setDepts(["gg"]);
    else if (!effDept) setDepts([]);
  }

  const canSubmit = title.trim() && (isBhag || effDept || depts.length > 0);

  function submit() {
    if (!canSubmit) return;
    onAdd(isBhag ? ["gg"] : effDept ? [effDept] : depts, title.trim(), type);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__hd">
          <div className="modal__title">Nueva meta estratégica</div>
          <button className="iconbtn" onClick={onClose}><span className="ic"><Icon name="x" size={14}/></span></button>
        </div>
        <div className="modal__bd">
          {/* Type selector */}
          <div className="field">
            <label>Tipo de meta (Scaling Up)</label>
            <div style={{display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8}}>
              {Object.entries(D.POA_TYPES).map(([k,v]) => (
                <div key={k} onClick={() => handleTypeChange(k)} style={{
                  padding: 10, borderRadius: 8, cursor: "pointer",
                  border: "1px solid " + (type === k ? v.color : "var(--line)"),
                  background: type === k ? v.color + "12" : "var(--bg-1)",
                  transition: "all .15s",
                }}>
                  <div style={{fontSize: 11, fontWeight: 600, color: v.color, textTransform: "uppercase", letterSpacing: ".06em"}}>{v.label}</div>
                  <div className="dim" style={{fontSize: 11, marginTop: 2}}>{v.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* BHAG — empresa completa, sin selector */}
          {isBhag && (
            <div className="field">
              <div style={{padding: "10px 14px", borderRadius: 8, background: "var(--accent-soft)", border: "1px solid var(--accent-line)", display: "flex", alignItems: "center", gap: 10}}>
                <span style={{fontSize: 18}}>🎯</span>
                <div>
                  <div style={{fontSize: 13, fontWeight: 600, color: "var(--accent)"}}>Meta única para toda la empresa</div>
                  <div className="dim" style={{fontSize: 11, marginTop: 2}}>El BHAG aplica a la organización completa, sin departamento específico.</div>
                </div>
              </div>
            </div>
          )}

          {/* Multi-dept selector para Anual / Trimestral / Rock */}
          {!isBhag && !effDept && (
            <div className="field">
              <label>Departamentos <span className="dim" style={{fontWeight: 400, fontSize: 11}}>— selecciona uno o varios</span></label>
              <div style={{display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4}}>
                {D.DEPARTMENTS.map(d => {
                  const sel = depts.includes(d.id);
                  return (
                    <div key={d.id} onClick={() => toggleDept(d.id)} style={{
                      padding: "5px 11px", borderRadius: 6, cursor: "pointer",
                      fontSize: 12, fontWeight: 500,
                      border: "1px solid " + (sel ? d.color : "var(--line)"),
                      background: sel ? d.color + "15" : "var(--bg-1)",
                      color: sel ? d.color : "var(--text-2)",
                      transition: "all .12s",
                      userSelect: "none",
                    }}>
                      {d.name}
                    </div>
                  );
                })}
              </div>
              {depts.length === 0 && (
                <div className="dim" style={{fontSize: 11, marginTop: 6, color: "var(--warning)"}}>Selecciona al menos un departamento</div>
              )}
              {depts.length > 1 && (
                <div className="dim" style={{fontSize: 11, marginTop: 6}}>
                  Se creará una meta en cada departamento seleccionado ({depts.length})
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="field">
            <label>Título de la meta</label>
            <input className="input" placeholder="Ej. Alcanzar $30M de ingresos anuales"
              value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()} autoFocus/>
          </div>
          <div className="dim" style={{fontSize: 12, marginTop: 8}}>
            Se creará con un objetivo inicial. Podrás editarlo directamente en el POA.
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" disabled={!canSubmit} onClick={submit} style={{opacity: !canSubmit ? 0.5 : 1}}>
            <Icon name="plus" size={14}/> Crear meta
          </button>
        </div>
      </div>
    </div>
  );
}

window.POAPage = POAPage;
