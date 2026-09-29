# `pixel-mark`

A [`pixel-mark`](https://observablehq.com/@liris/pixel-mark) is a graphical mark or encoding that uses images to plot data.

This repo is a D3 toolkit extention decidated to facilitate the usage and encoding of raster images in D3 data visualization.


The toolkit is accessible as esm or umd script in the *dist* directory.


## How to use it

First import it in your work and init it with data like you would in any D3 visualization (an Array of Objects). To be usable, D3 should be accessible in you work
With a script import as it follows:

````html
<script src="../dist/pixel_mark.umd.js"></script>
````

This toolkit plug its configuration directly to data as such.

```javascript

const {
    initPixScale,
    fit,
    shape,
    transform
} = pixel_mark;

  const dataset = initPixScale(data,images)
```


Then functions (FIT,SHAPE, TRANSFORM) are usable os any D3 functionality. In SVG use .fit() to draw images, and .transform() to encode data. 

In general, ech function follows the same structure e.g:


```js
fit("strategy", callback)

```
Where the callback should return a normalized value between `0` and `1`.

What follows is the minimal necessity for the use of this toolkit on a single datapoint.
```javascript

  const svg = d3.select(DOM.svg(50,50))
  
  svg
  .append("image")
  .datum(data[0])
  .attr("width", 50)
  .attr("height", 50)
  .attr("x", 0) 
  .attr("y", 0)  
  .fit() 
  .transform("grid", (d) => Math.random())
```

See below the list of options available for **FIT, SHAPE, TRANSFORM**


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




## **fit**(type,option,callback)* <br>
To define how the image should fill the given shape.
Where *type* is a string amongst:  [clip, stretch, carve, repeat] with **stretch** as default.

```js
fit(elements, "option", d => value)
```


### Clip

Fits the image inside the target area by clipping portions that extend beyond the container.

The callback controls how strongly clipping is applied.

- `0` — minimum clipping.
- `1` — maximum clipping needed to fit the target.

---

### Stretch
Stretches the image independently along the horizontal and vertical axes to fill the target.

- `0` — preserve the original aspect ratio.
- `1` — fully stretch the image to fill the target.

---

### Carve

Uses content-aware seam carving to resize the image while attempting to preserve visually important regions.

- `0` — minimum/conventional resizing.
- `1` — maximum content-aware resizing.

---

### Repeat
Repeats or tiles the image so that it covers the target area.

- `0` — use the image as a single image.
- `1` — fully tile the target.

---

### Center Crop

Scales the image toward covering the target while keeping the crop centered.

- `0` — minimum cropping.
- `1` — full centered cover/crop.

---

### Focus

Crops and positions the image around a specified focal point. The callback controls how strongly the image is fitted around that point.

A focal point can be supplied on the datum:

```js
d.__focus = [0.25, 0.4];
```

Coordinates are normalized:

```text
[0, 0]     → top-left
[0.5, 0.5] → center
[1, 1]     → bottom-right
```

Example:

```js
fit(images, "focus", d => d.zoom);
```

---

### Saliency Crop

Automatically identifies visually important regions of the image and uses them to determine the crop.

- `0` — minimum saliency-based adjustment.
- `1` — maximum saliency-based crop.

A saliency point can also be given:

```js
d.__saliency = [0.7, 0.35];
```

---

### Warp

Applies a nonlinear deformation to the image.

- `0` — no warp.
- `1` — maximum warp.

---

### Mesh
Deforms the image using a grid or mesh.

- `0` — original geometry.
- `1` — maximum mesh deformation.

---

### Squeeze
Compresses the image along one axis, progressively changing its aspect ratio.

- `0` — no squeeze.
- `1` — maximum squeeze.

---

### Bend

Bends the image progressively along one dimension, producing a curved projection.

- `0` — flat image.
- `1` — maximum bend.

---

### Cylinder
Maps the image onto a cylindrical surface.

- `0` — flat projection.
- `1` — maximum cylindrical curvature.

---

### Sphere

Maps the image toward a spherical projection, producing a bulging or lens-like deformation.

- `0` — flat image.
- `1` — maximum spherical deformation.

---



  Checkout this gallery for more information:

  [https://observablehq.com/@liris/list-of-pixel-mark-fit](https://observablehq.com/@liris/list-of-pixel-mark-fit)

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


The *transform()* function is chainable! *(*shape()* and *fit()* should also be but such use seems irrelevant)*.



