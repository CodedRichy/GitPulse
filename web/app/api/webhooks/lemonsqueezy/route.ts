import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/webhooks/lemonsqueezy
 * Handles Lemon Squeezy webhooks for subscription lifecycles.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('LEMON_SQUEEZY_WEBHOOK_SECRET is not set');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // 1. Verify Signature
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(rawBody).digest('hex');
    const signature = request.headers.get('x-signature');

    if (!signature || signature !== digest) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Parse Payload
    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;
    const body = payload.data;
    const customData = payload.meta.custom_data || {};
    const userId = customData.userId;
    const requestedTier = customData.tier;

    console.log(`Processing Lemon Squeezy event: ${eventName} for user: ${userId}`);

    // 3. Handle Events
    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const status = body.attributes.status;
      
      if (status === 'active') {
        // Upgrade the user
        await supabase
          .from('users')
          .update({ tier: requestedTier || 'pro' })
          .eq('id', userId);
          
        console.log(`User ${userId} upgraded to ${requestedTier || 'pro'}`);
      }
    }

    if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      // Downgrade the user
      await supabase
        .from('users')
        .update({ tier: 'free' })
        .eq('id', userId);
        
      console.log(`User ${userId} downgraded to free`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
