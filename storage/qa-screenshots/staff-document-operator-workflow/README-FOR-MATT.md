# Staff document operator workflow — QA capture

After logging in as founder/admin on **portal** (or local dev):

1. `/admin/operations/staff/oversight/documents` — list, assignable templates, QA sample section
2. `/admin/operations/staff/oversight/documents/templates/new` — create real template
3. Open a draft template — KXD Classic preview + PDF preview download
4. Submit for legal review → Approve for use (counsel-reviewed body only)
5. Confirm sample templates cannot be assigned from the assign dropdown

Capture PNG screenshots of steps 1–3 for PR evidence. PDF preview files can be generated with **Download PDF preview** on the template editor.

## PR #93 integration QA (2026-10-21)

- Disposable Neon branch: `staff-doc-operator-pr93-ephemeral` (`br-quiet-moon-af5chjn1`)
- Integration scripts passed on that branch (operator workflow + Release B gate + phase2)
- Vercel preview: `https://kxd-flagship-site-git-feat-staff-document-operator-workflow-kxd.vercel.app`
- Authenticated UI workflow screenshots require Matt/founder login — see `preview-login-auth-required.png`

Do not assign real documents to Tyler until Matt explicitly approves content and assignment.
