import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface WhatsAppBindingProps {
  otpFromUrl?: string;
}

export function WhatsAppBinding({ otpFromUrl }: WhatsAppBindingProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill OTP from URL parameter
  useEffect(() => {
    if (otpFromUrl) {
      setCode(otpFromUrl);
      // Auto-verify if OTP is provided
      verifyCode(otpFromUrl);
    }
  }, [otpFromUrl]);

  const verifyCode = async (codeToVerify?: string) => {
    const verificationCode = codeToVerify || code;
    
    if (!verificationCode.toString().trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in first');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-whatsapp-binding', {
        body: { code: verificationCode },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setVerified(true);
        setError(null);
      } else {
        setError(data?.error || 'Invalid verification code');
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      setError(error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            WhatsApp Verified
          </CardTitle>
          <CardDescription>
            Your WhatsApp number is successfully linked to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You can now use WhatsApp to track expenses and manage your budget.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Verification Failed
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please send <code className="bg-muted px-2 py-1 rounded">/verify</code> to your WhatsApp to get a new verification link.
          </p>
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Or enter code manually
            </label>
            <Input
              id="code"
              type="text"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              maxLength={6}
            />
          </div>
          <Button onClick={() => verifyCode()} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifying...</CardTitle>
          <CardDescription>Please wait while we verify your WhatsApp number</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Verification</CardTitle>
       
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium">
            Verification Code
          </label>
          <Input
            id="code"
            type="text"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
            maxLength={6}
          />
          <p className="text-xs text-muted-foreground">
            Enter the 6-digit code from WhatsApp
          </p>
        </div>
        <Button onClick={() => verifyCode()} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
