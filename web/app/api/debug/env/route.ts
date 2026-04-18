import { NextResponse } from 'next/server';

/**
 * Debug endpoint to verify environment variables are loaded
 * Remove this in production after debugging
 */
export async function GET() {
  const envVars = {
    LEMON_SQUEEZY_API_KEY: process.env.LEMON_SQUEEZY_API_KEY ? 'SET' : 'NOT_SET',
    LEMON_SQUEEZY_STORE_ID: process.env.LEMON_SQUEEZY_STORE_ID || 'NOT_SET',
    LEMON_SQUEEZY_VARIANT_ID_PRO: process.env.LEMON_SQUEEZY_VARIANT_ID_PRO || 'NOT_SET',
    LEMON_SQUEEZY_VARIANT_ID_TEAM: process.env.LEMON_SQUEEZY_VARIANT_ID_TEAM || 'NOT_SET',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET',
  };

  return NextResponse.json(envVars);
}
