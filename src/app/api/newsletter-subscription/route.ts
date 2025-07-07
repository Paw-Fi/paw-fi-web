import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate email field
    if (!body.email || typeof body.email !== 'string' || !isValidEmail(body.email)) {
      return NextResponse.json(
        { error: 'Valid email address is required' }, 
        { status: 400 }
      );
    }

    // Call the Supabase Edge Function for newsletter subscription
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Missing Supabase URL configuration');
    }

    // Format the URL for the Edge Function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/newsletter-subscription`;
    
    // Forward the request to the Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getSupabaseAnonKey()}` // Use anon key for public functions
      },
      body: JSON.stringify({
        email: body.email,
        firstName: body.firstName || null,
        lastName: body.lastName || null,
        interests: body.interests || [],
        referralSource: body.referralSource || null,
        marketingConsent: !!body.marketingConsent
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to subscribe' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper to get Supabase anon key from env
function getSupabaseAnonKey(): string {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('Missing Supabase anon key configuration');
  }
  return anonKey;
}
