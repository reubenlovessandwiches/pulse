import { useMemo, useState } from "react";
import {
  useGetFinanceSummary,
  useGetFinanceUsers,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  DollarSign,
  Bot,
  Database,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const fmtMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
};

function StatStrip({
  items,
}: {
  items: { label: string; value: string; icon: React.ElementType; sub?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40 rounded-xl overflow-hidden border border-border/40">
      {items.map(({ label, value, icon: Icon, sub }, i) => (
        <div key={i} className="bg-card px-5 py-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
          </div>
          <p className="text-xl font-bold tabular-nums">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      ))}
    </div>
  );
}

export default function Finance() {
  const { data: summary, isLoading: summaryLoading } = useGetFinanceSummary();

  const monthOptions = useMemo(() => {
    const months = summary?.months?.map((m) => m.month) ?? [];
    return [null, ...months] as (string | null)[];
  }, [summary]);

  const [navIndex, setNavIndex] = useState(0);
  const selectedMonth = monthOptions[Math.min(navIndex, monthOptions.length - 1)] ?? null;

  const { data: usersData, isLoading: usersLoading } = useGetFinanceUsers(
    selectedMonth ? { month: selectedMonth } : undefined,
  );
  const users = usersData?.users ?? [];

  const anyEstimated =
    (summary?.months?.some((m) => m.estimated) ?? false) || users.some((u) => u.estimated);

  const selectedMonthData = selectedMonth
    ? summary?.months?.find((m) => m.month === selectedMonth)
    : null;

  const statItems =
    summaryLoading || !summary
      ? null
      : selectedMonth && selectedMonthData
        ? [
            { label: "Month total", value: usd(selectedMonthData.totalUsd), icon: DollarSign },
            { label: "Apify", value: usd(selectedMonthData.apifyUsd), icon: Database },
            { label: "OpenAI", value: usd(selectedMonthData.openaiUsd), icon: Bot },
            {
              label: "Platform fee",
              value: usd(summary.platformMonthlyUsd),
              icon: CreditCard,
              sub: `Next: ${fmtDate(summary.platformNextPayment)}`,
            },
          ]
        : [
            {
              label: "This month",
              value: usd(summary.currentMonth.totalUsd),
              icon: DollarSign,
              sub: fmtMonth(summary.currentMonth.month),
            },
            {
              label: "Apify (all time)",
              value: usd(summary.allTime.apifyUsd),
              icon: Database,
            },
            {
              label: "OpenAI (all time)",
              value: usd(summary.allTime.openaiUsd),
              icon: Bot,
            },
            {
              label: "Platform fee",
              value: usd(summary.platformMonthlyUsd),
              icon: CreditCard,
              sub: `Next: ${fmtDate(summary.platformNextPayment)}`,
            },
          ];

  const chartData = users
    .filter((u) => u.totalUsd > 0)
    .map((u) => ({
      name: u.appUser ?? "platform",
      total: u.totalUsd,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Heading + month stepper */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
           
          >
            Usage & Costs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Per-user cost attribution (Apify crawls + OpenAI analysis) and consolidated monthly
            spend.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg border border-border/50 p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={navIndex >= monthOptions.length - 1}
            onClick={() => setNavIndex((i) => Math.min(i + 1, monthOptions.length - 1))}
            title="Older month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[9rem] text-center px-1 tabular-nums">
            {selectedMonth ? fmtMonth(selectedMonth) : "All time"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={navIndex <= 0}
            onClick={() => setNavIndex((i) => Math.max(i - 1, 0))}
            title="Newer month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      {summaryLoading || !statItems ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <StatStrip items={statItems} />
      )}

      {/* Spend by account bar chart */}
      {!usersLoading && chartData.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Spend by account —{" "}
              {selectedMonth ? fmtMonth(selectedMonth) : "all time"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${v % 1 === 0 ? v : v.toFixed(2)}`}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <RechartsTooltip
                  formatter={(value: number) => [usd(value), "Total"]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                    boxShadow: "0 4px 12px hsl(var(--foreground) / 0.08)",
                  }}
                  cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={52}>
                  {chartData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={
                        index === 0
                          ? "hsl(var(--primary))"
                          : `hsl(var(--primary) / ${Math.max(0.25, 0.75 - index * 0.06)})`
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-account breakdown table */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Per-account breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <Skeleton className="h-40" />
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No attributable costs{" "}
              {selectedMonth ? `in ${fmtMonth(selectedMonth)}` : "recorded yet"}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="py-2 pr-4">Account</th>
                    <th className="py-2 pr-4 text-right">Apify</th>
                    <th className="py-2 pr-4 text-right">OpenAI</th>
                    <th className="py-2 pr-4 text-right">Tokens (in / out)</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.appUser ?? "__platform__"} className="border-b border-border/50">
                      <td className="py-2 pr-4">
                        <span className="flex items-center gap-1.5 flex-wrap">
                          {u.appUser ?? (
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              platform / shared
                            </Badge>
                          )}
                          {u.estimated && (
                            <span
                              className="text-[10px] font-mono text-amber-500"
                              title="Reconstructed from stored content — see note below"
                            >
                              est.
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">{usd(u.apifyUsd)}</td>
                      <td className="py-2 pr-4 text-right">{usd(u.openaiUsd)}</td>
                      <td className="py-2 pr-4 text-right font-mono text-xs text-muted-foreground">
                        {u.tokensInput.toLocaleString()} / {u.tokensOutput.toLocaleString()}
                      </td>
                      <td className="py-2 text-right font-semibold">{usd(u.totalUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly history */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Monthly history</CardTitle>
        </CardHeader>
        <CardContent>
          {summaryLoading || !summary ? (
            <Skeleton className="h-40" />
          ) : summary.months.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No usage recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="py-2 pr-4">Month</th>
                    <th className="py-2 pr-4 text-right">Apify</th>
                    <th className="py-2 pr-4 text-right">OpenAI</th>
                    <th className="py-2 pr-4 text-right">Platform</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.months.map((m) => (
                    <tr key={m.month} className="border-b border-border/50">
                      <td className="py-2 pr-4">
                        <span className="flex items-center gap-1.5">
                          {fmtMonth(m.month)}
                          {m.estimated && (
                            <span
                              className="text-[10px] font-mono text-amber-500"
                              title="Reconstructed from stored content"
                            >
                              est.
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">{usd(m.apifyUsd)}</td>
                      <td className="py-2 pr-4 text-right">{usd(m.openaiUsd)}</td>
                      <td className="py-2 pr-4 text-right">{usd(m.platformUsd)}</td>
                      <td className="py-2 text-right font-semibold">{usd(m.totalUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Est. footnote */}
      {anyEstimated && (
        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-4">
          <span className="text-amber-500 font-mono">est.</span> — Figures marked "est." are
          reconstructed from stored content. Token usage and per-run costs weren't recorded before
          cost tracking went live, so historical OpenAI spend is estimated (token counts × list
          price) and Apify spend uses actual run costs from your Apify account with approximate
          per-user attribution. All costs are recorded automatically from now on.
        </p>
      )}
    </div>
  );
}
