import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Chart,
  LineController, BarController, PieController, DoughnutController,
  ScatterController, BubbleController, LineElement, BarElement,
  ArcElement, PointElement, CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
} from "chart.js";

Chart.register(
  LineController, BarController, PieController, DoughnutController,
  ScatterController, BubbleController, LineElement, BarElement,
  ArcElement, PointElement, CategoryScale, LinearScale,
  Tooltip, Legend, Filler
);

import { fetchAllGraphs, deleteGraph } from "../store/graphSlice.js";
import api from "../services/api.js";


const COLORS = [
  { bg: "rgba(99,210,255,0.72)",  border: "rgba(99,210,255,1)",  light: "rgba(99,210,255,0.12)",  hex: "#63d2ff" },
  { bg: "rgba(255,167,92,0.72)",  border: "rgba(255,167,92,1)",  light: "rgba(255,167,92,0.12)",  hex: "#ffa75c" },
  { bg: "rgba(167,255,150,0.72)", border: "rgba(167,255,150,1)", light: "rgba(167,255,150,0.12)", hex: "#a7ff96" },
  { bg: "rgba(190,140,255,0.72)", border: "rgba(190,140,255,1)", light: "rgba(190,140,255,0.12)", hex: "#be8cff" },
  { bg: "rgba(255,120,170,0.72)", border: "rgba(255,120,170,1)", light: "rgba(255,120,170,0.12)", hex: "#ff78aa" },
];

const AGG_META = {
  sum:     { color: "#38bdf8", bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.22)",  label: "SUM"   },
  count:   { color: "#34d399", bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.22)",  label: "COUNT" },
  avg:     { color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.22)",  label: "AVG"   },
  average: { color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.22)",  label: "AVG"   },
  min:     { color: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.22)", label: "MIN"   },
  max:     { color: "#f472b6", bg: "rgba(244,114,182,0.10)", border: "rgba(244,114,182,0.22)", label: "MAX"   },
};

const normalizeChartKey = (raw = "") => {
  const s = raw.trim().toLowerCase();
  if (s === "bar" || s === "multi-series bar") return "Bar";
  if (s === "stacked bar") return "StackedBar";
  if (s === "line") return "Line";
  if (s === "area") return "Area";
  if (s === "pie") return "Pie";
  if (s === "donut" || s === "doughnut") return "Doughnut";
  if (s === "scatter") return "Scatter";
  if (s === "histogram") return "Histogram";
  return "Bar";
};

const toChartJsType = (key) => {
  switch (key) {
    case "Pie":       return "pie";
    case "Doughnut":  return "doughnut";
    case "Scatter":   return "scatter";
    case "Bar": case "StackedBar": case "Histogram": return "bar";
    default: return "line";
  }
};

const TYPE_META = {
  Bar:        { color: "#38bdf8", bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.22)"  },
  StackedBar: { color: "#0ea5e9", bg: "rgba(14,165,233,0.10)",  border: "rgba(14,165,233,0.22)"  },
  Line:       { color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.22)"  },
  Area:       { color: "#f59e0b", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.22)"  },
  Pie:        { color: "#34d399", bg: "rgba(52,211,153,0.10)",  border: "rgba(52,211,153,0.22)"  },
  Doughnut:   { color: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.22)" },
  Scatter:    { color: "#f472b6", bg: "rgba(244,114,182,0.10)", border: "rgba(244,114,182,0.22)" },
  Histogram:  { color: "#fb923c", bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.22)"  },
};


const I = {
  Bar: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[15px] h-[15px]">
      <rect x="2" y="9" width="3" height="9" rx="1"/>
      <rect x="8" y="5" width="3" height="13" rx="1"/>
      <rect x="14" y="7" width="3" height="11" rx="1"/>
    </svg>
  ),
  StackedBar: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[15px] h-[15px]">
      <rect x="2" y="13" width="4" height="5" rx="0.5" opacity="0.9"/>
      <rect x="2" y="8"  width="4" height="5" rx="0.5" opacity="0.6"/>
      <rect x="8" y="10" width="4" height="8" rx="0.5" opacity="0.9"/>
      <rect x="8" y="5"  width="4" height="5" rx="0.5" opacity="0.6"/>
      <rect x="14" y="11" width="4" height="7" rx="0.5" opacity="0.9"/>
      <rect x="14" y="7"  width="4" height="4" rx="0.5" opacity="0.6"/>
    </svg>
  ),
  Line: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-[15px] h-[15px]">
      <polyline points="2,15 6,9 11,12 18,4"/>
    </svg>
  ),
  Area: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[15px] h-[15px]">
      <path d="M2 15 L6 9 L11 12 L18 4 L18 18 L2 18 Z" opacity="0.6"/>
      <polyline points="2,15 6,9 11,12 18,4" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Pie: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[15px] h-[15px]">
      <path d="M10 2v8l5.9 5.9A8 8 0 1 1 10 2z"/>
    </svg>
  ),
  Doughnut: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" className="w-[15px] h-[15px]">
      <circle cx="10" cy="10" r="7"/>
      <circle cx="10" cy="10" r="3.5" strokeWidth="4" stroke="#0a1020" fill="none"/>
    </svg>
  ),
  Scatter: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[15px] h-[15px]">
      <circle cx="4"  cy="15" r="1.5"/><circle cx="8"  cy="9"  r="1.5"/>
      <circle cx="12" cy="12" r="1.5"/><circle cx="16" cy="5"  r="1.5"/>
      <circle cx="6"  cy="5"  r="1.5"/><circle cx="14" cy="14" r="1.5"/>
    </svg>
  ),
  Histogram: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[15px] h-[15px]">
      <rect x="1"  y="12" width="3" height="6" rx="0"/>
      <rect x="5"  y="7"  width="3" height="11" rx="0"/>
      <rect x="9"  y="4"  width="3" height="14" rx="0"/>
      <rect x="13" y="8"  width="3" height="10" rx="0"/>
      <rect x="17" y="13" width="2" height="5"  rx="0"/>
    </svg>
  ),
  Grid: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[15px] h-[15px]">
      <rect x="2" y="2" width="6" height="6" rx="1"/>
      <rect x="12" y="2" width="6" height="6" rx="1"/>
      <rect x="2" y="12" width="6" height="6" rx="1"/>
      <rect x="12" y="12" width="6" height="6" rx="1"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="w-[14px] h-[14px]">
      <line x1="15" y1="5" x2="5" y2="15"/><line x1="5" y1="5" x2="15" y2="15"/>
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <circle cx="12" cy="16" r=".5" fill="currentColor"/>
    </svg>
  ),
  Empty: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-12 h-12">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <path d="M7 16l3-4 3 3 2-2 2 2"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-[13px] h-[13px]">
      <path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12"/>
    </svg>
  ),
  Chat: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-[14px] h-[14px]">
      <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 4V4z"/>
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[14px] h-[14px]">
      <path d="M2.293 2.293a1 1 0 011.32-.083l14 9a1 1 0 010 1.58l-14 9A1 1 0 012 21v-7.586l8.293-1.707L2 9.586V3a1 1 0 01.293-.707z"/>
    </svg>
  ),
  ClearChat: () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-[13px] h-[13px]">
      <path d="M3 6h14M8 6V4h4v2M5 6l1 11h8l1-11"/>
    </svg>
  ),
  Sparkle: () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[13px] h-[13px]">
      <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z"/>
    </svg>
  ),
};

function buildConfig(graph, chartData) {
  const key      = normalizeChartKey(graph.chartType || "Bar");
  const jsType   = toChartJsType(key);
  const isArc    = key === "Pie" || key === "Doughnut";
  const isScatter    = key === "Scatter";
  const isArea       = key === "Area";
  const isLine       = key === "Line";
  const isStackedBar = key === "StackedBar";
  const isHistogram  = key === "Histogram";

  const datasets = chartData.datasets.map((ds, i) => {
    const c = COLORS[i % COLORS.length];
    if (isScatter) {
      const rawData   = ds.data;
      const scatterData =
        Array.isArray(rawData) && rawData[0]?.x !== undefined
          ? rawData
          : rawData.map((v, idx) => ({ x: idx, y: Number(v) }));
      return { label: ds.label, data: scatterData, backgroundColor: c.bg, borderColor: c.border, borderWidth: 1.5, pointRadius: 5, pointHoverRadius: 8 };
    }
    if (isArc) return { ...ds, backgroundColor: COLORS.map((col) => col.bg), borderColor: COLORS.map((col) => col.border), borderWidth: 2, hoverOffset: 8 };
    if (isArea) return { ...ds, backgroundColor: c.bg, borderColor: c.border, borderWidth: 2, pointBackgroundColor: c.border, pointRadius: 3, pointHoverRadius: 7, tension: 0.4, fill: "origin", borderSkipped: false };
    if (isHistogram) return { ...ds, backgroundColor: c.bg, borderColor: c.border, borderWidth: 1, borderRadius: 0, borderSkipped: "start", barPercentage: 1.0, categoryPercentage: 1.0 };
    if (isLine) return { ...ds, backgroundColor: c.light, borderColor: c.border, borderWidth: 2.5, pointBackgroundColor: c.border, pointRadius: 4, pointHoverRadius: 7, tension: 0.4, fill: false, borderSkipped: false };
    return { ...ds, backgroundColor: c.bg, borderColor: c.border, borderWidth: 1.5, borderRadius: 6, borderSkipped: "start", pointRadius: 0, pointHoverRadius: 0, tension: 0, fill: false };
  });

  const TICK = { color: "#475569", font: { family: "'DM Mono', monospace", size: 10 } };
  const GRID = { color: "rgba(255,255,255,0.04)" };
  const BORD = { color: "rgba(255,255,255,0.06)" };

  const scalesConfig = !isArc ? {
    x: { 
      stacked: isStackedBar,
       grid: isHistogram ? 
       { ...GRID, offset: false }
        : GRID,
        offset: !isHistogram,
        ticks: TICK,
        border: BORD, 
        title: { 
          display: !!graph.xLabel, 
          text: graph.xLabel, 
          color: "#94a3b8", 
          font: { 
            family: "'DM Mono', monospace", 
            size: 10 
          } 
        } 
      },
    y: { 
      stacked: isStackedBar, 
      grid: GRID, 
      border: BORD, 
      beginAtZero: true, 
      ticks: { 
        ...TICK, 
        callback: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v) }, 
        title: { 
          display: !!graph.yLabel, 
          text: graph.yLabel, 
          color: "#94a3b8", 
          font: { 
            family: "'DM Mono', monospace", 
            size: 10 
          } 
        } 
      },
  } : {};

  return {
    type: jsType,
    data: { labels: chartData.labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 750, easing: "easeInOutQuart" },
      plugins: {
        legend: { 
          display: true, 
          position: isArc ? "right" : "top", 
          labels: { 
            color: "#94a3b8", 
            font: { 
              family: "'DM Mono', monospace", 
              size: 11 
            }, 
            padding: 18, 
            usePointStyle: true, 
            pointStyleWidth: 8 
          } 
        },
        tooltip: {
          backgroundColor: "rgba(2,8,23,0.96)", 
          titleColor: "#e2e8f0", 
          bodyColor: "#94a3b8",
          borderColor: "rgba(99,210,255,0.18)", 
          borderWidth: 1, 
          padding: 12,
          titleFont: { 
            family: "'DM Mono', monospace", 
            size: 12 
          }, 
          bodyFont: { 
            family: "'DM Mono', monospace", 
            size: 11 
          },
          callbacks: {
            label: (ctx) => {
              if (isArc) { const total = ctx.dataset.data.reduce((a, b) => a + Number(b), 0); const pct = total ? ((Number(ctx.parsed) / total) * 100).toFixed(1) : 0; return ` ${ctx.label}: ${Number(ctx.parsed).toLocaleString()} (${pct}%)`; }
              const v = ctx.parsed?.y ?? ctx.parsed;
              return ` ${ctx.dataset.label}: ${typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v}`;
            },
          },
        },
      },
      scales: scalesConfig,
      ...(isArc && { cutout: key === "Doughnut" ? "55%" : "0%" }),
    },
  };
}

/* ═══════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════ */
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
  const key       = normalizeChartKey(graph.chartType || "Bar");
  const tm        = TYPE_META[key] || TYPE_META.Bar;
  const aggKey    = (graph.aggregation || "sum").toLowerCase();
  const agg       = AGG_META[aggKey] || AGG_META.sum;
  const ChartIcon = I[key] || I.Bar;

  return (
    <button
      onClick={onClick}
      disabled={(isLoading && !isSelected) || isDeleting}
      className="group relative w-full text-left flex flex-col gap-3 p-4 rounded-xl border transition-all duration-200 overflow-hidden"
      style={{ background: isSelected ? "rgba(15,23,42,0.9)" : "rgba(10,16,32,0.7)", borderColor: isSelected ? tm.color : "rgba(51,65,85,0.5)", boxShadow: isSelected ? `0 0 0 1px ${tm.border}, 0 8px 28px rgba(0,0,0,0.35)` : "none", opacity: isDeleting ? 0.45 : 1 }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "rgba(100,116,139,0.55)"; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "rgba(51,65,85,0.5)"; }}
    >
      {isSelected && <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: `linear-gradient(to bottom, ${tm.color}, transparent)` }} />}

      <span role="button" aria-label="Delete graph" onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center w-6 h-6 rounded-md border opacity-0 group-hover:opacity-100 transition-all duration-150 text-red-400 hover:text-red-200 hover:bg-red-500/20"
        style={{ borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.07)", cursor: isDeleting ? "not-allowed" : "pointer" }}>
        {isDeleting ? <span className="w-3 h-3 rounded-full border-2 border-red-700 border-t-red-400 animate-spin" /> : <I.Trash />}
      </span>

      <div className="flex items-center justify-between pr-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border" style={{ color: tm.color, background: tm.bg, borderColor: tm.border }}>
          <ChartIcon />{graph.chartType?.trim()}
        </span>
        {isLoading ? <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-700 border-t-sky-400 animate-spin" /> : <span className="w-2 h-2 rounded-full" style={{ background: isSelected ? tm.color : "#1e293b" }} />}
      </div>

      <div className="space-y-1.5">
        {[{ label: "X", fields: graph.xAxis || [], col: "#38bdf8" }, { label: "Y", fields: graph.yAxis || [], col: "#fbbf24" }].map(({ label, fields, col }) => (
          <div key={label} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-[8px] font-bold uppercase tracking-widest text-slate-700 w-3">{label}</span>
            <div className="flex flex-wrap gap-1">
              {fields.length > 0 ? fields.map((f) => (<Tag key={f} style={{ color: `${col}99`, background: `${col}0d`, borderColor: `${col}22` }}>{f}</Tag>)) : <span className="text-[10px] text-slate-700 font-mono">—</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ color: agg.color, background: agg.bg, borderColor: agg.border }}>ƒ {agg.label}</span>
        <span className="text-[9px] text-slate-700 font-mono">{graph.createdAt ? new Date(graph.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</span>
      </div>
    </button>
  );
}

function LoadingBars() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      <div className="flex items-end gap-1 h-10">
        {[0.55, 1, 0.72, 0.9, 0.6].map((h, i) => (
          <div key={i} className="w-1.5 rounded-sm bg-sky-400/50" style={{ height: `${h * 100}%`, animation: "barPulse 0.9s ease infinite alternate", animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <p className="text-xs text-slate-600 font-mono">Fetching chart data…</p>
    </div>
  );
}

function computeAggStat(vals, aggregation) {
  if (!vals.length) return { primary: 0, secondary: 0, secondaryLabel: "—" };
  const aggKey = (aggregation || "sum").toLowerCase();
  const sum    = vals.reduce((a, b) => a + b, 0);
  const max    = Math.max(...vals);
  const min    = Math.min(...vals);
  const avg    = sum / vals.length;
  const sorted = [...vals].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)];
  switch (aggKey) {
    case "sum":     return { primary: sum,         secondaryLabel: "peak",     secondary: max };
    case "count":   return { primary: vals.length, secondaryLabel: "non-zero", secondary: vals.filter(v => v !== 0).length };
    case "avg":
    case "average": return { primary: avg,         secondaryLabel: "median",   secondary: median };
    case "min":     return { primary: min,         secondaryLabel: "max",      secondary: max };
    case "max":     return { primary: max,         secondaryLabel: "min",      secondary: min };
    default:        return { primary: sum,         secondaryLabel: "peak",     secondary: max };
  }
}

function DatasetSummary({ chartData, graph }) {
  if (!chartData?.datasets?.length) return null;
  const aggregation = graph?.aggregation || "sum";
  const aggKey      = aggregation.toLowerCase();
  const agg         = AGG_META[aggKey] || AGG_META.sum;
  const isCount     = aggKey === "count";

  return (
    <div className="flex gap-2 px-4 pb-4 flex-wrap shrink-0">
      {chartData.datasets.map((ds, i) => {
        const c    = COLORS[i % COLORS.length];
        const vals = ds.data.map((v) => (typeof v === "object" ? v.y : Number(v)));
        const { primary, secondary, secondaryLabel } = computeAggStat(vals, aggregation);
        return (
          <div key={ds.label} className="flex-1 min-w-[80px] rounded-lg px-3 py-2.5 border" style={{ borderColor: c.border.replace(",1)", ",0.2)"), background: c.light }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] uppercase tracking-widest font-mono" style={{ color: c.hex }}>{ds.label}</p>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono" style={{ color: agg.color, background: agg.bg, border: `1px solid ${agg.border}` }}>{agg.label}</span>
            </div>
            <p className="text-sm font-bold font-mono" style={{ color: c.hex }}>{isCount ? primary.toLocaleString() : primary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            <p className="text-[9px] text-slate-600 font-mono mt-0.5">{secondaryLabel} {isCount ? secondary.toLocaleString() : secondary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
        );
      })}
    </div>
  );
}
function renderMarkdown(text) {
  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>');
  // Code blocks (inline)
  text = text.replace(/`([^`]+)`/g, '<code style="background:rgba(56,189,248,0.1);color:#38bdf8;padding:1px 5px;border-radius:4px;font-size:11px;font-family:\'DM Mono\',monospace">$1</code>');
  // JSON fenced block
  text = text.replace(/```json\n?([\s\S]*?)```/g, (_, json) => {
    return `<div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:8px;padding:10px 12px;margin:8px 0;font-family:'DM Mono',monospace;font-size:11px;color:#34d399;white-space:pre;overflow-x:auto">${json.trim()}</div>`;
  });
  // Bullet points
  text = text.replace(/^[\s]*[-•]\s(.+)$/gm, '<div style="display:flex;gap:6px;align-items:flex-start;margin:3px 0"><span style="color:#38bdf8;margin-top:2px;flex-shrink:0">▸</span><span>$1</span></div>');
  // Line breaks
  text = text.replace(/\n/g, '<br>');
  return text;
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", opacity: 0.7, animation: "typingDot 1.2s ease infinite", animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

function ChatPanel({ graphId, graph, token, onClose }) {
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [isLoading,   setIsLoading]   = useState(false);
  const [streamText,  setStreamText]  = useState("");
  const [phaseStatus, setPhaseStatus] = useState(null);
  const [histLoading, setHistLoading] = useState(false);
  const [clearing,    setClearing]    = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const abortRef       = useRef(null);

  //  Load history when graphId changes 
  useEffect(() => {
    if (!graphId) return;
    setMessages([]);
    setStreamText("");
    setHistLoading(true);

    api.get(`/chat/history/${graphId}`)
      .then(res => setMessages(res.data.messages || []))
      .catch(() => {})
      .finally(() => setHistLoading(false));

    // Focus input
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [graphId]);

  // Auto-scroll 
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);


const sendMessage = async () => {
  const msg = input.trim();
  if (!msg || isLoading) return;

  setInput("");
  setMessages((prev) => [
    ...prev,
    { role: "user", content: msg, timestamp: new Date().toISOString() },
  ]);
  setIsLoading(true);
  setStreamText("");
  setPhaseStatus(null);

  if (abortRef.current) abortRef.current.abort();
  const ctrl = new AbortController();
  abortRef.current = ctrl;

  try {
    const streamUrl =  "http://localhost:5000/api/chat/stream";

    const response = await fetch(streamUrl, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${token}`,
      },
      body:   JSON.stringify({ graphId, message: msg }),
      signal: ctrl.signal,
    });

    if (!response.ok) throw new Error("Request failed");

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText  = "";
    let buffer    = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep the incomplete last line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        let data;
        try { data = JSON.parse(line.slice(6)); }
        catch { continue; }

        // Phase status events 
        if (data.phase) {
          setPhaseStatus({
            phase:       data.phase,
            message:     data.message,
            query:       data.query       || null,
            explanation: data.explanation || null,
            rowCount:    data.rowCount    ?? null,
          });
          continue;
        }

        // Streamed answer chunk 
        if (data.content) {
          fullText += data.content;
          setStreamText(fullText);
          continue;
        }

        //  Done 
        if (data.done) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: fullText, timestamp: new Date().toISOString() },
          ]);
          setStreamText("");
          setPhaseStatus(null);
          continue;
        }

        // ── Error ────────────────────────────────────────────────────
        if (data.error) {
          setMessages((prev) => [
            ...prev,
            {
              role:      "assistant",
              content:   `⚠️ ${data.error}`,
              timestamp: new Date().toISOString(),
            },
          ]);
          setStreamText("");
          setPhaseStatus(null);
        }
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      setMessages((prev) => [
        ...prev,
        {
          role:      "assistant",
          content:   "⚠️ Something went wrong. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setStreamText("");
      setPhaseStatus(null);
    }
  } finally {
    setIsLoading(false);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PhaseIndicator component — drop this ABOVE the streaming bubble in your JSX.
// Shows which phase is active with an animated indicator.
//
// Usage (inside the messages list, just before the streamText bubble):
//   {phaseStatus && !streamText && <PhaseIndicator status={phaseStatus} />}
// ─────────────────────────────────────────────────────────────────────────────

function PhaseIndicator({ status }) {
  const PHASE_META = {
    querying:  { label: "Generating query",   color: "#a78bfa" },
    analyzing: { label: "Running query",      color: "#38bdf8" },
    results:   { label: "Query complete",     color: "#34d399" },
    streaming: { label: "Writing answer",     color: "#fbbf24" },
  };

  const meta = PHASE_META[status.phase] || { label: status.phase, color: "#64748b" };

  return (
    <div
      style={{
        display:      "flex",
        flexDirection:"column",
        gap:          6,
        padding:      "10px 12px",
        borderRadius: 12,
        background:   "rgba(15,23,42,0.9)",
        border:       `1px solid ${meta.color}33`,
        maxWidth:     "92%",
        fontFamily:   "'DM Mono', monospace",
      }}
    >
      {/* Phase label + spinner */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: meta.color,
            animation: "phasePulse 1.2s ease infinite",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, color: meta.color, fontWeight: 500 }}>
          {meta.label}
        </span>
        <span style={{ fontSize: 10, color: "#475569", marginLeft: "auto" }}>
          {status.message}
        </span>
      </div>

      {/* Show the generated query (collapsible feel via small text) */}
      {status.query && (
        <div
          style={{
            background:   "rgba(56,189,248,0.06)",
            border:       "1px solid rgba(56,189,248,0.15)",
            borderRadius: 6,
            padding:      "6px 8px",
            fontSize:     10,
            color:        "#38bdf8",
            whiteSpace:   "pre-wrap",
            wordBreak:    "break-all",
            maxHeight:    72,
            overflowY:    "auto",
          }}
        >
          {status.query}
        </div>
      )}

      {/* Row count after query execution */}
      {status.rowCount !== null && (
        <span style={{ fontSize: 10, color: "#34d399" }}>
          ✓ {status.rowCount} row{status.rowCount !== 1 ? "s" : ""} returned
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add this keyframe to your <style> block:
//   @keyframes phasePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
// ─────────────────────────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      await api.delete("/chat/clear", { data: { graphId } });
      setMessages([]);
      setPhaseStatus(null);
      setStreamText("");
    } catch {} finally { setClearing(false); }
  };

  const hasMessages = messages.length > 0 || !!streamText;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "rgba(5,9,20,0.98)", borderLeft: "1px solid rgba(30,41,59,0.9)" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 14px", borderBottom: "1px solid rgba(30,41,59,0.8)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
            <I.Sparkle />
            
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", fontFamily: "sans-serif", letterSpacing: "-0.2px" }}>AI Analyst</p>
            <p style={{ fontSize: 9, color: "#475569", fontFamily: "'DM Mono', monospace", marginTop: 1 }}>
              {graph?.chartType} · {graph?.aggregation}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {hasMessages && (
            <button onClick={clearChat} disabled={clearing} title="Clear chat"
              style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.07)", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: clearing ? 0.5 : 1 }}>
              {clearing ? <span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #7f1d1d", borderTopColor: "#f87171", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> : <I.ClearChat />}
            </button>
          )}
          <button onClick={onClose} title="Close chat"
            style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(51,65,85,0.6)", background: "transparent", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <I.X />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="gd-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {histLoading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, gap: 8, color: "#334155" }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #1e293b", borderTopColor: "#38bdf8", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace" }}>Loading history…</span>
          </div>
        )}

        {!histLoading && !hasMessages && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 16, padding: "20px 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 24, height: 24 }}>
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: "sans-serif", marginBottom: 6 }}>Ask anything about this chart</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {["What trends do you see?", "Summarise the top values", "Which category performs best?"].map(q => (
                  <button key={q} onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                    style={{ fontSize: 10, color: "#38bdf8", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontFamily: "'DM Mono', monospace", textAlign: "left" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!histLoading && messages.map((m, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, maxWidth: "92%", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              {/* Avatar */}
              {m.role === "assistant" && (
                <div style={{ width: 22, height: 22, borderRadius: 7, background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", flexShrink: 0 }}>
                  <I.Sparkle />
                </div>
              )}
              {/* Bubble */}
              <div style={{
                padding: "9px 12px",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: m.role === "user" ? "rgba(56,189,248,0.14)" : "rgba(15,23,42,0.9)",
                border: m.role === "user" ? "1px solid rgba(56,189,248,0.25)" : "1px solid rgba(30,41,59,0.8)",
                fontSize: 12,
                lineHeight: 1.65,
                color: m.role === "user" ? "#bae6fd" : "#94a3b8",
                fontFamily: "'DM Mono', monospace",
                wordBreak: "break-word",
              }}>
                {m.role === "assistant"
                  ? <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                  : m.content}
              </div>
            </div>
            <span style={{ fontSize: 9, color: "#1e293b", fontFamily: "'DM Mono', monospace", paddingLeft: m.role === "user" ? 0 : 28, paddingRight: m.role === "user" ? 0 : 0 }}>
              {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
          </div>
        ))}
        
         

        {phaseStatus && !streamText && (
          <PhaseIndicator status={phaseStatus} />
        )}

        {/* Streaming bubble */}
        {streamText && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, maxWidth: "92%" }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", flexShrink: 0 }}>
              <I.Sparkle />
            </div>
            <div style={{ padding: "9px 12px", borderRadius: "14px 14px 14px 4px", background: "rgba(15,23,42,0.9)", border: "1px solid rgba(56,189,248,0.2)", fontSize: 12, lineHeight: 1.65, color: "#94a3b8", fontFamily: "'DM Mono', monospace", wordBreak: "break-word" }}>
              <span dangerouslySetInnerHTML={{ __html: renderMarkdown(streamText) }} />
              <span style={{ display: "inline-block", width: 2, height: 13, background: "#38bdf8", marginLeft: 2, verticalAlign: "middle", animation: "cursor-blink 0.9s step-end infinite" }} />
            </div>
          </div>
        )}

        {/* Typing dots (only when loading but no text yet) */}
        {isLoading && !streamText && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8", flexShrink: 0 }}>
              <I.Sparkle />
            </div>
            <div style={{ padding: "9px 12px", borderRadius: "14px 14px 14px 4px", background: "rgba(15,23,42,0.9)", border: "1px solid rgba(30,41,59,0.8)" }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div style={{ padding: "12px 14px 14px", borderTop: "1px solid rgba(30,41,59,0.8)", flexShrink: 0, background: "rgba(5,9,20,0.98)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this data…"
            disabled={isLoading}
            rows={1}
            style={{
              flex: 1, resize: "none", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.6)",
              borderRadius: 10, padding: "9px 12px", color: "#cbd5e1", fontSize: 12,
              fontFamily: "'DM Mono', monospace", lineHeight: 1.5, outline: "none",
              transition: "border-color 0.15s", maxHeight: 100, overflowY: "auto",
              opacity: isLoading ? 0.6 : 1,
            }}
            onFocus={e => { e.target.style.borderColor = "rgba(56,189,248,0.4)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(51,65,85,0.6)"; }}
            onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            style={{
              width: 36, height: 36, borderRadius: 10, border: "none", flexShrink: 0,
              background: !input.trim() || isLoading ? "rgba(30,41,59,0.8)" : "rgba(56,189,248,0.85)",
              color: !input.trim() || isLoading ? "#334155" : "#020817",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {isLoading
              ? <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #1e293b", borderTopColor: "#38bdf8", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
              : <I.Send />}
          </button>
        </div>
        <p style={{ fontSize: 9, color: "#1e293b", fontFamily: "'DM Mono', monospace", marginTop: 6, textAlign: "center" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}


function ChartPanel({ graph, chartData, loading, error, onClose, chatOpen, onChatToggle }) {
  if (!graph) return null;
  const key       = normalizeChartKey(graph.chartType || "Bar");
  const tm        = TYPE_META[key] || TYPE_META.Bar;
  const aggKey    = (graph.aggregation || "sum").toLowerCase();
  const agg       = AGG_META[aggKey] || AGG_META.sum;
  const ChartIcon = I[key] || I.Bar;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ color: tm.color, background: tm.bg, borderColor: tm.border }}>
            <ChartIcon />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100" style={{ fontFamily: "sans-serif", letterSpacing: "-0.3px" }}>{graph.chartType?.trim()} Chart</h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{graph.xAxis?.join(", ")} · {graph.aggregation}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Chat toggle button */}
          <button
            onClick={onChatToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-mono transition-all duration-200"
            style={{
              color:       chatOpen ? "#020817" : "#38bdf8",
              background:  chatOpen ? "rgba(56,189,248,0.9)" : "rgba(56,189,248,0.08)",
              borderColor: chatOpen ? "transparent"           : "rgba(56,189,248,0.3)",
            }}
          >
            <I.Chat />
            {chatOpen ? "Close Chat" : "Chat"}
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 hover:bg-slate-800 transition-all">
            <I.X />
          </button>
        </div>
      </div>

      {/* Axis meta bar */}
      <div className="flex flex-wrap gap-3 px-5 py-3 border-b border-slate-800/70 shrink-0">
        {[{ label: "X Axis", items: graph.xAxis || [], col: "#38bdf8" }, { label: "Y Axis", items: graph.yAxis || [], col: "#fbbf24" }].map(({ label, items, col }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-[8px] uppercase tracking-widest text-slate-700">{label}</span>
            <div className="flex flex-wrap gap-1">
              {items.length > 0 ? items.map((f) => (<Tag key={f} style={{ color: `${col}99`, background: `${col}0d`, borderColor: `${col}22` }}>{f}</Tag>)) : <Tag style={{ color: "#475569", background: "rgba(30,41,59,0.6)", borderColor: "rgba(51,65,85,0.5)" }}>—</Tag>}
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase tracking-widest text-slate-700">Aggregation</span>
          <Tag style={{ color: agg.color, background: agg.bg, borderColor: agg.border }}>ƒ {agg.label}</Tag>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 px-5 py-4 min-h-0">
        {loading && <LoadingBars />}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-red-400/40">
            <I.Alert />
            <p className="text-xs font-mono text-slate-600 text-center max-w-xs">{error}</p>
          </div>
        )}
        {!loading && !error && chartData && (
          <div className="relative h-full" style={{ minHeight: "220px" }}>
            <ChartCanvas graph={graph} chartData={chartData} />
          </div>
        )}
        {!loading && !error && !chartData && (
          <div className="flex items-center justify-center h-full text-slate-700 text-xs font-mono">No data available.</div>
        )}
      </div>

      {!loading && !error && chartData && <DatasetSummary chartData={chartData} graph={graph} />}
    </>
  );
}

/* ═══════════════════════════════════════════
   MAIN GRAPH PAGE
═══════════════════════════════════════════ */
export default function Graph() {
  const dispatch = useDispatch();
  const { Allgraphs: graphs, deletingId } = useSelector((s) => s.graph);
  const { user, token } = useSelector((state) => state.auth);

  // ── Panel state ──────────────────────────
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [chartData,     setChartData]     = useState(null);
  const [loadingId,     setLoadingId]     = useState(null);
  const [error,         setError]         = useState(null);
  const [fetching,      setFetching]      = useState(false);
  const [filter,        setFilter]        = useState("All");
  const [panelOpen,     setPanelOpen]     = useState(false);
  const [chatOpen,      setChatOpen]      = useState(false);

  // ── Derived panel width ──────────────────
  // Chart-only: 560px | Chart+Chat: 920px
  const CHART_W = 560;
  const CHAT_W  = 400;
  const panelW  = panelOpen ? (chatOpen ? CHART_W + CHAT_W : CHART_W) : 0;

  useEffect(() => {
    setFetching(true);
    dispatch(fetchAllGraphs({ userId: user._id })).finally(() => setFetching(false));
  }, [dispatch]);

  const handleCardClick = useCallback(async (graph) => {
    if (loadingId) return;
    if (selectedGraph?._id === graph._id && panelOpen) return; // already open
    setSelectedGraph(graph);
    setChartData(null);
    setError(null);
    setChatOpen(false); // reset chat on new graph
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
  }, [loadingId, selectedGraph, panelOpen]);

  const handleDelete = useCallback(async (graph) => {
    if (selectedGraph?._id === graph._id) {
      setPanelOpen(false);
      setChatOpen(false);
      setTimeout(() => { setSelectedGraph(null); setChartData(null); setError(null); }, 320);
    }
    dispatch(deleteGraph(graph._id));
  }, [dispatch, selectedGraph]);

  const handleClose = () => {
    setPanelOpen(false);
    setChatOpen(false);
    setTimeout(() => { setSelectedGraph(null); setChartData(null); setError(null); }, 320);
  };

  const handleChatToggle = () => setChatOpen(prev => !prev);

  const chartTypes = ["All", ...new Set((graphs || []).filter(Boolean).map((g) => normalizeChartKey(g.chartType || "")).filter(Boolean))];
  const filtered   = filter === "All" ? (graphs || []).filter(Boolean) : (graphs || []).filter(Boolean).filter((g) => normalizeChartKey(g.chartType || "") === filter);

  // Token for streaming fetch — adjust the fallback key to match your localStorage key
  const authToken = token || localStorage.getItem("token") || localStorage.getItem("authToken") || "";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes barPulse      { to { opacity:.25; transform:scaleY(.35); } }
        @keyframes spin          { to { transform: rotate(360deg); } }
        @keyframes typingDot     { 0%,80%,100% { opacity:0.2; transform:scale(0.8); } 40% { opacity:1; transform:scale(1); } }
        @keyframes cursor-blink  { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes slideInRight  { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
        .gd-scroll::-webkit-scrollbar       { width:4px; }
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
              const count   = t === "All" ? (graphs?.length ?? 0) : (graphs || []).filter((g) => normalizeChartKey(g.chartType || "") === t).length;
              const active  = filter === t;
              const NavIcon = t === "All" ? I.Grid : I[t] || I.Bar;
              const tm      = t === "All" ? { color: "#38bdf8" } : TYPE_META[t] || TYPE_META.Bar;
              return (
                <button key={t} onClick={() => setFilter(t)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] transition-all"
                  style={{ color: active ? tm.color : "#64748b", background: active ? `${tm.color}14` : "transparent", border: active ? `1px solid ${tm.color}33` : "1px solid transparent" }}>
                  <NavIcon />
                  <span className="flex-1 text-left">{t}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: active ? `${tm.color}22` : "rgba(30,41,59,0.8)", color: active ? tm.color : "#334155" }}>{count}</span>
                </button>
              );
            })}
          </nav>

          <div className="px-5 py-3 text-[10px] text-slate-700" style={{ borderTop: "1px solid rgba(30,41,59,0.8)" }}>
            {graphs?.length ?? 0} charts total
          </div>
        </aside>

        {/* ── Main cards area ───────────────────── */}
        <main
          className="flex-1 flex flex-col overflow-hidden"
          style={{ marginRight: `${panelW}px`, transition: "margin-right 0.32s cubic-bezier(0.4,0,0.2,1)" }}
        >
          <header className="flex items-center justify-between px-8 py-5 shrink-0" style={{ borderBottom: "1px solid rgba(30,41,59,0.8)" }}>
            <div>
              <h1 className="text-[17px] font-bold text-slate-100" style={{ fontFamily: "sans-serif", letterSpacing: "-0.4px" }}>Graph Library</h1>
              <p className="text-[11px] text-slate-600 mt-0.5">Click a card to render its chart</p>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
              {fetching
                ? <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />Syncing…</>
                : <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,.7)" }} />Live</>}
            </span>
          </header>

          <div className="flex-1 overflow-y-auto gd-scroll p-8">
            {fetching && (!graphs || graphs.length === 0) ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                {[...Array(6)].map((_, i) => (<div key={i} className="h-36 rounded-xl animate-pulse" style={{ background: "rgba(15,23,42,0.6)", animationDelay: `${i * 60}ms` }} />))}
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
                  <GraphCard key={g._id} graph={g}
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

        {/* ── Backdrop ─────────────────────────── */}
        {panelOpen && (
          <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(1px)" }} onClick={handleClose} />
        )}

        {/* ── Right drawer: Chart + (optional) Chat ── */}
        <div
          className="fixed top-0 right-0 bottom-0 z-50 flex flex-row overflow-hidden"
          style={{
            width:     `${panelW}px`,
            transform: panelOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1), width 0.32s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: "-12px 0 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* Chart section */}
          <div
            className="flex flex-col overflow-y-auto gd-scroll"
            style={{
              width:      chatOpen ? `${CHART_W}px` : "100%",
              flexShrink: 0,
              background: "#0a1020",
              borderLeft: "1px solid rgba(30,41,59,0.9)",
              transition: "width 0.32s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <ChartPanel
              graph={selectedGraph}
              chartData={chartData}
              loading={loadingId === selectedGraph?._id}
              error={error}
              onClose={handleClose}
              chatOpen={chatOpen}
              onChatToggle={handleChatToggle}
            />
          </div>

          {/* Chat section — slides in */}
          {chatOpen && selectedGraph && (
            <div style={{ width: `${CHAT_W}px`, flexShrink: 0, animation: "slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
              <ChatPanel
                graphId={selectedGraph._id}
                graph={selectedGraph}
                token={authToken}
                onClose={() => setChatOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}