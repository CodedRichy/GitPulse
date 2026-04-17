# GitPulse — Commercial-Grade Hardening Action Plan

**Start Date**: April 17, 2026  
**Target Production**: June 1, 2026 (6 weeks)  
**Current Status**: Phase 1 Complete (70% of critical fixes)  

---

## ✅ COMPLETED (This Session)

### 1. **Error Handling System** ✅
📄 **File**: `src/utils/errors.ts`  
📝 **What**: Structured error classes replacing generic strings  
🎯 **Impact**: Enables proper error recovery and user guidance

### 2. **Input Validation** ✅
📄 **File**: `src/utils/validation-extended.ts`  
📝 **What**: Comprehensive sanitization for all user inputs  
🎯 **Impact**: Blocks injection attacks, path traversal

### 3. **MCP Authentication** ✅
📄 **File**: `src/mcp/auth.ts`  
📝 **What**: Token-based authentication for MCP server  
🎯 **Impact**: Secures git access from external agents

### 4. **CI/CD Pipeline** ✅
📄 **File**: `.github/workflows/ci.yml`  
📝 **What**: Comprehensive GitHub Actions workflow  
🎯 **Impact**: Automated validation on every PR/push

### 5. **Git Tests** ✅
📄 **File**: `src/core/__tests__/git.test.ts`  
📝 **What**: 20+ new tests for git operations  
🎯 **Impact**: Catches git bugs before production

---

## ⏳ NEXT UP (This Week - 20-30 hours)

### 6. **Structured Logging** ⏳
📄 **Files to Create**: `src/utils/logger.ts`  
📝 **What to Do**:
```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'gitpulse' },
  transports: [
    new winston.transports.File({ 
      filename: '.gitpulse/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: '.gitpulse/gitpulse.log' 
    }),
  ],
});
```

📋 **Then Apply To** (30+ files):
- `src/index.ts` - Replace console calls
- `src/core/git.ts` - Replace console calls
- `src/core/quality-gates.ts` - Replace console calls
- All command handlers
- Web API routes

⏱️ **Effort**: 6-8 hours  
✅ **Acceptance**: `logger.info()`, `logger.error()` used everywhere instead of `console`

---

### 7. **Web API Rate Limiting** ⏳
📄 **Files to Create**: `web/app/api/middleware/rateLimit.ts`  
📝 **What to Do**:
```typescript
// web/app/api/middleware/rateLimit.ts
import { NextRequest, NextResponse } from 'next/server';

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limit = { requests: 10, window: 60000 }
) {
  return async (req: NextRequest) => {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const key = `${ip}:${req.nextUrl.pathname}`;
    
    // Use existing rate-limit.ts (but it's not used!)
    const { success } = rateLimit(key, limit.requests, limit.window);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    
    return handler(req);
  };
}
```

📋 **Apply To** (8 routes):
- `web/app/api/analytics/runs/route.ts`
- `web/app/api/analytics/stats/route.ts`
- `web/app/api/telemetry/route.ts`
- `web/app/api/keys/route.ts`
- `web/app/api/settings/route.ts`
- `web/app/api/health/route.ts`
- All other API routes

⏱️ **Effort**: 2-3 hours  
✅ **Acceptance**: All API routes return 429 when rate limited

---

### 8. **Auth Module Tests** ⏳
📄 **File to Create**: `src/core/__tests__/auth.test.ts`  
📝 **What to Test**:
```typescript
describe('Auth', () => {
  describe('JWT Token Generation', () => {
    it('generates valid JWT tokens');
    it('includes expiration in token');
    it('validates token signature');
  });
  
  describe('Token Refresh', () => {
    it('refreshes expired tokens');
    it('returns new tokens');
  });
  
  describe('Token Validation', () => {
    it('accepts valid tokens');
    it('rejects expired tokens');
    it('rejects tampered tokens');
  });
});
```

⏱️ **Effort**: 4-5 hours  
✅ **Acceptance**: 8+ new tests, all passing

---

## 📅 WEEK 2 (May 20-27)

### 9. **User-Friendly Error Messages**
📄 **File to Create**: `src/utils/error-messages.ts`  
```typescript
export const ERROR_MESSAGES = {
  'GIT_NOT_REPO': {
    title: 'Not a git repository',
    action: 'Run `git init` or navigate to a git project'
  },
  'NO_STAGED_FILES': {
    title: 'No files to commit',
    action: 'Use `git add` to stage files'
  },
  // ... 30+ more errors
};
```

⏱️ **Effort**: 4-5 hours

---

### 10. **Config Validation with Zod**
📄 **File to Modify**: `src/utils/config.ts` (or create config-schema.ts)  
```typescript
import { z } from 'zod';

export const GitPulseConfigSchema = z.object({
  aiProvider: z.enum(['ollama', 'openrouter', 'openai']),
  ollamaHost: z.string().url().optional(),
  ollamaModel: z.string().min(1).optional(),
  strict: z.boolean().default(false),
});

// Usage:
const config = GitPulseConfigSchema.parse(loadedConfig);
```

⏱️ **Effort**: 3-4 hours

---

### 11. **MCP Server Tests**
📄 **File to Create**: `src/mcp/__tests__/server.test.ts`  

⏱️ **Effort**: 6-8 hours

---

## 📅 WEEK 3-4 (May 27 - June 10)

### 12. **Performance: File Hash Caching**
- Add caching to quality-gates to avoid rescanning unchanged files
- ⏱️ **Effort**: 3-4 hours

### 13. **Web Component Tests**
- Set up testing library + write tests for key components
- ⏱️ **Effort**: 10-15 hours

### 14. **Docker Support**
- Create Dockerfile + docker-compose.yml
- ⏱️ **Effort**: 6-8 hours

### 15. **Documentation**
- Deployment guide
- Architecture decision records
- API documentation
- ⏱️ **Effort**: 8-10 hours

---

## 🔍 Current Gaps (Not Yet Started)

| Gap | Severity | Status | ETA |
|-----|----------|--------|-----|
| Structured Logging | HIGH | ⏳ Week 1 | 6-8h |
| Rate Limiting | HIGH | ⏳ Week 1 | 2-3h |
| Config Validation | MEDIUM | ⏳ Week 2 | 3-4h |
| Web Offline Support | MEDIUM | ⏳ Week 3 | 4-5h |
| Docker Setup | MEDIUM | ⏳ Week 3 | 6-8h |
| Mobile Responsiveness | MEDIUM | ⏳ Week 3 | 6-8h |
| Git-Shield Feature | LOW | ⏳ Week 3 | 8-10h |
| Lockfile Feature | LOW | ⏳ Week 3 | 6-8h |

---

## 🎯 Weekly Summary

### Week 1 (This Week)
- **Goal**: Add logging, rate limiting, auth tests
- **Hours**: 20-30
- **Coverage Target**: 50%
- **Security**: 70% of critical issues fixed

### Week 2
- **Goal**: Better errors, config validation, more tests
- **Hours**: 20-25
- **Coverage Target**: 65%
- **Security**: 85% of critical issues fixed

### Week 3-4
- **Goal**: Performance, web tests, Docker, documentation
- **Hours**: 30-40
- **Coverage Target**: 75%+
- **Security**: 95% fixed, ready for audit

---

## 🚀 How to Execute

### Daily Standup Questions:
1. **What did I finish?** (Mark as COMPLETED ✅)
2. **What's blocking me?** (Identify issues early)
3. **What's next?** (Pick next task from list)

### For Each Task:
1. Create feature branch: `git checkout -b feat/TASK_NAME`
2. Code + test locally: `npm test -- path/to/tests`
3. Type check: `npm run typecheck`
4. Commit: `git commit -m "feat: TASK_NAME"`
5. Push + create PR: `git push origin feat/TASK_NAME`
6. GitHub Actions runs CI automatically
7. Merge when green ✅

### Testing Before Merge:
```bash
npm run typecheck   # TypeScript check
npm test           # Unit tests
npm run build      # Build verification
npm audit          # Dependency scan
```

---

## 📈 Success Metrics

Track these weekly:

| Metric | Week 1 | Week 2 | Week 3 | Week 4 | Target |
|--------|--------|--------|--------|--------|--------|
| Test Coverage | 45% | 55% | 65% | 75% | 75%+ |
| Critical Issues | 2 | 1 | 0 | 0 | 0 |
| High Issues | 5 | 3 | 1 | 0 | 0 |
| CI Pass Rate | 100% | 100% | 100% | 100% | 100% |
| Docs Completeness | 30% | 50% | 75% | 100% | 100% |

---

## 🎉 Done When:

- ✅ All critical security issues fixed
- ✅ Test coverage >75%
- ✅ CI/CD pipeline all green
- ✅ Comprehensive error handling throughout
- ✅ All user-facing error messages friendly
- ✅ Docker support working
- ✅ Documentation complete
- ✅ No unresolved GitHub issues tagged "production"

---

## 💡 Pro Tips

1. **Test first**: Write tests before fixing (TDD approach)
2. **Small commits**: One feature per commit for easy review
3. **Document as you go**: Update IMPLEMENTATION_SUMMARY.md weekly
4. **Get feedback early**: PR reviews catch issues before merge
5. **Automate everything**: Use CI/CD to catch problems
6. **Monitor metrics**: Track coverage/issues weekly

---

## 📞 Questions?

- **Error handling question?** → See `src/utils/errors.ts`
- **Validation question?** → See `src/utils/validation-extended.ts`
- **Auth question?** → See `src/mcp/auth.ts`
- **CI/CD question?** → See `.github/workflows/ci.yml`
- **Test question?** → See `src/core/__tests__/*`

All files have comprehensive JSDoc comments!

