# Build log

| screen | date | state | notes |
| --- | --- | --- | --- |
| S00 welcome | 2026-10-27 | done | onboarding once, then settings |
| S01 invoices list | 2026-10-27 | done | stats, search, status chips, empty states |
| S02 editor | 2026-10-27 | done | client/product pickers, per-line and global discount, validation |
| S03 viewer | 2026-10-27 | done | 3 templates, status stamp, ZATCA TLV QR, print to PDF, share, duplicate, convert |
| S04 estimates | 2026-10-27 | done | shares S01-S03 code paths |
| S05 clients | 2026-10-27 | done | outstanding per client |
| S06 products | 2026-10-27 | done | reached from settings |
| S07 settings | 2026-10-27 | done | logo (shrunk client-side), signature pad, accent, backup/restore, wipe |
| S08 reports | 2026-10-27 | done | by month, top clients, VAT collected |

Harder than expected: Chromium clips right-to-left documents in its print
path when the root is `dir="rtl"`. Fixed by switching the page wrappers to
LTR in `@media print` and keeping only the invoice itself RTL.

Tested with Playwright at 390px and 1366px: full flow, zero console errors,
PDF verified by rasterising the output.
