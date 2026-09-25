import {autoRatio, createCanvas, IMAGE_MIME, setImageHref, toElements} from "./utils.js";
import {datumFor} from "./data.js";


function shapePath(containerSize, d) {
    const spec = d.__shape || {type: "rect"};
    const type = spec.type || "rect";
    const option = spec.option;
    const [w, h] = containerSize;

    if (type === "rect") return undefined;

    if (type === "circle") {
        const r = option === undefined
            ? Math.min(w, h) / 2
            : Number(option);
        const path = new Path2D();
        path.arc(
            w / 2,
            h / 2,
            Number.isFinite(r) ? r : Math.min(w, h) / 2,
            0,
            2 * Math.PI
        );
        return path;
    }

    if (type === "path") {
        let points = option;

        if (Array.isArray(points) && points.length > 2) {
            const normalized = points.every(p =>
                Array.isArray(p) &&
                p.length >= 2 &&
                Number.isFinite(Number(p[0])) &&
                Number.isFinite(Number(p[1])) &&
                Number(p[0]) >= 0 && Number(p[0]) <= 1 &&
                Number(p[1]) >= 0 && Number(p[1]) <= 1
            );

            points = normalized
                ? points.map(([x, y]) => [Number(x) * w, Number(y) * h])
                : points;

            return pathFromPoints(points);
        }

        if (typeof points === "string") return new Path2D(points);
        return undefined;
    }

    if (type === "triangle") return pathFromPoints(regularPolygonPoints([w, h], 3));
    if (type === "diamond") return pathFromPoints(regularPolygonPoints([w, h], 4));
    if (type === "pentagon") return pathFromPoints(regularPolygonPoints([w, h], 5));
    if (type === "hexagon") return pathFromPoints(regularPolygonPoints([w, h], 6));
    if (type === "octagon") return pathFromPoints(regularPolygonPoints([w, h], 8));

    if (type === "star") {
        const points = typeof option === "number"
            ? option
            : option?.points ?? 5;
        const innerRatio = typeof option === "object"
            ? option.innerRatio ?? 0.5
            : 0.5;

        const cx = w / 2;
        const cy = h / 2;
        const outerR = Math.min(w, h) / 2;
        const innerR = outerR * innerRatio;
        const step = Math.PI / points;
        const vertices = [];

        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = -Math.PI / 2 + i * step;
            vertices.push([
                cx + r * Math.cos(angle),
                cy + r * Math.sin(angle)
            ]);
        }

        return pathFromPoints(vertices);
    }

    if (type === "cross") {
        const thicknessRatio = Number.isFinite(Number(option))
            ? Number(option)
            : 1 / 3;

        const t = Math.min(w, h) * thicknessRatio;
        const x0 = (w - t) / 2;
        const x1 = (w + t) / 2;
        const y0 = (h - t) / 2;
        const y1 = (h + t) / 2;

        return pathFromPoints([
            [x0, 0], [x1, 0], [x1, y0], [w, y0],
            [w, y1], [x1, y1], [x1, h], [x0, h],
            [x0, y1], [0, y1], [0, y0], [x0, y0]
        ]);
    }

    if (type === "roundedRect") {
        const r = Math.min(
            Number(option ?? Math.min(w, h) * 0.15),
            Math.min(w, h) / 2
        );

        const path = new Path2D();
        path.moveTo(r, 0);
        path.lineTo(w - r, 0);
        path.arcTo(w, 0, w, r, r);
        path.lineTo(w, h - r);
        path.arcTo(w, h, w - r, h, r);
        path.lineTo(r, h);
        path.arcTo(0, h, 0, h - r, r);
        path.lineTo(0, r);
        path.arcTo(0, 0, r, 0, r);
        path.closePath();
        return path;
    }

    return undefined;
}

function applyShapeMask(canvas, d) {
    const context = canvas.getContext("2d");
    const path = shapePath([canvas.width, canvas.height], d);
    d.__clipath = path;
    if (!path) return canvas;

    const masked = createCanvas(canvas.width, canvas.height);
    const maskedContext = masked.getContext("2d");
    maskedContext.drawImage(canvas, 0, 0);
    maskedContext.save();
    maskedContext.globalCompositeOperation = "destination-in";
    maskedContext.fill(path);
    maskedContext.restore();

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(masked, 0, 0);
    return canvas;
}


function resizeCanvasPreservingContent(d, width, height) {
    const canvas = d.__canvas;
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));

    if (canvas.width === w && canvas.height === h) return canvas;

    const current = createCanvas(
        Math.max(1, canvas.width || w),
        Math.max(1, canvas.height || h)
    );

    if (canvas.width && canvas.height) {
        current.getContext("2d").drawImage(canvas, 0, 0);
    }

    canvas.width = w;
    canvas.height = h;

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, w, h);

    if (current.width && current.height) {
        context.drawImage(
            current,
            0, 0, current.width, current.height,
            0, 0, w, h
        );
    }

    return canvas;
}

function renderShape(containerSize, d) {
    resizeCanvasPreservingContent(d, containerSize[0], containerSize[1]);
    return applyShapeMask(d.__canvas, d);
}

export function shape(elements, type = "rect", option, callback) {
    const elems = toElements(elements);

    for (let i = 0; i < elems.length; ++i) {
        const element = elems[i];
        let d = datumFor(element);

        if (typeof callback === "function") {
            d = callback(d, i, elems);
        }

        if (!d || !d.__img || !d.__canvas) {
            throw new Error("shape() requires data initialized with initPixScale()");
        }

        const width = element.getAttribute("width");
        const height = element.getAttribute("height");
        const [w, h] = autoRatio(d.__img, width, height);

        element.setAttribute("width", w);
        element.setAttribute("height", h);

        d.__shape = {type, option};
        renderShape([w, h], d);

        setImageHref(element, d.__canvas.toDataURL(IMAGE_MIME));
    }

    return elements;
}

function pathFromPoints(points, close = true) {
    const clipPath = new Path2D();
    clipPath.moveTo(...points[0]);
    for (let i = 1; i < points.length; ++i) clipPath.lineTo(...points[i]);
    if (close) clipPath.closePath();
    return clipPath;
}

function regularPolygonPoints(containerSize, sides, rotation = -Math.PI / 2) {
    const [w, h] = containerSize;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2;
    const points = [];
    for (let i = 0; i < sides; i++) {
        const angle = rotation + (i * 2 * Math.PI) / sides;
        points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    return points;
}




function shapeFunction(containerSize, d, type, option) {
    d.__shape = { type, option };
    renderShape(containerSize, d);
    return d.__canvas;
}

export function shape_rect(containerSize, d) {
    return shapeFunction(containerSize, d, "rect");
}

export function shape_circle(containerSize, d, r) {
    return shapeFunction(containerSize, d, "circle", r);
}

export function shape_path(containerSize, d, path) {
    return shapeFunction(containerSize, d, "path", path);
}

function regularPolygonShape(sides) {
    return function (containerSize, d, rotation = -Math.PI / 2) {
        d.__shape = {
            type: "path",
            option: regularPolygonPoints(containerSize, sides, rotation)
        };
        return renderShape(containerSize, d);
    };
}

export const shape_triangle = regularPolygonShape(3);
export const shape_diamond = regularPolygonShape(4);
export const shape_pentagon = regularPolygonShape(5);
export const shape_hexagon = regularPolygonShape(6);
export const shape_octagon = regularPolygonShape(8);

export function shape_star(containerSize, d, option) {
    d.__shape = { type: "star", option };
    return renderShape(containerSize, d);
}

export function shape_cross(containerSize, d, thicknessRatio = 1 / 3) {
    d.__shape = { type: "cross", option: thicknessRatio };
    return renderShape(containerSize, d);
}

export function shape_roundedRect(containerSize, d, radius) {
    d.__shape = { type: "roundedRect", option: radius };
    return renderShape(containerSize, d);
}

export const shapes = {
    rect: {function: shape_rect},
    circle: {function: shape_circle},
    path: {function: shape_path},
    triangle: {function: shape_triangle},
    diamond: {function: shape_diamond},
    pentagon: {function: shape_pentagon},
    hexagon: {function: shape_hexagon},
    octagon: {function: shape_octagon},
    star: {function: shape_star},
    cross: {function: shape_cross},
    roundedRect: {function: shape_roundedRect}
};