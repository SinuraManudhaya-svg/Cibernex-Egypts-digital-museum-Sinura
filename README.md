# Egypt Digital Museum

A dark, gold-accented digital museum for Ancient Egypt — HTML/CSS/vanilla JS
frontend, Express + MongoDB Atlas backend. "Ancient Egypt meets future
technology."

## Pages

| Page | What it does |
|---|---|
| `index.html` | Homepage. Has an extended cinematic "main loading screen" (see below) shown once per browser session, plus an Announcements section at the bottom. |
| `artifacts.html` | Browse/search/filter/sort the artifact collection. |
| `artifact.html?id=<id>` | Single artifact detail page. |
| `timeline.html` | Artifacts grouped by historical period, with a clickable era track. |
| `exhibitions.html` | Browse curated exhibitions (search, category filters, sort). |
| `exhibition.html?id=<slug>` | Single exhibition detail page, with its linked artifacts. |
| `virtual-museum.html` | Room-by-room walkthrough — each "room" is one of your exhibitions. Artifacts with a `model3d` field get a rotatable 3D "View in 3D" button (Three.js). |
| `learn.html` | Static educational reference: overview, hieroglyphic alphabet, notable kings/queens, major gods, glossary. No database involved — content lives directly in the HTML. |
| `about.html` | About the developer. |
| `admin.html` | Password-protected dashboard for adding/editing/deleting artifacts, exhibitions, and announcements. See **Admin Dashboard** below. |

## Structure

```
index.html, artifacts.html, artifact.html, timeline.html,
exhibitions.html, exhibition.html, virtual-museum.html,
learn.html, about.html, admin.html

css/
  main.css                 Shared theme (colors, navbar, hero, buttons)
  components.css           Shared component styles (chips, cards, fact-grid, etc.)
  loader.css               The standard loading-screen animation (every page except index.html)
  main-loader.css          The extended "main loading screen" — index.html only, first load per session
  responsive.css           Homepage breakpoints
  artifacts.css            Collection grid, cards, featured card, My Collection panel
  artifact-detail.css      Artifact detail page layout
  exhibitions.css          Exhibitions browse page
  exhibition-detail.css    Exhibition detail page (shared by exhibition.html and virtual-museum.html)
  timeline.css             Timeline page
  virtual-museum.css       Room stage, nav controls, 3D viewer modal
  learn.css                Data tables, sticky jump nav (learn.html only)
  announcements.css        Homepage announcements section
  admin.css                Admin dashboard

js/
  main.js                  Lenis smooth scroll + standard loading screen (every page except index.html)
  main-loader.js           Extended loading screen logic — index.html only
  nav-links.js             Active nav highlighting + mobile hamburger menu (shared)
  collection.js            localStorage helper for "My Collection"
  artifacts.js             Artifacts page logic: fetch, search, filter, sort, render
  artifact-detail.js       Artifact detail page logic
  timeline.js              Timeline page logic
  exhibitions.js           Exhibitions browse page logic
  exhibition-detail.js     Exhibition detail page logic
  virtual-museum.js        Room-by-room walkthrough logic
  model-viewer.js          Three.js 3D model viewer (ES module, loaded via importmap)
  learn.js                 Sticky jump-nav scroll-spy for learn.html
  announcements.js         Fetches + renders the homepage announcements section
  admin.js                 Admin dashboard logic (login, CRUD for all 3 entities)

json/
  artifacts.json           Static artifact database — also the fallback source when
                            the API server isn't running, and what you seed into MongoDB
  exhibitions.json         Same idea, for exhibitions

My/
  my.png                   Developer photo used on about.html

server/
  server.js                Express API — reads/writes artifacts, exhibitions and
                            announcements in MongoDB Atlas; also serves the whole
                            static site on the same port
  seed.js                  Imports json/artifacts.json into MongoDB (npm run seed)
  seed-exhibitions.js      Imports json/exhibitions.json into MongoDB (npm run seed:exhibitions)
  .env                     Your real MongoDB + admin credentials (never commit this)
  package.json             Server dependencies + npm scripts
```

## Running it locally

1. In `server/`, make sure `.env` has:
   ```
   MONGODB_URI="mongodb+srv://..."
   DB_NAME="egypt_digital_museum"
   COLLECTION_NAME="artifacts"
   PORT=3000
   ADMIN_TOKEN="something-only-you-know"
   ADMIN_PASSWORD="something-else-only-you-know"
   ```
   `ADMIN_TOKEN` and `ADMIN_PASSWORD` are both required for `admin.html` to work —
   the login screen asks for both, and the server checks both together (see
   **Admin Dashboard** below for why there are two).
2. `cd server && npm install`
3. Seed your data (safe to re-run any time — it upserts, never duplicates):
   ```
   npm run seed               # imports json/artifacts.json
   npm run seed:exhibitions   # imports json/exhibitions.json
   ```
4. `npm start` — this connects to Atlas and serves **the entire site**
   (frontend + API) at `http://localhost:3000`. You only need this one
   process running — `server.js` serves the HTML/CSS/JS itself, so
   there's no separate static file server needed.
5. Visit `http://localhost:3000/index.html`.

Every page's JavaScript tries the local API first
(`http://localhost:3000/api/...`) and falls back to the matching file in
`json/` if the server isn't running — so most pages still work even with
the backend off. **Announcements are the one exception**: they only live
in MongoDB (no `json/announcements.json` fallback), so if the server's
down, that section just hides itself instead of showing broken/empty data.

## Admin Dashboard

Visit `http://localhost:3000/admin.html`. You'll be asked for the **token**
and **password** you set in `.env` — both must match for the dashboard to
unlock (this two-field login, instead of just one, is a deliberate small
extra hurdle: it means an attacker would need to have leaked *both* values
to get in, not just one).

Once unlocked, three tabs:

- **Artifacts** — add/edit/delete. New artifacts get the next free numeric
  `id` automatically.
- **Exhibitions** — add/edit/delete. You choose the `id` yourself (a slug
  like `pharaohs`) since it's used in URLs; it can't be changed after
  creation. `Artifact IDs` is a comma-separated list (e.g. `1, 3, 15`).
- **Announcements** — add/edit/delete. Active ones appear automatically
  at the bottom of `index.html` — no extra step needed.

**Security note:** this is a shared token+password check, appropriate for
local development or a personal project only — there are no real user
accounts, no password hashing, no rate-limiting, no HTTPS enforcement.
**Do not deploy `admin.html` publicly as-is.** If this site is ever hosted
somewhere real, that write access needs proper authentication first.

## Adding a new artifact or exhibition

**Easiest: use `admin.html`** — it writes straight to MongoDB.

**Manually via the JSON files** (useful before you've connected Mongo, or
for bulk edits): edit `json/artifacts.json` / `json/exhibitions.json`
directly, then re-run the matching seed command (`npm run seed` or
`npm run seed:exhibitions`) to push the change into the database — editing
the JSON file alone does **not** update the live site, since the site
reads from MongoDB whenever the API server is running.

- Artifacts: give it a unique numeric `id`. `sortYear` is a plain number
  used for Oldest/Newest sorting — negative for BCE, positive for CE. Set
  `"featured": true` to include it in the rotating featured section.
- Exhibitions: give it a unique `id` slug. `artifactIds` is an array of
  real artifact `id`s — the exhibition pulls each artifact's full details
  live rather than duplicating them.

### Adding real images
Set an artifact's or exhibition's `"image"` field to a path or URL. If
it's missing or fails to load, the site automatically falls back to the
gold Eye-of-Horus placeholder instead of a broken image — never a hard
error. Legally-usable sources: The Met's Open Access collection
(CC0), the British Museum's collection site, and Wikimedia Commons.

### Adding a 3D model
Give an artifact a `"model3d"` field pointing to a `.glb`/`.gltf` file
(e.g. `models/artifacts/mask.glb`). It then gets a "View in 3D" button on
its card in `virtual-museum.html`, opening an interactive Three.js viewer
(drag to rotate, scroll to zoom). No AI on this platform can generate the
actual 3D file — you'll need an external tool (Meshy AI, Tripo3D, etc.)
or a real scanned/downloaded model.

## Security checklist before pushing to GitHub

- [ ] `server/.env` is listed in `.gitignore` (check `server/` — it should
  already be there)
- [ ] You've never committed a real `MONGODB_URI`, `ADMIN_TOKEN`, or
  `ADMIN_PASSWORD` to version control
- [ ] If any credential above was ever exposed (e.g. pasted somewhere
  public), rotate it in MongoDB Atlas / change it in `.env`

## Deploying beyond localhost

The frontend is a static site (no build step). `server/server.js` is a
Node/Express app — it can't run on a static host like Cloudflare Pages by
itself. To go live: keep the frontend on a static host, and move
`server/` to something that runs Node continuously (Render, Railway,
Fly.io, etc.), then update the `API_URL`/`*_API_URL` constants at the top
of each page's JS file to point at that server's real URL instead of
`http://localhost:3000`.