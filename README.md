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

Choose **Walkthrough** in the camera bar for an eye-level visit. Click the small floor dots, spaced about half a metre along the room and corridor routes, to jump, or use **Jump to** to enter another room. Drag (or swipe) to turn your head; arrow keys also turn the view. Scroll or use +/− to change the field of view. **Exit walkthrough**, Esc, or another camera preset returns to orbit controls.

Walls and ceilings remain full in walkthrough mode. Points hidden by walls are not shown, and points occupied by moved furniture are disabled. Navigation is local to each visitor and does not change the shared design.


## Individual wall and bathroom colours

In **Materials**, select a named wall face or choose **Pick a wall or tiled floor** and click it in the model. Dragging still orbits the camera. Opposite sides of partitions and room sections of long walls have separate finishes. The kitchen wood cladding also has its own finish.

The SDB bathroom and SDE shower room have separate floor and wall palettes, including the shower recess returns and the ML cupboard return. Tiles are 50 × 50 mm with 2 mm grout; their world-space grid stays the same size during cutaways and ceiling-height changes. Custom colours leave the grout neutral.

Colours are included in automatic local recovery, JSON export/import and **Save & share → Save shared design**. Older designs inherit their previous plaster finish on the new wall faces. Repeated uploaded textures use validated references to avoid inflating exports. The update needs no Supabase schema changes.


## Reuse colours and select multiple walls

**Saved colours** is available for every material. The last used colour appears first; click a saved swatch to reuse that exact solid colour on the current surface or selection. **Save current** also stores an existing surface colour without recolouring anything. Up to 12 unique colours are kept, included in local recovery, JSON exports and shared design saves. Tile grids and neutral grout stay intact when applying colours.

Use **Pick walls or tiled floors**, then click a face. **Shift-click** adds or removes faces, including without first entering selection mode. A blue overlay marks the actual selected faces, following wall cutaways and ceiling-height changes. The selection count and names appear in Materials. A normal click replaces the selection, and **Clear selection** or Esc clears it. Selection is local UI state and is never exported or shared. Colour/finish and roughness edits apply to the whole selection; uploaded texture editing is limited to a single non-tiled surface.

Wall selection also works inside **Walkthrough**: enable **Pick walls or tiled floors**, click to select, or Shift-click to add/remove. Dragging still turns your head and floor dots still move between points. Colour changes keep the same camera position and direction. Esc first clears an active selection; a second Esc exits walkthrough.


## Furniture detail and individual colours

Movable sofas, armchairs, chairs, beds, wardrobes, tables and the desk use rounded edges, padded cushions, timber legs, handles, fabric weave and wood grain. The reconstruction keeps the existing furniture IDs, positions, rotations and nominal sizes; these are illustrative furniture models, not identified manufacturer products.

Select furniture in **Furniture** or click it in walkthrough. Choose **Wood & frame**, **Upholstery / fabric**, or **Bedding / scatter cushions** where available, then use the colour picker, swatches or saved colours. Only the selected piece changes. **Restore colours** restores that piece’s original palette independently of its position. Colour overrides are included in automatic local saves, JSON exports and explicit shared saves. Older designs load with the new default furniture palette. No database migration is required. In walkthrough, arrow keys keep turning the head; Esc deselects furniture before exiting.
