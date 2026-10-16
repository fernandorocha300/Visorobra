import React, { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Settings,
  Home as HomeIcon,
  Building2,
  FileText,
  User as UserIcon,
} from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", icon: HomeIcon, label: "Início" },
  { to: "/obras", icon: Building2, label: "Obras" },
  { to: "/relatorios", icon: FileText, label: "Relatórios" },
  { to: "/perfil", icon: UserIcon, label: "Perfil" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

const ownerOf = (pathname) =>
  NAV_ITEMS.find((n) =>
    n.to === "/" ? pathname === "/" : pathname.startsWith(n.to)
  )?.to;

export default function BottomTabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Persisted per-tab navigation stack: tab root -> last visited pathname
  const tabPaths = useRef({});

  // Record the current pathname under its owning tab root whenever it changes
  useEffect(() => {
    const root = ownerOf(pathname);
    if (root) tabPaths.current[root] = pathname;
  }, [pathname]);

  const handleClick = (e, to, active) => {
    e.preventDefault();
    if (active) {
      // Re-selecting the active tab: reset to its root and scroll to top
      sessionStorage.removeItem("tabScroll:" + to);
      tabPaths.current[to] = to;
      navigate(to, { replace: true });
      const main = document.querySelector("main");
      if (main) main.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Restore the tab's last visited pathname (or its root if none stored)
      navigate(tabPaths.current[to] || to);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur safe-bottom"
      aria-label="Navegação principal"
    >
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={(e) => handleClick(e, to, active)}
              role="tab"
              aria-selected={active}
              aria-label={label}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1.5 transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="label-mono text-[0.5625rem] leading-none">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}