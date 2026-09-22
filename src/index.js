import * as d3 from "d3";
import {transform} from "./transform.js";
import {fit} from "./fit.js";
import {shape} from "./shape.js";
import {createCanvas, loadImage} from "./utils.js";

export {transform, fit, shape};


function asSelectionMethod(fn) {
    return function (...args) {
        fn(this.nodes(), ...args);
        return this;
    };
}


export async function initPixScale(data, images, callback) {
    // Extend d3.selection with the toolkit's custom methods.
    d3.selection.prototype.transform = asSelectionMethod(transform);
    d3.selection.prototype.fit = asSelectionMethod(fit);
    d3.selection.prototype.shape = asSelectionMethod(shape);

    if (data === undefined) return data;

    if (Array.isArray(images)) {
        for (let i = 0; i < data.length; ++i) {
            // TODO: still only handles b64 strings vs. already-loaded HTMLImageElements
            if (typeof images[0] === "string") {
                data[i].__src = images[i];
                data[i].__img = (await loadImage(data[i].__src));
            } else {
                data[i].__img = images[i];
            }

            data[i].__canvas = createCanvas(data[i].__img.naturalWidth, data[i].__img.naturalHeight);
            data[i].__canvas.getContext("2d").drawImage(data[i].__img, 0, 0);
        }
    } else {
        for (let i = 0; i < data.length; ++i) {
            data[i].__src = images([data[i]].map(callback)[0]);
            data[i].__img = (await loadImage(data[i].__src));
            data[i].__canvas = createCanvas(data[i].__img.naturalWidth, data[i].__img.naturalHeight);
            data[i].__canvas.getContext("2d").drawImage(data[i].__img, 0, 0);
        }
    }

    return data;
}