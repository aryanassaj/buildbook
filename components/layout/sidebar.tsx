"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: "▦" },
  { label: "Projects", href: "/projects", icon: "⊞" },
];

const ADMIN_NAV = [
  { label: "Devices", href: "/devices", icon: "⊟" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { role, logout } = useAuth();
  const companyCode = typeof window !== "undefined" ? localStorage.getItem("bb_company_code") : null;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="w-56 min-h-screen bg-neutral-900 border-r border-neutral-800 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-neutral-800">
        <span className="text-white font-semibold text-sm tracking-tight">BuildBook</span>
        {companyCode && (
          <p className="text-neutral-500 text-xs mt-0.5 font-mono">{companyCode}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}

        {(role === "ADMIN" || role === "MANAGER") && (
          <>
            <div className="pt-4 pb-1 px-2">
              <span className="text-neutral-600 text-xs uppercase tracking-wider font-medium">
                Admin
              </span>
            </div>
            {ADMIN_NAV.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-neutral-800 space-y-0.5">
        <div className="px-2 py-1.5 flex items-center gap-2">
          <span className="text-neutral-500 text-xs capitalize">{role?.toLowerCase() ?? "—"}</span>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-2 py-1.5 text-sm text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function NavItem({ label, href, icon, active }: { label: string; href: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-2 py-1.5 text-sm transition-colors ${
        active
          ? "bg-neutral-800 text-white"
          : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
      }`}
    >
      <span className="text-xs opacity-60">{icon}</span>
      {label}
    </Link>
  );
}
