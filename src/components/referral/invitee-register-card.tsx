import { Link } from '@tanstack/react-router';
import { UserPlus, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface InviteeRegisterCardProps {
  code?: string;
}

export function InviteeRegisterCard({ code }: InviteeRegisterCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="rounded-3xl border-subtle-border">
        <CardContent className="p-8">
          <div className="flex items-start gap-4">
            <div className="bg-subtle-background rounded-2xl p-3 shrink-0">
              <UserPlus className="w-6 h-6 text-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-medium text-foreground mb-2">Step 1: Create Your Account</h3>
              <p className="text-muted-foreground mb-4">
                Register to accept this invitation and unlock lifetime premium access
              </p>
              <Button asChild size="lg" className="rounded-full">
                <Link to="/register" search={code ? ({ code } as any) : undefined}>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
