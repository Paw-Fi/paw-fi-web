import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export interface ReferralAuthPromptProps {
  redirectTo?: string
  code?: string
  title?: string
  description?: string
  className?: string
}

export function ReferralAuthPrompt({
  redirectTo = '/referral',
  code,
  title = 'Sign in or create an account',
  description = 'To accept the invite and start your free trial, please sign in or create an account.',
  className,
}: ReferralAuthPromptProps) {
  const search = code ? ({ redirect: redirectTo, code } as any) : ({ redirect: redirectTo } as any)

  return (
    <Card className={['rounded-3xl border-subtle-border', className].filter(Boolean).join(' ')}>
      <CardContent className="p-8">
        <div className="text-center max-w-xl mx-auto">
          <h3 className="text-2xl font-medium text-foreground mb-2">{title}</h3>
          <p className="text-muted-foreground mb-6">{description}</p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/register" search={search}>
                Create account
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link to="/login" search={search}>
                Sign in
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

