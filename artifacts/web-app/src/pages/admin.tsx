import React, { useState, useEffect } from "react";
import { fmtDateTimeNumeric, fmtDuration } from "@/lib/utils";
import { 
  useListJobs,
  getListJobsQueryKey,
  useResumeClassification,
  useResumeFacebookClassification,
  useResumeInstagramClassification,
  useResumeTikTokClassification,
  useResumeTwitterClassification,
  useResumeYoutubeClassification,
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
  useDeriveArchetypes,
  useListArchetypes,
  getListArchetypesQueryKey,
  useGetApifySettings,
  getGetApifySettingsQueryKey,
  useUpdateApifySettings,
  useTestApifyConnection,
  getMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pager } from "@/components/pager";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Activity, KeyRound, CheckCircle2, AlertCircle, RefreshCw, Sparkles, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Wifi, ChevronDown } from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiX, SiYoutube } from "react-icons/si";
import { FaRedditAlien } from "react-icons/fa";
import type { IconType } from "react-icons";

const FINISHED_STATUSES = new Set(["completed", "failed", "cancelled"]);
const PAGE_SIZE = 5;

type QueueRow = {
  source?: string | null;
  id: number;
  jobType: string;
  status?: string | null;
  title?: string | null;
  subredditName?: string | null;
  postUrl?: string | null;
  targetUsername?: string | null;
};

const rowKey = (job: QueueRow) => `${job.source ?? "job"}-${job.id}`;

// Friendly, plain-language label for each pipeline activity so the queue is
// readable without knowing the internal jobType codes.
function jobTypeLabel(jobType: string): string {
  switch (jobType) {
    case "crawl_subreddit":
      return "Reddit crawl — subreddit posts";
    case "crawl_comments":
      return "Reddit crawl — post comments";
    case "investigate_user":
      return "Reddit crawl — user history";
    case "analyze_user":
      return "Classify one Reddit user";
    case "reanalyze_user":
      return "Re-analyze one Reddit user (no crawl)";
    case "analyze_batch":
      return "Classify Reddit users";
    case "analyze_facebook_batch":
      return "Classify Facebook users";
    case "analyze_instagram_batch":
      return "Classify Instagram users";
    case "analyze_tiktok_batch":
      return "Classify TikTok users";
    case "analyze_twitter_batch":
      return "Classify X (Twitter) users";
    case "analyze_youtube_batch":
      return "Classify YouTube users";
    case "topic_analysis":
      return "Sentiment report";
    default:
      return jobType;
  }
}

// The expandable detail panel target: a clickable Reddit link for crawls, or the
// topic summary text for a sentiment report. Null rows have nothing to expand.
function jobTarget(job: QueueRow): { label: string; url?: string } | null {
  if ((job.source ?? "job") === "sentiment") {
    return job.title ? { label: job.title } : null;
  }
  if (job.jobType === "crawl_comments") {
    if (!job.postUrl) return null;
    return { label: job.postUrl, url: job.postUrl };
  }
  if (
    job.jobType === "investigate_user" ||
    job.jobType === "analyze_user" ||
    job.jobType === "reanalyze_user" ||
    job.jobType === "analyze_batch"
  ) {
    if (!job.targetUsername) return null;
    // For batch runs the username is only meaningful while in progress; a stale
    // value on a finished/failed row must not be labelled "currently analysing".
    if (job.jobType === "analyze_batch" && job.status !== "running") return null;
    return {
      label: `u/${job.targetUsername}`,
      url: `/reddit-users/${job.targetUsername}`,
    };
  }
  if (job.subredditName) {
    return { label: `r/${job.subredditName}`, url: `https://www.reddit.com/r/${job.subredditName}` };
  }
  return null;
}

export default function Admin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [apifyKey, setApifyKey] = useState("");
  const [apifyActor, setApifyActor] = useState("");
  const [apifyFacebookActor, setApifyFacebookActor] = useState("");
  const [apifyInstagramActor, setApifyInstagramActor] = useState("");
  const [apifyTiktokActor, setApifyTiktokActor] = useState("");
  const [apifyTwitterActor, setApifyTwitterActor] = useState("");
  const [apifyYoutubeActor, setApifyYoutubeActor] = useState("");
  const [apifyArcticFallback, setApifyArcticFallback] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [deriveSource, setDeriveSource] = useState("");
  const [deriveDescription, setDeriveDescription] = useState("");

  const toggleJob = (key: string) =>
    setExpandedJobs(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const jobsParams = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const { data: jobsData, isLoading: loadingJobs } = useListJobs(jobsParams, {
    query: { queryKey: getListJobsQueryKey(jobsParams), refetchInterval: 10000 }
  });

  const jobs = jobsData?.jobs;
  const jobsTotal = jobsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(jobsTotal / PAGE_SIZE));

  const deriveArchetypesMutation = useDeriveArchetypes();
  const { data: currentArchetypes } = useListArchetypes(undefined, {
    query: { queryKey: getListArchetypesQueryKey(), refetchInterval: 10000 },
  });
  const deriveJob = jobs?.find((j) => j.jobType === "derive_archetypes");
  const deriveRunning =
    deriveArchetypesMutation.isPending ||
    deriveJob?.status === "running" ||
    deriveJob?.status === "pending";

  const handleDeriveArchetypes = (e: React.FormEvent) => {
    e.preventDefault();
    const source = deriveSource.trim();
    if (!source) {
      toast({ title: "Missing community", description: "Enter a subreddit reference first.", variant: "destructive" });
      return;
    }
    deriveArchetypesMutation.mutate(
      { data: { source, description: deriveDescription.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Regenerating archetypes", description: "Running in the background — this can take up to a minute." });
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey(jobsParams) });
        },
        onError: (err) => {
          toast({ title: "Could not start", description: err instanceof Error ? err.message : "Request failed.", variant: "destructive" });
        },
      },
    );
  };

  const { data: fbDashboard } = useGetFacebookDashboard({
    query: { queryKey: getGetFacebookDashboardQueryKey(), refetchInterval: 10000 },
  });
  const { data: dashboard } = useGetDashboard(undefined, {
    query: { queryKey: getGetDashboardQueryKey(), refetchInterval: 10000 }
  });
  const { data: igDashboard } = useGetInstagramDashboard({
    query: { queryKey: getGetInstagramDashboardQueryKey(), refetchInterval: 10000 }
  });
  const { data: ttDashboard } = useGetTikTokDashboard({
    query: { queryKey: getGetTikTokDashboardQueryKey(), refetchInterval: 10000 }
  });
  const { data: ytDashboard } = useGetYoutubeDashboard({
    query: { queryKey: getGetYoutubeDashboardQueryKey(), refetchInterval: 10000 }
  });
  const { data: twDashboard } = useGetTwitterDashboard({
    query: { queryKey: getGetTwitterDashboardQueryKey(), refetchInterval: 10000 }
  });

  const hasUnclassified = [dashboard, fbDashboard, igDashboard, ttDashboard, twDashboard, ytDashboard]
    .some((d) => (d?.unanalyzedUsers ?? 0) > 0);

  const { data: apify } = useGetApifySettings({
    query: { queryKey: getGetApifySettingsQueryKey() }
  });

  useEffect(() => {
    if (apify?.actorId) setApifyActor(apify.actorId);
  }, [apify?.actorId]);

  useEffect(() => {
    if (apify?.facebookActorId) setApifyFacebookActor(apify.facebookActorId);
  }, [apify?.facebookActorId]);

  useEffect(() => {
    if (apify?.instagramActorId) setApifyInstagramActor(apify.instagramActorId);
  }, [apify?.instagramActorId]);

  useEffect(() => {
    if (apify?.tiktokActorId) setApifyTiktokActor(apify.tiktokActorId);
  }, [apify?.tiktokActorId]);

  useEffect(() => {
    if (apify?.twitterActorId) setApifyTwitterActor(apify.twitterActorId);
  }, [apify?.twitterActorId]);

  useEffect(() => {
    if (apify?.youtubeActorId) setApifyYoutubeActor(apify.youtubeActorId);
  }, [apify?.youtubeActorId]);

  useEffect(() => {
    if (apify?.arcticFallbackEnabled !== undefined) setApifyArcticFallback(apify.arcticFallbackEnabled);
  }, [apify?.arcticFallbackEnabled]);

  // Only the main admin may edit the shared Apify API token. Members can still
  // view its masked status and edit the per-platform actor IDs.
  const { data: me } = useQuery({
    queryKey: getGetMeQueryKey(),
    queryFn: () => getMe(),
  });
  const isAdmin = me?.role === "admin";

  const resumeClassification = useResumeClassification();
  const resumeFacebookClassification = useResumeFacebookClassification();
  const resumeInstagramClassification = useResumeInstagramClassification();
  const resumeTikTokClassification = useResumeTikTokClassification();
  const resumeTwitterClassification = useResumeTwitterClassification();
  const resumeYoutubeClassification = useResumeYoutubeClassification();
  const updateApify = useUpdateApifySettings();
  const testApify = useTestApifyConnection();

  const [testResult, setTestResult] = useState<{ ok: boolean; username?: string | null; error?: string | null } | null>(null);
  const [showCosts, setShowCosts] = useState(false);

  const handleTestApify = () => {
    setTestResult(null);
    testApify.mutate(undefined, {
      onSuccess: (res) => {
        setTestResult(res);
      },
      onError: () => {
        setTestResult({ ok: false, error: "Request failed" });
      },
    });
  };


  const handleResumeClassification = async () => {
    try {
      // Resume every platform that has a real classification backend: Reddit,
      // Facebook, Instagram, TikTok and X (Twitter) each expose a resume endpoint.
      const [reddit, facebook, instagram, tiktok, twitter, youtube] = await Promise.all([
        resumeClassification.mutateAsync(undefined),
        resumeFacebookClassification.mutateAsync(undefined),
        resumeInstagramClassification.mutateAsync(undefined),
        resumeTikTokClassification.mutateAsync(undefined),
        resumeTwitterClassification.mutateAsync(undefined),
        resumeYoutubeClassification.mutateAsync(undefined),
      ]);

      const startedParts: string[] = [];
      if (reddit.status === "started") startedParts.push(`${reddit.pending} Reddit`);
      if (facebook.status === "started") startedParts.push(`${facebook.pending} Facebook`);
      if (instagram.status === "started") startedParts.push(`${instagram.pending} Instagram`);
      if (tiktok.status === "started") startedParts.push(`${tiktok.pending} TikTok`);
      if (twitter.status === "started") startedParts.push(`${twitter.pending} X`);
      if (youtube.status === "started") startedParts.push(`${youtube.pending} YouTube`);

      const anyRunning =
        reddit.status === "already_running" ||
        facebook.status === "already_running" ||
        instagram.status === "already_running" ||
        tiktok.status === "already_running" ||
        twitter.status === "already_running" ||
        youtube.status === "already_running";

      if (startedParts.length > 0) {
        toast({ title: "Analysis Resumed", description: `Classifying ${startedParts.join(" + ")} unanalyzed.` });
      } else if (anyRunning) {
        toast({ title: "Already Running", description: "A classification pass is already in progress." });
      } else {
        toast({ title: "Nothing to Resume", description: "All entities are already classified." });
      }

      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey(jobsParams) });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetFacebookDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInstagramDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTikTokDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTwitterDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetYoutubeDashboardQueryKey() });
    } catch {
      toast({ title: "Resume Failed", description: "Could not start classification.", variant: "destructive" });
    }
  };

  const resumeBusy =
    resumeClassification.isPending ||
    resumeFacebookClassification.isPending ||
    resumeInstagramClassification.isPending ||
    resumeTikTokClassification.isPending ||
    resumeTwitterClassification.isPending ||
    resumeYoutubeClassification.isPending;

  const handleSaveApify = (e: React.FormEvent) => {
    e.preventDefault();
    updateApify.mutate({
      data: {
        ...(apifyKey.trim() !== "" ? { apiKey: apifyKey.trim() } : {}),
        actorId: apifyActor.trim(),
        facebookActorId: apifyFacebookActor.trim(),
        instagramActorId: apifyInstagramActor.trim(),
        tiktokActorId: apifyTiktokActor.trim(),
        twitterActorId: apifyTwitterActor.trim(),
        youtubeActorId: apifyYoutubeActor.trim(),
        arcticFallbackEnabled: apifyArcticFallback,
      }
    }, {
      onSuccess: () => {
        setApifyKey("");
        queryClient.invalidateQueries({ queryKey: getGetApifySettingsQueryKey() });
        toast({ title: "Integration Updated", description: "Apify configuration saved." });
      },
      onError: () => {
        toast({ title: "Save Failed", description: "Could not save Apify settings.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Pipeline queue, scraper configuration, and archetype taxonomy.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-mono text-sm text-muted-foreground tracking-wider flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                SYSTEM PIPELINE QUEUE
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  { icon: FaRedditAlien, label: "Reddit", n: dashboard?.unanalyzedUsers },
                  { icon: SiFacebook, label: "Facebook", n: fbDashboard?.unanalyzedUsers },
                  { icon: SiInstagram, label: "Instagram", n: igDashboard?.unanalyzedUsers },
                  { icon: SiTiktok, label: "TikTok", n: ttDashboard?.unanalyzedUsers },
                  { icon: SiX, label: "X", n: twDashboard?.unanalyzedUsers },
                  { icon: SiYoutube, label: "YouTube", n: ytDashboard?.unanalyzedUsers },
                ] as { icon: IconType; label: string; n: number | undefined }[])
                  .filter((p) => (p.n ?? 0) > 0)
                  .map(({ icon: Icon, label, n }) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="font-mono text-[10px] bg-accent/10 text-accent border-accent/20 flex items-center gap-1.5"
                    >
                      <Icon className="w-3 h-3" aria-label={label} />
                      {n} unclassified
                    </Badge>
                  ))}
                <Button
                  size="sm"
                  variant="secondary"
                  className="font-mono text-xs"
                  onClick={handleResumeClassification}
                  disabled={resumeBusy || !hasUnclassified}
                  title={hasUnclassified ? "Classify all unclassified entities" : "All entities are already classified"}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-2 ${resumeBusy ? "animate-spin" : ""}`} />
                  {resumeBusy ? "CLASSIFYING…" : "CLASSIFY ALL"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border font-mono tracking-wider">
                  <tr>
                    <th className="w-8 px-2 py-3"></th>
                    <th className="px-4 py-3 text-center">Job ID</th>
                    <th className="px-4 py-3 text-center">Activity</th>
                    <th className="px-4 py-3 text-center">Launched By</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Start</th>
                    <th className="px-4 py-3 text-center">Time Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingJobs ? (
                    Array.from({length: 3}).map((_, i) => (
                      <tr key={i} className="border-b border-border/50"><td colSpan={7} className="p-4"><Skeleton className="h-6 w-full" /></td></tr>
                    ))
                  ) : jobs?.map(job => {
                    const target = jobTarget(job);
                    const key = rowKey(job);
                    const expanded = expandedJobs.has(key);
                    const isReport = (job.source ?? "job") === "sentiment";
                    const progressText = isReport
                      ? (job.total ? `${job.progress ?? 0}/${job.total} posts` : '-')
                      : job.jobType === 'crawl_comments'
                        ? (job.progress !== null ? `${job.progress} comments` : '-')
                        : (job.progress !== null && job.total ? `${job.progress}/${job.total}` : '-');
                    return (
                      <React.Fragment key={key}>
                        <tr className={`border-b border-border/50 hover:bg-muted/10 ${FINISHED_STATUSES.has(job.status) ? "opacity-50" : ""}`}>
                          <td className="w-8 px-2 py-3">
                            {target ? (
                              <button
                                onClick={() => toggleJob(key)}
                                className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                              >
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`} />
                              </button>
                            ) : <span className="block w-5" />}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {isReport ? 'S' : '#'}{job.id.toString().padStart(5, '0')}
                          </td>
                          <td className="px-4 py-3">{jobTypeLabel(job.jobType)}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{job.launchedBy ?? '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center gap-2">
                              <Badge variant="outline" className={`font-mono text-[10px] ${
                                job.status === 'completed' ? 'bg-primary/10 text-primary border-primary/20' :
                                job.status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                'bg-accent/10 text-accent border-accent/20 animate-pulse'
                              }`}>
                                {job.status.toUpperCase()}
                              </Badge>
                              {progressText !== '-' && (
                                <span className="font-mono text-xs text-muted-foreground">({progressText})</span>
                              )}
                              {job.jobType === 'analyze_batch' && job.status === 'running' && job.targetUsername && (
                                <span className="font-mono text-xs text-accent">u/{job.targetUsername}</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                            {fmtDateTimeNumeric(job.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground text-xs font-mono">
                            {fmtDuration(job.createdAt, job.completedAt)}
                          </td>
                        </tr>
                        {expanded && target && (
                          <tr className={`border-b border-border/30 bg-muted/5 ${FINISHED_STATUSES.has(job.status) ? "opacity-50" : ""}`}>
                            <td />
                            <td colSpan={6} className="px-4 py-2.5">
                              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                                {isReport ? 'Topic' : job.jobType === 'crawl_comments' ? 'Thread URL' : job.jobType === 'analyze_batch' ? 'Currently analysing' : (job.jobType === 'investigate_user' || job.jobType === 'analyze_user' || job.jobType === 'reanalyze_user') ? 'User' : 'Subreddit'}
                              </p>
                              {target.url ? (
                                <a
                                  href={target.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono text-primary hover:underline break-all"
                                >
                                  {target.label}
                                </a>
                              ) : (
                                <p className="text-xs font-mono text-foreground/80 break-words">{target.label}</p>
                              )}
                              {job.errorMessage && (
                                <p className="text-[11px] text-destructive mt-1.5 font-mono">{job.errorMessage}</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {jobs?.length === 0 && jobsTotal === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground font-mono text-xs">
                        QUEUE EMPTY
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-[11px] text-muted-foreground font-mono">
                  {jobsTotal} JOBS
                </span>
                <Pager
                  page={page}
                  pageCount={totalPages}
                  onPageChange={(p) => {
                    setPage(p);
                    setExpandedJobs(new Set());
                  }}
                />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-4 font-mono leading-relaxed">
              Finished rows (dimmed) are frozen snapshots from when each job ran — their
              progress totals are historical and don't add up across runs. The live count
              above is the single source of truth; "Resume Analysis" always re-scans every
              user still unclassified.
            </p>
          </CardContent>
        </Card>

        {isAdmin && (
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="font-mono text-sm text-muted-foreground tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                ARCHETYPE TAXONOMY
              </span>
              {currentArchetypes ? (
                <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20">
                  {currentArchetypes.length} ACTIVE
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Regenerate the fixed set of archetypes used to classify every user. Point it at the
              community you analyse and the taxonomy is re-derived by AI in the background, then
              applied to all future classification. Existing analyses are unchanged until users are
              re-classified.
            </p>
            <form onSubmit={handleDeriveArchetypes} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-2 block">SUBREDDIT / COMMUNITY REFERENCE</label>
                <Input
                  value={deriveSource}
                  onChange={(e) => setDeriveSource(e.target.value)}
                  placeholder="r/politics"
                  className="bg-background/50 font-mono"
                  disabled={deriveRunning}
                />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-2 block">DESCRIPTION (OPTIONAL)</label>
                <Input
                  value={deriveDescription}
                  onChange={(e) => setDeriveDescription(e.target.value)}
                  placeholder="e.g. US national politics discussion"
                  className="bg-background/50 font-mono"
                  disabled={deriveRunning}
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full font-mono" disabled={deriveRunning}>
                {deriveRunning ? "REGENERATING…" : "REGENERATE ARCHETYPES"}
              </Button>
              {deriveJob && (
                <div className={`flex items-center gap-2 text-xs font-mono rounded-md px-3 py-2 border ${
                  deriveJob.status === "completed"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : deriveJob.status === "failed"
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-muted/30 text-muted-foreground border-border/40"
                }`}>
                  {deriveJob.status === "completed"
                    ? <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Regenerated {deriveJob.total ?? 0} archetypes for {deriveJob.targetUsername}</>
                    : deriveJob.status === "failed"
                      ? <><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {deriveJob.errorMessage ?? "Failed to regenerate."}</>
                      : <><RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" /> Regenerating for {deriveJob.targetUsername}…</>
                  }
                </div>
              )}
              {currentArchetypes && currentArchetypes.length > 0 && (
                <div className="text-[10px] font-mono text-muted-foreground border border-border/40 rounded-md px-3 py-2 bg-background/30">
                  <p className="font-semibold text-foreground/70 mb-1">CURRENT TAXONOMY</p>
                  <p className="leading-relaxed">{currentArchetypes.map((a) => a.name).join(" · ")}</p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
        )}

        <Card className={`glass border-primary/20 ${isAdmin ? "" : "lg:col-span-2"}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Scraper Integration</h3>
                <span className="text-xs text-muted-foreground">· Apify</span>
              </div>
              {apify?.configured ? (
                <Badge variant="outline" className="text-[11px] bg-primary/8 text-primary border-primary/20 gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] bg-destructive/8 text-destructive border-destructive/20 gap-1">
                  <AlertCircle className="w-3 h-3" /> Not configured
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveApify} className="space-y-5">

              {/* ── Zone 1: Connection ───────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      API Token
                      {apify?.configured && apify.maskedKey && (
                        <span className="text-muted-foreground font-normal ml-1.5">current: {apify.maskedKey}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Crawls route through Apify residential proxies.{" "}
                      <a href="https://console.apify.com/account/integrations" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        Get a token ↗
                      </a>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCosts((v) => !v)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-4"
                  >
                    Estimated costs
                    <ChevronDown className={`w-3 h-3 transition-transform ${showCosts ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {showCosts && (
                  <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground/70 mb-1.5">Approximate Apify costs</p>
                    <p>• Subreddit crawl (posts only, free actor) — ~$1 per 170 posts</p>
                    <p>• Sentiment Analysis crawl (comments per post) — ~$1 per 3 posts</p>
                    <p className="text-muted-foreground/60 pt-1">Varies with post volume, comment depth, and Apify plan.</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {isAdmin ? (
                    <Input
                      type="password"
                      value={apifyKey}
                      onChange={(e) => setApifyKey(e.target.value)}
                      placeholder={apify?.configured ? "Enter new token to replace…" : "apify_api_…"}
                      className="font-mono flex-1"
                      autoComplete="off"
                    />
                  ) : (
                    <Input
                      type="text"
                      value={apify?.configured && apify.maskedKey ? apify.maskedKey : "Not configured"}
                      readOnly
                      disabled
                      className="font-mono flex-1"
                    />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    disabled={testApify.isPending || !apify?.configured}
                    onClick={handleTestApify}
                    title={!apify?.configured ? "Save a token first" : "Test Apify connection"}
                  >
                    <Wifi className={`w-4 h-4 mr-1.5 ${testApify.isPending ? "animate-pulse" : ""}`} />
                    {testApify.isPending ? "Testing…" : "Test"}
                  </Button>
                </div>

                {!isAdmin && (
                  <p className="text-xs text-muted-foreground">Only an admin can change the API token.</p>
                )}

                {testResult && (
                  <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${
                    testResult.ok
                      ? "bg-primary/8 text-primary border-primary/20"
                      : "bg-destructive/8 text-destructive border-destructive/20"
                  }`}>
                    {testResult.ok
                      ? <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Connected as <span className="font-medium ml-0.5">{testResult.username}</span></>
                      : <><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {testResult.error}</>
                    }
                  </div>
                )}
              </div>

              {/* ── Divider ──────────────────────────────────────────────── */}
              <div className="border-t border-border/50" />

              {/* ── Zone 2: Actor IDs ────────────────────────────────────── */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-foreground">Actor IDs</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sets the Apify actor used to scrape each platform. Leave blank to use defaults.</p>
                </div>

                <div className="space-y-2">
                  {([
                    {
                      Icon: FaRedditAlien,
                      label: "Reddit",
                      value: apifyActor,
                      onChange: (v: string) => setApifyActor(v),
                      placeholder: "trudax~reddit-scraper",
                      hint: "Default lite actor returns posts OR comments only; full actor returns both together.",
                    },
                    {
                      Icon: SiFacebook,
                      label: "Facebook",
                      value: apifyFacebookActor,
                      onChange: (v: string) => setApifyFacebookActor(v),
                      placeholder: "apify~facebook-comments-scraper",
                    },
                    {
                      Icon: SiInstagram,
                      label: "Instagram",
                      value: apifyInstagramActor,
                      onChange: (v: string) => setApifyInstagramActor(v),
                      placeholder: "apify~instagram-comment-scraper",
                    },
                    {
                      Icon: SiTiktok,
                      label: "TikTok",
                      value: apifyTiktokActor,
                      onChange: (v: string) => setApifyTiktokActor(v),
                      placeholder: "clockworks~tiktok-comments-scraper",
                    },
                    {
                      Icon: SiX,
                      label: "X / Twitter",
                      value: apifyTwitterActor,
                      onChange: (v: string) => setApifyTwitterActor(v),
                      placeholder: "kaitoeasyapi~twitter-reply",
                    },
                    {
                      Icon: SiYoutube,
                      label: "YouTube",
                      value: apifyYoutubeActor,
                      onChange: (v: string) => setApifyYoutubeActor(v),
                      placeholder: "streamers~youtube-comments-scraper",
                    },
                  ] as { Icon: React.ElementType; label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string }[]).map(({ Icon, label, value, onChange, placeholder, hint }) => (
                    <div key={label} className="grid grid-cols-[120px_1fr] items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-foreground/80">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium">{label}</span>
                      </div>
                      <Input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="font-mono text-xs h-8"
                        title={hint}
                      />
                    </div>
                  ))}
                </div>

                {/* Archive fallback + save */}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 mt-1">
                  <div>
                    <p className="text-xs font-medium text-foreground">Archive fallback</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Recover deleted Reddit posts &amp; comments from Arctic Shift during crawls.
                    </p>
                  </div>
                  <Switch
                    checked={apifyArcticFallback}
                    onCheckedChange={setApifyArcticFallback}
                    aria-label="Toggle Arctic Shift archive fallback"
                  />
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full"
                  disabled={updateApify.isPending}
                >
                  {updateApify.isPending ? "Saving…" : "Save integration"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
