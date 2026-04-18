# GitPulse Tasks

## Current Focus: Phase 9.2 - Team Dashboard (Month 2)

### Phase 9.1 COMPLETE ✅ (Month 1 - Enterprise Foundation)
- [x] Team database schema (4 tables: teams, team_members, team_settings, team_audit_logs)
- [x] RBAC API routes (/api/teams, /api/teams/[id]/members, /api/teams/[id]/settings)
- [x] CLI team support (gitpulse teams, gitpulse config --set-api-key)
- [x] Cloud-sync team detection (gp_team_* API key prefix)
- [x] Telemetry routing based on API key type
- [x] Sentry removed (cost optimization: $312/year → $0)

### Phase 9.2 IN PROGRESS ⏳ (Month 2 - Team Dashboard)
- [x] Team list page shell (`/dashboard/teams`) - created with matching UI
- [x] Team detail layout with tabs (`/dashboard/teams/[id]`) - created
- [x] Team overview page (`/dashboard/teams/[id]/page.tsx`)
- [x] Team analytics page (`/dashboard/teams/[id]/analytics`)
- [x] Team members page (`/dashboard/teams/[id]/members`)
- [x] Team settings page (`/dashboard/teams/[id]/settings`)
- [ ] Wire up API endpoints to real data
- [ ] Add charts to analytics page
- [ ] Implement member invite flow
- [ ] Connect settings to backend

## Immediate Next Actions

1. **Wire Up Team Dashboard** (Week 5-6):
   - Connect team list to `/api/teams` endpoint
   - Connect team detail to `/api/teams/[id]` endpoint
   - Implement member invite/remove functionality
   - Connect settings form to `/api/teams/[id]/settings`

2. **Team Analytics** (Week 7-8):
   - Line charts for quality over time
   - Issue severity breakdown
   - Repository rankings
   - Date range selectors

3. **Update Documentation**:
   - Keep docs in sync with implementation
   - Update screenshots once UI is built

## Roadmap: Phase 9 Enterprise Readiness

### Phase 9.1: Enterprise Foundation ✅ COMPLETE
- Multi-tenant team schema with RLS
- RBAC API with role enforcement
- CLI team sync and API key management

### Phase 9.2: Team Dashboard ⏳ IN PROGRESS (Page Shells Complete)
- ✅ Page shells created with GitPulse UI patterns
- ⏳ Wire up to real API data
- ⏳ Charts for analytics
- ⏳ Member invite/remove functionality

### Phase 9.3: Security Hardening ⏳ PLANNED
- Field-level encryption
- Distributed locks
- Audit immutability

### Phase 9.4: New Pricing Model ⏳ PLANNED
- $25/dev/month Pro tier
- Lemon Squeezy checkout
- Team seat management

### Phase 9.5: Distribution ⏳ PLANNED
- GitHub Marketplace listing
- AI tool partnerships
- Content marketing

### Phase 9.6: Scale Prep ⏳ PLANNED
- 99.9% uptime target
- Performance optimization
- Enterprise SLA

## Notes
- **Latest**: Phase 9.1 complete (April 18, 2026)
- **Build Status**: Passing
- **Next Milestone**: Team Dashboard UI (Phase 9.2)
- **Kill Criteria**: 500+ free signups, 5+ Pro customers, 1+ Enterprise lead by Month 6
