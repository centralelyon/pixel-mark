

## **transform**(type,value,options = {})*<br>

Apply a transform with `.transform("<name>", value)`. Unless noted otherwise, `value` is a number from `0` to `1`. Names are camelCase in code (e.g. `flowField`, `countSq`, `toColor`).

Checkout this gallery for more information:
[https://observablehq.com/@liris/list-of-available-pixel-mark-transform](https://observablehq.com/@liris/list-of-available-pixel-mark-transform)

---

### Pixel

Pixelates the image by shrinking it and redrawing it enlarged without smoothing, producing blocky mosaic cells.

- `0` — coarsest: a 3×3 grid of giant blocks.
- `1` — finest: close to the original detail (about 70% resolution per axis).
- Values above `1` are read as a target pixel count.

---

### Kcolor

Reduces the image to a limited palette using k-means color clustering, giving a flat, posterized look.

- `0` — a single color.
- `1` — 32 colors.
- Values above `1` — the exact number of colors (e.g. `5` gives 5 colors).

---

### Blur

Applies a Gaussian blur to the image.

- `0` — no blur.
- `n` — blur radius in pixels; larger values are blurrier.

---

### Opacity

Fades the image by changing its overall transparency.

- `0` — fully transparent.
- `1` — fully opaque (unchanged).

---

### Sepia

Gives the image a warm, brownish vintage tone.

- `0` — original colors.
- `1` — full sepia.

---

### Invert

Inverts the image's colors, producing a photographic negative.

- `0` — original colors.
- `1` — fully inverted.

---

### Saturate

Adjusts the intensity of the image's colors.

- `0` — fully desaturated (grayscale).
- `1` — original colors.
- `3` — strongly oversaturated.

---

### Brightness

Makes the image lighter or darker.

- `0` — black.
- `1` — original brightness.
- `2` — twice as bright.

---

### Contrast

Increases or decreases the difference between light and dark areas.

- `0` — flat gray.
- `1` — original contrast.
- `3` — high contrast.

---

### Grayscale

Removes color from the image.

- `0` — original colors.
- `1` — fully grayscale.

---

### Dotted

Overlays a dark layer punched with a grid of circular holes, so the image is only fully visible through the dots.

- `0` — no holes: only the dark overlay remains.
- larger values: bigger dots (dot radius is `value` × one third of the image width); useful up to about `0.25`.

---

### Grid

Covers the image with a black grid whose square windows reveal the picture beneath.

- `0` — no windows: the image is fully covered.
- `1` — very large windows, each half the image width.

---

### Count Sq

Reveals the image one square at a time, filling row by row, with the remaining area left black.

- `0` — (almost) fully covered.
- `1` — fully revealed.

---

### To Color

Tints the image with a solid color (`#09f` by default).

- `0` — no tint.
- `1` — the image is fully replaced by the flat color.

---

### Spiral

Twists the image into a spiral, with the rotation increasing toward the edges.

- `0` — no distortion.
- `1` — strongest swirl (about 1.5 turns at the corners).

---

### Radial

Squeezes the image toward its center, compressing the outer areas in a barrel-like distortion.

- `0` — no distortion.
- `1` — maximum compression toward the center.

---

### Orbit

Rotates the image around its center.

- `0` — no rotation.
- `0.5` — rotated 180°.
- `1` — a full 360° turn, identical to `0`.

---

### Wave

Ripples the image vertically along a sine wave.

- `0` — flat image.
- `1` — tall, frequent waves (about 8 cycles, amplitude around 18% of the shorter side).

---

### Flow

Warps the image with smooth, swirling displacement, like paint pushed along by a current.

- `0` — no distortion.
- `1` — strongest flow (displacement up to about 25% of the shorter side).

---

### Hexbin

Rebuilds the image as a honeycomb of hexagonal cells, each filled with the color sampled at its center.

- `0` — tiny hexagons (about 2 px radius), close to the original detail.
- `1` — large hexagons (about one eighth of the shorter side).

---

### Halftone

Converts the image into a halftone dot pattern on a white background, with darker areas drawn as larger dots.

- `0` — very fine dots.
- `1` — coarse dots (cells about one fourteenth of the shorter side).

---

### Edge

Replaces the image with a Sobel edge-detection map that highlights where brightness changes sharply.

- `0` and `1` — both show the full edge map (they look identical).
- values in between — fade out weak edges, keeping only the strong contours.

---

### Flow Field

Smears pixels along the image's own contours, giving a painterly, flowing look.

- `0` — no distortion.
- `1` — strongest smear.

---

### Shear

Slants the image horizontally around its vertical center.

- `0` — maximum slant, with the top pushed to the right.
- `0.5` — no shear.
- `1` — maximum slant the other way, with the top pushed to the left.

---

### Warp

Stretches the image outward from the center, magnifying the outer areas in a pincushion-like distortion.

- `0` — no distortion.
- `1` — maximum outward stretch.

---

### Fisheye

Bulges the center of the image outward like a wide-angle lens while keeping the edges in place.

- `0` — subtle lens effect (not an exact identity).
- `1` — strong fisheye, with roughly 3× magnification at the center.

---

### Ripple

Adds concentric ripples radiating from the center, like a stone dropped in water.

- `0` — flat image.
- `1` — tight, high-amplitude ripples.

---

### Twist

Twists the image around its center, with the rotation strongest in the middle and fading toward the edges.

- `0` — no distortion.
- `1` — up to a full turn at the center.

---

