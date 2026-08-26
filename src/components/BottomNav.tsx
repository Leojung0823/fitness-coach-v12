"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/strings";

/**
 * The coach holds the phone in one hand while the client is mid-set, so the
 * four destinations sit within thumb reach at the bottom rather than behind a
 * menu at the top.
 */
const ITEMS = [
  { href: "/home", label: t.nav.home, icon: "home" },
  { href: "/clients", label: t.nav.clients, icon: "clients" },
  { href: "/training", label: t.nav.training, icon: "training" },
  { href: "/account", label: t.nav.account, icon: "account" },
] as const;

function Icon({ name }: { name: (typeof ITEMS)[number]["icon"] }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M3.5 10.3 12 3.8l8.5 6.5" />
        <path d="M5.7 9.1v11h12.6v-11" />
      </svg>
    );
  }
  if (name === "clients") {
    return (
      <svg {...common}>
        <circle cx="9.2" cy="8.4" r="3.4" />
        <path d="M3.4 19.4c0-3.1 2.6-5.2 5.8-5.2s5.8 2.1 5.8 5.2" />
        <path d="M16.4 5.6a3 3 0 0 1 0 5.7M17.8 14.3c1.8.7 2.9 2.2 2.9 4.2" />
      </svg>
    );
  }
  if (name === "training") {
    // A dumbbell: the one object every one of these screens is about.
    return (
      <svg {...common}>
        <path d="M3 9.5v5M6 7.5v9M18 7.5v9M21 9.5v5M6 12h12" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20c0-3.6 3.2-6 7.2-6s7.2 2.4 7.2 6" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  // Recording a workout is a focused task with its own action bar at the
  // bottom; stacking a second bar under it would cost a third of a phone
  // screen and put two different "what do I tap now" answers side by side.
  if (pathname.startsWith("/workout")) return null;

  return (
    <nav className="bottom-nav" aria-label="主要導覽">
      {ITEMS.map((item) => {
        // /clients is current for every page beneath it, so opening a client
        // does not make the bar look like it navigated somewhere else.
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={current ? "bottom-nav-item current" : "bottom-nav-item"}
            aria-current={current ? "page" : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
