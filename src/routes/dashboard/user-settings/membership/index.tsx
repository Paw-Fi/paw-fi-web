import { createFileRoute } from "@tanstack/react-router";
import { MembershipDashboard } from "@/components/membership/MembershipDashboard";
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';

export const Route = createFileRoute("/dashboard/user-settings/membership/")({
  component: MembershipPage,
  head: () => {
    const pageUrl = getCanonicalUrl('/dashboard/membership');
    const meta = seo({
      title: 'Membership - Subscription & Premium Features | Moneko',
      description: 'Manage Moneko membership, subscription status & explore premium AI financial features.',
      keywords: 'membership, subscription, premium features, Moneko',
      url: pageUrl,
    });
    
    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ]
    };
  },
});

function MembershipPage() {
  return <MembershipDashboard />;
}
