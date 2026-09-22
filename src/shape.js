import {autoRatio, IMAGE_MIME, setImageHref, toElements} from "./utils.js";
import {datumFor} from "./data.js";

export function shape(elements, type = "rect", option, callback) {
    const elems = toElements(elements);
    for (const element of elems) {
        let d = datumFor(element);
        if (typeof callback === "function") d = callback(d);

        const width = element.getAttribute("width");
        const height = element.getAttribute("height");
        const [w, h] = autoRatio(d.__img, width, height);

        element.setAttribute("width", w);
        element.setAttribute("height", h);

        d.__canvas.width = w;
        d.__canvas.height = h;

        const strategy = shapes[type];
        if (!strategy) throw new Error(`Unknown shape: ${type}`);
        strategy.function([w, h], d, option);
        setImageHref(element, d.__canvas.toDataURL(IMAGE_MIME));
    }
    return elements;
}

export function shape_rect(containerSize, d) {
    const context = d.__canvas.getContext("2d");
    context.clearRect(0, 0, ...containerSize);
    d.__clipath = undefined;
    context.drawImage(d.__img, 0, 0, containerSize[0], containerSize[1]);
}

export function shape_circle(containerSize, d, r) {
    if (r === undefined) r = Math.min(...containerSize) / 2;

    const context = d.__canvas.getContext("2d");
    const circlePath = new Path2D();
    circlePath.arc(
        containerSize[0] / 2,
        containerSize[1] / 2,
        r,
        0,
        2 * Math.PI
    );
    context.clip(circlePath);
    d.__clipath = circlePath;
    context.drawImage(d.__img, 0, 0, containerSize[0], containerSize[1]);
}

export function shape_path(containerSize, d, path) {
    let clipPath;

    if (Array.isArray(path) && path.length > 3) {
        if (
            Math.max(...path.map(p => p[0])) <= 1 &&
            Math.max(...path.map(p => p[1])) <= 1
        ) {
            path = path.map(p => p.map((v, i) => v * containerSize[i]));
        }

        clipPath = new Path2D();
        clipPath.moveTo(...path[0]);
        for (let i = 1; i < path.length; ++i) clipPath.lineTo(...path[i]);
    } else if (typeof path === "string") {
        clipPath = new Path2D(path);
    } else {
        clipPath = new Path2D();
    }

    const context = d.__canvas.getContext("2d");
    context.clip(clipPath);
    d.__clipath = clipPath;
    context.drawImage(d.__img, 0, 0, containerSize[0], containerSize[1]);
}

export const shapes = {
    rect: {function: shape_rect},
    circle: {function: shape_circle},
    path: {function: shape_path}
};