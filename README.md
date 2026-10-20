# Ivry · Atelier Canut

Interactive 3D reconstruction of a Lyon canut apartment based on the ASEPT PRO ind. 1 plan and 3D views dated 12 October 2026.

Open `index.html` directly, or visit the GitHub Pages URL after enabling **Settings → Pages → Deploy from a branch → main → / (root)**. The root page embeds its scripts, styles, and cropped plan, so Pages needs no build step.

The editable source is in `dist/`. To run it locally:

```sh
python3 -m http.server 4173 --directory dist
```

Then open <http://localhost:4173>.

Use **Arrange furniture** to select, drag, rotate, nudge, reset, and undo movable furnishings. Layout and material choices save in browser storage. Furniture movement is intentionally freeform; compare the floor plan when checking clearances.

Printed widths from the plan guide the model. The entry and bathroom box has a 2.90 m plasterboard ceiling; the kitchen/living area reaches 4.00 m with a main beam and timber joists. Beam section, joist spacing, furniture sizes and window heights are illustrative and should not be treated as survey dimensions.

Three.js and OrbitControls are copyright the Three.js authors and licensed under MIT. See <https://github.com/mrdoob/three.js/blob/master/LICENSE>.


## Save, export and shared editing

**Save & share** provides a complete JSON export/import and automatic local drafts in IndexedDB, including furniture, finishes, uploaded textures and ceiling heights. JSON exports can be imported on another device. PNG exports are pictures only.

GitHub Pages serves the application. Supabase stores one shared apartment design. Everyone who can access the page can read and save it; there is no sign-in or editor restriction. Shared saves are explicit. Visitors check for new revisions every 10 seconds while the page is visible. A newer shared revision never silently overwrites an unsaved local draft: load the latest version or explicitly replace it. Export a draft before replacing it if you want a separate copy.

Setup:

1. Run `supabase/schema.sql` in the project's Supabase SQL Editor.
2. Set the project origin and **publishable** key in `dist/shared-config.js`. A legacy anon key is also supported. Never use a secret or service-role key.
3. Run `npm test` and `npm run build`, then publish the updated root `index.html` to GitHub Pages.
4. Open **Save & share**, save the first shared design, and check it from another browser.

The SQL keeps previous shared revisions in `app_private.ivry_history`, accessible to the project administrator. Writes use an atomic revision check. Local drafts remain available when the connection fails. This is shared snapshot editing, not simultaneous per-object merging.

Rebuild the standalone page after editing any source in `dist/`:

```sh
npm run build
```


## Walkthrough

Choose **Walkthrough** in the camera bar for an eye-level visit. Click a visible floor marker to jump, or use **Jump to** to enter another room. Drag (or swipe) to turn your head; arrow keys also turn the view. Scroll or use +/− to change the field of view. **Exit walkthrough**, Esc, or another camera preset returns to orbit controls.

Walls and ceilings remain full in walkthrough mode. Points hidden by walls are not shown, and points occupied by moved furniture are disabled. Navigation is local to each visitor and does not change the shared design.
