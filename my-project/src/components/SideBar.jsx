import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/home/databases", label: "Databases", icon: "🗄️" },
  { to: "/home/tables", label: "Tables", icon: "📋" },
  { to: "/home/graph", label: "Graph", icon: "📊" },
  { to: "/home/settings", label: "Settings", icon: "⚙️" },
];

export default function SideBar() {
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-slate-200 shadow-sm flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Menu
        </h2>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <span className="text-lg" aria-hidden>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
