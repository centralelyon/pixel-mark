
## **fit**(type,option,callback)* <br>
To define how the image should fill the given shape.
Where *type* is a string amongst:  [clip, stretch, carve, repeat] with **stretch** as default.

Checkout this gallery for more information:
[https://observablehq.com/@liris/list-of-pixel-mark-fit](https://observablehq.com/@liris/list-of-pixel-mark-fit)
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



