import { Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AcceptInvitationCardProps {
  code: string;
  referrerEmail: string;
  onAccept: () => void;
  isLoading: boolean;
}

export function AcceptInvitationCard({ code, referrerEmail, onAccept, isLoading }: AcceptInvitationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="rounded-3xl border-subtle-border">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="bg-subtle-background rounded-2xl p-3 w-fit mx-auto mb-4">
              <Gift className="w-8 h-8 text-foreground" />
            </div>
            <h3 className="text-2xl font-medium text-foreground mb-2">You're Invited!</h3>
            <p className="text-muted-foreground mb-4">{referrerEmail} invited you to join Moneko and get <strong>lifetime access</strong> to premium features.</p>
            <div className="bg-subtle-background rounded-2xl p-4 mb-6 inline-block">
              <p className="text-sm text-muted-foreground mb-1">Referral Code</p>
              <p className="text-2xl font-mono font-semibold text-foreground">{code}</p>
            </div>
          </div>

          <Button
            onClick={onAccept}
            disabled={isLoading}
            size="lg"
            className="w-full rounded-full"
          >
            {isLoading ? 'Processing...' : 'Accept Invitation'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
