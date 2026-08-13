import { Clock, CreditCard, User } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface TrialingUser {
  id: string;
  userId: string;
  plan: string;
  trialStart: string | null;
  trialEnd: string | null;
  email?: string;
  fullName?: string;
  provider?: string;
}

interface TrialingUsersTableProps {
  users: TrialingUser[];
}

export function TrialingUsersSummaryCard({ users }: TrialingUsersTableProps) {
  const stripeCount = users.filter((u) => u.provider === "stripe").length;
  const appleCount = users.filter((u) => u.provider === "apple").length;

  return (
    <div className="flex flex-col justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 p-4 transition-colors hover:border-slate-700/80">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Active Trials
          </span>
          <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.2 rounded border border-blue-900/50 bg-blue-950/40 text-blue-300">
            LIVE SNAPSHOT
          </span>
        </div>

        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-3xl font-extrabold tracking-tight text-white">
            {users.length.toLocaleString()}
          </span>
        </div>

        <p className="text-xs text-slate-500 font-normal leading-tight">
          Users currently trialing Moneko Plus
        </p>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#635BFF]" />
          Stripe: <strong className="text-slate-200 font-medium">{stripeCount}</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF]" />
          Apple: <strong className="text-slate-200 font-medium">{appleCount}</strong>
        </span>
      </div>
    </div>
  );
}

export function TrialingUsersTable({ users }: TrialingUsersTableProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/40">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Trialing Users Directory
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Active trial accounts and payment provider status
          </p>
        </div>
        <span className="text-xs font-medium text-slate-400 px-2 py-0.5 rounded border border-slate-800 bg-slate-900">
          {users.length} Active
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-900/60 border-b border-slate-800">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">User / Email</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Plan</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Provider</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Started</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Trial Ends</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="border-slate-800/60 hover:bg-slate-900/40 transition-colors">
                <TableCell className="font-medium text-xs text-white py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      <User className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200 truncate max-w-[200px]">
                        {user.fullName || user.email || user.userId}
                      </p>
                      {user.email && user.fullName && (
                        <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-300 py-2.5">
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border border-indigo-900/50 bg-indigo-950/40 text-indigo-300">
                    {user.plan || "Plus"}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-slate-300 py-2.5">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <CreditCard className="h-3 w-3 text-slate-500" />
                    <span className="capitalize">{user.provider || "Unknown"}</span>
                  </span>
                </TableCell>
                <TableCell className="text-xs text-slate-400 py-2.5">
                  {user.trialStart ? format(new Date(user.trialStart), "MMM d, yyyy") : "N/A"}
                </TableCell>
                <TableCell className="text-xs font-semibold text-amber-300 py-2.5">
                  {user.trialEnd ? format(new Date(user.trialEnd), "MMM d, HH:mm") : "N/A"}
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-xs text-slate-500">
                  No users currently in trial.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


