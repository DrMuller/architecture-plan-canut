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
