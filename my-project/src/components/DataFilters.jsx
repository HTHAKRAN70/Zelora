import { useState } from "react";

const OPERATORS = [
  { value: "=",           label: "= Equals"         },
  { value: "!=",          label: "≠ Not Equal"       },
  { value: ">",           label: "> Greater Than"    },
  { value: ">=",          label: "≥ Greater or Equal"},
  { value: "<",           label: "< Less Than"       },
  { value: "<=",          label: "≤ Less or Equal"   },
  { value: "contains",    label: "⊃ Contains"        },
  { value: "not_contains",label: "⊄ Not Contains"    },
];

const OP_SYMBOL = {
  "=": "=", "!=": "≠", ">": ">", ">=": "≥",
  "<": "<", "<=": "≤", "contains": "⊃", "not_contains": "⊄",
};

const SectionHeading = ({ icon, label, badge }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-sm">{icon}</span>
    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{label}</h4>
    {badge != null && badge > 0 && (
      <span className="ml-auto text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
        {badge} active
      </span>
    )}
  </div>
);

const Divider = () => <div className="h-px bg-slate-100 my-1" />;

export default function DataFilters({
  availableFields = [],
  filters = [],
  onFiltersChange,
  rowLimit,
  onRowLimitChange,
  rowSelection = "all",
  onRowSelectionChange,
  sortConfig = { field: "", order: "asc" },
  onSortChange,
}) {
  const [draft, setDraft] = useState({ field: "", operator: "=", value: "" });

  const addFilter = () => {
    if (!draft.field || draft.value === "") return;
    onFiltersChange([...filters, { ...draft }]);
    setDraft({ field: "", operator: "=", value: "" });
  };

  const removeFilter = (i) => onFiltersChange(filters.filter((_, j) => j !== i));

  const inputCls =
    "border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition";

  return (
    <div className="space-y-4">

      <section>
        <SectionHeading icon="🔍" label="Row Filters" badge={filters.length} />

        {filters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
            {filters.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-indigo-200 rounded-lg text-[11px] font-mono text-indigo-700 shadow-sm"
              >
                <span className="font-bold text-slate-700">{f.field}</span>
                <span className="text-indigo-400 font-normal">{OP_SYMBOL[f.operator] ?? f.operator}</span>
                <span className="font-bold text-slate-700">{f.value}</span>
                <button
                  type="button"
                  onClick={() => removeFilter(i)}
                  className="ml-0.5 text-red-400 hover:text-red-600 font-bold leading-none"
                >×</button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => onFiltersChange([])}
              className="ml-auto text-[10px] text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <select
            value={draft.field}
            onChange={(e) => setDraft((p) => ({ ...p, field: e.target.value }))}
            className={`flex-1 ${inputCls}`}
          >
            <option value="">Select field…</option>
            {availableFields.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <select
            value={draft.operator}
            onChange={(e) => setDraft((p) => ({ ...p, operator: e.target.value }))}
            className={`w-40 ${inputCls}`}
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Value"
            value={draft.value}
            onChange={(e) => setDraft((p) => ({ ...p, value: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addFilter()}
            className={`flex-1 ${inputCls}`}
          />

          <button
            type="button"
            onClick={addFilter}
            disabled={!draft.field || draft.value === ""}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
          >
            + Add
          </button>
        </div>
      </section>

      <Divider />
        <section>
        <SectionHeading icon="↕️" label="Sort" />
        <div className="flex gap-2">
          <select
            value={sortConfig?.field || ""}
            onChange={(e) => onSortChange({ ...sortConfig, field: e.target.value })}
            className={`flex-1 ${inputCls}`}
          >
            <option value="">No sort (optional)</option>
            {availableFields.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {["asc", "desc"].map((ord) => (
            <button
              key={ord}
              type="button"
              onClick={() => onSortChange({ ...sortConfig, order: ord })}
              className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${
                (sortConfig?.order || "asc") === ord
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600"
              }`}
            >
              {ord === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          ))}
        </div>
      </section>

      <Divider />
        <section>
        <SectionHeading icon="📏" label="Row Limit" />
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="number"
            min="1"
            placeholder="All rows"
            value={rowLimit || ""}
            onChange={(e) =>
              onRowLimitChange(e.target.value ? Number(e.target.value) : null)
            }
            className={`w-28 ${inputCls}`}
          />

          {[
            { val: "all",  icon: "∞", label: "All"  },
            { val: "head", icon: "⬆", label: "Head" },
            { val: "tail", icon: "⬇", label: "Tail" },
          ].map(({ val, icon, label }) => (
            <button
              key={val}
              type="button"
              onClick={() => onRowSelectionChange(val)}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold border transition ${
                rowSelection === val
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600"
              }`}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {(rowLimit || sortConfig?.field) && (
          <div className="mt-2.5 text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 font-mono">
            {rowLimit && rowSelection !== "all"
              ? `→ Using ${rowSelection === "head" ? "first" : "last"} ${rowLimit} rows`
              : rowLimit
              ? `→ Limiting to ${rowLimit} rows`
              : "→ No row limit"}
            {sortConfig?.field
              ? `, sorted by "${sortConfig.field}" ${sortConfig.order === "desc" ? "(desc)" : "(asc)"}`
              : ""}
            {filters.length > 0 ? `, with ${filters.length} filter${filters.length > 1 ? "s" : ""}` : ""}
          </div>
        )}
      </section>
    </div>
  );
}