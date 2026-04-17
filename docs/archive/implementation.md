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

### 1.3 Login Page Logo (Temporary)
**File:** `web/app/login/page.tsx`
**Asset:** `assets/GitPulseLogo.png` (white background for contrast)

**Steps:**
1. Add logo above login form
2. Ensure proper sizing and spacing
3. Maintain brand consistency

**Status:** Temporary - may be removed based on feedback
**Priority:** Medium
**Effort:** Low (10 minutes)

---

## Phase 2: Data Architecture (Short-term)

### 2.1 Config Persistence ✅ COMPLETED
**Files:**
- `web/app/api/config/route.ts`
- `web/lib/telemetry-client.ts`
- `web/supabase/migrations/20240417_create_user_configs.sql`

**Implementation:**
- Created Supabase table `user_configs` with RLS policies
- Updated `/api/config` GET to fetch from database with fallback to default
- Updated `/api/config` POST to save to database with tier checking
- Updated `telemetry-client.ts` to use real config from API

**Status:** Completed
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

### 3.1 reCAPTCHA v3 Integration ✅ COMPLETED
**Target Forms:** Support page (`web/app/support/page.tsx`)

**Implementation:**
1. Sign up for Google reCAPTCHA v3
2. Add to environment variables:
   ```env
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key
   RECAPTCHA_SECRET_KEY=your_secret_key
   ```
3. Install `react-google-recaptcha-v3` package
4. Wrap form with `GoogleReCaptchaProvider`
5. Use `useGoogleReCaptcha` hook to execute invisible verification
6. Validate token with Google API in `/api/support/route.ts`
7. Check score (0.0-1.0, reject if < 0.5)

**Status:** Completed
**Priority:** Medium
**Effort:** Medium (1-2 hours)

### 3.2 CSRF Protection ✅ COMPLETED
**Implementation:**
1. Created custom CSRF utilities (`web/lib/csrf.ts`)
2. Generate CSRF tokens on session creation (`/api/auth/github/route.ts`)
3. Created CSRF context/provider (`web/lib/csrf-context.tsx`)
4. Added CSRF validation to support API (`/api/support/route.ts`)
5. Added CSRF token to form headers (support page)

**Files Created:**
- `web/lib/csrf.ts` - CSRF token generation and verification
- `web/lib/csrf-context.tsx` - React context for accessing token

**Files Modified:**
- `web/app/layout.tsx` - Added CsrfProvider wrapper
- `web/app/api/auth/github/route.ts` - Generate and set CSRF cookie on auth
- `web/app/support/page.tsx` - Include CSRF token in form submission
- `web/app/api/support/route.ts` - Validate CSRF token

**Status:** Completed
**Priority:** Medium
**Effort:** Medium (2-3 hours)

### 3.3 Audit Logging ✅ COMPLETED
**Target Operations:**
- API key creation/revocation ✅
- Config changes ✅
- User settings updates ✅
- Support ticket submissions ✅

**Implementation:**
- Created SQL migration for `audit_logs` table with RLS policies
- Created `web/lib/audit.ts` with logging utilities
- Added logging to:
  - `/api/keys/route.ts` - API key create/revoke
  - `/api/config/route.ts` - Config updates
  - `/api/settings/route.ts` - Settings updates
  - `/api/support/route.ts` - Support ticket creation

**Files Created:**
- `web/supabase/migrations/20240417_create_audit_logs.sql`
- `web/lib/audit.ts`

**Audit Log Schema:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,  -- e.g., 'api_key.create'
  resource_type VARCHAR(50),     -- e.g., 'api_key'
  resource_id UUID,
  details JSONB,                 -- Additional context
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP,
  success BOOLEAN
);
```

**Status:** Completed
**Priority:** Medium
**Effort:** Medium (3-4 hours)

---

## Phase 4: Data Governance (Long-term)

### 4.1 Data Retention Policy ✅ COMPLETED
**Retention Rules:**
- Telemetry runs: 90 days ✅
- Support tickets: 365 days (after resolution) ✅
- Audit logs: 180 days ✅

**Implementation:**
1. Created SQL migration (`20240417_data_retention.sql`):
   - Added `retention_until` columns to telemetry_runs, support_tickets, audit_logs
   - Created cleanup function `cleanup_expired_data()`
   - Added trigger for auto-setting retention on ticket resolution

2. Created Supabase Edge Function (`supabase/functions/data-cleanup/`):
   - Scheduled cleanup job
   - Runs `cleanup_expired_data()` function
   - Requires CRON_SECRET for authorization

3. GDPR Data Export (`/api/user/export`):
   - Exports all user data as JSON
   - Includes profile, API keys, configs, telemetry, tickets, audit logs
   - Rate limited: 3 exports/hour

4. Account Deletion (`/api/user/delete`):
   - Full data wipe (Right to be Forgotten)
   - Requires confirmation flag
   - Deletes all tables in correct order
   - Clears session cookies
   - Rate limited: 1 attempt/hour

**Files Created:**
- `web/supabase/migrations/20240417_data_retention.sql`
- `web/supabase/functions/data-cleanup/index.ts`
- `web/app/api/user/export/route.ts`
- `web/app/api/user/delete/route.ts`

**Status:** Completed
**Priority:** Low
**Effort:** High (1-2 days)

### 4.2 Error Tracking ✅ COMPLETED
**Implementation:**
1. Installed `@sentry/nextjs` SDK
2. Configured Sentry for client, server, and edge runtimes:
   - `sentry.client.config.ts` - Client-side error tracking with session replay
   - `sentry.server.config.ts` - Server-side error tracking
   - `sentry.edge.config.ts` - Edge runtime error tracking
3. Updated `next.config.mjs` with Sentry webpack plugin
4. Integrated Sentry into existing error boundary component
5. Added environment variables to `.env.local`

**Features:**
- Automatic error tracking (client & server)
- Performance monitoring (10% sample in production)
- Session replay with privacy masking
- Source map upload on build
- Monitoring tunnel route (`/monitoring`) to bypass ad-blockers
- Filters for common non-actionable errors (network errors, etc.)

**Environment Variables Required:**
```
NEXT_PUBLIC_SENTRY_DSN=https://.../sentry.io/...
SENTRY_DSN=https://.../sentry.io/...
SENTRY_ORG=your-org-name
SENTRY_PROJECT=gitpulse-web
SENTRY_AUTH_TOKEN=sntrys_...
```

**Files Created:**
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `next.config.mjs` (replaced .ts version)

**Files Modified:**
- `web/components/error-boundary.tsx` - Sentry integration
- `web/.env.local` - Added Sentry env vars
- `web/package.json` - Added Sentry dependency

**Status:** Completed
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
