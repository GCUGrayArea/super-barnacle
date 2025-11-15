# Unblocked PRs Plan

**Generated:** 2025-11-15
**Last Updated:** 2025-11-15 (Post Block 1 Completion)
**Purpose:** Planning document for parallel PR development with file dependency tracking

---

## ✅ BLOCK 1 - COMPLETE

### PR-001: Project Setup and Configuration ✅
**Status:** COMPLETE
**Verified:** TypeScript builds successfully, tests pass, all dependencies installed

### PR-002: Docker Configuration ✅
**Status:** COMPLETE
**Verified:** All Docker files present (Dockerfile, docker-compose.yml, docker-compose.prod.yml, .dockerignore)

### PR-003: Coding Standards Document ✅
**Status:** COMPLETE
**Verified:** Both .claude/rules/coding-standards.md and .claude/rules/agent-defaults.md exist

---

## 🟢 BLOCK 2 - NEWLY UNBLOCKED PRs

### 🟢 PR-004: Logging and Error Handling Infrastructure
**Status:** READY TO START - UNBLOCKED ✅
**Dependencies:** PR-001 ✅ (Complete)
**Priority:** High
**Estimated Time:** 45-60 minutes

**Description:**
Set up structured logging with Winston and create standardized error handling patterns that will be used throughout the application.

**Files This PR Will Create:**
- `src/lib/logger.ts` - Winston logger configuration with JSON format, correlation IDs
- `src/lib/errors.ts` - Custom error classes (SkyFiAPIError, ValidationError, etc.)
- `src/lib/error-handler.ts` - Centralized error handling middleware
- `src/types/logging.ts` - Logging type definitions (LogLevel, LogContext, etc.)
- `__tests__/lib/logger.test.ts` - Logger unit tests
- `__tests__/lib/errors.test.ts` - Error handling unit tests

**Acceptance Criteria:**
- [ ] Winston logger configured with JSON format
- [ ] Log levels: DEBUG, INFO, WARN, ERROR
- [ ] Correlation ID support for request tracing
- [ ] Custom error classes with proper inheritance
- [ ] Error handler never logs sensitive data (API keys, credentials)
- [ ] Tests verify logging behavior
- [ ] Tests verify error handling patterns
- [ ] Test coverage >80%

**File Conflicts:** ✅ NONE with PR-006 (can run in parallel)

---

### 🟢 PR-006: Type Definitions from OpenAPI Schema
**Status:** READY TO START - UNBLOCKED ✅
**Dependencies:** PR-001 ✅ (Complete)
**Priority:** High
**Estimated Time:** 45-60 minutes

**Description:**
Generate TypeScript type definitions from the SkyFi OpenAPI spec, with Zod schemas for runtime validation.

**Files This PR Will Create:**
- `src/types/skyfi-api.ts` - Generated TypeScript types from OpenAPI (all request/response types)
- `src/schemas/skyfi.schemas.ts` - Zod validation schemas for runtime validation
- `scripts/generate-types.ts` - Script to regenerate types from OpenAPI spec
- `__tests__/schemas/skyfi.schemas.test.ts` - Schema validation tests

**Key Types to Define:**
- `ProductType`: enum (DAY, MULTISPECTRAL, SAR)
- `Resolution`: enum (LOW, MEDIUM, HIGH, VERY_HIGH)
- `DeliveryDriver`: enum (S3, GS, AZURE)
- `ArchiveSearchRequest`, `ArchiveSearchResponse`
- `OrderArchiveRequest`, `OrderTaskingRequest`, `OrderResponse`
- `FeasibilityRequest`, `FeasibilityResponse`, `PassPrediction`
- `NotificationRequest`, `NotificationResponse`
- `PricingRequest`, `PricingResponse`

**Acceptance Criteria:**
- [ ] All SkyFi API request/response types defined
- [ ] Zod schemas for runtime validation of API responses
- [ ] Type-safe enums for ProductType, Resolution, DeliveryDriver, etc.
- [ ] Script to regenerate types from updated OpenAPI spec
- [ ] 100% type coverage (no `any` types)
- [ ] Tests verify schema validation works correctly
- [ ] Test coverage >80%

**Reference:** Uses `docs/openapi.json` as source of truth

**File Conflicts:** ✅ NONE with PR-004 (can run in parallel)

**Note on src/types/ directory:**
- PR-004 creates `src/types/logging.ts`
- PR-006 creates `src/types/skyfi-api.ts`
- Different files, NO CONFLICT ✅

---

## 🔴 BLOCK 2 - STILL BLOCKED

### 🔴 PR-005: SkyFi API Client Base
**Status:** BLOCKED - Waiting for PR-004
**Dependencies:**
- PR-001 ✅ (Complete)
- PR-004 ❌ (Not started - needs logging infrastructure)
**Priority:** High
**Estimated Time:** 60-90 minutes

**Description:**
Create the foundational HTTP client for SkyFi API with authentication, request/response handling, rate limiting, and retry logic.

**Files This PR Will Create:**
- `src/skyfi/client.ts` - Base HTTP client with authentication
- `src/skyfi/config.ts` - SkyFi API configuration
- `src/lib/retry.ts` - Retry logic with exponential backoff
- `src/lib/rate-limiter.ts` - Rate limiting logic
- `src/types/skyfi-base.ts` - Base type definitions
- `__tests__/skyfi/client.test.ts` - Client unit tests
- `__tests__/lib/retry.test.ts` - Retry logic tests

**Will Be Unblocked:** After PR-004 is marked Complete

**File Conflicts with PR-006:**
⚠️ **POTENTIAL CONFLICT** - Both touch `src/types/*` and `src/schemas/*`:
- PR-005 creates `src/types/skyfi-base.ts`
- PR-006 creates `src/types/skyfi-api.ts`
- These are different files, but should coordinate to avoid duplication

**Recommendation:** Run PR-005 AFTER PR-006 completes to ensure type consistency

---

## Parallelization Strategy

### ✅ Current Opportunity (Block 2 - First Wave)
**Two PRs can run in parallel NOW:**

1. **Agent A** → PR-004 (Logging and Error Handling Infrastructure)
2. **Agent B** → PR-006 (Type Definitions from OpenAPI Schema)

**Why these are safe to parallelize:**
- Zero file conflicts (different directories and files)
- Both depend only on PR-001 which is complete
- PR-004 creates logging infrastructure
- PR-006 creates type definitions
- No shared code dependencies

### Next Wave (Block 2 - Second Wave)
**After PR-004 AND PR-006 complete:**

3. **Agent A or B** → PR-005 (SkyFi API Client Base)
   - Depends on PR-004 for logging
   - Can reference PR-006 types for consistency

### Future Blocks (Block 3+)
**After Block 2 completes, Block 3 will unlock:**
- PR-007: Archive Search Implementation (depends on PR-005, PR-006)
- PR-008: Order Placement Implementation (depends on PR-005, PR-006)
- PR-009: Feasibility and Pass Prediction Implementation (depends on PR-005, PR-006)
- PR-010: Order Management Implementation (depends on PR-005, PR-006)
- PR-011: Notifications/Monitoring Implementation (depends on PR-005, PR-006)
- PR-012: Pricing API Implementation (depends on PR-005, PR-006)

**Block 3 can have MASSIVE parallelization** - all 6 PRs can run simultaneously!

Also from Block 4:
- PR-013: MCP Server Setup and HTTP/SSE Transport (depends on PR-001, PR-004)

---

## File Conflict Matrix for Block 2-3

| PR | src/lib/* | src/skyfi/* | src/types/* | src/schemas/* | scripts/* | __tests__/* |
|---|---|---|---|---|---|---|
| PR-004 | logger.ts, errors.ts, error-handler.ts | - | logging.ts | - | - | lib/logger.test.ts, lib/errors.test.ts |
| PR-005 | retry.ts, rate-limiter.ts | client.ts, config.ts | skyfi-base.ts | - | - | skyfi/client.test.ts, lib/retry.test.ts |
| PR-006 | - | - | skyfi-api.ts | skyfi.schemas.ts | generate-types.ts | schemas/skyfi.schemas.test.ts |
| PR-007 | - | archives.ts | archives.ts | archives.schemas.ts | - | skyfi/archives.test.ts, skyfi/archives.integration.test.ts |

**Analysis:**
- ✅ PR-004 and PR-006: NO CONFLICTS (can parallelize)
- ⚠️ PR-005 and PR-006: Both touch `src/types/*` but different files (coordinate to avoid duplication)
- ✅ All Block 3 PRs (PR-007 through PR-012): Create different files in `src/skyfi/*` (can parallelize)

---

## Recommended Work Order

### ✅ Wave 1 (NOW - Block 2 First Wave)
**Run these in parallel:**
1. **Agent A** → PR-004 (Logging Infrastructure)
2. **Agent B** → PR-006 (Type Definitions)

### Wave 2 (After Wave 1 Complete)
3. **Agent A or B** → PR-005 (SkyFi API Client Base)

### Wave 3 (After Wave 2 Complete - MASSIVE PARALLELIZATION)
**Run ALL of these in parallel (no conflicts):**
4. **Agent A** → PR-007 (Archive Search)
5. **Agent B** → PR-008 (Order Placement)
6. **Agent C** → PR-009 (Feasibility & Pass Prediction)
7. **Agent D** → PR-010 (Order Management)
8. **Agent E** → PR-011 (Notifications/Monitoring)
9. **Agent F** → PR-012 (Pricing API)

**Also can start in parallel:**
10. **Agent G** → PR-013 (MCP Server Setup) - depends only on PR-001, PR-004

---

## Notes for Agents

### Before claiming a PR:
1. ✅ Verify this document shows the PR as "READY TO START - UNBLOCKED"
2. ✅ Check no other agent is working on a conflicting PR
3. ✅ Confirm all dependencies are marked "Complete" in task-list.md
4. ✅ Read the file list and verify no conflicts

### During Planning phase:
1. Move PR from "New" → "Planning" in task-list.md
2. Verify the file list is accurate
3. Refine ESTIMATED files to VERIFIED files
4. Check for any ambiguities and ask questions if needed
5. Move to "In Progress" when ready

### During Implementation:
1. Follow `.claude/rules/coding-standards.md`
2. Write tests alongside implementation (TDD preferred)
3. Target >80% test coverage
4. Run `npm run build`, `npm test`, `npm run lint` frequently
5. Never log API keys or sensitive data

### Before marking Complete:
- [ ] All acceptance criteria checked off
- [ ] Tests written and passing (>80% coverage)
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes (no errors)
- [ ] `npm run typecheck` passes
- [ ] Documentation updated if needed
- [ ] No hardcoded secrets

### Git workflow:
- Branch: `claude/review-task-list-state-01DZuwKLGGSbucKZKqzUHCEm`
- Commit with clear, descriptive messages
- Push when complete: `git push -u origin claude/review-task-list-state-01DZuwKLGGSbucKZKqzUHCEm`

---

## Summary

**Block 1 Status:** ✅ COMPLETE (3/3 PRs done)
**Block 2 Status:** 🟢 2 PRs READY, 1 BLOCKED
**Currently Unblocked:** 2 PRs (PR-004, PR-006)
**Safe to Parallelize:** PR-004 and PR-006 (zero conflicts)
**Next Unblocked:** PR-005 (after PR-004 completes)
**Future Parallelization:** Block 3 can run 6+ PRs in parallel
**Critical Path:** PR-001 ✅ → PR-004 → PR-005 → Block 3 PRs → Block 5 MCP Tools

---

## Detailed File Lists by PR

### PR-004: Logging and Error Handling Infrastructure
```
src/lib/
├── logger.ts          (create) - Winston logger setup
├── errors.ts          (create) - Custom error classes
└── error-handler.ts   (create) - Centralized error handling

src/types/
└── logging.ts         (create) - Logging type definitions

__tests__/lib/
├── logger.test.ts     (create) - Logger tests
└── errors.test.ts     (create) - Error handling tests
```

### PR-006: Type Definitions from OpenAPI Schema
```
src/types/
└── skyfi-api.ts       (create) - All SkyFi API types

src/schemas/
└── skyfi.schemas.ts   (create) - Zod validation schemas

scripts/
└── generate-types.ts  (create) - Type generation script

__tests__/schemas/
└── skyfi.schemas.test.ts (create) - Schema validation tests
```

### PR-005: SkyFi API Client Base (BLOCKED - needs PR-004)
```
src/lib/
├── retry.ts           (create) - Retry logic
└── rate-limiter.ts    (create) - Rate limiting

src/skyfi/
├── client.ts          (create) - HTTP client
└── config.ts          (create) - API configuration

src/types/
└── skyfi-base.ts      (create) - Base type definitions

__tests__/skyfi/
└── client.test.ts     (create) - Client tests

__tests__/lib/
└── retry.test.ts      (create) - Retry logic tests
```

