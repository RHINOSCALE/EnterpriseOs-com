// Registro de Auditoría
const { useState, useEffect, useMemo, useRef } = React;

function AuditPage({ session, audit }) {
  const D = window.INDISA_DATA;
  const role = session.role;
  const [filter, setFilter] = useState("all");

  const visible = audit.filter(a => role === "owner" ? true : (a.dept === session.dept || a.dept === null));
  const final = filter === "all" ? visible : visible.filter(a => a.level === filter);

  const lbls = { all: "todos", info: "info", success: "éxito", warn: "alertas" };

  return (
    <div className="page">
      <div className="page__hd">
        <div>
          <h1 className="page__title">Registro de Auditoría</h1>
          <p className="page__sub">Seguimiento de actividad · {role === "owner" ? "todos los departamentos" : "tu departamento"}</p>
        </div>
        <div className="page__actions">
          <button className="btn"><Icon name="doc" size={14}/> Exportar CSV</button>
        </div>
      </div>

      <div className="row row--4" style={{marginBottom: 14}}>
        <Card title="Eventos totales">
          <div style={{fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em"}}>{visible.length}</div>
        </Card>
        <Card title="Alertas">
          <div style={{fontSize: 30, fontWeight: 600, color: "var(--warning)", letterSpacing: "-0.02em"}}>{visible.filter(a => a.level === "warn").length}</div>
        </Card>
        <Card title="Éxitos">
          <div style={{fontSize: 30, fontWeight: 600, color: "var(--positive)", letterSpacing: "-0.02em"}}>{visible.filter(a => a.level === "success").length}</div>
        </Card>
        <Card title="Accesos fallidos">
          <div style={{fontSize: 30, fontWeight: 600, color: "var(--danger)", letterSpacing: "-0.02em"}}>{visible.filter(a => /fall|inv\u00e1l|expir|revoc/i.test(a.action)).length}</div>
        </Card>
      </div>

      <div className="tabs">
        {["all", "info", "success", "warn"].map(f => (
          <div key={f} className={"tabs__tab " + (filter === f ? "is-active" : "")} onClick={() => setFilter(f)}>{lbls[f]}</div>
        ))}
      </div>

      <Card title="Eventos" sub={`${final.length} entradas · más recientes primero`}>
        <div className="audit">
          <div className="audit__row" style={{background: "var(--bg-1)", fontWeight: 500}}>
            <div className="dim mono" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em"}}>Fecha · hora</div>
            <div className="dim mono" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em"}}>Acción</div>
            <div className="dim mono" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em"}}>Actor</div>
            <div className="dim mono" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em"}}>Nivel</div>
          </div>
          {final.map((a, i) => (
            <div key={i} className="audit__row">
              <div className="audit__time">{a.ts}</div>
              <div>
                <span className="mono dim" style={{marginRight: 8, fontSize: 11}}>{a.dept ? D.DEPT_BY_ID[a.dept]?.short || a.dept : "—"}</span>
                {a.action}
              </div>
              <div className="audit__user">{a.user}</div>
              <div>
                {a.level === "warn" && <span className="chip chip--warn"><span className="dot"/>alerta</span>}
                {a.level === "success" && <span className="chip chip--ok"><span className="dot"/>ok</span>}
                {a.level === "info" && <span className="chip chip--info"><span className="dot"/>info</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

window.AuditPage = AuditPage;
