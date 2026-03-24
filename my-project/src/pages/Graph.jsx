import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Chart,
  LineController,
  BarController,
  PieController,
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

Chart.register(
  LineController,
  BarController,
  PieController,
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

import { fetchAllGraphs, deleteGraph } from "../store/graphSlice.js";
import api from "../services/api.js";

const COLORS = [
  { bg: "rgba(99,210,255,0.72)",  border: "rgba(99,210,255,1)",  light: "rgba(99,210,255,0.10)",  hex: "#63d2ff"  },
  { bg: "rgba(255,167,92,0.72)",  border: "rgba(255,167,92,1)",  light: "rgba(255,167,92,0.10)",  hex: "#ffa75c"  },
  { bg: "rgba(167,255,150,0.72)", border: "rgba(167,255,150,1)", light: "rgba(167,255,150,0.10)", hex: "#a7ff96"  },
  { bg: "rgba(190,140,255,0.72)", border: "rgba(190,140,255,1)", light: "rgba(190,140,255,0.10)", hex: "#be8cff"  },
  { bg: "rgba(255,120,170,0.72)", border: "rgba(255,120,170,1)", light: "rgba(255,120,170,0.10)", hex: "#ff78aa"  },
];

const AGG_META = {
  sum:   { color: "#38bdf8", bg: "rgba(56,189,248,0.10)",   border: "rgba(56,189,248,0.22)",   label: "SUM"   },
  count: { color: "#34d399", bg: "rgba(52,211,153,0.10)",   border: "rgba(52,211,153,0.22)",   label: "COUNT" },
  avg:   { color: "#fbbf24", bg: "rgba(251,191,36,0.10)",   border: "rgba(251,191,36,0.22)",   label: "AVG"   },
  min:   { color: "#a78bfa", bg: "rgba(167,139,250,0.10)",  border: "rgba(167,139,250,0.22)",  label: "MIN"   },
  max:   { color: "#f472b6", bg: "rgba(244,114,182,0.10)",  border: "rgba(244,114,182,0.22)",  label: "MAX"   },
};

const TYPE_META = {
  Bar:  { color: "#38bdf8", bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.22)"  },
  Line: { color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.22)"  },
  Pie:  { color: "#34d399", bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.22)"  },
};



const I = {
  Bar: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[15px] h-[15px]">
      <rect x="2" y="9" width="3" height="9" rx="1"/><rect x="8" y="5" width="3" height="13" rx="1"/><rect x="14" y="7" width="3" height="11" rx="1"/>
    </svg>
  ),
  Line: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-[15px] h-[15px]">
      <polyline points="2,15 6,9 11,12 18,4"/>
    </svg>
  ),
  Pie: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[15px] h-[15px]">
      <path d="M10 2v8l5.9 5.9A8 8 0 1 1 10 2z"/>
    </svg>
  ),
  Grid: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[15px] h-[15px]">
      <rect x="2" y="2" width="6" height="6" rx="1"/><rect x="12" y="2" width="6" height="6" rx="1"/>
      <rect x="2" y="12" width="6" height="6" rx="1"/><rect x="12" y="12" width="6" height="6" rx="1"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]">
      <line x1="15" y1="5" x2="5" y2="15"/><line x1="5" y1="5" x2="15" y2="15"/>
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r=".5" fill="currentColor"/>
    </svg>
  ),
  Empty: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-12 h-12">
      <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 16l3-4 3 3 2-2 2 2"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-[13px] h-[13px]">
      <path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12"/>
    </svg>
  ),
};

function buildConfig(graph, chartData) {
  const type = (graph.chartType || "Bar").toLowerCase();
  const datasets = chartData.datasets.map((ds, i) => {
    const c = COLORS[i % COLORS.length];
    const isLine = type === "line";
    return {
      ...ds,
      backgroundColor: isLine ? c.light : c.bg,
      borderColor: c.border,
      borderWidth: isLine ? 2.5 : 1.5,
      pointBackgroundColor: c.border,
      pointRadius: isLine ? 4 : 0,
      pointHoverRadius: isLine ? 7 : 0,
      tension: isLine ? 0.4 : 0,
      fill: isLine && i === 0,
      borderRadius: type === "bar" ? 6 : 0,
      borderSkipped: false,
    };
  });

  return {
    type,
    data: { labels: chartData.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 750, easing: "easeInOutQuart" },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "#94a3b8",
            font: { family: "'DM Mono', monospace", size: 11 },
            padding: 18,
            usePointStyle: true,
            pointStyleWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: "rgba(2,8,23,0.96)",
          titleColor: "#e2e8f0",
          bodyColor: "#94a3b8",
          borderColor: "rgba(99,210,255,0.18)",
          borderWidth: 1,
          padding: 12,
          titleFont: { family: "'DM Mono', monospace", size: 12 },
          bodyFont: { family: "'DM Mono', monospace", size: 11 },
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y ?? ctx.parsed;
              return ` ${ctx.dataset.label}: ${typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v}`;
            },
          },
        },
      },
      scales: type !== "pie" ? {
        x: {
          grid:   { color: "rgba(255,255,255,0.04)" },
          ticks:  { color: "#475569", font: { family: "'DM Mono', monospace", size: 10 } },
          border: { color: "rgba(255,255,255,0.06)" },
          title:  { display: !!graph.xLabel, text: graph.xLabel, color: "#334155", font: { family: "'DM Mono', monospace", size: 10 } },
        },
        y: {
          grid:   { color: "rgba(255,255,255,0.04)" },
          border: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#475569",
            font: { family: "'DM Mono', monospace", size: 10 },
            callback: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v,
          },
          title: { display: !!graph.yLabel, text: graph.yLabel, color: "#334155", font: { family: "'DM Mono', monospace", size: 10 } },
        },
      } : {},
    },
  };
}

function ChartCanvas({ graph, chartData }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !chartData) return;
    const existing = Chart.getChart(ref.current);
    if (existing) existing.destroy();
    const chart = new Chart(ref.current, buildConfig(graph, chartData));
    return () => { chart.destroy(); };
  }, [chartData, graph]);

  return <canvas ref={ref} />;
}


function Tag({ children, style }) {
  return (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono border" style={style}>
      {children}
    </span>
  );
}


function GraphCard({ graph, isSelected, isLoading, isDeleting, onClick, onDelete }) {
  const tm  = TYPE_META[graph.chartType] || TYPE_META.Bar;
  const agg = AGG_META[(graph.aggregation || "sum").toLowerCase()] || AGG_META.sum;
  const ChartIcon = I[graph.chartType] || I.Bar;

  return (
    <button
      onClick={onClick}
      disabled={(isLoading && !isSelected) || isDeleting}
      className="group relative w-full text-left flex flex-col gap-3 p-4 rounded-xl border transition-all duration-200 overflow-hidden"
      style={{
        background: isSelected ? "rgba(15,23,42,0.9)" : "rgba(10,16,32,0.7)",
        borderColor: isSelected ? tm.color : "rgba(51,65,85,0.5)",
        boxShadow: isSelected ? `0 0 0 1px ${tm.border}, 0 8px 28px rgba(0,0,0,0.35)` : "none",
        opacity: isDeleting ? 0.45 : 1,
        transition: "opacity 0.2s, border-color 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "rgba(100,116,139,0.55)"; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "rgba(51,65,85,0.5)"; }}
    >
      {/* selected accent bar */}
      {isSelected && (
        <span
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
          style={{ background: `linear-gradient(to bottom, ${tm.color}, transparent)` }}
        />
      )}

      {/* ── DELETE BUTTON (top-right corner) ─────────────────────────────── */}
      <span
        role="button"
        aria-label="Delete graph"
        onClick={(e) => {
          e.stopPropagation(); // prevent card click / panel open
          onDelete();
        }}
        className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center w-6 h-6 rounded-md border
                   opacity-0 group-hover:opacity-100 transition-all duration-150
                   text-red-400 hover:text-red-200 hover:bg-red-500/20"
        style={{
          borderColor: "rgba(239,68,68,0.25)",
          background: "rgba(239,68,68,0.07)",
          cursor: isDeleting ? "not-allowed" : "pointer",
        }}
      >
        {isDeleting
          ? <span className="w-3 h-3 rounded-full border-2 border-red-700 border-t-red-400 animate-spin" />
          : <I.Trash />
        }
      </span>

      {/* row 1 — type badge + spinner/dot */}
      <div className="flex items-center justify-between pr-6">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border"
          style={{ color: tm.color, background: tm.bg, borderColor: tm.border }}
        >
          <ChartIcon />
          {graph.chartType}
        </span>
        {isLoading
          ? <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-700 border-t-sky-400 animate-spin" />
          : <span className="w-2 h-2 rounded-full transition-colors" style={{ background: isSelected ? tm.color : "#1e293b" }} />
        }
      </div>

      {/* row 2 — axes */}
      <div className="space-y-1.5">
        {[{ label: "X", fields: graph.xAxis || [], col: "#38bdf8" },
          { label: "Y", fields: graph.yAxis || [], col: "#fbbf24" }].map(({ label, fields, col }) => (
          <div key={label} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-[8px] font-bold uppercase tracking-widest text-slate-700 w-3">{label}</span>
            <div className="flex flex-wrap gap-1">
              {fields.map((f) => (
                <Tag key={f} style={{ color: `${col}99`, background: `${col}0d`, borderColor: `${col}22` }}>{f}</Tag>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* row 3 — footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
          style={{ color: agg.color, background: agg.bg, borderColor: agg.border }}
        >
          ƒ {agg.label}
        </span>
        <span className="text-[9px] text-slate-700 font-mono">
          {new Date(graph.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
        </span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING BARS
// ─────────────────────────────────────────────────────────────────────────────

function LoadingBars() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      <div className="flex items-end gap-1 h-10">
        {[0.55, 1, 0.72, 0.9, 0.6].map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-sm bg-sky-400/50"
            style={{
              height: `${h * 100}%`,
              animation: "barPulse 0.9s ease infinite alternate",
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>
      <p className="text-xs text-slate-600 font-mono">Fetching chart data…</p>
    </div>
  );
}
function DatasetSummary({ chartData }) {
  if (!chartData?.datasets?.length) return null;
  return (
    <div className="flex gap-2 px-6 pb-6 flex-wrap shrink-0">
      {chartData.datasets.map((ds, i) => {
        const c    = COLORS[i % COLORS.length];
        const vals = ds.data.map(Number);
        const sum  = vals.reduce((a, b) => a + b, 0);
        const max  = Math.max(...vals);
        return (
          <div
            key={ds.label}
            className="flex-1 min-w-[100px] rounded-lg px-3 py-2.5 border"
            style={{ borderColor: c.border.replace(",1)", ",0.2)"), background: c.light }}
          >
            <p className="text-[9px] uppercase tracking-widest mb-1 font-mono" style={{ color: c.hex }}>{ds.label}</p>
            <p className="text-sm font-bold font-mono" style={{ color: c.hex }}>
              {sum.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </p>
            <p className="text-[9px] text-slate-600 font-mono mt-0.5">
              peak {max.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ChartPanel({ graph, chartData, loading, error, onClose }) {
  if (!graph) return null;
  const tm  = TYPE_META[graph.chartType] || TYPE_META.Bar;
  const agg = AGG_META[(graph.aggregation || "sum").toLowerCase()] || AGG_META.sum;
  const ChartIcon = I[graph.chartType] || I.Bar;

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ color: tm.color, background: tm.bg, borderColor: tm.border }}>
            <ChartIcon />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100" style={{ fontFamily: "sans-serif", letterSpacing: "-0.3px" }}>
              {graph.chartType} Chart
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {graph.xAxis?.join(", ")} · {graph.aggregation}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 hover:bg-slate-800 transition-all"
        >
          <I.X />
        </button>
      </div>

      <div className="flex flex-wrap gap-3 px-6 py-3 border-b border-slate-800/70 shrink-0">
        {[{ label: "X Axis", items: graph.xAxis || [], col: "#38bdf8" },
          { label: "Y Axis", items: graph.yAxis || [], col: "#fbbf24" }].map(({ label, items, col }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-[8px] uppercase tracking-widest text-slate-700">{label}</span>
            <div className="flex flex-wrap gap-1">
              {items.map((f) => (
                <Tag key={f} style={{ color: `${col}99`, background: `${col}0d`, borderColor: `${col}22` }}>{f}</Tag>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase tracking-widest text-slate-700">Aggregation</span>
          <Tag style={{ color: agg.color, background: agg.bg, borderColor: agg.border }}>ƒ {agg.label}</Tag>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase tracking-widest text-slate-700">Labels</span>
          <Tag style={{ color: "#64748b", background: "rgba(30,41,59,0.6)", borderColor: "rgba(51,65,85,0.5)" }}>
            {graph.xLabel} / {graph.yLabel}
          </Tag>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 min-h-0">
        {loading && <LoadingBars />}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-red-400/40">
            <I.Alert />
            <p className="text-xs font-mono text-slate-600 text-center max-w-xs">{error}</p>
          </div>
        )}
        {!loading && !error && chartData && (
          <div className="relative h-full" style={{ minHeight: "300px" }}>
            <ChartCanvas graph={graph} chartData={chartData} />
          </div>
        )}
        {!loading && !error && !chartData && (
          <div className="flex items-center justify-center h-full text-slate-700 text-xs font-mono">
            No data available.
          </div>
        )}
      </div>

      {!loading && !error && chartData && <DatasetSummary chartData={chartData} />}
    </>
  );
}


export default function Graph() {
  const dispatch = useDispatch();
  const { Allgraphs: graphs, deletingId } = useSelector((s) => s.graph);
  const { user } = useSelector((state) => state.auth);

  const [selectedGraph, setSelectedGraph] = useState(null);
  const [chartData,     setChartData]     = useState(null);
  const [loadingId,     setLoadingId]     = useState(null);
  const [error,         setError]         = useState(null);
  const [fetching,      setFetching]      = useState(false);
  const [filter,        setFilter]        = useState("All");
  const [panelOpen,     setPanelOpen]     = useState(false);

  const temp = { userId: user._id };

  useEffect(() => {
    setFetching(true);
    dispatch(fetchAllGraphs(temp)).finally(() => setFetching(false));
  }, [dispatch]);

  const handleCardClick = useCallback(async (graph) => {
    if (loadingId) return;

    setSelectedGraph(graph);
    setChartData(null);
    setError(null);
    setPanelOpen(true);
    setLoadingId(graph._id);

    try {
      const res  = await api.post("/graph/create", { graphId: graph._id });
      const data = res.data?.chartData;
      if (!data) throw new Error("No chartData in response.");
      setChartData(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load chart data.");
    } finally {
      setLoadingId(null);
    }
  }, [loadingId]);

  const handleDelete = useCallback(async (graph) => {
    
    if (selectedGraph?._id === graph._id) {
      setPanelOpen(false);
      setTimeout(() => {
        setSelectedGraph(null);
        setChartData(null);
        setError(null);
      }, 320);
    }
    dispatch(deleteGraph(graph._id));
  }, [dispatch, selectedGraph]);

  const handleClose = () => {
    setPanelOpen(false);
    setTimeout(() => {
      setSelectedGraph(null);
      setChartData(null);
      setError(null);
    }, 320);
  };

  const chartTypes = ["All", ...new Set((graphs || []).filter(Boolean).map((g) => g.chartType).filter(Boolean))];
    const filtered   = filter === "All" 
      ? (graphs || []).filter(Boolean) 
      : (graphs || []).filter(Boolean).filter((g) => g.chartType === filter);
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes barPulse { to { opacity:.25; transform:scaleY(.35); } }
        .gd-scroll::-webkit-scrollbar { width:4px; }
        .gd-scroll::-webkit-scrollbar-track { background:transparent; }
        .gd-scroll::-webkit-scrollbar-thumb { background:rgba(148,163,184,.12); border-radius:4px; }
      `}</style>
      <div className="flex h-screen w-full overflow-hidden" style={{ background: "#060c1a", color: "#cbd5e1", fontFamily: "'DM Mono', monospace" }}>
        <aside className="w-52 shrink-0 flex flex-col" style={{ background: "rgba(10,16,32,0.7)", borderRight: "1px solid rgba(30,41,59,0.8)" }}>
          <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: "1px solid rgba(30,41,59,0.8)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.22)", color: "#38bdf8" }}>
              <I.Bar />
            </div>
            <span className="text-[13px] font-bold text-slate-100" style={{ fontFamily: "sans-serif", letterSpacing: "-0.3px" }}>DataViz</span>
          </div>
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto gd-scroll">
            <p className="text-[9px] uppercase tracking-widest text-slate-700 px-2 pb-2 pt-1">Charts</p>
            {chartTypes.map((t) => {
              const count  = t === "All" ? (graphs?.length ?? 0) : (graphs || []).filter((g) => g.chartType === t).length;
              const active = filter === t;
              const NavIcon = t === "All" ? I.Grid : (I[t] || I.Bar);
              return (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] transition-all"
                  style={{
                    color: active ? "#38bdf8" : "#64748b",
                    background: active ? "rgba(56,189,248,0.08)" : "transparent",
                    border: active ? "1px solid rgba(56,189,248,0.2)" : "1px solid transparent",
                  }}
                >
                  <NavIcon />
                  <span className="flex-1 text-left">{t}</span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: active ? "rgba(56,189,248,0.15)" : "rgba(30,41,59,0.8)", color: active ? "#38bdf8" : "#334155" }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="px-5 py-3 text-[10px] text-slate-700" style={{ borderTop: "1px solid rgba(30,41,59,0.8)" }}>
            {graphs?.length ?? 0} charts total
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main
          className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
          style={{ marginRight: panelOpen ? "560px" : "0" }}
        >
          {/* header */}
          <header className="flex items-center justify-between px-8 py-5 shrink-0" style={{ borderBottom: "1px solid rgba(30,41,59,0.8)" }}>
            <div>
              <h1 className="text-[17px] font-bold text-slate-100" style={{ fontFamily: "sans-serif", letterSpacing: "-0.4px" }}>
                Graph Library
              </h1>
              <p className="text-[11px] text-slate-600 mt-0.5">Click a card to render its chart</p>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
              {fetching
                ? <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />Syncing…</>
                : <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,.7)" }} />Live</>
              }
            </span>
          </header>

          {/* card grid */}
          <div className="flex-1 overflow-y-auto gd-scroll p-8">
            {fetching && (!graphs || graphs.length === 0) ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-36 rounded-xl animate-pulse" style={{ background: "rgba(15,23,42,0.6)", animationDelay: `${i * 60}ms` }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-700">
                <I.Empty />
                <p className="text-sm font-semibold text-slate-600" style={{ fontFamily: "sans-serif" }}>No charts found</p>
                <p className="text-xs text-slate-700">Create a chart to get started</p>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                {filtered.map((g) => (
                  <GraphCard
                    key={g._id}
                    graph={g}
                    isSelected={selectedGraph?._id === g._id}
                    isLoading={loadingId === g._id}
                    isDeleting={deletingId === g._id}
                    onClick={() => handleCardClick(g)}
                    onDelete={() => handleDelete(g)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* ── Backdrop ── */}
        {panelOpen && (
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
            onClick={handleClose}
          />
        )}

        {/* ── Slide-in Panel ── */}
        <div
          className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-y-auto gd-scroll transition-transform duration-300"
          style={{
            width: "560px",
            background: "#0a1020",
            borderLeft: "1px solid rgba(30,41,59,0.9)",
            boxShadow: "-12px 0 48px rgba(0,0,0,0.5)",
            transform: panelOpen ? "translateX(0)" : "translateX(100%)",
          }}
        >
          <ChartPanel
            graph={selectedGraph}
            chartData={chartData}
            loading={loadingId === selectedGraph?._id}
            error={error}
            onClose={handleClose}
          />
        </div>

      </div>
    </>
  );
}