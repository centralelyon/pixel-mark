
## **shape**(type,option,callback)* <br>
Apply a shape with `.shape("<type>", option)`. The `option` argument is optional and its meaning depends on the shape. Shapes are centered in the container and, unless noted otherwise, sized to fit its shorter side. Rotations are in radians. Names are camelCase in code (e.g. `roundedRect`).
Checkout this gallery for more information:
[https://observablehq.com/@liris/list-of-pixel-mark-shape](https://observablehq.com/@liris/list-of-pixel-mark-shape)

---

### Rect

Draws the image as a plain rectangle filling the whole container, with no clipping.

- no option.

---

### Circle

Clips the image to a circle centered in the container.

- omitted — the circle fits the container (its diameter is the shorter side).
- `r` — the radius in pixels.

---

### Path

Clips the image to a custom polygon or SVG path.

- an array of `[x, y]` points (at least 4) — in pixels, or as fractions of the container if every coordinate is between `0` and `1`.
- an SVG path string, e.g. `"M10 10 L90 10 L50 90 Z"`.
- omitted or invalid — nothing is visible, because an empty path clips everything.

---

### Triangle

Clips the image to an equilateral triangle inscribed in the container, pointing up.

- omitted — one vertex pointing straight up.
- `rotation` — rotates the triangle around the center (e.g. `Math.PI` points it down).

---

### Diamond

Clips the image to a diamond, a square rotated 45° with its corners touching the middle of each side.

- omitted — vertices at the top, right, bottom and left.
- `rotation` — rotates the diamond (e.g. `Math.PI / 4` gives an upright square).

---

### Pentagon

Clips the image to a regular five-sided polygon, pointing up.

- omitted — one vertex pointing straight up.
- `rotation` — rotates the pentagon around the center (e.g. `Math.PI` points it down).

---

### Hexagon

Clips the image to a regular six-sided polygon, "pointy-top" by default.

- omitted — a vertex at the top and bottom, flat sides left and right.
- `0` — flat-top: flat sides at the top and bottom, points left and right.
- `rotation` — any other angle rotates the hexagon around the center.

---

### Octagon

Clips the image to a regular eight-sided polygon.

- omitted — a vertex at the top, bottom, left and right.
- `Math.PI / 8` — flat sides at the top, bottom, left and right (stop-sign orientation).

---

### Star

Clips the image to a star with configurable point count and sharpness.

- omitted — a 5-pointed star.
- a number — the number of points (e.g. `6`).
- `{points, innerRatio}` — `innerRatio` runs from `0` to `1` (default `0.5`); smaller values give thinner, spikier arms, and values near `1` approach a regular polygon.

---

### Cross

Clips the image to a plus-shaped cross.

- omitted — arms one third as thick as the container's shorter side.
- a number — the arm thickness as a fraction of the shorter side (e.g. `0.5` for chunkier arms, `0.1` for thin bars).

---

### Rounded Rect

Clips the image to a rectangle with rounded corners.

- omitted — corner radius of 15% of the shorter side.
- `radius` — the corner radius in pixels, capped at half the shorter side.

---


