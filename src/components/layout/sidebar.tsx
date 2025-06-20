"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ScanSearch,
  Download,
  Lightbulb,
  Library,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Scraping",
    href: "/trends",
    icon: ScanSearch,
  },
  {
    name: "Downloads",
    href: "/downloads",
    icon: Download,
  },
  {
    name: "Ideaboards",
    href: "/ideaboards",
    icon: Lightbulb,
  },
  {
    name: "Library",
    href: "/library",
    icon: Library,
  },
  {
    name: "Billing",
    href: "/settings",
    icon: CreditCard,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn(
      "fixed top-16 left-0 bottom-0 z-50 bg-background/80 backdrop-blur-md border-r border-border transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex flex-col h-full">
        <nav className="flex-1 px-2 pt-4 pb-2 space-y-2">
          {/* Toggle Button - styled like navigation items */}
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center text-sm font-medium rounded-lg transition-colors group",
              "px-3 py-3 justify-center",
              "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center text-sm font-medium rounded-lg transition-colors group",
                  isCollapsed ? "px-3 py-3 justify-center" : "px-4 py-3",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  isCollapsed ? "" : "mr-3"
                )} />
                {!isCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}