// Seed data for INDISA Enterprise OS
// Spanish UI · Light corporate look

const DEPARTMENTS = [
  { id: "gg",  name: "Gerencia General",       short: "GG",  color: "#2563eb" },
  { id: "ing", name: "Ingeniería y Diseño",    short: "ING", color: "#f97316" },
  { id: "con", name: "Contabilidad",           short: "CON", color: "#ef4444" },
  { id: "rh",  name: "Recursos Humanos",       short: "RH",  color: "#8b5cf6" },
  { id: "mkt", name: "Marketing",              short: "MKT", color: "#d946ef" },
  { id: "it",  name: "IT",                     short: "IT",  color: "#14b8a6" },
  { id: "mnt", name: "Mantenimiento",          short: "MNT", color: "#f43f5e" },
  { id: "ven", name: "Ventas / Mercadeo",      short: "VEN", color: "#10b981" },
  { id: "ope", name: "Producción",             short: "OPE", color: "#ef4444" },
  { id: "com", name: "Compras / Materiales",   short: "COM", color: "#a855f7" },
  { id: "log", name: "Proyectos / Logística",  short: "LOG", color: "#0ea5e9" },
  { id: "ac",  name: "Atención al Cliente",    short: "AC",  color: "#6366f1" },
];

const DEPT_BY_ID = Object.fromEntries(DEPARTMENTS.map(d => [d.id, d]));

const INITIAL_CODES = [
  { code: "INDISA-OWNER-2026",   role: "owner",  dept: null,   uses: 0, max: 999, expires: "2026-12-31", revoked: false, createdBy: "sistema", createdAt: "2026-01-04" },
  { code: "INDISA-ADM-MKT-26",   role: "admin",  dept: "mkt",  uses: 0, max: 3,  expires: "2026-09-30", revoked: false, createdBy: "owner",   createdAt: "2026-02-12" },
  { code: "INDISA-ADM-OPE-26",   role: "admin",  dept: "ope",  uses: 0, max: 3,  expires: "2026-09-30", revoked: false, createdBy: "owner",   createdAt: "2026-02-12" },
  { code: "INDISA-ADM-VEN-26",   role: "admin",  dept: "ven",  uses: 0, max: 3,  expires: "2026-09-30", revoked: false, createdBy: "owner",   createdAt: "2026-02-12" },
  { code: "INDISA-VIEW-ING-Q2",  role: "viewer", dept: "ing",  uses: 1, max: 10, expires: "2026-06-30", revoked: false, createdBy: "admin",   createdAt: "2026-04-01" },
  { code: "INDISA-VIEW-LOG-Q2",  role: "viewer", dept: "log",  uses: 4, max: 25, expires: "2026-06-30", revoked: false, createdBy: "admin",   createdAt: "2026-04-01" },
  { code: "INDISA-DEMO-EXPIRED", role: "viewer", dept: "rh",   uses: 2, max: 5,  expires: "2025-01-01", revoked: false, createdBy: "admin",   createdAt: "2024-11-12" },
  { code: "INDISA-DEMO-REVOK",   role: "viewer", dept: "con",  uses: 0, max: 5,  expires: "2026-12-01", revoked: true,  createdBy: "admin",   createdAt: "2026-01-22" },
];

function mkSeries(n, base, vol, trend = 0) {
  const out = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v = v + (Math.sin(i * 0.7 + base) * vol) + trend + (Math.random() - 0.5) * vol;
    out.push(Math.max(0, Math.round(v * 10) / 10));
  }
  return out;
}

const INITIAL_KPIS = {
  _company: [
    { id: "rev",     label: "Ingresos YTD",         unit: "M$",  value: 18.4, target: 22.0, deltaPct: 12.3, trend: mkSeries(12, 12, 1.2, 0.5) },
    { id: "margin",  label: "Margen EBITDA",        unit: "%",   value: 18.6, target: 20.0, deltaPct: 2.1,  trend: mkSeries(12, 16, 0.6, 0.2) },
    { id: "csat",    label: "Satisfacción Cliente", unit: "/100",value: 87,   target: 90,   deltaPct: 1.8,  trend: mkSeries(12, 82, 1.5, 0.4) },
    { id: "otd",     label: "Entregas a Tiempo",    unit: "%",   value: 94.2, target: 96.0, deltaPct: -0.6, trend: mkSeries(12, 93, 1.2) },
  ],
  gg:  [
    { id: "strat",   label: "Iniciativas Estratégicas",unit: "/12", value: 9,    target: 12,   deltaPct: 8.3,  trend: mkSeries(12, 7, 0.5, 0.2) },
    { id: "cash",    label: "Caja Disponible",       unit: "mo",  value: 18,   target: 24,   deltaPct: -3.5, trend: mkSeries(12, 19, 1.2) },
    { id: "rev",     label: "Ingresos YTD",          unit: "M$",  value: 18.4, target: 22.0, deltaPct: 12.3, trend: mkSeries(12, 12, 1.2, 0.5) },
    { id: "morale",  label: "eNPS",                  unit: "",    value: 42,   target: 50,   deltaPct: 4.8,  trend: mkSeries(12, 35, 2) },
  ],
  ing: [
    { id: "ship",    label: "Entregas Realizadas",   unit: "",    value: 28,   target: 32,   deltaPct: 16.6, trend: mkSeries(12, 1.5, 0.5, 0.4) },
    { id: "bugs",    label: "Defectos Abiertos",     unit: "",    value: 47,   target: 30,   deltaPct: -8.2, trend: mkSeries(12, 55, 4) },
    { id: "lead",    label: "Tiempo de Entrega",     unit: "d",   value: 4.2,  target: 3.5,  deltaPct: -12.0,trend: mkSeries(12, 5.6, 0.4) },
    { id: "cov",     label: "Cobertura de Pruebas", unit: "%",    value: 78,   target: 85,   deltaPct: 3.2,  trend: mkSeries(12, 70, 1) },
  ],
  con: [
    { id: "ar",      label: "Cuentas por Cobrar",    unit: "K$",  value: 412,  target: 350,  deltaPct: -4.2, trend: mkSeries(12, 480, 8) },
    { id: "dso",     label: "Días de Cobro",         unit: "d",   value: 38,   target: 30,   deltaPct: -2.1, trend: mkSeries(12, 42, 1) },
    { id: "close",   label: "Cierre Mensual",        unit: "d",   value: 5,    target: 4,    deltaPct: -10.0,trend: mkSeries(12, 6.5, 0.4) },
    { id: "comp",    label: "Cumplimiento",          unit: "%",   value: 99,   target: 100,  deltaPct: 0.5,  trend: mkSeries(12, 96, 0.8) },
  ],
  rh:  [
    { id: "head",    label: "Colaboradores",         unit: "",    value: 184,  target: 200,  deltaPct: 4.5,  trend: mkSeries(12, 160, 4, 1.5) },
    { id: "att",     label: "Rotación (LTM)",        unit: "%",   value: 8.4,  target: 7.0,  deltaPct: -1.0, trend: mkSeries(12, 10, 0.5) },
    { id: "fill",    label: "Tiempo de Contratación",unit: "d",   value: 31,   target: 28,   deltaPct: -4.0, trend: mkSeries(12, 38, 1.2) },
    { id: "enps",    label: "eNPS",                  unit: "",    value: 42,   target: 50,   deltaPct: 4.8,  trend: mkSeries(12, 35, 2) },
  ],
  mkt: [
    { id: "mql",     label: "Leads Calificados",     unit: "",    value: 1245, target: 1400, deltaPct: 18.4, trend: mkSeries(12, 800, 80) },
    { id: "cac",     label: "Costo de Adquisición",  unit: "$",   value: 240,  target: 220,  deltaPct: -5.0, trend: mkSeries(12, 260, 8) },
    { id: "reach",   label: "Alcance de Marca",      unit: "K",   value: 482,  target: 600,  deltaPct: 22.1, trend: mkSeries(12, 220, 25) },
    { id: "conv",    label: "Conversión Web",        unit: "%",   value: 3.4,  target: 4.0,  deltaPct: 7.2,  trend: mkSeries(12, 2.4, 0.2) },
  ],
  it:  [
    { id: "uptime",  label: "Disponibilidad",        unit: "%",   value: 99.94,target: 99.99,deltaPct: 0.02, trend: mkSeries(12, 99.8, 0.1) },
    { id: "mttr",    label: "Tiempo de Recuperación",unit: "min", value: 28,   target: 20,   deltaPct: -12.0,trend: mkSeries(12, 45, 3) },
    { id: "tick",    label: "Tickets Abiertos",      unit: "",    value: 64,   target: 50,   deltaPct: -8.4, trend: mkSeries(12, 80, 4) },
    { id: "sec",     label: "Score de Seguridad",    unit: "/100",value: 86,   target: 95,   deltaPct: 3.6,  trend: mkSeries(12, 78, 1.2) },
  ],
  mnt: [
    { id: "mtbf",    label: "MTBF",                  unit: "h",   value: 150,  target: 220,  deltaPct: -4.2, trend: mkSeries(12, 160, 4) },
    { id: "pm",      label: "Mant. Preventivo",      unit: "%",   value: 68,   target: 95,   deltaPct: 1.4,  trend: mkSeries(12, 86, 1) },
    { id: "avail",   label: "Disponibilidad",        unit: "%",   value: 88,   target: 96,   deltaPct: -1.2, trend: mkSeries(12, 90, 1) },
    { id: "spare",   label: "Stock de Repuestos",    unit: "%",   value: 58,   target: 80,   deltaPct: -3.5, trend: mkSeries(12, 72, 1) },
  ],
  ven: [
    { id: "pipe",    label: "Pipeline",              unit: "M$",  value: 24.6, target: 30.0, deltaPct: 14.8, trend: mkSeries(12, 14, 1) },
    { id: "wr",      label: "Tasa de Cierre",        unit: "%",   value: 28,   target: 32,   deltaPct: 3.4,  trend: mkSeries(12, 22, 1) },
    { id: "asp",     label: "Ticket Promedio",       unit: "K$",  value: 142,  target: 160,  deltaPct: 8.8,  trend: mkSeries(12, 110, 5) },
    { id: "cycle",   label: "Ciclo de Venta",        unit: "d",   value: 48,   target: 42,   deltaPct: -4.2, trend: mkSeries(12, 56, 2) },
  ],
  ope: [
    { id: "thr",     label: "Producción Diaria",     unit: "u/d", value: 1500, target: 2000, deltaPct: -3.1, trend: mkSeries(12, 1400, 80) },
    { id: "qty",     label: "Calidad Aprobada",      unit: "%",   value: 67.2, target: 98.5, deltaPct: -4.4, trend: mkSeries(12, 95, 0.4) },
    { id: "yield",   label: "Rendimiento",           unit: "%",   value: 64.0, target: 94.0, deltaPct: -3.8, trend: mkSeries(12, 88, 0.6) },
    { id: "oee",     label: "OEE",                   unit: "%",   value: 55,   target: 85,   deltaPct: -2.1, trend: mkSeries(12, 70, 1) },
  ],
  com: [
    { id: "save",    label: "Ahorro YTD",            unit: "K$",  value: 180,  target: 320,  deltaPct: 4.2,  trend: mkSeries(12, 80, 18) },
    { id: "leadp",   label: "Tiempo de Proveedor",   unit: "d",   value: 18,   target: 10,   deltaPct: -8.0, trend: mkSeries(12, 18, 1) },
    { id: "po",      label: "Órdenes Procesadas",    unit: "",    value: 245,  target: 350,  deltaPct: 5.4,  trend: mkSeries(12, 230, 12) },
    { id: "vend",    label: "Calificación Provedor", unit: "/100",value: 65,   target: 90,   deltaPct: -2.4, trend: mkSeries(12, 78, 1) },
  ],
  log: [
    { id: "otd",     label: "Entregas a Tiempo",     unit: "%",   value: 94.2, target: 96.0, deltaPct: -0.6, trend: mkSeries(12, 93, 1.2) },
    { id: "cost",    label: "Costo por Unidad",      unit: "$",   value: 4.2,  target: 3.8,  deltaPct: -4.2, trend: mkSeries(12, 5.1, 0.2) },
    { id: "fill",    label: "Tasa de Surtido",       unit: "%",   value: 96.8, target: 98.0, deltaPct: 0.8,  trend: mkSeries(12, 94, 0.5) },
    { id: "ret",     label: "Devoluciones",          unit: "%",   value: 1.8,  target: 1.5,  deltaPct: -0.4, trend: mkSeries(12, 2.4, 0.2) },
  ],
  ac:  [
    { id: "csat",    label: "Satisfacción (CSAT)",   unit: "/100",value: 87,   target: 90,   deltaPct: 1.8,  trend: mkSeries(12, 82, 1.5, 0.4) },
    { id: "nps",     label: "NPS",                   unit: "",    value: 52,   target: 60,   deltaPct: 4.0,  trend: mkSeries(12, 42, 1.5) },
    { id: "frt",     label: "Primera Respuesta",     unit: "min", value: 3.4,  target: 2.5,  deltaPct: -12.0,trend: mkSeries(12, 5, 0.4) },
    { id: "res",     label: "Tiempo de Resolución",  unit: "h",   value: 7.8,  target: 5.0,  deltaPct: -8.0, trend: mkSeries(12, 12, 0.6) },
  ],
};

const INITIAL_PROJECTS = {
  ing: [
    { id: "p1", title: "Lanzamiento ERP módulo v2",  status: "doing",  prio: "high", assignees: ["AM","JR"], due: "2026-06-15", dept: "ing", tag: "plataforma" },
    { id: "p2", title: "Integración SCADA planta",   status: "review", prio: "med",  assignees: ["LP"],      due: "2026-05-28", dept: "ing", tag: "infraestructura" },
    { id: "p3", title: "Design system tokens v3",    status: "doing",  prio: "low",  assignees: ["MD","SC"], due: "2026-06-30", dept: "ing", tag: "diseño" },
    { id: "p4", title: "App móvil de inventario",    status: "todo",   prio: "high", assignees: ["JR","DV"], due: "2026-07-22", dept: "ing", tag: "móvil" },
    { id: "p5", title: "Dashboard de calidad",       status: "done",   prio: "med",  assignees: ["AM"],      due: "2026-05-04", dept: "ing", tag: "analytics" },
    { id: "p6", title: "Endurecimiento API gateway", status: "backlog",prio: "low",  assignees: ["LP","DV"], due: "2026-08-10", dept: "ing", tag: "infraestructura" },
  ],
  mkt: [
    { id: "m1", title: "Campaña Q3 de marca",        status: "doing",  prio: "high", assignees: ["RC","NV"], due: "2026-06-30", dept: "mkt", tag: "campaña" },
    { id: "m2", title: "Rediseño del sitio web",     status: "review", prio: "med",  assignees: ["NV"],      due: "2026-05-30", dept: "mkt", tag: "web" },
    { id: "m3", title: "Expo LATAM 2026",            status: "todo",   prio: "high", assignees: ["RC"],      due: "2026-07-12", dept: "mkt", tag: "evento" },
    { id: "m4", title: "Sprint de contenido SEO",    status: "done",   prio: "low",  assignees: ["AB"],      due: "2026-04-30", dept: "mkt", tag: "contenido" },
    { id: "m5", title: "Modelo lead scoring v2",     status: "doing",  prio: "med",  assignees: ["AB","NV"], due: "2026-06-08", dept: "mkt", tag: "ops" },
  ],
  ope: [
    { id: "o1", title: "Mejora OEE Línea 3",         status: "doing",  prio: "high", assignees: ["FG","HM"], due: "2026-06-30", dept: "ope", tag: "lean" },
    { id: "o2", title: "Cierre de auditoría EHS",    status: "review", prio: "high", assignees: ["HM"],      due: "2026-05-22", dept: "ope", tag: "seguridad" },
    { id: "o3", title: "Calendario de turnos v2",    status: "todo",   prio: "med",  assignees: ["FG"],      due: "2026-06-12", dept: "ope", tag: "personal" },
    { id: "o4", title: "Auditoría ISO 9001",         status: "doing",  prio: "med",  assignees: ["HM","PR"], due: "2026-07-04", dept: "ope", tag: "calidad" },
  ],
  ven: [
    { id: "v1", title: "Rollout tier enterprise",    status: "doing",  prio: "high", assignees: ["CB","RG"], due: "2026-06-20", dept: "ven", tag: "go-to-market" },
    { id: "v2", title: "Programa de canales",        status: "todo",   prio: "med",  assignees: ["CB"],      due: "2026-07-30", dept: "ven", tag: "partners" },
    { id: "v3", title: "Limpieza de CRM",            status: "done",   prio: "low",  assignees: ["RG"],      due: "2026-04-22", dept: "ven", tag: "ops" },
  ],
  rh:  [
    { id: "r1", title: "Renovación de onboarding",   status: "doing",  prio: "med",  assignees: ["SA"],      due: "2026-06-30", dept: "rh", tag: "personas" },
    { id: "r2", title: "Ciclo de desempeño Q2",      status: "review", prio: "high", assignees: ["SA","DK"], due: "2026-06-15", dept: "rh", tag: "proceso" },
    { id: "r3", title: "Programa de bienestar",      status: "todo",   prio: "low",  assignees: ["DK"],      due: "2026-08-01", dept: "rh", tag: "cultura" },
  ],
  con: [
    { id: "c1", title: "Preparación auditoría FY26", status: "doing",  prio: "high", assignees: ["EF"],      due: "2026-07-31", dept: "con", tag: "auditoría" },
    { id: "c2", title: "Migración ERP a v2",         status: "review", prio: "med",  assignees: ["EF","TB"], due: "2026-06-10", dept: "con", tag: "plataforma" },
    { id: "c3", title: "Declaración fiscal Q2",      status: "todo",   prio: "med",  assignees: ["TB"],      due: "2026-07-15", dept: "con", tag: "impuestos" },
  ],
  it:  [
    { id: "i1", title: "Implementación Zero Trust",  status: "doing",  prio: "high", assignees: ["BN","KP"], due: "2026-07-20", dept: "it", tag: "seguridad" },
    { id: "i2", title: "MFA obligatorio",            status: "review", prio: "high", assignees: ["KP"],      due: "2026-05-30", dept: "it", tag: "seguridad" },
    { id: "i3", title: "Renovación de endpoints",    status: "todo",   prio: "med",  assignees: ["BN"],      due: "2026-08-15", dept: "it", tag: "hardware" },
  ],
  mnt: [
    { id: "n1", title: "Mantenimiento de compresor", status: "doing",  prio: "med",  assignees: ["WL"],      due: "2026-06-04", dept: "mnt", tag: "preventivo" },
    { id: "n2", title: "Revisión torre de enfriam.", status: "review", prio: "high", assignees: ["WL","JK"], due: "2026-06-22", dept: "mnt", tag: "capex" },
    { id: "n3", title: "Inspección de calderas",     status: "todo",   prio: "high", assignees: ["JK"],      due: "2026-07-08", dept: "mnt", tag: "seguridad" },
  ],
  com: [
    { id: "co1", title: "RFQ proveedor de acero",    status: "doing",  prio: "high", assignees: ["GV"],      due: "2026-06-12", dept: "com", tag: "abastecimiento" },
    { id: "co2", title: "Consolidación de provee.",  status: "review", prio: "med",  assignees: ["GV","PL"], due: "2026-06-30", dept: "com", tag: "estrategia" },
    { id: "co3", title: "Renovación de contratos",   status: "todo",   prio: "low",  assignees: ["PL"],      due: "2026-08-01", dept: "com", tag: "legal" },
  ],
  log: [
    { id: "l1", title: "Optimización de rutas",      status: "doing",  prio: "high", assignees: ["MN","OZ"], due: "2026-06-20", dept: "log", tag: "ops" },
    { id: "l2", title: "Layout de almacén v2",       status: "review", prio: "med",  assignees: ["OZ"],      due: "2026-06-04", dept: "log", tag: "infraestructura" },
    { id: "l3", title: "RFP transportistas",         status: "todo",   prio: "high", assignees: ["MN"],      due: "2026-07-15", dept: "log", tag: "abastecimiento" },
  ],
  ac:  [
    { id: "a1", title: "Actualización base de cono.",status: "doing",  prio: "med",  assignees: ["IT","UA"], due: "2026-06-30", dept: "ac", tag: "contenido" },
    { id: "a2", title: "Playbook recuperación CSAT", status: "review", prio: "high", assignees: ["UA"],      due: "2026-06-12", dept: "ac", tag: "proceso" },
    { id: "a3", title: "Flujo escalación Nivel 2",   status: "todo",   prio: "med",  assignees: ["IT"],      due: "2026-07-04", dept: "ac", tag: "proceso" },
  ],
  gg:  [
    { id: "g1", title: "Cascada estratégica OKR",    status: "doing",  prio: "high", assignees: ["GM"],      due: "2026-06-30", dept: "gg", tag: "estrategia" },
    { id: "g2", title: "Reporte Q2 al Directorio",   status: "review", prio: "high", assignees: ["GM"],      due: "2026-06-04", dept: "gg", tag: "directorio" },
    { id: "g3", title: "Kick-off plan anual 2027",   status: "todo",   prio: "med",  assignees: ["GM"],      due: "2026-09-01", dept: "gg", tag: "POA" },
  ],
};

const INITIAL_POA = {
  gg:  [
    { id: "g1", type: "bhag", title: "Alcanzar $24M de ingresos anuales", owner: "Gerencia General", progress: 62, q: [4.1, 5.6, 0, 0], objectives: [
      { id: "o1", text: "Cerrar 3 cuentas enterprise", done: true },
      { id: "o2", text: "Expandir a 2 mercados nuevos", done: false },
      { id: "o3", text: "Lanzar programa de socios", done: false },
    ]},
    { id: "g2", type: "annual", title: "Margen EBITDA ≥ 20%", owner: "Gerencia General", progress: 78, q: [18.1, 18.6, 0, 0], objectives: [
      { id: "o1", text: "Reducir COGS en 3%", done: true },
      { id: "o2", text: "Renegociar 5 proveedores top", done: true },
      { id: "o3", text: "Automatizar finanzas", done: false },
    ]},
  ],
  ing: [
    { id: "g1", type: "rock", title: "Lanzar plataforma ERP v2", owner: "Líder de Ingeniería", progress: 70, q: [6, 12, 0, 0], objectives: [
      { id: "o1", text: "Módulo 1 — Inventario", done: true },
      { id: "o2", text: "Módulo 2 — Ventas", done: true },
      { id: "o3", text: "Módulo 3 — Finanzas", done: false },
      { id: "o4", text: "Módulo 4 — Reportes", done: false },
    ]},
    { id: "g2", type: "quarterly", title: "Reducir lead time a 3.5 días", owner: "Líder de Ingeniería", progress: 55, q: [5.6, 4.2, 0, 0], objectives: [
      { id: "o1", text: "Upgrade del pipeline CI/CD", done: true },
      { id: "o2", text: "Cobertura de tests 85%", done: false },
    ]},
  ],
  mkt: [
    { id: "g1", type: "annual", title: "Generar 5,000 leads calificados", owner: "Líder de Marketing", progress: 48, q: [1100, 1245, 0, 0], objectives: [
      { id: "o1", text: "Lanzar campaña Q3", done: false },
      { id: "o2", text: "Presencia en LATAM Expo", done: false },
      { id: "o3", text: "Sprint de contenido", done: true },
    ]},
    { id: "g2", type: "quarterly", title: "Conversión web ≥ 4%", owner: "Líder de Marketing", progress: 65, q: [2.8, 3.4, 0, 0], objectives: [
      { id: "o1", text: "Rediseñar landings", done: true },
      { id: "o2", text: "Implementar lead scoring", done: false },
    ]},
  ],
  ope: [
    { id: "g1", type: "rock", title: "OEE ≥ 85% en todas las líneas", owner: "Líder de Operaciones", progress: 38, q: [72, 65, 0, 0], objectives: [
      { id: "o1", text: "Reparaciones Línea 3", done: true },
      { id: "o2", text: "Capacitación de operadores", done: false },
      { id: "o3", text: "Cadencia de mantenimiento", done: false },
    ]},
  ],
  rh: [
    { id: "g1", type: "annual", title: "Rotación ≤ 7%", owner: "Líder de RH", progress: 60, q: [9.0, 8.4, 0, 0], objectives: [
      { id: "o1", text: "Programa de bienestar", done: false },
      { id: "o2", text: "Framework de carrera", done: true },
    ]},
  ],
  ven: [
    { id: "g1", type: "quarterly", title: "Tasa de cierre ≥ 32%", owner: "Líder de Ventas", progress: 70, q: [24, 28, 0, 0], objectives: [
      { id: "o1", text: "Programa de enablement", done: true },
      { id: "o2", text: "Refresh de battlecards", done: true },
      { id: "o3", text: "Revisión de pricing", done: false },
    ]},
  ],
};

// POA goal types (Scaling Up methodology)
const POA_TYPES = {
  bhag:      { label: "BHAG",      sub: "Meta audaz a 10 años",  color: "#8b5cf6", cls: "chip--accent" },
  annual:    { label: "Anual",     sub: "Meta del año",          color: "#2563eb", cls: "chip--info" },
  quarterly: { label: "Trimestral",sub: "Meta del trimestre",    color: "#0ea5e9", cls: "chip" },
  rock:      { label: "Rock",      sub: "Prioridad trimestral",  color: "#f97316", cls: "chip--warn" },
};

// ===== Tasks (independent module, with checklists) =====
function mkTasks(deptId, baseId, items) {
  return items.map((it, i) => ({
    id: `${baseId}-${i+1}`,
    title: it[0],
    description: it[1] || "",
    project_id: it[2] || null,
    department: deptId,
    assigned_to: it[3] || "AM",
    priority: it[4] || "medium",
    status: it[5] || "pending",
    due_date: it[6] || "2026-06-30",
    tags: it[7] || [],
    checklist: (it[8] || []).map((t, j) => ({ id: `c${j}`, text: t[0], done: t[1] })),
  }));
}

const INITIAL_TASKS = [
  ...mkTasks("ing", "ti", [
    ["Definir contrato API v2", "Especificación OpenAPI para clientes externos", "p1", "AM", "high", "in_progress", "2026-05-22", ["api","docs"], [["Borrador inicial", true], ["Revisión arquitectura", true], ["Aprobación PM", false]]],
    ["Migrar tests a Vitest", "Reemplazo de Jest por Vitest", "p1", "JR", "medium", "pending", "2026-06-10", ["testing"], [["Setup config", false], ["Migrar suite 1", false]]],
    ["Refactor módulo de auth", "", "p2", "LP", "high", "in_progress", "2026-05-30", ["auth","seguridad"], [["Análisis", true], ["Implementación", false]]],
    ["Documentar API gateway", "Wiki interna + onboarding", "p6", "DV", "low", "blocked", "2026-07-05", ["docs"], [["Esquema general", true]]],
    ["Setup CI/CD para mobile", "", "p4", "JR", "high", "completed", "2026-04-20", ["devops","móvil"], [["Pipeline", true], ["Smoke tests", true]]],
  ]),
  ...mkTasks("mkt", "tm", [
    ["Brief creativo Q3", "Para la campaña de marca", "m1", "RC", "high", "in_progress", "2026-05-18", ["creativo"], [["Reunión kickoff", true], ["Brief escrito", false]]],
    ["Wireframes home v2", "", "m2", "NV", "medium", "in_progress", "2026-05-25", ["diseño","web"], [["Sketch", true], ["Lo-fi", true], ["Hi-fi", false]]],
    ["Logística stand Expo", "", "m3", "RC", "high", "pending", "2026-06-20", ["evento"], [["Cotizar montaje", false]]],
    ["Analizar campañas Q2", "", "m4", "AB", "low", "completed", "2026-04-28", ["analytics"], [["Reporte", true]]],
  ]),
  ...mkTasks("ope", "to", [
    ["Auditoría 5S Línea 3", "", "o1", "FG", "high", "in_progress", "2026-05-20", ["lean","calidad"], [["Checklist", true], ["Recorrido", false]]],
    ["Capacitación operadores", "Programa de 8 horas", "o1", "HM", "medium", "pending", "2026-06-15", ["personas"], [["Material", false]]],
    ["Cierre hallazgos EHS", "12 hallazgos abiertos", "o2", "HM", "critical", "in_progress", "2026-05-22", ["seguridad"], [["3 críticos", true], ["6 medios", false]]],
  ]),
  ...mkTasks("ven", "tv", [
    ["Onboarding 3 SDRs", "", "v1", "CB", "high", "in_progress", "2026-05-28", ["personas"], [["Material", true], ["Sesión 1", true]]],
    ["Pricing tier enterprise", "Análisis competencia", "v1", "RG", "medium", "pending", "2026-06-08", ["estrategia"], []],
  ]),
  ...mkTasks("rh", "tr", [
    ["Encuesta de clima Q2", "", "r1", "SA", "medium", "in_progress", "2026-06-05", ["personas"], [["Diseñar preguntas", true], ["Enviar", false]]],
    ["Revisión salarial Q2", "", "r2", "DK", "high", "pending", "2026-06-15", ["compensación"], []],
  ]),
  ...mkTasks("con", "tc", [
    ["Conciliación bancaria abr", "", "c1", "EF", "high", "completed", "2026-05-05", ["finanzas"], [["Banco 1", true], ["Banco 2", true]]],
    ["Provisiones mensuales", "", "c2", "TB", "medium", "in_progress", "2026-05-18", ["finanzas"], [["Salarios", true], ["Servicios", false]]],
  ]),
  ...mkTasks("it", "tit", [
    ["Rotar credenciales prod", "", "i1", "BN", "critical", "pending", "2026-05-20", ["seguridad"], [["Base de datos", false], ["APIs", false]]],
    ["Configurar SSO Workday", "", "i2", "KP", "high", "in_progress", "2026-05-30", ["sso","seguridad"], [["IdP", true], ["SP", false]]],
  ]),
  ...mkTasks("mnt", "tn", [
    ["Cambio aceite compresor 2", "", "n1", "WL", "medium", "completed", "2026-05-08", ["preventivo"], [["Drenar", true], ["Reemplazar", true]]],
    ["Inspección visual torres", "", "n2", "JK", "high", "in_progress", "2026-05-25", ["preventivo"], [["Torre A", true], ["Torre B", false]]],
  ]),
  ...mkTasks("com", "tco", [
    ["RFQ 3 proveedores acero", "", "co1", "GV", "high", "in_progress", "2026-05-30", ["abastecimiento"], [["Proveedor A", true], ["Proveedor B", true], ["Proveedor C", false]]],
  ]),
  ...mkTasks("log", "tl", [
    ["Análisis costos ruta sur", "", "l1", "MN", "medium", "in_progress", "2026-06-01", ["ops"], [["Recolectar datos", true]]],
    ["Rediseñar racks A1-A4", "", "l2", "OZ", "low", "pending", "2026-06-15", ["infra"], []],
  ]),
  ...mkTasks("ac", "ta", [
    ["Actualizar 12 artículos", "", "a1", "IT", "medium", "in_progress", "2026-06-10", ["contenido"], [["Artículo 1-4", true], ["Artículo 5-8", false]]],
    ["Triage tickets P1", "", "a2", "UA", "high", "in_progress", "2026-05-18", ["soporte"], []],
  ]),
  ...mkTasks("gg", "tg", [
    ["Borrador Q2 Directorio", "", "g2", "GM", "critical", "in_progress", "2026-05-30", ["directorio","reporte"], [["Resumen ejecutivo", true], ["Anexos financieros", false]]],
  ]),
];

// Default budgets for projects (rolled in dynamically by Projects module)
const PROJECT_BUDGETS = {
  p1: { budget: 120000, spent: 86000 }, p2: { budget: 64000,  spent: 41000 },
  p3: { budget: 28000,  spent: 14000 }, p4: { budget: 95000,  spent: 21000 },
  p5: { budget: 32000,  spent: 32000 }, p6: { budget: 48000,  spent: 6000  },
  m1: { budget: 180000, spent: 92000 }, m2: { budget: 56000,  spent: 47000 },
  m3: { budget: 220000, spent: 30000 }, m4: { budget: 14000,  spent: 14000 }, m5: { budget: 22000, spent: 12000 },
  o1: { budget: 320000, spent: 180000 }, o2: { budget: 75000, spent: 60000 }, o3: { budget: 18000, spent: 4000 }, o4: { budget: 42000, spent: 22000 },
  v1: { budget: 90000, spent: 36000 },  v2: { budget: 22000, spent: 6000 }, v3: { budget: 8000, spent: 8000 },
  r1: { budget: 18000, spent: 9000 }, r2: { budget: 24000, spent: 14000 }, r3: { budget: 32000, spent: 4000 },
  c1: { budget: 14000, spent: 9000 }, c2: { budget: 65000, spent: 38000 }, c3: { budget: 6000, spent: 2000 },
  i1: { budget: 240000, spent: 92000 }, i2: { budget: 40000, spent: 26000 }, i3: { budget: 180000, spent: 18000 },
  n1: { budget: 12000, spent: 7000 }, n2: { budget: 28000, spent: 16000 }, n3: { budget: 22000, spent: 3000 },
  co1: { budget: 95000, spent: 40000 }, co2: { budget: 30000, spent: 12000 }, co3: { budget: 5000, spent: 1000 },
  l1: { budget: 35000, spent: 22000 }, l2: { budget: 48000, spent: 16000 }, l3: { budget: 18000, spent: 0 },
  a1: { budget: 12000, spent: 7000 }, a2: { budget: 8000, spent: 5000 }, a3: { budget: 6000, spent: 1000 },
  g1: { budget: 14000, spent: 6000 }, g2: { budget: 8000, spent: 4500 }, g3: { budget: 6000, spent: 0 },
};

const ORG_TREE = {
  owner: { id: "owner", role: "owner", name: "Gerente General", dept: null, code: "OWN-01" },
  admins: DEPARTMENTS.map(d => ({
    id: `adm-${d.id}`, role: "admin", name: `Admin ${d.name}`, dept: d.id, code: `ADM-${d.short}`,
    viewers: [
      { id: `v-${d.id}-1`, role: "viewer", name: `Viewer ${d.short} 1`, dept: d.id, code: `VWR-${d.short}-01` },
      { id: `v-${d.id}-2`, role: "viewer", name: `Viewer ${d.short} 2`, dept: d.id, code: `VWR-${d.short}-02` },
    ]
  }))
};

const INITIAL_AUDIT = [
  { ts: "2026-05-14 09:18", action: "Inicio de sesión",                       user: "Gerente General", dept: "gg",  level: "info" },
  { ts: "2026-05-14 09:12", action: "KPI actualizado: Pipeline → $24.6M",     user: "Admin Ventas",    dept: "ven", level: "info" },
  { ts: "2026-05-14 09:04", action: "Código creado: VIEW-LOG-Q2",             user: "Admin Logística", dept: "log", level: "success" },
  { ts: "2026-05-14 08:58", action: "Proyecto movido: SCADA → Revisión",      user: "Admin Ingeniería",dept: "ing", level: "info" },
  { ts: "2026-05-14 08:41", action: "Intento fallido de código (3er intento)",user: "desconocido",     dept: null,  level: "warn" },
  { ts: "2026-05-13 17:22", action: "Código revocado: DEMO-REVOK",            user: "Gerente General", dept: "gg",  level: "warn" },
  { ts: "2026-05-13 16:08", action: "Objetivo POA cerrado: Migración ERP",    user: "Admin Contab.",   dept: "con", level: "success" },
  { ts: "2026-05-13 14:50", action: "Inicio de sesión",                       user: "Admin Marketing", dept: "mkt", level: "info" },
];

// ===== Files / Documents =====
// kind: doc | sheet | slide | pdf | image | other
const INITIAL_FILES = [
  { id: "f1",  name: "Plan Estratégico 2026.docx",     kind: "doc",   size: 184_320, dept: "gg",  sharedWith: ["ing","mkt","ven","ope","rh"], uploadedBy: "Carlos Mendoza",   uploadedAt: "2026-01-12", confidential: true  },
  { id: "f2",  name: "Reporte Q1 al Directorio.pdf",   kind: "pdf",   size: 1_240_000, dept: "gg", sharedWith: [],                              uploadedBy: "Carlos Mendoza",   uploadedAt: "2026-04-08", confidential: true  },
  { id: "f3",  name: "Modelo Financiero v3.xlsx",      kind: "sheet", size: 540_000, dept: "con", sharedWith: ["gg"],                           uploadedBy: "Admin Contabilidad", uploadedAt: "2026-03-22" },
  { id: "f4",  name: "Brief campaña Q3.docx",          kind: "doc",   size: 78_000,  dept: "mkt", sharedWith: ["gg","ven"],                     uploadedBy: "Admin Marketing",  uploadedAt: "2026-05-02" },
  { id: "f5",  name: "Especificación ERP v2.pdf",      kind: "pdf",   size: 3_200_000, dept: "ing", sharedWith: ["gg","con","ven","ope","log"],  uploadedBy: "Admin Ingeniería", uploadedAt: "2026-02-18" },
  { id: "f6",  name: "Mockups Home v2.png",            kind: "image", size: 2_100_000, dept: "mkt", sharedWith: ["ing"],                         uploadedBy: "Viewer MKT 1",     uploadedAt: "2026-04-29" },
  { id: "f7",  name: "Procedimiento EHS.pdf",          kind: "pdf",   size: 412_000, dept: "ope", sharedWith: ["mnt","rh","gg"],                uploadedBy: "Admin Producción", uploadedAt: "2026-03-10" },
  { id: "f8",  name: "Catálogo Productos 2026.pdf",    kind: "pdf",   size: 4_800_000, dept: "ven", sharedWith: ["mkt","gg","ac"],               uploadedBy: "Admin Ventas",     uploadedAt: "2026-01-30" },
  { id: "f9",  name: "Política de Vacaciones.docx",    kind: "doc",   size: 56_000,  dept: "rh",  sharedWith: ["gg","ing","mkt","con","it","mnt","ven","ope","com","log","ac"], uploadedBy: "Admin RH", uploadedAt: "2026-02-01" },
  { id: "f10", name: "Inventario de servidores.xlsx",  kind: "sheet", size: 96_000,  dept: "it",  sharedWith: ["gg"],                            uploadedBy: "Admin IT",         uploadedAt: "2026-05-05" },
  { id: "f11", name: "Bitácora mantenimientos.xlsx",   kind: "sheet", size: 78_000,  dept: "mnt", sharedWith: ["ope","gg"],                      uploadedBy: "Admin Mant.",      uploadedAt: "2026-05-10" },
  { id: "f12", name: "Tarifario Proveedores.xlsx",     kind: "sheet", size: 220_000, dept: "com", sharedWith: ["con","gg"],                      uploadedBy: "Admin Compras",    uploadedAt: "2026-04-15" },
  { id: "f13", name: "Manual de Marca.pdf",            kind: "pdf",   size: 6_400_000, dept: "mkt", sharedWith: ["gg","ven","ac","ing"],          uploadedBy: "Admin Marketing",  uploadedAt: "2026-01-05" },
  { id: "f14", name: "Playbook Recuperación CSAT.docx",kind: "doc",   size: 32_000,  dept: "ac",  sharedWith: ["ven","mkt"],                     uploadedBy: "Admin AC",         uploadedAt: "2026-04-22" },
  { id: "f15", name: "Layout Almacén v2.png",          kind: "image", size: 1_550_000, dept: "log", sharedWith: ["ope","gg"],                     uploadedBy: "Admin Logística",  uploadedAt: "2026-05-04" },
];

// ===== Calendar custom events =====
const INITIAL_EVENTS = [
  { id: "e1", title: "Reunión Directorio Q2",        date: "2026-06-04", time: "09:00", dept: "gg",  type: "meeting" },
  { id: "e2", title: "Cierre mensual mayo",          date: "2026-05-31", time: "17:00", dept: "con", type: "milestone" },
  { id: "e3", title: "Town hall mensual",            date: "2026-05-22", time: "11:00", dept: "rh",  type: "meeting" },
  { id: "e4", title: "Auditoría ISO 9001",           date: "2026-07-04", time: "08:00", dept: "ope", type: "audit" },
  { id: "e5", title: "Demo ERP módulo Finanzas",     date: "2026-06-18", time: "15:00", dept: "ing", type: "demo" },
  { id: "e6", title: "Kickoff campaña Q3",           date: "2026-06-02", time: "10:00", dept: "mkt", type: "kickoff" },
  { id: "e7", title: "Capacitación seguridad",       date: "2026-05-28", time: "14:00", dept: "mnt", type: "training" },
  { id: "e8", title: "Revisión pricing enterprise",  date: "2026-06-10", time: "16:00", dept: "ven", type: "meeting" },
];

// Sidebar nav (Spanish)
const NAV_SECTIONS = [
  { h: "Workspace", items: [
    { id: "dashboard", label: "Dashboard",          icon: "grid",     roles: ["owner","admin","viewer"] },
    { id: "kpis",      label: "KPIs & Analytics",   icon: "trending", roles: ["owner","admin","viewer"] },
    { id: "projects",  label: "Proyectos",          icon: "board",    roles: ["owner","admin","viewer"] },
    { id: "tasks",     label: "Tareas",             icon: "checkbox", roles: ["owner","admin","viewer"] },
    { id: "poa",       label: "POA · Plan Anual",   icon: "target",   roles: ["owner","admin","viewer"] },
    { id: "calendar",  label: "Calendario",         icon: "calendar", roles: ["owner","admin","viewer"] },
    { id: "files",     label: "Documentos",         icon: "folder",   roles: ["owner","admin","viewer"] },
    { id: "departments", label: "Departamentos",    icon: "stack",    roles: ["owner"] },
    { id: "org",         label: "Organigrama",      icon: "people",   roles: ["owner","admin","viewer"] },
  ]},
  { h: "Administración", items: [
    { id: "codes",       label: "Códigos de Acceso",icon: "key",      roles: ["owner","admin"] },
    { id: "audit",       label: "Registro de Audit.",icon: "shield",  roles: ["owner","admin"] },
  ]},
];

window.INDISA_DATA = {
  DEPARTMENTS, DEPT_BY_ID, INITIAL_CODES, INITIAL_KPIS, INITIAL_PROJECTS,
  INITIAL_POA, POA_TYPES, INITIAL_TASKS, PROJECT_BUDGETS,
  INITIAL_FILES, INITIAL_EVENTS,
  ORG_TREE, INITIAL_AUDIT, NAV_SECTIONS,
};

// ===== Icon set =====
function Icon({ name, size = 16, stroke = 1.7, className = "" }) {
  const s = size;
  const common = {
    width: s, height: s, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round",
    className,
  };
  switch (name) {
    case "grid":    return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
    case "trending":return <svg {...common}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>;
    case "board":   return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></svg>;
    case "target":  return <svg {...common}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>;
    case "stack":   return <svg {...common}><polygon points="12 3 22 8 12 13 2 8 12 3"/><polyline points="2 13 12 18 22 13"/></svg>;
    case "people":  return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M14 20c0-2.5 2-4.5 4.5-4.5S23 17.5 23 20"/></svg>;
    case "key":     return <svg {...common}><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9"/><path d="M17 6l3 3"/></svg>;
    case "shield":  return <svg {...common}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>;
    case "search":  return <svg {...common}><circle cx="11" cy="11" r="6"/><line x1="20" y1="20" x2="16.5" y2="16.5"/></svg>;
    case "bell":    return <svg {...common}><path d="M6 8a6 6 0 1112 0v4l2 3H4l2-3V8z"/><path d="M10 19a2 2 0 004 0"/></svg>;
    case "sun":     return <svg {...common}><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="3" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21" y2="12"/><line x1="5.6" y1="5.6" x2="7" y2="7"/><line x1="17" y1="17" x2="18.4" y2="18.4"/><line x1="5.6" y1="18.4" x2="7" y2="17"/><line x1="17" y1="7" x2="18.4" y2="5.6"/></svg>;
    case "moon":    return <svg {...common}><path d="M20 14A8 8 0 0110 4a8 8 0 1010 10z"/></svg>;
    case "logout":  return <svg {...common}><path d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
    case "plus":    return <svg {...common}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case "filter":  return <svg {...common}><polygon points="3 4 21 4 14 13 14 20 10 20 10 13 3 4"/></svg>;
    case "more":    return <svg {...common}><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>;
    case "chev":    return <svg {...common}><polyline points="6 9 12 15 18 9"/></svg>;
    case "arrow":   return <svg {...common}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>;
    case "up":      return <svg {...common}><polyline points="6 14 12 8 18 14"/></svg>;
    case "down":    return <svg {...common}><polyline points="6 10 12 16 18 10"/></svg>;
    case "lock":    return <svg {...common}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>;
    case "check":   return <svg {...common}><polyline points="5 12 10 17 19 7"/></svg>;
    case "x":       return <svg {...common}><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>;
    case "edit":    return <svg {...common}><path d="M4 20h4l11-11-4-4L4 16v4z"/></svg>;
    case "copy":    return <svg {...common}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>;
    case "refresh": return <svg {...common}><polyline points="21 4 21 10 15 10"/><polyline points="3 20 3 14 9 14"/><path d="M20 10a8 8 0 00-14-3l-3 3"/><path d="M4 14a8 8 0 0014 3l3-3"/></svg>;
    case "calendar":return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>;
    case "users":   return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M14 20c0-2.5 2-4.5 4.5-4.5S23 17.5 23 20"/></svg>;
    case "doc":     return <svg {...common}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><polyline points="14 3 14 8 19 8"/></svg>;
    case "flame":   return <svg {...common}><path d="M12 3s5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0-3 3-6 3-6z"/></svg>;
    case "folder":  return <svg {...common}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>;
    case "checkbox":return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="8 12 11 15 16 9"/></svg>;
    case "warn":    return <svg {...common}><path d="M12 4l10 17H2L12 4z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17.5" r=".7" fill="currentColor"/></svg>;
    case "activity":return <svg {...common}><polyline points="3 12 7 12 10 5 14 19 17 12 21 12"/></svg>;
    case "spark":   return <svg {...common}><polyline points="3 17 9 11 13 15 21 7"/></svg>;
    case "users2":  return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>;
    case "cog":     return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 010-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 014 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 010 4h-.1a1.6 1.6 0 00-1.5 1z"/></svg>;
    case "logo":    return <svg {...common} viewBox="0 0 24 24"><path d="M4 20V4M12 20V8M20 20V12" strokeWidth="2.4"/></svg>;
    default: return null;
  }
}
window.Icon = Icon;
