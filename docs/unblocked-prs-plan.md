# Unblocked PRs Plan

**Generated:** 2025-11-15
**Purpose:** Planning document for parallel PR development with file dependency tracking

---

## Currently Unblocked PRs (Block 1)

### ✅ PR-003: Coding Standards Document
**Status:** ALREADY COMPLETE
**Priority:** Medium
**Files Created:**
- `.claude/rules/coding-standards.md` ✅ (exists)
- `.claude/rules/agent-defaults.md` ✅ (exists)

**Notes:** These files were already created in the planning phase and merged from main. This PR can be marked as complete.

---

### 🟢 PR-001: Project Setup and Configuration
**Status:** READY TO START
**Dependencies:** None
**Priority:** High
**Estimated Time:** 45-60 minutes

**Files This PR Will Touch:**
- `package.json` (create)
- `tsconfig.json` (create)
- `.eslintrc.js` (create)
- `.prettierrc` (create)
- `jest.config.js` (create)
- `.nvmrc` (create)
- `src/index.ts` (create)
- `__tests__/setup.ts` (create)

**Key Dependencies to Install:**
- `@modelcontextprotocol/sdk`
- `openai`
- `zod`
- `axios`
- `winston`
- `dotenv`
- TypeScript, ESLint (Airbnb config), Prettier, Jest

**Acceptance Criteria:**
- [ ] package.json with all core dependencies
- [ ] TypeScript compiles successfully with strict mode enabled
- [ ] ESLint runs without errors on sample code
- [ ] Prettier formats code correctly
- [ ] Jest test runner executes successfully
- [ ] npm scripts for build, test, lint, format are working

**Conflicts:** None - This PR has no file conflicts with other PRs

---

### 🟢 PR-002: Docker Configuration
**Status:** READY TO START
**Dependencies:** None
**Priority:** High
**Estimated Time:** 30-45 minutes

**Files This PR Will Touch:**
- `Dockerfile` (create)
- `.dockerignore` (create)
- `docker-compose.yml` (create)
- `docker-compose.prod.yml` (create)

**Acceptance Criteria:**
- [ ] Dockerfile builds successfully with multi-stage optimization
- [ ] Production image size <200MB
- [ ] docker-compose.yml starts MCP server and Postgres
- [ ] Health check defined in Dockerfile
- [ ] Non-root user for security
- [ ] Build time <5 minutes

**Conflicts:** None - This PR has no file conflicts with other PRs

---

## Parallelization Strategy

### Current Opportunity (Block 1)
All three PRs in Block 1 can technically run in parallel:
- **PR-001** and **PR-002** have ZERO file overlap
- **PR-003** is already complete

**Recommendation:** Agents can safely work on PR-001 and PR-002 simultaneously without any conflicts.

### Next Block (Block 2) - Blocked Until Block 1 Complete
After PR-001 is complete, these PRs will become unblocked:
- **PR-004**: Logging and Error Handling Infrastructure
  - Depends on: PR-001
  - Files: `src/lib/logger.ts`, `src/lib/errors.ts`, `src/lib/error-handler.ts`, etc.

- **PR-005**: SkyFi API Client Base
  - Depends on: PR-001, PR-004
  - Files: `src/skyfi/client.ts`, `src/skyfi/config.ts`, `src/lib/retry.ts`, etc.

- **PR-006**: Type Definitions from OpenAPI Schema
  - Depends on: PR-001
  - Files: `src/types/skyfi-api.ts`, `src/schemas/skyfi.schemas.ts`, `scripts/generate-types.ts`, etc.

**Block 2 Parallelization:**
- PR-004 and PR-006 can run in parallel (no file overlap)
- PR-005 must wait for PR-004 to complete (depends on logging infrastructure)

---

## File Conflict Matrix for Block 1-2

| PR | package.json | tsconfig.json | src/index.ts | src/lib/* | src/skyfi/* | src/types/* | src/schemas/* |
|---|---|---|---|---|---|---|---|
| PR-001 | CREATE | CREATE | CREATE | - | - | - | - |
| PR-002 | - | - | - | - | - | - | - |
| PR-004 | - | - | - | CREATE | - | CREATE | - |
| PR-005 | - | - | - | CREATE | CREATE | CREATE | CREATE |
| PR-006 | - | - | - | - | - | CREATE | CREATE |

**Conflicts:**
- ⚠️ PR-005 and PR-006 both create files in `src/types/*` and `src/schemas/*` - they should NOT run in parallel
- ✅ PR-004 and PR-006 have no conflicts - they CAN run in parallel
- ✅ PR-001 and PR-002 have no conflicts - they CAN run in parallel

---

## Recommended Work Order

### Immediate (Parallel Track)
1. **Agent A** → PR-001 (Project Setup)
2. **Agent B** → PR-002 (Docker Configuration)

### Next Wave (After PR-001 complete)
3. **Agent A** → PR-004 (Logging Infrastructure)
4. **Agent B** → PR-006 (Type Definitions)

### Following Wave (After PR-004 and PR-006 complete)
5. **Agent A or B** → PR-005 (SkyFi API Client Base)

---

## Notes for Agents

1. **Before claiming a PR:**
   - Check this file to see if it's unblocked
   - Verify no other agent is working on a conflicting PR
   - Confirm all dependencies are complete

2. **File conflict resolution:**
   - If you must work on a PR that conflicts with another in-progress PR, coordinate or wait
   - The file conflict matrix above shows exact overlaps

3. **State transitions:**
   - Update task-list.md when claiming: New → Planning → In Progress → Complete
   - Update this planning doc when starting work on a PR

4. **Testing requirements:**
   - Every PR MUST include tests
   - Target >80% code coverage
   - Integration tests where applicable

5. **Commit and push:**
   - Work on branch: `claude/add-task-list-01P4Qt9PjwMZB5fRygqRn83j`
   - Commit with clear messages
   - Push when complete: `git push -u origin claude/add-task-list-01P4Qt9PjwMZB5fRygqRn83j`

---

## Summary

**Currently Unblocked:** 2 PRs (PR-001, PR-002) + 1 already complete (PR-003)
**Safe to Parallelize:** PR-001 and PR-002 (zero conflicts)
**Next Unblocked:** 3 PRs in Block 2 after PR-001 completes
**Critical Path:** PR-001 → PR-004 → PR-005 (blocks many downstream PRs)

