import { useState } from "react";
import {
  useGetYoutubeDashboard,
  getGetYoutubeDashboardQueryKey,
  useGetYoutubeDashboardThemeDetails,
  getGetYoutubeDashboardThemeDetailsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { YoutubeUserLink } from "@/components/youtube-user-link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

function ThemeDetailDialog({ label, open, onClose }: { label: string | null; open: boolean; onClose: () => void }) {
  const params = { label: label ?? "" };
  const { data, isLoading } = useGetYoutubeDashboardThemeDetails(params, {
    query: {
      queryKey: getGetYoutubeDashboardThemeDetailsQueryKey(params),
      enabled: open && !!label,
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wider">{label}</DialogTitle>
          <DialogDescription>
            Elaborated theme descriptions from individual profiles
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          )}
          {!isLoading && data?.items?.length === 0 && (
            <p className="text-sm text-muted-foreground">No detailed descriptions available yet — re-analyse profiles to populate this.</p>
          )}
          {data?.items?.map((item, i) => (
            <div key={i} className="p-3 rounded-md bg-muted/20 border border-border/50 space-y-1">
              <div className="flex items-center gap-2">
                <YoutubeUserLink
                  username={item.username}
                  displayName={item.displayName}
                  className="text-xs font-mono font-medium"
                />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function YoutubeDashboard() {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const { data, isLoading } = useGetYoutubeDashboard({
    query: {
      queryKey: getGetYoutubeDashboardQueryKey(),
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-20 w-full glass rounded-xl" />
        <Skeleton className="h-[340px] w-full glass" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-80 w-full glass" />
          <Skeleton className="h-80 w-full glass" />
        </div>
      </div>
    );
  }

  const stats = data;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <ThemeDetailDialog
        label={selectedTheme}
        open={!!selectedTheme}
        onClose={() => setSelectedTheme(null)}
      />

      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">YouTube Dashboard</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">YOUTUBE COMMUNITY DYNAMICS ANALYSIS</p>
        </div>
      </div>

      <div className="glass rounded-xl border border-border/40 flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border/40">
        <div className="flex-1 px-6 py-5">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Total Users</p>
          <p className="text-3xl font-bold text-foreground">{stats?.totalUsers.toLocaleString()}</p>
        </div>
        <div className="flex-1 px-6 py-5">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Posts Analyzed</p>
          <p className="text-3xl font-bold text-foreground">{stats?.totalPosts.toLocaleString()}</p>
        </div>
        <div className="flex-1 px-6 py-5">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Comments Analyzed</p>
          <p className="text-3xl font-bold text-foreground">{stats?.totalComments.toLocaleString()}</p>
        </div>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-mono text-sm text-muted-foreground tracking-wider">ARCHETYPE DISTRIBUTION</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.archetypeDistribution} layout="vertical" margin={{ right: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="archetypeName"
                  width={140}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  itemStyle={{ color: "hsl(var(--primary))" }}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                />
                <Bar dataKey="userCount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="userCount" position="right" fontSize={11} fill="hsl(var(--muted-foreground))" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="font-mono text-sm text-muted-foreground tracking-wider">HIGH-CONFIDENCE PROFILES</CardTitle>
            <CardDescription>Top users by archetype confidence score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/30">
              {stats?.topUsers?.map((u, idx) => (
                <div key={u.user.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="font-mono text-sm font-bold text-primary/50 w-7 text-right shrink-0 mt-0.5">
                    {(idx + 1).toString().padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <YoutubeUserLink
                      username={u.user.username}
                      displayName={u.user.displayName}
                      className="font-medium text-sm"
                    />
                    {u.dominantArchetype && u.dominantArchetype !== "Mixed / Unclassified" && (
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">{u.dominantArchetype}</p>
                    )}
                    <div className="mt-2 h-1 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${u.topScore}%` }} />
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground shrink-0 mt-1">{u.topScore}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="font-mono text-sm text-muted-foreground tracking-wider">RECURRING NARRATIVE THEMES</CardTitle>
            <CardDescription>Click any theme to explore elaborated descriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats?.topThemes?.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTheme(t.theme)}
                  className="w-full text-left group border-l-2 border-transparent hover:border-primary/50 pl-3 -ml-3 rounded-r transition-all py-2"
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="font-mono text-xs text-muted-foreground/60 w-4 shrink-0">
                      {(idx + 1).toString().padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium group-hover:text-primary transition-colors truncate mr-2">{t.theme}</span>
                        <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">{t.count}</span>
                      </div>
                      <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/50 rounded-full group-hover:bg-primary/70 transition-colors"
                          style={{ width: `${Math.min(100, (t.count / (stats.topThemes?.[0]?.count || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
