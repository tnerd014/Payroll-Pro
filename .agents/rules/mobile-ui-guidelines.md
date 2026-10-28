# Mobile UI/UX Guidelines: Icon Economy & Minimalist Action Design

## Core Rule: Not All Buttons Need Text
On mobile screens, screen space is at an absolute premium. Overcrowding buttons with excessive copy (e.g. multi-line button labels like "Print Official Payslip" or wide banners like "Official Payslip Document Tap to view & share breakdown") makes the mobile UI look bloated, congested, and dated.

## Concrete Principles to Follow Across All Mobile Views:
1. **Icon-First Actions**:
   - Just the icon is often enough. Use established, intuitive iconography:
     - Payslip Preview: `<FileText />`
     - Printing: `<Printer />`
     - Sharing: `<Share2 />`
     - Dismissing / Closing: `<X />` or `<ArrowLeft />`
     - Copying: `<Copy />` / `<Check />`
     - Editing: `<Edit3 />`
     - Deleting: `<Trash2 />`
   - Every icon button MUST have an accessible `title` and `aria-label` attribute and a minimum touch target size of 40x40px to 48x48px.

2. **No Bloated Card Action Strips**:
   - Do NOT add redundant full-width action strips with sentences of text to every card in a list.
   - Place a sleek, tactile icon button directly on the card header/row, or make the card itself cleanly tappable.

3. **Minimalist Action Docks**:
   - In floating bottom bars and sheet footers, prioritize icon buttons or single concise words (e.g. "Print", "Share", "Done").
   - Center action docks with thumb-friendly spacing rather than stretching wide text buttons across the bottom.
