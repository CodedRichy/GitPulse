// Environment variable validation

const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: 'string',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'string',
  SUPABASE_SERVICE_ROLE_KEY: 'string',
  NEXT_PUBLIC_GITHUB_CLIENT_ID: 'string',
  GITHUB_CLIENT_ID: 'string',
  GITHUB_CLIENT_SECRET: 'string',
  JWT_SECRET: 'string',
} as const;

type EnvVarType = 'string' | 'number' | 'boolean';

export function validateEnvVars(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, type] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];

    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
      continue;
    }

    if (type === 'string' && typeof value !== 'string') {
      errors.push(`Environment variable ${key} must be a string`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validate on import (will throw in development if invalid)
if (process.env.NODE_ENV === 'development') {
  const validation = validateEnvVars();
  if (!validation.valid) {
    console.error('Environment variable validation failed:');
    validation.errors.forEach((error) => console.error(`  - ${error}`));
  }
}
