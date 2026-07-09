---
inclusion: auto
---

# Incremental Context Policy

## Rules

1. **Read each documentation file only once per session.** Cache the understanding internally.
2. **Do not re-read unchanged documents.** If a document has been analyzed earlier in the session, reuse the previous analysis.
3. **Load source code only for modules referenced by the current task.** Never scan the entire repository unless explicitly requested.
4. **Follow lazy-loading:** Load related source code only when a specific finding or task requires evidence from that module.
5. **Reuse previous analysis whenever possible.** If a gap was already identified and documented, reference the existing finding rather than re-investigating.
6. **Minimize context window usage.** Prefer targeted searches (`grep_search`, `file_search`) over full file reads when only a specific piece of information is needed.
7. **Batch related reads.** When multiple files from the same module are needed, read them in a single turn rather than across multiple turns.

## Bootstrap Order

When starting a new investigation:
1. Read the task/prompt requirements
2. Load the most specific relevant document first (e.g., the page causing the error, not the entire architecture doc)
3. Expand context outward only when the specific file doesn't contain enough information
4. Stop loading context once the root cause is identified

## Document Priority (when multiple docs cover the same topic)

1. Source code (ground truth)
2. Functional Specification (intended behavior)
3. Design documents (architectural intent)
4. Implementation readiness / audit docs (status tracking)
5. ADRs (decision context)
