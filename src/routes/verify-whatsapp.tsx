import { createFileRoute, redirect } from "@tanstack/react-router";
import { WhatsAppBinding } from "@/components/settings/whatsapp-binding";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/verify-whatsapp")({
  component: VerifyWhatsappPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      otp: (search.otp as string) || undefined,
    };
  },
  beforeLoad: async ({ search }) => {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Build redirect URL with OTP parameter preserved
      const otp = (search as { otp?: string }).otp;
      const redirectUrl = otp 
        ? `/verify-whatsapp?otp=${otp}`
        : '/verify-whatsapp';
      
      // Redirect to login with return URL
      throw redirect({
        to: '/login',
        search: {
          redirect: redirectUrl,
        },
      });
    }
  },
});

function VerifyWhatsappPage() {
  const { otp } = Route.useSearch();

  return (
    <div className="container mx-auto max-w-md py-8">
      <WhatsAppBinding otpFromUrl={otp} />
    </div>
  );
}
