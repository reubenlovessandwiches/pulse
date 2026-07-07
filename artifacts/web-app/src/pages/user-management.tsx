import { useState } from "react";
import {
  useListAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useListLoginAttempts,
  getListAccountsQueryKey,
  getMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import type {
  CreateAccountBodyRole,
  UpdateAccountBodyRole,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pager } from "@/components/pager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Trash2,
  Pencil,
  ShieldCheck,
  User as UserIcon,
  Check,
  X,
  ShieldAlert,
  Eye,
  EyeOff,
  History,
} from "lucide-react";

const ATTEMPTS_PER_PAGE = 10;

function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`pr-10 ${className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function UserManagement() {
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: getGetMeQueryKey(),
    queryFn: () => getMe(),
    retry: false,
  });

  if (meLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (me?.role !== "admin") {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-destructive mx-auto" />
        <h1 className="text-xl font-bold">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">
          Account management is available to the main admin only.
        </p>
      </div>
    );
  }

  return <UserManagementContent currentUser={me.username} />;
}

function UserManagementContent({ currentUser }: { currentUser: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const accountsQuery = useListAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const [page, setPage] = useState(0);
  const attemptsQuery = useListLoginAttempts({ page, limit: ATTEMPTS_PER_PAGE });

  const [createOpen, setCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<CreateAccountBodyRole>("member");

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UpdateAccountBodyRole>("member");
  const [editPassword, setEditPassword] = useState("");

  const openEdit = (acc: { username: string; role: string }) => {
    setEditTarget(acc.username);
    setEditRole(acc.role as UpdateAccountBodyRole);
    setEditPassword("");
  };

  const accounts = accountsQuery.data?.accounts ?? [];
  const attempts = attemptsQuery.data?.attempts ?? [];
  const total = attemptsQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / ATTEMPTS_PER_PAGE));

  const adminCount = accounts.filter((a) => a.role === "admin").length;
  const memberCount = accounts.length - adminCount;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const activeCount = accounts.filter(
    (a) => a.lastSeen && Date.now() - new Date(a.lastSeen).getTime() < thirtyDaysMs,
  ).length;

  const refreshAccounts = () =>
    queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    createAccount.mutate(
      { data: { username: username.trim(), password, role } },
      {
        onSuccess: () => {
          toast({ title: "Account created", description: `${username.trim()} (${role})` });
          setUsername("");
          setPassword("");
          setRole("member");
          setCreateOpen(false);
          refreshAccounts();
        },
        onError: () => {
          toast({
            title: "Could not create account",
            description: "Username may already be taken.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleDelete = (target: string) => {
    deleteAccount.mutate(
      { username: target },
      {
        onSuccess: () => {
          toast({ title: "Account deleted", description: target });
          refreshAccounts();
        },
        onError: () => {
          toast({
            title: "Could not delete account",
            description: "You cannot delete yourself or the last admin.",
            variant: "destructive",
          });
        },
        onSettled: () => setPendingDelete(null),
      },
    );
  };

  const handleEdit = () => {
    if (!editTarget) return;
    const data: { role?: UpdateAccountBodyRole; password?: string } = { role: editRole };
    if (editPassword) data.password = editPassword;
    updateAccount.mutate(
      { username: editTarget, data },
      {
        onSuccess: () => {
          toast({ title: "Account updated", description: editTarget });
          setEditTarget(null);
          refreshAccounts();
        },
        onError: () => {
          toast({
            title: "Could not update account",
            description: "The change was rejected — you cannot demote the last admin.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
           
          >
            Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {accounts.length > 0
              ? `${accounts.length} account${accounts.length !== 1 ? "s" : ""} · ${adminCount} admin, ${memberCount} member · ${activeCount} active in the last 30 days`
              : "Manage accounts and review access history."}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
          <UserPlus className="w-4 h-4" />
          New Account
        </Button>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList className="mb-4">
          <TabsTrigger value="accounts" className="gap-2">
            <Users className="w-3.5 h-3.5" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-3.5 h-3.5" />
            Login History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card className="glass">
            <CardContent className="pt-6">
              {accountsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground py-4">Loading…</p>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No accounts found.</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {accounts.map((acc) => {
                    const isSelf = acc.username === currentUser;
                    return (
                      <div key={acc.username} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          {acc.role === "admin" ? (
                            <ShieldCheck className="w-4 h-4 text-primary" />
                          ) : (
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                          )}
                          <div>
                            <div className="text-sm font-medium">
                              {acc.username}
                              {isSelf && (
                                <span className="text-muted-foreground font-normal"> (you)</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              last seen {acc.lastSeen ? formatUtc(acc.lastSeen) : "never"}
                            </div>
                          </div>
                          <Badge
                            variant={acc.role === "admin" ? "default" : "secondary"}
                            className="text-[11px]"
                          >
                            {acc.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(acc)}
                            aria-label={`Edit ${acc.username}`}
                            className="text-muted-foreground hover:text-primary w-8 h-8"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isSelf}
                            onClick={() => setPendingDelete(acc.username)}
                            aria-label={`Delete ${acc.username}`}
                            className="text-muted-foreground hover:text-destructive disabled:opacity-30 w-8 h-8"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Login Attempts
                </div>
                <span className="text-xs text-muted-foreground">{total} total · UTC</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {attemptsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground py-4">Loading…</p>
              ) : attempts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No login attempts recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-muted-foreground border-b border-border/50">
                        <th className="py-2 pr-4">Result</th>
                        <th className="py-2 pr-4">Username</th>
                        <th className="py-2 pr-4">IP Address</th>
                        <th className="py-2">Time (UTC)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {attempts.map((a) => (
                        <tr key={a.id}>
                          <td className="py-2.5 pr-4">
                            {a.success ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                                <Check className="w-3 h-3" /> Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium">
                                <X className="w-3 h-3" /> Failed
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-xs">{a.username}</td>
                          <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                            {a.ipAddress ?? "—"}
                          </td>
                          <td className="py-2.5 font-mono text-xs text-muted-foreground tabular-nums">
                            {formatUtc(a.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pager page={page} pageCount={pageCount} onPageChange={setPage} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New account dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New account</DialogTitle>
            <DialogDescription>Create a new login for this workspace.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="new-user"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <Select value={role} onValueChange={(v) => setRole(v as CreateAccountBodyRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAccount.isPending || !username.trim() || !password}
              >
                {createAccount.isPending ? "Creating…" : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
            <DialogDescription>
              Update the role or reset the password for{" "}
              <span className="font-mono">{editTarget}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select
                value={editRole}
                onValueChange={(v) => setEditRole(v as UpdateAccountBodyRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">New password</label>
              <PasswordInput
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updateAccount.isPending}>
              {updateAccount.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-mono">{pendingDelete}</span> and revokes their access. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
