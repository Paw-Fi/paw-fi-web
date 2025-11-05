/**
 * Referral System Type Definitions
 *
 * Types for the referral code system including codes, acceptances,
 * and API response structures.
 */

// ============================================================================
// Database Entity Types
// ============================================================================

/**
 * Referral code entity from the database
 */
export interface ReferralCode {
  id: string
  user_id: string
  code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Referral acceptance entity from the database
 */
export interface ReferralAcceptance {
  id: string
  referral_code_id: string
  referrer_user_id: string
  referee_user_id: string
  referee_email?: string | null
  referral_code_text: string
  status: 'pending' | 'completed' | 'failed'
  stripe_checkout_session_id: string | null
  completed_at: string | null
  created_at: string
}

/**
 * User information for referral acceptance display
 */
export interface ReferralUser {
  userId: string
  email: string
  fullName: string
  status: 'pending' | 'completed' | 'failed'
  acceptedAt: string
  completedAt: string | null
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response from get-referral-code Edge Function
 */
export interface GetReferralCodeResponse {
  code: string
  createdAt: string
  acceptanceCount: number
  completedCount: number
  acceptedBy: ReferralUser[]
  trialStart?: string | null
  trialEnd?: string | null
  isTrialing?: boolean
  trialEligible?: boolean
}

/**
 * Referrer information from validate-referral-code Edge Function
 */
export interface ReferrerInfo {
  userId: string
  email: string
  fullName: string
}

/**
 * Response from validate-referral-code Edge Function
 */
export interface ValidateReferralCodeResponse {
  valid: boolean
  referrer?: ReferrerInfo
  error?: string
}

/**
 * Response from accept-referral Edge Function
 */
export interface AcceptReferralResponse {
  success: boolean
  checkoutUrl?: string
  sessionId?: string
  error?: string
}

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Request body for validate-referral-code Edge Function
 */
export interface ValidateReferralCodeRequest {
  code: string
}

/**
 * Request body for accept-referral Edge Function
 */
export interface AcceptReferralRequest {
  code: string
}

// ============================================================================
// Hook State Types
// ============================================================================

/**
 * State for useReferralCode hook
 */
export interface UseReferralCodeState {
  code: string | null
  createdAt: string | null
  acceptanceCount: number
  completedCount: number
  acceptedBy: ReferralUser[]
  trialStart: string | null
  trialEnd: string | null
  isTrialing: boolean
  trialEligible: boolean
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * State for useValidateReferral hook
 */
export interface UseValidateReferralState {
  isValid: boolean | null
  referrerInfo: ReferrerInfo | null
  isLoading: boolean
  error: Error | null
  validate: (code: string) => Promise<ValidateReferralCodeResponse>
  reset: () => void
}

/**
 * State for useAcceptReferral hook
 */
export interface UseAcceptReferralState {
  isLoading: boolean
  error: Error | null
  accept: (code: string) => Promise<AcceptReferralResponse>
  reset: () => void
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for ReferralCodeDisplay component
 */
export interface ReferralCodeDisplayProps {
  code: string
  acceptanceCount: number
  completedCount: number
}

/**
 * Props for ReferralAcceptanceList component
 */
export interface ReferralAcceptanceListProps {
  acceptedBy: ReferralUser[]
  isLoading: boolean
}

/**
 * Props for AcceptInvitationCard component
 */
export interface AcceptInvitationCardProps {
  code: string
  referrer: ReferrerInfo | null
  onAccept: () => Promise<void>
  isLoading: boolean
  error: Error | null
}
