
// Utility to determine whether a user should be treated as on the Free plan
// Considers webhook behavior:
// - Users are downgraded to plan === 'free' when subscription is deleted,
//   incomplete_expired, unpaid, or lifetime is refunded.
// - Paid/trialing users have plan !== 'free'.
// Therefore, FE/backend can treat missing subscription or plan === 'free' as Free access.

export type BasicSubscription = {
  plan?: string | null
  status?: string | null
}

// Returns true when there is no subscription or plan === 'free'
export function isFreeUser(subscription?: BasicSubscription | null): boolean {
  if (!subscription) return true
  return (subscription.plan ?? 'free') === 'free'
}

export default isFreeUser
