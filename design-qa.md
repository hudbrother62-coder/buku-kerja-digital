# Buku Kerja Digital — Design QA

## Source visual truth

- Dashboard menu to remove: `upload/608fbf78-e1cb-419d-9f36-56c7361c62e0.png` (1498 × 374).
- Student edit dialog to simplify: `upload/fcefa810-613d-4aac-af17-37fa766059cf.png` (1140 × 921).
- Grade input density reference: `upload/e1b59edb-575e-4765-aaa2-373b84952933.png` (1387 × 701).
- API tutorial reference: `upload/b4b16b03-4dba-42ac-a42e-fb7768f15aab.png` (1499 × 681).
- Vercel key configuration evidence: `upload/2f053268-08d8-4ca0-b4c5-d20f67bdc54e.png` (1920 × 1080).
- Report cards to make interactive: `upload/4dc7fb2f-6045-4b08-b409-2a5d03749dc0.png` (1445 × 725).
- Broken single-class chart reference: `upload/01-IMG-20260908-WA0007-1-.jpg` (1536 × 864).

## Implementation evidence

- Local implementation: `http://terminal.local:4173/?preview=dashboard`.
- Browser-rendered dashboard capture: Cloud Browser inline capture, 966 × 904 CSS viewport, device scale factor 1.
- State: preview teacher account, light theme, one class, populated students/presence/journals/grades/schedule.
- Pixel density normalization: source screenshots were problem-state references rather than a 1:1 target mockup; comparison focused on requested removal, hierarchy, density, and functionality.

## Full-view comparison

- The four-card “Mulai dari sini” block is removed from the dashboard.
- The class-average chart remains responsive and now renders a substantial gradient column when only one class has values; two or more classes use a line and area comparison.
- “Komposisi Harian” is restored directly below the chart as a compact H/S/I/A table with totals, percentages, and progress bars.
- Routine and one-time agenda are combined below the chart in a seven-day summary; the full monthly calendar remains in Agenda.
- Dashboard typography, spacing, colors, and card radii remain consistent with the existing product design.

## Focused comparisons and interactions

- Student edit: browser dialog showed “Edit Data Siswa” and zero add-data tabs; only student fields and save/cancel remained.
- Grade form: zero grade forms on initial load, one after “Input nilai”, and a visible “Tutup formulir” control.
- Reports: four cards rendered; clicking Presensi opened 30 rows and actions for Preview, Edit data, Excel, PDF, Word, and CSV.
- Report preview: a white print-layout sheet rendered all 30 attendance rows, report identity, print date, and matching record count.
- Report deletion: each detail report exposes a delete action only for its own rows and uses the existing confirmation dialog before database deletion.
- AI tutorial: direct URL resolved to `https://aistudio.google.com/app/apikey`; five steps were visible and tutorial details were open by default.
- Console: no application-origin runtime errors after a clean reload. Browser-extension metadata messages were unrelated to the application.

## Required fidelity surfaces

- Fonts and typography: existing Inter hierarchy retained; headings and control labels remain readable and consistently weighted.
- Spacing and layout rhythm: dashboard is less top-heavy; chart and agenda use stacked full-width panels; edit dialog removes duplicate navigation.
- Colors and visual tokens: all new surfaces use existing theme tokens; canvas labels redraw for light/dark changes.
- Image quality and assets: supplied Bantu Beres logo assets remain unchanged; no placeholder was introduced.
- Copy and content: labels describe all-class averages, seven-day agenda, AI status, report contents, and export formats.

## Comparison history

1. P1: edit dialogs exposed create tabs. Fixed by rendering create tabs only when adding new master data. Browser retest returned zero tabs in edit state.
2. P1: report cards downloaded immediately and had no detail view. Fixed with a detail table, preview dialog, edit navigation, and multi-format exports. Browser retest opened all 30 attendance rows.
3. P2: grade form filled the initial viewport. Fixed by defaulting it closed and adding an explicit open/close state. Browser retest confirmed the transition.
4. P2: canvas labels used fixed light-theme colors. Fixed by reading inherited theme tokens and redrawing when the app theme changes.
5. P1: a one-class line chart looked broken because it could only render a floating point. Fixed with a dedicated one-class column state; browser retest measured a 910 × 220 chart and confirmed visible data rendering.
6. P1: report preview did not resemble the exported document and truncated records. Fixed with a printable report sheet using the same complete row set consumed by Excel, PDF, Word, and CSV exports.
7. P2: daily attendance composition was missing after the dashboard revision. Restored as four data rows and verified in the browser.

## Final result

final result: passed
