import {createCanvas, loadImage} from "./utils.js";

export async function singleBind(data, img) {
    if (typeof img === "string") {
        data.__src = img;
        data.__img = await loadImage(img);
    } else {
        data.__img = img;
    }

    data.__canvas = createCanvas(data.__img.naturalWidth, data.__img.naturalHeight);
    data.__canvas.getContext("2d").drawImage(data.__img, 0, 0);
    return data;
}

export function datumFor(element, data) {
    return data !== undefined ? data : element.__data__;
}