import { NextRequest, NextResponse } from 'next/server';
import { createCheckout } from "@lemonsqueezy/lemonsqueezy.js";
import { verifyToken } from '@/lib/jwt';
import { initLemonSqueezy } from '@/lib/lemonsqueezy';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/billing/checkout
 * Generates a Lemon Squeezy checkout URL for the requested tier.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Initialize SDK
    initLemonSqueezy();

    // 2. Identify User
    const sessionCookie = request.cookies.get('gitpulse_auth')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionData = verifyToken(sessionCookie);
    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // 3. Fetch user email from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', sessionData.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.email || !user.email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address. Please update your profile.' }, { status: 400 });
    }

    // 4. Get Request Body
    const { tier } = await request.json();
    if (!tier || !['pro', 'team'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier requested' }, { status: 400 });
    }

    // 4. Get Environment IDs
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
    const variantId = tier === 'pro' 
      ? process.env.LEMON_SQUEEZY_VARIANT_ID_PRO 
      : process.env.LEMON_SQUEEZY_VARIANT_ID_TEAM;

    if (!storeId || !variantId) {
      return NextResponse.json({ 
        error: 'Billing configuration missing. Please ensure Variant IDs are set in .env.local' 
      }, { status: 500 });
    }

    // 5. Create Checkout
    const { data: checkout, error } = await createCheckout(storeId, variantId, {
      checkoutData: {
        email: user.email,
        custom: {
            userId: sessionData.userId,
            tier: tier
        }
      },
      productOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
      }
    });

    if (error) {
      console.error('Lemon Squeezy Checkout Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ url: checkout.data.attributes.url });

  } catch (error) {
    console.error('Checkout API Route Error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
