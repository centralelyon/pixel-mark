# `pixel-mark`

A [`pixel-mark`](https://observablehq.com/@liris/pixel-mark) is a graphical mark or encoding that uses images to plot data.

This repo is a D3 toolkit extention decidated to facilitate the usage and encoding of raster images in D3 data visualization.


The toolkit is accessible in this link

[https://observablehq.com/@liris/pixel-mark-d3-toolkit](https://observablehq.com/@liris/pixel-mark-d3-toolkit)




## How it works

This toolkit is divided in 3 major functions

* *.**shape**(type,option,callback)* <br>
To define what shape should the image have.
Where *type* is a string amongst: [rect, circle, path] with **rect** as default.

  Checkout this gallery for more information:
  [https://observablehq.com/@liris/list-of-pixel-mark-shape](https://observablehq.com/@liris/list-of-pixel-mark-shape)

* *.**fit**(type,option,callback)* <br>
To define how the image should fill the given shape.
Where *type* is a string amongst:  [clip, stretch, carve, repeat] with **stretch** as default.

  Checkout this gallery for more information:

  [https://observablehq.com/@liris/list-of-pixel-mark-fit](https://observablehq.com/@liris/list-of-pixel-mark-fit)

* *.**transform**(type,value,options = {})*<br>
To modify the raster image w.r.t. data.
  Where *type* is a string amongst: [pixel, kcolor, blur, opacity, sepia, invert, saturate, brightness, contrast, grayscale, dotted, grid, countSq, toColor] .<br> And *value* is a callback that returns a number (e.g. the amount of pixels when `type=="pixel"`).

  Checkout this gallery for more information:
  [https://observablehq.com/@liris/list-of-available-pixel-mark-transform](https://observablehq.com/@liris/list-of-available-pixel-mark-transform)

The *transform()* function is chainable! *(*shape()* and *fit()* should also be but such use seems irrelevant)*.

## How to use it

Currently this toolkit is only accessible in the observable framework.


First import it in your notebook and init it with data like you would in any D3 visualization (an Array of Objects)

```javascript

  import {initPixScale} from "@liris/pixel-mark-d3-toolkit"

  iniPixScale(data,images)
```

* In SVG use .fit() to draw images, and .transform() to encode data. What follows is the minimal necessity for the use of this toolkit on a single datapoint.
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


