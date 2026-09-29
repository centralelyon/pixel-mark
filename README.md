# `pixel-mark`

A [`pixel-mark`](https://observablehq.com/@liris/pixel-mark) is a graphical mark or encoding that uses images to plot data.

This repo is a D3 toolkit extension designed to facilitate the usage and encoding of raster images in D3 data visualization, and provide data-driven pixel-wise encoding.
At its core, this toolkit is divided in 3 functions: 

* **SHAPE** To select the images' shape (e.g. hexagon,circle, or star..).
* **FIT** To decide how such shape should be filled (e.g. center, stretch, focus, or crop..)
* **TRANSFORM** To provide pixel-wise transformations on images to encode data. (e.g. color filter, halftone, or hexbin..)

You can experiment, and explore different strategies of these functions on this sandbox:
https://centralelyon.github.io/pixel-mark/liveEdit/


## Installation

```bash
npm install pixel-mark d3
```

Or via CDN:

```html
<script src="https://unpkg.com/pixel-mark"></script>
```


## How to use it

First import it in your work and init it with data like you would in any D3 visualization (an Array of Objects). To be usable, D3 should be accessible in you work
With a script import as it follows:

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

See the documentation for strategies available of each:
[**SHAPE**](https://github.com/centralelyon/pixel-mark/blob/main/docs/SHAPE.md)
[**FIT**](https://github.com/centralelyon/pixel-mark/blob/main/docs/FIT.md)
[**TRANSFORM**](https://github.com/centralelyon/pixel-mark/blob/main/docs/TRANSFORM.md)




The *transform()* function is chainable! Meaning you can combine multiple transforms on a single image!


## Credits

ANR Grant [Project-ANR-21-CE33-0002](https://anr.fr/Project-ANR-21-CE33-0002)

<p align="center">
  <a href="https://www.ec-lyon.fr"><img src="figures/logo-ecl.png" alt="ECL" width="22%"/></a>
  <a href="https://anr.fr/"><img src="figures/logo-anr.png" alt="ANR" width="22%"/></a>
  <a href="https://www.inria.fr"><img src="figures/logo-inria.png" alt="Inria" width="22%"/></a>
  <a href="https://liris.cnrs.fr"><img src="figures/logo-liris.png" alt="LIRIS" width="22%"/></a>
</p>
