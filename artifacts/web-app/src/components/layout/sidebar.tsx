import { Link, useLocation } from "wouter";
import {
  Activity, LogOut, Settings, DollarSign, Users, Globe,
} from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiX, SiYoutube } from "react-icons/si";
import { FaRedditAlien } from "react-icons/fa";
import { useLogout, getGetMeQueryKey, getMe } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

type Subtab = { label: string; href: string };

type NavEntry =
  | { kind: "link"; key: string; label: string; icon: React.ElementType; href: string; adminOnly?: boolean }
  | { kind: "flyout"; key: string; label: string; icon: React.ElementType; prefix: string; subtabs: Subtab[]; adminOnly?: boolean };

const NAV: NavEntry[] = [
  {
    kind: "flyout", key: "sentiment", label: "Analysis",   icon: Globe,         prefix: "/sentiment",
    subtabs: [
      { label: "New Analysis", href: "/sentiment-analysis" },
      { label: "Reports",      href: "/sentiment-reports"  },
    ],
  },
  {
    kind: "flyout", key: "reddit",   label: "Reddit",     icon: FaRedditAlien, prefix: "/reddit",
    subtabs: [
      { label: "Dashboard",   href: "/reddit-overview"    },
      { label: "Investigate", href: "/reddit-investigate" },
      { label: "Users",        href: "/reddit-users"       },
      { label: "Archetypes",    href: "/reddit-archetypes"  },
    ],
  },
  {
    kind: "flyout", key: "facebook", label: "Facebook",   icon: SiFacebook,    prefix: "/facebook",
    subtabs: [
      { label: "Dashboard", href: "/facebook-overview"   },
      { label: "Users",     href: "/facebook-users"      },
      { label: "Archetypes",  href: "/facebook-archetypes" },
    ],
  },
  {
    kind: "flyout", key: "instagram", label: "Instagram", icon: SiInstagram,   prefix: "/instagram",
    subtabs: [
      { label: "Dashboard", href: "/instagram-overview"   },
      { label: "Users",     href: "/instagram-users"      },
      { label: "Archetypes",  href: "/instagram-archetypes" },
    ],
  },
  {
    kind: "flyout", key: "tiktok",  label: "TikTok",     icon: SiTiktok,      prefix: "/tiktok",
    subtabs: [
      { label: "Dashboard", href: "/tiktok-overview"   },
      { label: "Users",     href: "/tiktok-users"      },
      { label: "Archetypes",  href: "/tiktok-archetypes" },
    ],
  },
  {
    kind: "flyout", key: "twitter", label: "X / Twitter", icon: SiX,           prefix: "/twitter",
    subtabs: [
      { label: "Dashboard", href: "/twitter-overview"   },
      { label: "Users",     href: "/twitter-users"      },
      { label: "Archetypes",  href: "/twitter-archetypes" },
    ],
  },
  {
    kind: "flyout", key: "youtube", label: "YouTube",    icon: SiYoutube,     prefix: "/youtube",
    subtabs: [
      { label: "Dashboard", href: "/youtube-overview"   },
      { label: "Users",     href: "/youtube-users"      },
      { label: "Archetypes",  href: "/youtube-archetypes" },
    ],
  },
];

const BOTTOM_NAV: NavEntry[] = [
  { kind: "link", key: "admin",   label: "Settings", icon: Settings,   href: "/admin"           },
  { kind: "link", key: "finance", label: "Usage",    icon: DollarSign,   href: "/finance",         adminOnly: true },
  { kind: "link", key: "users",   label: "Accounts", icon: Users,        href: "/user-management", adminOnly: true },
];

function FlyoutItem({ entry }: { entry: Extract<NavEntry, { kind: "flyout" }> }) {
  const [location] = useLocation();
  const isActive = location.startsWith(entry.prefix);
  const Icon = entry.icon as React.ElementType;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className={`group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              aria-label={entry.label}
            >
              <Icon className="w-[18px] h-[18px]" />
              {isActive && (
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary" />
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">
          {entry.label}
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side="right"
        align="start"
        sideOffset={12}
        className="w-44 p-2 rounded-xl shadow-xl border border-border/60 bg-popover"
      >
        <p className="px-2 pt-1 pb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          {entry.label}
        </p>
        <div className="space-y-0.5">
          {entry.subtabs.map((tab) => (
            <SubtabLink key={tab.href} href={tab.href} label={tab.label} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SubtabLink({ href, label }: { href: string; label: string }) {
  const [location] = useLocation();
  const isActive = location === href;
  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/80 hover:bg-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function DirectLink({ entry }: { entry: Extract<NavEntry, { kind: "link" }> }) {
  const [location] = useLocation();
  const isActive = entry.href === "/" ? location === "/" : location.startsWith(entry.href);
  const Icon = entry.icon as React.ElementType;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={entry.href}
          className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 ${
            isActive
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          aria-label={entry.label}
        >
          <Icon className="w-[18px] h-[18px]" />
          {isActive && (
            <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary" />
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">
        {entry.label}
      </TooltipContent>
    </Tooltip>
  );
}

function NavItem({ entry }: { entry: NavEntry }) {
  if (entry.kind === "link") return <DirectLink entry={entry} />;
  return <FlyoutItem entry={entry} />;
}

export function Sidebar() {
  const queryClient = useQueryClient();
  const logout = useLogout();
  const { data: me } = useQuery({
    queryKey: getGetMeQueryKey(),
    queryFn: () => getMe(),
    retry: false,
  });
  const isAdmin = me?.role === "admin";

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.setQueryData(getGetMeQueryKey(), null);
        queryClient.invalidateQueries();
      },
    });
  };

  return (
    <div
      className="no-print flex flex-col items-center h-full w-[68px] border-r border-border/60 bg-sidebar py-4 gap-1 overflow-hidden"
    >
      {/* Wordmark — click to go home */}
      <div className="mb-3 flex items-center justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm hover:opacity-85 transition-opacity"
              style={{ background: "hsl(var(--primary))" }}
              aria-label="Home"
            >
              <Activity className="w-[18px] h-[18px] text-primary-foreground" strokeWidth={2.5} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">Home</TooltipContent>
        </Tooltip>
      </div>

      <div className="w-8 border-t border-border/50 mb-1" />

      {/* Primary nav */}
      <nav className="flex flex-col items-center gap-1 flex-1 min-h-0 overflow-y-auto w-full px-3 scrollbar-none">
        {NAV.map((entry) => (
          <NavItem key={entry.key} entry={entry} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="flex flex-col items-center gap-1 w-full px-3 border-t border-border/50 pt-2 mt-1">
        {BOTTOM_NAV.filter((e) => !e.adminOnly || isAdmin).map((entry) => (
          <NavItem key={entry.key} entry={entry} />
        ))}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleLogout}
              disabled={logout.isPending}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all"
              aria-label="Sign out"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">
            Sign out
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
