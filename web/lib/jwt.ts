import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required for session token operations.');
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = '30d';

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
