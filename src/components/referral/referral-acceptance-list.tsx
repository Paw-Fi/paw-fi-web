import { Users } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReferralUser } from '@/types/referral.types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReferralAcceptanceListProps {
  acceptances: ReferralUser[];
}

export function ReferralAcceptanceList({ acceptances }: ReferralAcceptanceListProps) {
  if (!acceptances || acceptances.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="rounded-3xl border-subtle-border">
        <CardContent className="p-8">
          <h3 className="text-xl font-medium text-foreground mb-4">Friends Who Joined</h3>
          <div className="space-y-3">
            {acceptances.map((acceptance) => (
              <div
                key={acceptance.userId}
                className="flex items-center justify-between p-4 bg-subtle-background rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full w-10 h-10 flex items-center justify-center bg-secondary">
                    <Users className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {acceptance.fullName || acceptance.email || 'User'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(acceptance.acceptedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {acceptance.status === 'completed' ? (
                  <Badge className="rounded-full">Completed</Badge>
                ) : (
                  <Badge variant="secondary" className="rounded-full">Pending</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
