import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required for session token operations.');
  }
  
  // Security: Validate JWT secret strength
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security.');
  }
  
  // Check for weak/common secrets (only if the entire secret matches a weak pattern)
  const weakPatterns = ['secret', 'password', '123', 'test', 'dev', 'localhost'];
  const lowerSecret = secret.toLowerCase();
  for (const pattern of weakPatterns) {
    if (lowerSecret === pattern) {
      throw new Error(`JWT_SECRET is too weak. Use a strong random string (at least 32 characters).`);
    }
  }
  
  return secret;
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = '7d'; // Security: Reduced from 30 days to limit session hijacking window

export interface JWTPayload {
  userId: string;
  exp: number;
}

export function generateToken(payload: Omit<JWTPayload, 'exp'>): string {
  return jwt.sign({ userId: payload.userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    // Silently fail for malformed tokens (old base64 cookies)
    if (error instanceof jwt.JsonWebTokenError && error.message === 'jwt malformed') {
      return null;
    }
    console.error('JWT verification failed:', error);
    return null;
  }
}
