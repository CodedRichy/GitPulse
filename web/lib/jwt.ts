import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '30d';

export interface JWTPayload {
  userId: string;
  githubToken: string;
  exp: number;
}

export function generateToken(payload: Omit<JWTPayload, 'exp'>): string {
  return jwt.sign(
    {
      userId: payload.userId,
      githubToken: payload.githubToken,
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    },
    JWT_SECRET
  );
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
