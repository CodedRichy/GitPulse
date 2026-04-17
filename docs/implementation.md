# Implementation Plan

## Overview
This document outlines the implementation priorities for GitPulse based on current state analysis and best practices.

## Phase 1: Brand Implementation (Immediate)

### 1.1 Favicon Setup
**File:** `web/app/favicon.ico`
**Asset:** `assets/GitPulseLogoTransparent.png`

**Steps:**
1. Convert `GitPulseLogoTransparent.png` to `.ico` format (192x192 recommended)
2. Place in `web/app/` directory
3. Update `web/app/layout.tsx` metadata if needed

**Priority:** High
**Effort:** Low (5 minutes)

### 1.2 Navigation Bar Logo
**File:** `web/components/navbar.tsx`
**Asset:** `assets/GitPulseLogoTransparent.png` or `assets/GitPulseLogo.png`

**Steps:**
1. Import logo asset
2. Replace text-based logo with image
3. Ensure responsive sizing
4. Add alt text for accessibility

**Priority:** High
**Effort:** Low (15 minutes)

### 1.3 Login Page Logo
**File:** `web/app/login/page.tsx`
**Asset:** `assets/GitPulseLogo.png` (white background for contrast)

**Steps:**
1. Add logo above login form
2. Ensure proper sizing and spacing
3. Maintain brand consistency

**Priority:** Medium
**Effort:** Low (10 minutes)

---

## Phase 2: Data Architecture (Short-term)

### 2.1 Config Persistence
**Files:**
- `web/app/api/config/route.ts`
- `web/lib/telemetry-client.ts`

**Current State:**
- `/api/config` returns mock data
- `updateConfig()` only logs to console
- No actual persistence

**Implementation Options:**

**Option A: Supabase Table (Recommended)**
```sql
CREATE TABLE user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

**Option B: CLI Config File Sync**
- Read/write to `.gitpulse/config.json`
- Sync between CLI and web dashboard
- More complex but keeps config local

**Priority:** High (blocking feature)
**Effort:** Medium (2-3 hours)

### 2.2 API Key Management
**Current State:** Functional with bcrypt hashing
**Status:** No changes needed immediately

**Future Enhancements:**
- Key expiration dates
- Key usage analytics
- Bulk key operations

---

## Phase 3: Security Improvements (Medium-term)

### 3.1 reCAPTCHA Integration
**Target Forms:** Support page (`web/app/support/page.tsx`)

**Implementation:**
1. Sign up for Google reCAPTCHA v2
2. Add to environment variables:
   ```env
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key
   RECAPTCHA_SECRET_KEY=your_secret_key
   ```
3. Add reCAPTCHA component to form
4. Validate token in `/api/support/route.ts`

**Priority:** Medium
**Effort:** Medium (1-2 hours)

### 3.2 CSRF Protection
**Implementation:**
1. Install CSRF library (e.g., `csurf` or custom implementation)
2. Generate CSRF tokens on session creation
3. Validate on POST/PUT/DELETE requests
4. Add tokens to forms

**Priority:** Medium
**Effort:** Medium (2-3 hours)

### 3.3 Audit Logging
**Target Operations:**
- API key creation/revocation
- Config changes
- User settings updates
- Support ticket submissions

**Implementation:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Priority:** Medium
**Effort:** Medium (3-4 hours)

---

## Phase 4: Data Governance (Long-term)

### 4.1 Data Retention Policy
**Retention Rules:**
- Telemetry runs: 90 days
- Support tickets: 365 days (after resolution)
- API keys: No expiration (add feature)
- Audit logs: 180 days

**Implementation:**
1. Add retention columns to tables
2. Create scheduled cleanup job (Supabase Edge Function or cron)
3. Add user-facing data export (GDPR)
4. Add user account deletion with data wipe

**Priority:** Low
**Effort:** High (1-2 days)

### 4.2 Error Tracking
**Options:**
- Sentry (recommended for Next.js)
- LogRocket
- Custom logging solution

**Implementation:**
1. Install SDK
2. Configure with environment variables
3. Add error boundaries
4. Track performance metrics

**Priority:** Low
**Effort:** Medium (2-3 hours)

---

## Phase 5: Form Enhancements

### 5.1 Email Notifications
**Current State:** Commented out in `/api/support/route.ts` (lines 133-136)

**Implementation Options:**
- Resend (recommended for Next.js)
- SendGrid
- AWS SES
- Supabase Auth emails

**Use Cases:**
- Support ticket confirmation
- Support ticket response
- API key creation reminder
- Account changes

**Priority:** Low
**Effort:** Medium (2-3 hours)

### 5.2 Webhook Integration
**Use Cases:**
- Support ticket to Slack/Discord
- Telemetry alerts to monitoring
- Config changes to CI/CD

**Implementation:**
1. Webhook configuration table
2. Signature verification
3. Retry logic
4. Webhook logs

**Priority:** Low
**Effort:** High (1-2 days)

---

## Execution Order

1. **Start Now:** Phase 1 (Brand Implementation) - Quick wins, visible progress
2. **Next:** Phase 2.1 (Config Persistence) - Unblocks core feature
3. **Then:** Phase 3.1 (reCAPTCHA) - Easy security win
4. **Later:** Phase 3.2-3.3 (CSRF, Audit Logs) - Security hardening
5. **Future:** Phase 4-5 (Data governance, enhancements) - Nice-to-have

---

## Notes

### Current Architecture Strengths
- ✅ Supabase database (managed PostgreSQL)
- ✅ JWT authentication
- ✅ Rate limiting
- ✅ API key management with bcrypt
- ✅ GitHub OAuth integration
- ✅ Custom API routes (no third-party form services needed)

### Why Not Web3forms/Typeform?
- Already have backend infrastructure
- Need custom processing (AI, analytics)
- Building SaaS product (not static site)
- Data privacy/control requirements
- Complex workflows (MCP, CLI sync)

### Environment Variables Needed
```env
# reCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=

# Error Tracking
SENTRY_DSN=
SENTRY_ENVIRONMENT=

# Email
RESEND_API_KEY=
```

---

## Resources

- [Next.js Favicon](https://nextjs.org/docs/app/api-reference/config#favicon)
- [Supabase Data Retention](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [reCAPTCHA v2](https://developers.google.com/recaptcha/docs/v2)
- [Resend for Next.js](https://resend.com/docs/with-nextjs)
- [Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
