import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Grid3x3, Package,
  CalendarCheck, Settings as SettingsIcon, Users, Sun, Moon, LogOut, Menu, X, ScrollText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { to: "/pos", label: "POS", icon: ShoppingCart, roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { to: "/orders", label: "Orders", icon: ClipboardList, roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { to: "/tables", label: "Tables", icon: Grid3x3, roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { to: "/products", label: "Products", icon: Package, roles: ["ADMIN", "MANAGER"] },
  { to: "/closing", label: "Closing", icon: CalendarCheck, roles: ["ADMIN", "MANAGER"] },
  { to: "/audit", label: "Audit Log", icon: ScrollText, roles: ["ADMIN"] },
  { to: "/users", label: "Staff", icon: Users, roles: ["ADMIN"] },
  { to: "/settings", label: "Settings", icon: SettingsIcon, roles: ["ADMIN"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter((n) => n.roles.includes(user?.role));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-cream dark:bg-canopy-950">
      {/* Sidebar */}
      <aside
        className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 w-64 transform border-r border-canopy-100 bg-white transition-transform duration-200 dark:border-canopy-800 dark:bg-canopy-900 md:static md:translate-x-0`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-canopy-100 px-5 dark:border-canopy-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-canopy-700 text-lg font-display text-amber-100 shadow-card">
            🦜
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-base font-semibold text-canopy-900 dark:text-canopy-50">
              {settings?.cafe_name || "D'Amazon Cafe"}
            </div>
            <div className="truncate text-[11px] uppercase tracking-wide text-canopy-500 dark:text-canopy-400">
              POS System
            </div>
          </div>
          <button className="ml-auto md:hidden text-canopy-500" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-canopy-700 text-white shadow-card"
                    : "text-canopy-700 hover:bg-canopy-50 dark:text-canopy-200 dark:hover:bg-canopy-800"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-canopy-100 p-3 dark:border-canopy-800">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-amber-900">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-canopy-900 dark:text-canopy-50">{user?.name}</div>
              <div className="truncate text-xs capitalize text-canopy-500 dark:text-canopy-400">{user?.role?.toLowerCase()}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="rounded-lg p-2 text-canopy-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-canopy-100 bg-white/80 px-4 backdrop-blur dark:border-canopy-800 dark:bg-canopy-900/80 md:px-6">
          <button className="text-canopy-600 md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="hidden text-sm text-canopy-500 dark:text-canopy-400 md:block">
            {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-canopy-200 text-canopy-600 transition hover:bg-canopy-50 dark:border-canopy-700 dark:text-canopy-300 dark:hover:bg-canopy-800"
              title="Toggle dark mode"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
