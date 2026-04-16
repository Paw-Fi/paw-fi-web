import { Clock, AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrialingUser {
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

export function TrialingUsersTable({ users }: TrialingUsersTableProps) {
  const now = new Date();
  const stripeCount = users.filter((u) => u.provider === "stripe").length;
  const appleCount = users.filter((u) => u.provider === "apple").length;

  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <p className="text-xs tracking-[0.25em] text-white/60 uppercase">
            Active Trials
          </p>
          <CardTitle className="mt-1 text-xl text-white">
            {users.length} Users in Trial
          </CardTitle>
          {(stripeCount > 0 || appleCount > 0) && (
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="text-white/50">
                <span className="inline-block w-2 h-2 rounded-full bg-[#635BFF] mr-1" />
                Stripe: {stripeCount}
              </span>
              <span className="text-white/50">
                <span className="inline-block w-2 h-2 rounded-full bg-[#007AFF] mr-1" />
                Apple: {appleCount}
              </span>
            </div>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
          <Clock className="h-5 w-5 text-blue-400" />
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-white/50">No active trials</p>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-4 font-medium text-white/60">User</th>
                  <th className="py-2 px-4 font-medium text-white/60">Plan</th>
                  <th className="py-2 px-4 font-medium text-white/60">Provider</th>
                  <th className="py-2 px-4 font-medium text-white/60">Trial Ends</th>
                  <th className="py-2 pl-4 font-medium text-white/60">Time Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => {
                  const trialEnd = user.trialEnd ? new Date(user.trialEnd) : null;
                  const daysLeft = trialEnd
                    ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  const isExpiringSoon = daysLeft <= 2 && daysLeft >= 0;
                  const isExpired = daysLeft < 0;

                  return (
                    <tr key={user.id} className="hover:bg-white/5">
                      <td className="py-3 pr-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">
                            {user.fullName || "Unknown"}
                          </span>
                          <span className="text-xs text-white/50">{user.email || user.userId.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-400 capitalize">
                          {user.plan}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {user.provider ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              user.provider === "stripe"
                                ? "bg-[#635BFF]/20 text-[#635BFF]"
                                : "bg-[#007AFF]/20 text-[#007AFF]"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.provider === "stripe" ? "bg-[#635BFF]" : "bg-[#007AFF]"
                              }`}
                            />
                            {user.provider === "stripe" ? "Stripe" : "Apple"}
                          </span>
                        ) : (
                          <span className="text-white/30 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-white/70">
                        {trialEnd
                          ? trialEnd.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-3 pl-4">
                        {isExpired ? (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            Expired
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="flex items-center gap-1 text-xs text-amber-400">
                            <AlertCircle className="h-3 w-3" />
                            {daysLeft}d left
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400">{daysLeft}d left</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
