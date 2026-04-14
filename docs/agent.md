# GitPulse - AI Agent Instructions

## How to Use This Project

### ALWAYS Read This First

**Before doing anything else, read `/docs/project_memory.md`**

This is the PRIMARY SOURCE OF TRUTH for the project. It contains:
- Project overview and purpose
- Current status and roadmap
- Tech stack
- Architecture overview
- Key components
- Key decisions (WHY decisions were made)
- Known issues
- Current focus
- Next steps

### Use Core Files as Primary Context

After reading `project_memory.md`, use these core files:

1. **`/docs/architecture.md`** - System design, modules, folder structure, component interaction
2. **`/docs/dev_log.md`** - Chronological summary of major updates
3. **`/docs/tasks.md`** - Pending tasks, completed tasks, future improvements

### Only Read Deeper Files If Needed

- **`/docs/research/`** - Market research, technical explorations, comparisons, deep analysis
- **`/docs/archive/`** - Old updates, redundant plans, temporary notes

**DO NOT** dump research content into core memory files. Instead:
- Summarize key insights into `project_memory.md`
- Keep full details in `/docs/research/`

### Ignore Noise

- **node_modules** - Package dependencies
- **build/dist folders** - Compiled output
- **Irrelevant generated files** - Temporary build artifacts

### DO NOT Rely on Scattered Markdown Files

All relevant documentation is now consolidated in `/docs/`. Do not search for scattered markdown files outside this directory.

## 🔁 UPDATE_MEMORY Command

When the instruction "UPDATE_MEMORY" is given, you MUST:

1. **Analyze recent changes**
   - Review recent code changes
   - Check new documentation
   - Identify new features
   - Note architecture changes

2. **Update core memory files**

   **`/docs/project_memory.md`**
   - Update current status
   - Add new components
   - Update key decisions
   - Add known issues
   - Update current focus
   - Update next steps
   - Reflect architecture changes

   **`/docs/dev_log.md`**
   - Add chronological summary of updates
   - Keep concise (no raw logs or noise)
   - Focus on major milestones

   **`/docs/tasks.md`**
   - Mark completed tasks
   - Add new pending tasks
   - Update future improvements
   - Remove outdated tasks

3. **Reflect changes**
   - New features added
   - Architecture changes
   - Updated status
   - Removed outdated information

4. **Keep everything concise and structured**
   - No duplication
   - Clear hierarchy
   - Easy to scan
   - High signal-to-noise ratio

5. **NEVER duplicate content**
   - Each piece of information should live in ONE place
   - Reference other files instead of repeating
   - Cross-link where appropriate

## Decision Consistency

Base all suggestions on:
- Existing architecture (from `architecture.md`)
- Documented decisions (from `project_memory.md`)

DO NOT contradict previous decisions unless explicitly asked.

## Anti-Hallucination Rules

If information is missing:
- Say it clearly
- Do NOT guess

Prefer:
- Asking clarifying questions
- Reading relevant files
- Checking core memory first

## Performance Rule

Minimize unnecessary file reads. Prefer:
1. Memory (`project_memory.md`) → 
2. Targeted file access → 
3. Codebase search (only if needed)

## Goal

Operate as a context-aware development assistant that:
- Maintains consistent understanding
- Uses structured memory instead of raw data
- Minimizes hallucination
- Evolves with the project over time

## Quick Reference

| File | Purpose | When to Read |
|------|---------|--------------|
| `project_memory.md` | Primary source of truth | ALWAYS FIRST |
| `architecture.md` | System design | Understanding structure |
| `dev_log.md` | Update history | Understanding evolution |
| `tasks.md` | Task tracking | Planning work |
| `agent.md` | This file | Understanding how to work |
| `research/` | Deep analysis | Specific research needs |
| `archive/` | Old docs | Rarely needed |
