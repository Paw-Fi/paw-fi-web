import { Clock } from "lucide-react";

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
  const stripeCount = users.filter((u) => u.provider === "stripe").length;
  const appleCount = users.filter((u) => u.provider === "apple").length;

  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <p className="text-xs tracking-[0.25em] text-white/60 uppercase">
            Active Trials
          </p>
          <CardTitle className="text-2xl font-bold text-white">
            {users.length.toLocaleString()}
          </CardTitle>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
          <Clock className="h-5 w-5 text-blue-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider breakdown */}
        {(stripeCount > 0 || appleCount > 0) && (
          <div className="flex items-center gap-3 pt-2 text-xs">
            {stripeCount > 0 && (
              <span className="text-white/50">
                <span className="inline-block w-2 h-2 rounded-full bg-[#635BFF] mr-1" />
                Stripe: {stripeCount}
              </span>
            )}
            {appleCount > 0 && (
              <span className="text-white/50">
                <span className="inline-block w-2 h-2 rounded-full bg-[#007AFF] mr-1" />
                Apple: {appleCount}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
