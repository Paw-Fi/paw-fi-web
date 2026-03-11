import { Gift } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AcceptInvitationCardProps {
  code: string;
  referrerEmail: string;
  onAccept: () => void;
  isLoading: boolean;
}

export function AcceptInvitationCard({
  code,
  referrerEmail,
  onAccept,
  isLoading,
}: AcceptInvitationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="border-subtle-border rounded-3xl">
        <CardContent className="p-8">
          <div className="mb-6 text-center">
            <div className="bg-subtle-background mx-auto mb-4 w-fit rounded-2xl p-3">
              <Gift className="text-foreground h-8 w-8" />
            </div>
            <h3 className="text-foreground mb-2 text-2xl font-medium">
              You're Invited
            </h3>
            <p className="text-muted-foreground mb-3">
              {referrerEmail} invited you to join Moneko and claim{" "}
              <strong>50% off the lifetime plan</strong>.
            </p>
            <p className="text-muted-foreground mb-4 text-sm">
              Your 50% discount will be applied automatically at checkout, and
              you'll enter your card details there to complete the purchase.
            </p>
            <div className="bg-subtle-background mb-6 inline-block rounded-2xl p-4">
              <p className="text-muted-foreground mb-1 text-sm">
                Referral Code
              </p>
              <p className="text-foreground font-mono text-2xl font-semibold">
                {code}
              </p>
            </div>
          </div>

          <Button
            onClick={onAccept}
            disabled={isLoading}
            size="lg"
            className="w-full rounded-full"
          >
            {isLoading ? "Preparing Checkout..." : "Continue to Checkout"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
