# Ask the Room — room clarifications

## App concept (won Segment 2 vote, 13–12–12)
Founders post questions they'd love a 30-second answer to. Other founders upvote and reply. Crowdsourced wisdom in real time. Built live at Seed the South 2026 — the audience should be able to sign up and use it during this workshop.

**Domain**: https://asktheroom.org (registered)
**D1 database**: `asktheroom-db` (env vars in `.env` as `ASKTHEROOM_DB_*`)
**Workers token**: existing `CLOUDFLARE_WORKERS_API_TOKEN` in `.env` (reused from dryrun setup; same Cloudflare account)
**Worker name** (for wrangler.toml): `asktheroom`

## Synthesized decisions (from clarifying poll)

| # | Question | Winner | Notes |
|---|---|---|---|
| 1 | Author identity | **Show name (default), with optional Anonymous toggle per question** | 4-2 vote. Josh elaborated: "default to name with anonymous as an option." Build the toggle. |
| 2 | Topic tags | **Tagged** | 4-1. Igor added: "figure out non-traditional aspects of question — group not just from generic category, but unique angle beyond generic grouping." For v1: predefined dropdown of common tags (Fundraising, Hiring, Product, Sales, Operations, Other). |
| 3 | Reply length | **Longer ok** | 5-1 strong. Use textarea (multi-line), not single-line input. Reasonable cap (~1000 chars). |
| 4 | Vote visibility | **See who voted** | 3-2 (one ambiguous reply from Alan, one humorous from Palash). Show upvoter names on hover/click. |
| 5 | Question lifespan | **Stay forever** | 5-1 strong. No expiration. |
| 6 | Killer feature (free-text) | **Upvotes** | Marcus + Leann both independently named "upvotes" as THE feature. Make upvoting prominent + satisfying. |
| 7 | App name (free-text) | **"Ask the Room"** (default) or **"Pretty Fly for AI"** (Taylor Leë's suggestion) | Use "Ask the Room" as the working name. |
| 8 | Notifications | **Notify me when answered** | 3-0. v1: in-app notifications only (don't try to wire email/SMS for the demo; show a notifications panel/badge). |

## Build target (locked)
- **Stack**: Cloudflare Workers + Hono + D1 + better-auth (email+password, NO email verification, NO OAuth)
- **Auth mode default**: SIGN-UP tab (NOT sign-in) — workshop / first-touch rule
- **Auth errors**: Show server's `data.message`, never bare "Sign in failed."
- **Routes pattern**: `routes/*.js` (one file per feature) — questions, votes, answers, auth handled by better-auth
- **Pages pattern**: `pages/*.js` (one file per UI route) — Hono `c.html()` with inline `<script>` against better-auth REST + your `/api/*` endpoints

## Suggested feature set (v1, minimum viable for demo)
1. **Sign up / sign in** (better-auth, default signup tab, with a "name" field captured at signup)
2. **Home / feed** — list of questions, ordered by recent or by upvotes; tag filter dropdown; each question shows: author name (or "Anonymous"), topic tag, question text, upvote count + upvoters list, answer count
3. **Ask a question** — form: question text (textarea), topic tag (dropdown), anonymous toggle (default off)
4. **Question detail page** — full question, list of answers (longer text supported), upvote button, "answer this" form for signed-in users, notifications badge for the asker if new answers landed since last visit
5. **Upvote a question** — endpoint + UI; show upvoter names on hover/click

## Raw replies (for nuance)

### Q1 Anonymity (Josh, Margaret, Suhas, Joseph, Marcia, Jim Cusson)
- Josh Nassau (+12488214299): "There should be an option to remain anonymous but the default should be to add your name"
- Margaret Cheatham Williams: Show name (postback)
- Suhas Malempati: Anonymous (postback)
- Joseph schindel: Show name (postback)
- Jim Cusson: Show name (postback)
- Marcia Klingensmith: Anonymous (postback)

### Q2 Tags (Eric, Javon, Igor, Michael, Justin OConnor, Jillian)
- Eric: Free-form (postback)
- Javon Jones: Tagged (postback)
- Igor Gorlatov: "Yes, tagged, but figure out non traditional aspects of question — group not just from generic category, but unique angle the person is coming from beyond generic grouping"
- Justin OConnor: Tagged (postback)
- Jillian Hamady: "tagged" (text)
- Michael Peck: (pending)

### Q3 Reply length (Kevin, Marié, Robin, Neadom, Kristen, John LC)
- Kevin H: Longer ok (postback)
- Marié Whittington: Longer ok (postback)
- Robin Pugh: Longer ok (postback)
- Neadom Tucker: "Short" (text)
- Kristen Santos: "Longer responses" (text)
- John Lawton Cowan: Longer ok (postback)

### Q4 Vote visibility (AJ, Palash, Alan, Parker, Justin Gray, Heathir)
- AJ Jackson: See who voted (postback)
- Palash Desai: "Just the count for everyone else but see who voted for me" (humor; treated as 'see who')
- Alan Blakeborough: "Yes" (ambiguous; not counted either way)
- Parker Byrd: "Just the count" (text)
- Justin Gray: Just the count (postback)
- Heathir McElroy: See who voted (postback)

### Q5 Lifespan (Catherine, John Heun, Han K, Paula, Julian, Lesley)
- Catherine Hayes: "Stay forever" (after typo)
- John Heun: End of day (postback)
- Han K: Stay forever (postback)
- Paula Pingel: Stay forever (postback)
- Julian Vitenson: Stay forever (postback)
- Lesley Childers: Stay forever (postback)

### Q6 Killer feature (Jim Swain, Leann, Kate, Sharon, Marcus)
- Marcus Wade: "The upvote feature"
- Leann Day: "Upvoting questions"
- Jim Swain: tapped "Share my answer" chip but didn't type
- Kate Booth: skipped
- Sharon Jones: skipped

### Q7 App name (Megan, Marie, Dylan, Taylor Leë, Taylor Davis)
- Taylor Leë Andorfer (Coach Tay): "Pretty Fly for AI"
- Taylor Davis: skipped
- Megan Spivey: skipped
- Marie: (pending)
- Dylan Troutman: (pending)

### Q8 Notifications (Subhash, Dan, Josiah, Tory, Emily)
- Dan: Notify me (postback)
- Emily Gerhardstein: Notify me (postback)
- Josiah Sherrill: Notify me (postback)
- Subhash Patidar: (send had errors — may not have received)
- Tory: (pending)

## Total opt-ins: 45
