# Agent Defaults and PR State Model

**Version:** 1.0
**Last Updated:** 2025-11-15

This document defines the PR state model and default workflows for agents working on the SkyFi MCP project.

---

## PR State Model

Each PR in the task list (`docs/task-list.md`) progresses through a series of states:

```
New → Planning → Blocked-Ready/In Progress → Complete → Merged
                                              ↓
                                           Broken (if QC fails)
```

### State Definitions

#### `New`
- **Description**: PR has been defined but no agent has claimed it yet
- **Who Sets**: Planning agent during initial task list creation
- **What It Means**: PR is available to be claimed by an implementation agent
- **Next States**: `Planning`

#### `Planning`
- **Description**: Agent has claimed the PR and is verifying requirements and file list
- **Who Sets**: Implementation agent when claiming a PR
- **What Happens**: Agent:
  1. Reads the PRD and PR description
  2. Verifies all dependencies are `Complete`
  3. Checks for file conflicts with other PRs
  4. Refines the ESTIMATED file list to a VERIFIED file list
  5. Commits the verified file list to task list
  6. Asks clarifying questions if requirements are ambiguous
- **Next States**: `Blocked-Ready`, `In Progress`
- **Duration**: 5-10 minutes typically

#### `Blocked-Ready`
- **Description**: PR is ready to work but blocked waiting for dependencies
- **Who Sets**: Implementation agent during planning phase
- **What It Means**: Agent has verified the PR and refined file list, but dependencies are not yet complete
- **Next States**: `In Progress` (when dependencies complete)
- **Notes**: This state allows agents to do planning work in parallel while waiting for dependencies

#### `In Progress`
- **Description**: Agent is actively implementing the PR
- **Who Sets**: Implementation agent when starting work
- **What Happens**: Agent:
  1. Implements the changes according to acceptance criteria
  2. Writes tests (unit, integration as specified)
  3. Updates documentation if needed
  4. Runs linting and type checking
  5. Runs tests locally to verify
  6. Commits changes with clear commit messages
- **Next States**: `Complete`
- **Duration**: 30-60 minutes for most PRs

#### `Complete`
- **Description**: Agent has finished implementation and all acceptance criteria are met
- **Who Sets**: Implementation agent when work is done
- **What It Means**:
  - All acceptance criteria are checked off
  - Tests are written and passing
  - Code is committed
  - Documentation is updated
  - Ready for QC review
- **Next States**: `Merged` (if QC passes), `Broken` (if QC fails)
- **Requirements Before Marking Complete**:
  - All checkboxes in acceptance criteria checked
  - Test coverage >80% for new code
  - No linting errors
  - No type errors
  - All tests passing

#### `Broken`
- **Description**: QC agent found issues that need to be fixed
- **Who Sets**: QC agent during review
- **What It Means**:
  - Tests are failing
  - Code doesn't meet acceptance criteria
  - Breaking changes not properly handled
  - Documentation is incorrect or missing
- **Next States**: `Complete` (after fixes)
- **Fix Process**:
  1. Original agent (or another agent) claims the broken PR
  2. Fixes the issues identified by QC
  3. Marks as `Complete` again
  4. QC reviews again

#### `Merged`
- **Description**: PR has been reviewed by QC and merged
- **Who Sets**: QC agent after successful review
- **What It Means**: PR is complete and integrated into main branch
- **Next States**: None (terminal state)

---

## Agent Workflows

### Implementation Agent Workflow

#### 1. Finding Work
```
1. Read task-list.md
2. Find PRs in "New" state where all dependencies are "Complete"
3. Choose a PR based on:
   - Priority (High > Medium > Low)
   - Dependencies satisfied
   - Skills match
   - No file conflicts with other "In Progress" PRs
4. Claim the PR by moving it to "Planning"
```

#### 2. Planning Phase
```
1. Read docs/prd.md for context
2. Read the PR description and acceptance criteria
3. Verify all dependencies are in "Complete" state
4. Check file list for conflicts with other "In Progress" PRs
5. Refine ESTIMATED file list to VERIFIED file list:
   - Identify all files that will be created/modified
   - Check for conflicts with other PRs
   - Update task-list.md with verified file list
6. If dependencies not ready: move to "Blocked-Ready"
7. If dependencies ready: move to "In Progress"
8. Commit the updated task list with verified file list
```

#### 3. Implementation Phase
```
1. Create/modify files according to plan
2. Follow coding standards (.claude/rules/coding-standards.md)
3. Write tests (unit, integration as required)
4. Update documentation if needed
5. Run linting: npm run lint
6. Run type checking: npm run type-check
7. Run tests: npm test
8. Fix any errors
9. Commit changes with conventional commit messages
10. Move PR to "Complete" and check all acceptance criteria
11. Commit the updated task list
```

#### 4. Completion Checklist
Before marking a PR as `Complete`, verify:
- [ ] All acceptance criteria checked off
- [ ] Tests written and passing (>80% coverage)
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Documentation updated if needed
- [ ] Commits have clear, descriptive messages
- [ ] No hardcoded secrets or credentials
- [ ] Sensitive data not logged

### QC Agent Workflow

#### 1. Finding Work
```
1. Read task-list.md
2. Find PRs in "Complete" state
3. Prioritize by:
   - PRs blocking other work
   - High priority PRs
   - Oldest "Complete" PRs
```

#### 2. Review Process
```
1. Read the PR description and acceptance criteria
2. Review the code changes:
   - Verify all acceptance criteria are met
   - Check code quality and adherence to coding standards
   - Verify tests exist and cover edge cases
   - Check for security issues (hardcoded secrets, etc.)
   - Verify error handling is robust
   - Check documentation is accurate
3. Run tests: npm test
4. Run linting: npm run lint
5. Run type checking: npm run type-check
6. If all checks pass: move to "Merged" and merge the code
7. If issues found: move to "Broken" with detailed feedback
```

#### 3. Breaking a PR
When marking a PR as `Broken`, provide:
- Clear description of issues found
- Specific files and line numbers where applicable
- Suggested fixes
- Which acceptance criteria are not met

**Example Broken feedback:**
```
PR-014 marked as Broken

Issues found:
1. Tests failing: archive-search.test.ts line 45 - mock not properly configured
2. Missing error handling: src/mcp/tools/search-archives.ts line 78 - no try/catch for validation errors
3. Acceptance criteria not met: "Unit tests >80% coverage" - currently at 65%
4. Linting error: src/mcp/tools/search-archives.ts line 102 - unused variable 'result'

Suggested fixes:
- Fix mock setup in test file
- Add try/catch block with proper error handling
- Add tests for error paths to increase coverage
- Remove or use the 'result' variable
```

---

## Best Practices for Agents

### Communication
- **Ask questions** if requirements are unclear (use AskUserQuestion tool)
- **Document decisions** in commit messages
- **Update task list** immediately after state changes
- **Leave clear notes** in PR descriptions if you discover issues

### Collaboration
- **Check file conflicts** before claiming a PR
- **Coordinate with other agents** if PRs have overlapping files
- **Don't block others** - if you're stuck, ask for help or release the PR
- **Respect dependencies** - never start a PR before dependencies are complete

### Quality
- **Write tests first** or alongside implementation (TDD preferred)
- **Run tests frequently** during implementation
- **Don't skip acceptance criteria** - they exist for a reason
- **Document as you go** - don't leave it for the end

### Efficiency
- **Batch similar work** - if doing multiple similar PRs, establish patterns
- **Reuse code** - look for opportunities to create shared utilities
- **Parallelize when possible** - multiple agents can work simultaneously on independent PRs
- **Don't over-engineer** - meet the acceptance criteria, don't add unnecessary features

### Time Management
- **30-60 minute PRs** - if you're exceeding 90 minutes, consider splitting
- **Planning is quick** - 5-10 minutes for most PRs
- **Testing takes time** - budget 30-40% of implementation time for testing
- **Don't rush** - quality over speed

---

## Common Scenarios

### Scenario 1: PR Blocked on Dependencies
```
PR-015 depends on PR-007 and PR-013
PR-007 is "Complete"
PR-013 is "In Progress"

Actions:
1. Agent claims PR-015
2. Moves to "Planning"
3. Verifies file list
4. Moves to "Blocked-Ready" (PR-013 not done)
5. Commits updated task list
6. Finds other work
7. When PR-013 moves to "Complete", agent returns and moves PR-015 to "In Progress"
```

### Scenario 2: File Conflict Detected
```
PR-014 will modify src/mcp/server.ts
PR-013 is "In Progress" and also modifies src/mcp/server.ts

Actions:
1. Agent planning PR-014 notices conflict
2. Options:
   a. Wait for PR-013 to complete (mark PR-014 as "Blocked-Ready")
   b. Coordinate with agent on PR-013 to avoid conflicts
   c. Refine scope of PR-014 to avoid overlapping changes
3. Document decision in task list notes
```

### Scenario 3: Acceptance Criteria Unclear
```
PR-020 has ambiguous acceptance criteria about "token counting"

Actions:
1. Agent moves to "Planning"
2. Uses AskUserQuestion tool to clarify
3. Waits for user response
4. Updates PR description in task list with clarification
5. Commits clarification
6. Proceeds to "In Progress"
```

### Scenario 4: PR Too Large
```
PR-008 is taking 2+ hours to implement

Actions:
1. Agent recognizes PR is too large
2. Proposes splitting into PR-008a and PR-008b
3. Updates task list with new PRs and dependencies
4. Completes smaller PR-008a
5. Leaves PR-008b for next agent (or continues if time permits)
```

### Scenario 5: Tests Failing After Dependency Merge
```
PR-015 was "Complete" and tests passing
PR-013 merged with breaking changes
PR-015 tests now failing

Actions:
1. QC agent marks PR-015 as "Broken"
2. Provides details: "Tests failing due to changes in PR-013"
3. Agent (original or new) claims broken PR
4. Updates code to work with new PR-013 changes
5. Re-runs tests
6. Marks as "Complete" again
```

---

## State Transition Rules

### Valid Transitions

| From State | To State | Who | Condition |
|------------|----------|-----|-----------|
| New | Planning | Implementation Agent | Agent claims PR |
| Planning | Blocked-Ready | Implementation Agent | Dependencies not ready |
| Planning | In Progress | Implementation Agent | Dependencies ready, no conflicts |
| Blocked-Ready | In Progress | Implementation Agent | Dependencies now complete |
| In Progress | Complete | Implementation Agent | All acceptance criteria met |
| Complete | Merged | QC Agent | Review passed |
| Complete | Broken | QC Agent | Issues found |
| Broken | Complete | Implementation Agent | Issues fixed |

### Invalid Transitions

❌ `New` → `In Progress` (must go through Planning)
❌ `In Progress` → `Merged` (must go through Complete and QC review)
❌ `Merged` → any state (terminal state)
❌ `Planning` → `Complete` (must implement in In Progress state)

---

## Metrics and Expectations

### Time Expectations
- **Planning**: 5-10 minutes
- **Implementation**: 30-60 minutes
- **QC Review**: 10-15 minutes
- **Fixing Broken PRs**: 15-30 minutes

### Quality Expectations
- **First-time QC pass rate**: >80%
- **Test coverage**: >80% for all new code
- **Zero linting/type errors**: Required for "Complete" state
- **Documentation**: Updated for all user-facing changes

### Collaboration Expectations
- **Response time for questions**: <24 hours
- **State updates**: Immediate (commit after every state change)
- **File conflict resolution**: Proactive communication

---

**Last Updated:** 2025-11-15
**Version:** 1.0
