# Agent Operational Rules: Database Synchronization & Minimalist UI

## 1. Mandatory Database & Schema Synchronization
Whenever making any changes, corrections, additions, or migrations to the database (Supabase / PostgreSQL):
- You **MUST** update `schema.sql` at the root of the project at the same time.
- `schema.sql` is the source-of-truth reference for the production database schema. It must always stay 100% in sync with all live tables, columns, indexes, constraints, and RLS policies.

## 2. Minimalist Design: Zero Redundant Explanatory Microcopy
Modern, human-designed applications (Apple, Stripe, Linear, Notion, Raycast) do not clutter interfaces with obvious descriptive paragraphs under headers, stat cards, or form inputs.
- **No Definition Subtitles Under Headers**:
  - Avoid AI-generated descriptions like:
    - *"Manage staff profiles, monthly gross remuneration, and statutory deduction flags."*
    - *"Log unpaid days not worked with automatic workweek proration."*
    - *"Disbursements, automated monthly salary deductions, and balance tracking."*
    - *"Configure automated delivery or direct WhatsApp chat integration to send official salary payslips..."*
  - Use clean, confident titles alone (`Employee Directory`, `Staff Loans`, `Absence Log`, `WhatsApp Settings`).
- **Clean Selection Cards**:
  - Option and provider cards should feature crisp iconography and concise labels, not long explanatory blurbs.
- **Reserve Text for Dynamic Context**:
  - Only render contextual text when it displays live, dynamic state (e.g. `Active period: November 2026 • 24 Personnel`), never static redundant definitions of what the screen or button is.

