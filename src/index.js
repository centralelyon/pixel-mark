import * as d3 from "d3";
import {transform} from "./transform.js";
import {fit} from "./fit.js";
import {shape} from "./shape.js";
import {attachImage, loadImage} from "./utils.js";

export {transform, fit, shape};


//somehow this trick is needed to get nodes in selections
function asSelectionMethod(fn) {
    return function (...args) {
        fn(this.nodes(), ...args);
        return this;
    };
}


export async function initPixScale(data, images, callback) {
    d3.selection.prototype.transform = asSelectionMethod(transform);
    d3.selection.prototype.fit = asSelectionMethod(fit);
    d3.selection.prototype.shape = asSelectionMethod(shape);

    if (data === undefined) return data;

    const usesArray = Array.isArray(images);
    const usesUrls = usesArray && typeof images[0] === "string";


    await Promise.all(data.map(async (datum, i) => {
        if (usesArray) {
            // TODO: still only handles b64/URL strings vs. already-loaded
            // HTMLImageElements — same as the original notebook cell.
            if (usesUrls) {
                datum.__src = images[i];
                return attachImage(datum, await loadImage(datum.__src));
            }
            return attachImage(datum, images[i]);
        }

        datum.__src = images([datum].map(callback)[0]);
        return attachImage(datum, await loadImage(datum.__src));
    }));

    return data;
}