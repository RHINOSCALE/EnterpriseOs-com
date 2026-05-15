// Hand-built SVG chart components for INDISA
// All charts respect a single primary color with semantic accents.

const { useState, useEffect, useMemo, useRef } = React;

// ----- Helpers -----
function nice(n, dec = 1) {
  if (n == null || n === "") return "—";
  // Accept numeric strings; if not coercible, return original
  const num = typeof n === "number" ? n : Number(n);
  if (isNaN(num)) return String(n);
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(dec) + "M";
  if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(dec) + "k";
  return num.toFixed(dec).replace(/\.0$/, "");
}
window.nice = nice;

// ===== Sparkline =====
function Sparkline({ data, width = 80, height = 28, color = "var(--accent)", fill = true }) {
  const path = useMemo(() => {
    if (!data || data.length === 0) return { line: "", area: "" };
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const pts = data.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 4) - 2]);
    const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const area = line + ` L ${width},${height} L 0,${height} Z`;
    return { line, area };
  }, [data, width, height]);
  return (
    <svg width={width} height={height} className="kpi__spark">
      <defs>
        <linearGradient id={"sg" + width + height + color.charCodeAt(0)} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {fill && <path d={path.area} fill={`url(#sg${width}${height}${color.charCodeAt(0)})`} className="chart-area"/>}
      <path d={path.line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" className="chart-line"/>
    </svg>
  );
}

// ===== Line / Area chart =====
function LineChart({ series, height = 220, labels = [], colors = ["var(--accent)", "var(--info)", "var(--warning)"], showAxis = true, area = true }) {
  const ref = useRef(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => setW(entries[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const pad = { t: 14, r: 14, b: 22, l: 36 };
  const inW = w - pad.l - pad.r;
  const inH = height - pad.t - pad.b;

  const all = series.flatMap(s => s.data);
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const range = max - min || 1;

  const xs = labels.length ? labels : Array.from({length: series[0].data.length}, (_, i) => i + 1);
  const stepX = inW / Math.max(1, xs.length - 1);

  // Y grid
  const ticks = 4;
  const tickVals = Array.from({length: ticks + 1}, (_, i) => min + (range * i) / ticks);

  return (
    <div ref={ref} style={{position:"relative", width: "100%"}}>
      <svg width={w} height={height} style={{display:"block"}}>
        <g>
          {tickVals.map((tv, i) => {
            const y = pad.t + inH - ((tv - min)/range) * inH;
            return (
              <g key={i}>
                <line x1={pad.l} y1={y} x2={w-pad.r} y2={y} stroke="var(--line)" strokeDasharray="2,3"/>
                {showAxis && <text x={pad.l - 8} y={y + 4} fill="var(--text-3)" fontSize="10" textAnchor="end" fontFamily="var(--ff-mono)">{nice(tv,1)}</text>}
              </g>
            );
          })}
        </g>
        <g>
          {xs.map((lab, i) => {
            const x = pad.l + i * stepX;
            return showAxis && (i % Math.ceil(xs.length/8) === 0 || i === xs.length - 1) ? (
              <text key={i} x={x} y={height - 4} fill="var(--text-3)" fontSize="10" textAnchor="middle" fontFamily="var(--ff-mono)">{lab}</text>
            ) : null;
          })}
        </g>
        {series.map((s, si) => {
          const color = s.color || colors[si % colors.length];
          const pts = s.data.map((v, i) => [pad.l + i * stepX, pad.t + inH - ((v - min)/range) * inH]);
          const line = pts.map((p,i)=>(i===0?"M":"L")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
          const areaP = line + ` L ${pts[pts.length-1][0]},${pad.t+inH} L ${pts[0][0]},${pad.t+inH} Z`;
          const gid = `lg${si}-${color.charCodeAt(0)}-${w}`;
          return (
            <g key={si}>
              {area && (
                <>
                  <defs>
                    <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={si === 0 ? 0.25 : 0.12}/>
                      <stop offset="100%" stopColor={color} stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d={areaP} fill={`url(#${gid})`} className="chart-area" style={{animationDelay: (si*0.15) + "s"}}/>
                </>
              )}
              <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" className="chart-line" style={{animationDelay: (si*0.15) + "s"}}/>
              {pts.map((p,i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={hover?.i === i && hover?.s === si ? 3.5 : 0} fill={color}/>
              ))}
            </g>
          );
        })}
        {/* Hover overlay */}
        <rect x={pad.l} y={pad.t} width={inW} height={inH} fill="transparent"
          onMouseMove={e => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - r.left;
            const i = Math.min(xs.length - 1, Math.max(0, Math.round(x / stepX)));
            setHover({ i, s: 0, x: pad.l + i * stepX });
          }}
          onMouseLeave={() => setHover(null)}
        />
        {hover && <line x1={hover.x} y1={pad.t} x2={hover.x} y2={pad.t+inH} stroke="var(--line-strong)" strokeDasharray="2,3"/>}
      </svg>
      {hover && (
        <div className="chart-tt" style={{left: hover.x, top: pad.t}}>
          <div className="dim" style={{fontSize:10, marginBottom:2}}>{xs[hover.i]}</div>
          {series.map((s, si) => (
            <div key={si} style={{display:"flex", alignItems:"center", gap:6}}>
              <span className="sw" style={{width:8, height:8, borderRadius:2, background: s.color || colors[si % colors.length]}}/>
              <span style={{color: "var(--text)"}}>{nice(s.data[hover.i], 1)}</span>
              <span className="dim">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Stacked Bar Chart =====
function StackedBarChart({ data, keys, colors, height = 200, labels }) {
  const ref = useRef(null);
  const [w, setW] = useState(400);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(e => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const pad = { t: 10, r: 10, b: 22, l: 30 };
  const inW = w - pad.l - pad.r;
  const inH = height - pad.t - pad.b;
  const totals = data.map(d => keys.reduce((s, k) => s + (d[k] || 0), 0));
  const max = Math.max(...totals, 1);
  const barW = inW / data.length * 0.62;
  const gap = inW / data.length;

  return (
    <div ref={ref} style={{position:"relative", width:"100%"}}>
      <svg width={w} height={height} style={{display:"block"}}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = pad.t + (1 - p) * inH;
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="var(--line)" strokeDasharray="2,3"/>
              <text x={pad.l - 6} y={y + 3} fontSize="10" fill="var(--text-3)" textAnchor="end" fontFamily="var(--ff-mono)">{nice(max * p, 0)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = pad.l + i * gap + (gap - barW)/2;
          let y = pad.t + inH;
          return (
            <g key={i}>
              {keys.map((k, ki) => {
                const h = (d[k] / max) * inH;
                y -= h;
                return <rect key={k} x={x} y={y} width={barW} height={Math.max(0,h-1)} fill={colors[ki]} rx="2" className="chart-bar" style={{animationDelay: (i*0.06 + ki*0.04) + "s", transformOrigin: `${x + barW/2}px ${pad.t + inH}px`}}/>;
              })}
              <text x={pad.l + i * gap + gap/2} y={height - 6} fontSize="10" fill="var(--text-3)" textAnchor="middle" fontFamily="var(--ff-mono)">{labels ? labels[i] : d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ===== Donut chart =====
function DonutChart({ data, size = 180, thickness = 22, center }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size/2 - thickness/2 - 4;
  const cx = size/2, cy = size/2;
  let acc = 0;
  return (
    <div style={{position:"relative", width: size, height: size}}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} stroke="var(--bg-3)" strokeWidth={thickness} fill="none"/>
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * 2 * Math.PI * r;
          const offset = -acc;
          acc += dash;
          return (
            <circle key={i} cx={cx} cy={cy} r={r}
              stroke={d.color} strokeWidth={thickness} fill="none"
              strokeDasharray={`${dash} ${2 * Math.PI * r}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
              className="chart-arc"
              style={{ "--arc-len": dash, "--arc-offset": offset, animationDelay: (i*0.15) + "s" }}
            />
          );
        })}
      </svg>
      <div style={{position:"absolute", inset:0, display:"grid", placeItems:"center", textAlign:"center"}}>
        {center || (
          <div>
            <div className="mono" style={{fontSize: 22, letterSpacing: "-0.02em"}}>{nice(total, 0)}</div>
            <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em"}}>total</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Gauge =====
function GaugeChart({ value, target = 100, size = 180, label, unit = "%" }) {
  const pct = Math.min(1, Math.max(0, value / target));
  const r = size/2 - 14;
  const cx = size/2, cy = size/2 + 16;
  const start = Math.PI;     // left
  const end = 2 * Math.PI;   // right (top arc)
  const arc = (a) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  const bgPath = `M ${arc(start)} A ${r} ${r} 0 0 1 ${arc(end)}`;
  const fillAngle = start + (end - start) * pct;
  const fillPath = `M ${arc(start)} A ${r} ${r} 0 0 1 ${arc(fillAngle)}`;
  const color = pct >= 0.85 ? "var(--positive)" : pct >= 0.65 ? "var(--accent)" : pct >= 0.4 ? "var(--warning)" : "var(--danger)";
  return (
    <div style={{position:"relative", width: size, height: size*0.7}}>
      <svg width={size} height={size*0.85}>
        <path d={bgPath} stroke="var(--bg-3)" strokeWidth="12" fill="none" strokeLinecap="round"/>
        <path d={fillPath} stroke={color} strokeWidth="12" fill="none" strokeLinecap="round" className="chart-gauge"/>
        {/* needle */}
        <line x1={cx} y1={cy} x2={cx + (r - 6) * Math.cos(fillAngle)} y2={cy + (r - 6) * Math.sin(fillAngle)} stroke="var(--text)" strokeWidth="1.5"/>
        <circle cx={cx} cy={cy} r="3" fill="var(--text)"/>
      </svg>
      <div style={{position:"absolute", left:0, right:0, top:size*0.45, textAlign:"center"}}>
        <div className="mono" style={{fontSize: 24, letterSpacing:"-0.02em"}}>{nice(value, 1)}<span className="dim" style={{fontSize: 12, marginLeft: 2}}>{unit}</span></div>
        <div className="dim" style={{fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em"}}>{label} · target {nice(target,0)}{unit}</div>
      </div>
    </div>
  );
}

// ===== Radar chart =====
function RadarChart({ axes, series, size = 260 }) {
  const cx = size/2, cy = size/2;
  const r = size/2 - 28;
  const n = axes.length;
  const angle = (i) => -Math.PI/2 + (i * 2 * Math.PI) / n;
  const point = (i, v) => [cx + Math.cos(angle(i)) * r * v, cy + Math.sin(angle(i)) * r * v];

  return (
    <svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1].map((p, i) => (
        <polygon key={i}
          points={axes.map((_, ax) => point(ax, p).join(",")).join(" ")}
          fill="none" stroke="var(--line)" strokeDasharray={p < 1 ? "2,3" : ""}
        />
      ))}
      {axes.map((ax, i) => {
        const [x, y] = point(i, 1);
        const [lx, ly] = point(i, 1.15);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)"/>
            <text x={lx} y={ly + 4} fontSize="10" fill="var(--text-2)" textAnchor="middle" fontFamily="var(--ff-mono)">{ax}</text>
          </g>
        );
      })}
      {series.map((s, si) => (
        <g key={si}>
          <polygon
            points={s.data.map((v, i) => point(i, v).join(",")).join(" ")}
            fill={s.color} fillOpacity="0.12"
            stroke={s.color} strokeWidth="1.5"
            className="chart-radar"
            style={{transformOrigin: `${cx}px ${cy}px`, animationDelay: (si*0.15) + "s"}}
          />
          {s.data.map((v, i) => {
            const [x, y] = point(i, v);
            return <circle key={i} cx={x} cy={y} r="2.5" fill={s.color} className="chart-dot" style={{transformOrigin: `${x}px ${y}px`, animationDelay: (0.6 + i*0.05) + "s"}}/>;
          })}
        </g>
      ))}
    </svg>
  );
}

// ===== Heatmap (12 months x N rows) =====
function Heatmap({ rows, months = ["J","F","M","A","M","J","J","A","S","O","N","D"], scale = "lime" }) {
  const max = Math.max(...rows.flatMap(r => r.values), 1);
  const min = Math.min(...rows.flatMap(r => r.values), 0);
  const range = max - min || 1;
  const color = (v) => {
    const t = (v - min)/range;
    if (scale === "lime") return `oklch(${0.18 + t * 0.55} ${0.10 + t * 0.18} 120 / ${0.25 + t * 0.75})`;
    return `oklch(${0.20 + t * 0.5} ${0.05 + t * 0.12} 200 / ${0.25 + t * 0.75})`;
  };
  return (
    <div className="heat">
      <div></div>
      {months.map((m, i) => <div key={i} className="h">{m}</div>)}
      {rows.map((r, ri) => (
        <React.Fragment key={ri}>
          <div className="lbl">{r.label}</div>
          {r.values.map((v, i) => (
            <div key={i} className="c chart-heat-cell" style={{background: color(v), animationDelay: ((ri*12 + i)*0.012) + "s"}} title={`${r.label} · ${months[i]}: ${nice(v,1)}`}/>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

// ===== Bullet KPI bar (target marker) =====
function BulletBar({ value, target, max, color = "var(--accent)" }) {
  const m = max || Math.max(value, target) * 1.2;
  return (
    <div style={{position:"relative", height: 8, background: "var(--bg-3)", borderRadius: 4, overflow:"hidden"}}>
      <div className="chart-bullet" style={{position:"absolute", left:0, top:0, bottom:0, width: `${Math.min(100, value/m * 100)}%`, background: color, borderRadius: 4, transition: "width .6s"}}/>
      <div style={{position:"absolute", left: `${target/m * 100}%`, top: -2, bottom: -2, width: 2, background: "var(--text)"}}/>
    </div>
  );
}

// Controlled number input that buffers typing locally but syncs to props.value when it changes externally
function NumCell({ value, onCommit, className = "cell-edit mono", style = {}, step = "0.1", min, readOnly, ...rest }) {
  const [local, setLocal] = useState(value == null ? "" : String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setLocal(value == null ? "" : String(value));
  }, [value]);
  if (readOnly) {
    return <span className={className + " mono"} style={{...style, display: "inline-block", padding: "4px 6px"}}>{value == null ? "—" : value}</span>;
  }
  return (
    <input
      type="number"
      step={step}
      min={min}
      className={className}
      style={style}
      value={local}
      onFocus={() => { focused.current = true; }}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        focused.current = false;
        const n = parseFloat(local);
        if (!isNaN(n)) onCommit(n);
        else setLocal(value == null ? "" : String(value));
      }}
      onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
      {...rest}
    />
  );
}

// Controlled text input with same buffering behavior
function TextCell({ value, onCommit, className = "cell-edit", style = {}, readOnly, ...rest }) {
  const [local, setLocal] = useState(value || "");
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setLocal(value || "");
  }, [value]);
  if (readOnly) {
    return <span className={className} style={{...style, display: "inline-block", padding: "4px 6px"}}>{value || "—"}</span>;
  }
  return (
    <input
      className={className}
      style={style}
      value={local}
      onFocus={() => { focused.current = true; }}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { focused.current = false; if (local !== value) onCommit(local); }}
      onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
      {...rest}
    />
  );
}

Object.assign(window, { Sparkline, LineChart, StackedBarChart, DonutChart, GaugeChart, RadarChart, Heatmap, BulletBar, NumCell, TextCell });
