import { Link } from "wouter";
import {
  useGetDashboard,
  getGetDashboardQueryKey,
  useGetFacebookDashboard,
  getGetFacebookDashboardQueryKey,
  useGetInstagramDashboard,
  getGetInstagramDashboardQueryKey,
  useGetTikTokDashboard,
  getGetTikTokDashboardQueryKey,
  useGetTwitterDashboard,
  getGetTwitterDashboardQueryKey,
  useGetYoutubeDashboard,
  getGetYoutubeDashboardQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, MessageSquare } from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiX, SiYoutube } from "react-icons/si";
import { FaRedditAlien } from "react-icons/fa";

type Platform = {
  key: string;
  label: string;
  Icon: React.ElementType;
  overviewHref: string;
  usersHref: string;
  isLoading: boolean;
  totalUsers?: number;
  totalPosts?: number;
  totalComments?: number;
};

function Stat({ label, value, isLoading }: { label: string; value?: number; isLoading: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      {isLoading ? (
        <Skeleton className="h-6 w-16" />
      ) : (
        <span className="text-xl font-semibold text-foreground tabular-nums">
          {value !== undefined ? value.toLocaleString() : "—"}
        </span>
      )}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function PlatformCard({ p }: { p: Platform }) {
  const { Icon } = p;
  return (
    <Card className="glass flex flex-col">
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--primary) / 0.09)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
            <Icon className="w-[18px] h-[18px] text-primary" />
          </div>
          <span className="font-semibold text-foreground">
            {p.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Users"    value={p.totalUsers}    isLoading={p.isLoading} />
          <Stat label="Posts"    value={p.totalPosts}    isLoading={p.isLoading} />
          <Stat label="Comments" value={p.totalComments} isLoading={p.isLoading} />
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1 border-t border-border/40">
          <Link href={p.overviewHref}>
            <Button size="sm" variant="secondary" className="text-xs h-8 rounded-lg gap-1">
              Overview <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
          <Link href={p.usersHref}>
            <Button size="sm" variant="ghost" className="text-xs h-8 rounded-lg text-muted-foreground hover:text-foreground">
              Users
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { data: reddit,    isLoading: loadingReddit    } = useGetDashboard(undefined, { query: { queryKey: getGetDashboardQueryKey() } });
  const { data: facebook,  isLoading: loadingFacebook  } = useGetFacebookDashboard({ query: { queryKey: getGetFacebookDashboardQueryKey() } });
  const { data: instagram, isLoading: loadingInstagram } = useGetInstagramDashboard({ query: { queryKey: getGetInstagramDashboardQueryKey() } });
  const { data: tiktok,    isLoading: loadingTiktok    } = useGetTikTokDashboard({ query: { queryKey: getGetTikTokDashboardQueryKey() } });
  const { data: youtube,   isLoading: loadingYoutube   } = useGetYoutubeDashboard({ query: { queryKey: getGetYoutubeDashboardQueryKey() } });
  const { data: twitter,   isLoading: loadingTwitter   } = useGetTwitterDashboard({ query: { queryKey: getGetTwitterDashboardQueryKey() } });

  const platforms: Platform[] = [
    { key: "reddit",    label: "Reddit",      Icon: FaRedditAlien, overviewHref: "/reddit-overview",    usersHref: "/reddit-users",    isLoading: loadingReddit,    totalUsers: reddit?.totalUsers,    totalPosts: reddit?.totalPosts,    totalComments: reddit?.totalComments },
    { key: "facebook",  label: "Facebook",    Icon: SiFacebook,    overviewHref: "/facebook-overview",  usersHref: "/facebook-users",  isLoading: loadingFacebook,  totalUsers: facebook?.totalUsers,  totalPosts: facebook?.totalPosts,  totalComments: facebook?.totalComments },
    { key: "instagram", label: "Instagram",   Icon: SiInstagram,   overviewHref: "/instagram-overview", usersHref: "/instagram-users", isLoading: loadingInstagram, totalUsers: instagram?.totalUsers, totalPosts: instagram?.totalPosts, totalComments: instagram?.totalComments },
    { key: "tiktok",    label: "TikTok",      Icon: SiTiktok,      overviewHref: "/tiktok-overview",    usersHref: "/tiktok-users",    isLoading: loadingTiktok,    totalUsers: tiktok?.totalUsers,    totalPosts: tiktok?.totalPosts,    totalComments: tiktok?.totalComments },
    { key: "twitter",   label: "X / Twitter", Icon: SiX,           overviewHref: "/twitter-overview",   usersHref: "/twitter-users",   isLoading: loadingTwitter,   totalUsers: twitter?.totalUsers,   totalPosts: twitter?.totalPosts,   totalComments: twitter?.totalComments },
    { key: "youtube",   label: "YouTube",     Icon: SiYoutube,     overviewHref: "/youtube-overview",   usersHref: "/youtube-users",   isLoading: loadingYoutube,   totalUsers: youtube?.totalUsers,   totalPosts: youtube?.totalPosts,   totalComments: youtube?.totalComments },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-400">

      <div className="space-y-1">
        <h1
          className="text-4xl font-bold tracking-tight text-foreground"
         
        >
          Hello.
        </h1>
        <p className="text-base text-muted-foreground">
          Here's what's happening across your connected communities.
        </p>
      </div>

      <div
        className="flex items-center justify-between gap-4 rounded-2xl px-6 py-5 border border-primary/20"
        style={{ background: "linear-gradient(135deg, hsl(16 58% 40% / 0.07) 0%, hsl(82 28% 40% / 0.05) 100%)" }}
      >
        <div className="space-y-0.5">
          <h2 className="font-semibold text-foreground">
            Sentiment Analysis
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Drop post URLs from any platform to surface themes, tone, and concerns.
          </p>
        </div>
        <Link href="/sentiment-analysis">
          <Button className="shrink-0 rounded-xl h-10 px-5 text-sm font-medium gap-2">
            <MessageSquare className="w-4 h-4" /> Analyze
          </Button>
        </Link>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-widest">
          Platforms
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {platforms.map((p) => (
            <PlatformCard key={p.key} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
