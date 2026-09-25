import {toElements, setImageHref, createCanvas, createContext2D, IMAGE_MIME} from "./utils.js"
import {datumFor} from "./data.js";

export const transforms = {
    pixel: {defaultRange: [], function: pixelate},
    kcolor: {defaultRange: [1, 10], function: setKcolor},
    blur: {defaultRange: [2, 0], function: blur},
    opacity: {defaultRange: [0, 1], function: opacity},
    sepia: {defaultRange: [1, 0], function: sepia},
    invert: {defaultRange: [1, 0.1], function: invert},
    saturate: {defaultRange: [0, 3], function: saturate},
    brightness: {defaultRange: [0.1, 2], function: brightness},
    contrast: {defaultRange: [0.15, 3], function: contrast},
    grayscale: {defaultRange: [1, 0], function: grayscale},
    dotted: {defaultRange: [0.025, 0.25], function: dotted},
    grid: {defaultRange: [0.025, 0.25], function: grid},
    countSq: {defaultRange: [0, 1], function: countSq},
    toColor: {defaultRange: [], function: transform_toColor},
    spiral: {defaultRange: [0, 1], function: spiral},
    radial: {defaultRange: [0, 1], function: radial},
    orbit: {defaultRange: [0, 1], function: orbit},
    wave: {defaultRange: [0, 1], function: wave},
    flow: {defaultRange: [0, 1], function: flow},
    hexbin: {defaultRange: [0, 1], function: hexbin},
    halftone: {defaultRange: [0, 1], function: halftone},
    edge: {defaultRange: [0, 1], function: edge},
    flowField: {defaultRange: [0, 1], function: flowField},
    shear: {defaultRange: [0, 1], function: shear},
    warp: {defaultRange: [0, 1], function: warp},
    fisheye: {defaultRange: [0, 1], function: fisheye},
    ripple: {defaultRange: [0, 1], function: ripple},
    twist: {defaultRange: [0, 1], function: twist}
};

export function transform(elements, type, callback, dataCallback, custom) {
    const elems = toElements(elements);
    const isCallback = typeof callback === "function";

    for (let i = 0; i < elems.length; ++i) {
        const element = elems[i];
        let d = datumFor(element);
        const value = isCallback ? callback(d, i, elems) : callback;

        if (typeof dataCallback === "function") d = dataCallback(d, i, elems);

        if (type === "custom") {
            if (typeof custom !== "function") throw new TypeError("custom must be a function");
            d.__canvas = custom(d.__canvas, value);
        } else if (transforms[type]) {
            d.__canvas = transforms[type].function(d.__canvas, value);
        } else {
            throw new Error(`Unknown transform: "${type}". Valid transforms: ${Object.keys(transforms).join(", ")}, custom`);
        }

        setImageHref(element, d.__canvas.toDataURL(IMAGE_MIME));
    }

    return elements;
}

export function countSq(canvas, n) {
    const context = canvas.getContext("2d");
    const percent = canvas.width * 0.06;
    const sqSize = percent;
    const spacer = 0;
    const total = Math.floor(canvas.width / percent) *
        Math.floor(canvas.height / percent) * n;

    const tcan = createCanvas(canvas.width, canvas.height);
    const tcon = tcan.getContext("2d");
    tcon.save();
    tcon.globalAlpha = 1;
    tcon.fillRect(0, 0, canvas.width, canvas.height);
    tcon.restore();
    tcon.globalCompositeOperation = "destination-out";

    let it = 0;
    for (let y = spacer; y < canvas.height; y += sqSize + spacer) {
        for (let x = spacer; x < canvas.width; x += sqSize + spacer) {
            tcon.fillRect(x, y, sqSize, sqSize);
            if (it > total) break;
            ++it;
        }
        if (it > total) break;
    }

    tcon.fill();
    tcon.globalCompositeOperation = "destination-atop";
    tcon.drawImage(canvas, 0, 0);
    tcon.globalCompositing = "source-over";
    context.drawImage(tcan, 0, 0, canvas.width, canvas.height);
    return canvas;
}

export function dotted(canvas, n) {
    const context = canvas.getContext("2d");
    const percent = (canvas.width / 3) * n;
    const sqSize = percent * 2;
    const spacer = 0.5;

    const tcan = createCanvas(canvas.width, canvas.height);
    const tcon = tcan.getContext("2d");
    tcon.globalAlpha = 0.8;
    tcon.fillStyle = "black";
    tcon.fillRect(0, 0, canvas.width, canvas.height);
    tcon.globalCompositeOperation = "destination-out";
    tcon.globalAlpha = 1;
    tcon.beginPath();

    for (let y = spacer; y < canvas.height + sqSize; y += sqSize + spacer) {
        for (let x = spacer; x < canvas.width + sqSize; x += sqSize + spacer) {
            tcon.arc(x, y, percent, 0, 2 * Math.PI);
            tcon.closePath();
        }
    }

    tcon.fill();
    tcon.globalCompositeOperation = "destination-atop";
    tcon.drawImage(canvas, 0, 0);
    tcon.globalCompositing = "source-over";
    context.drawImage(tcan, 0, 0, canvas.width, canvas.height);
    return canvas;
}

export function grid(canvas, n) {
    const context = canvas.getContext("2d");
    const percent = (canvas.width / 2) * n;
    const sqSize = percent;
    const spacer = 1;

    const tcan = createCanvas(canvas.width, canvas.height);
    const tcon = tcan.getContext("2d");
    tcon.fillStyle = "black";
    tcon.fillRect(0, 0, canvas.width, canvas.height);
    tcon.globalCompositeOperation = "destination-out";

    for (let y = spacer; y < canvas.height; y += sqSize + spacer) {
        for (let x = spacer; x < canvas.width; x += sqSize + spacer) {
            tcon.fillRect(x, y, sqSize, sqSize);
        }
    }

    tcon.fill();
    tcon.globalCompositeOperation = "destination-atop";
    tcon.drawImage(canvas, 0, 0);
    tcon.globalCompositing = "source-over";
    context.drawImage(tcan, 0, 0, canvas.width, canvas.height);
    return canvas;
}

export function pixelate(canvas, n) {
    const width = canvas.width;
    const height = canvas.height;
    const context = canvas.getContext("2d");
    let currentPixels = width * height;

    if (n <= 1) n = Math.round((currentPixels / 2) * n);

    const nW = Math.min(width, Math.max(3, Math.sqrt(n) | 0));
    const nH = Math.min(height, Math.max(3, Math.sqrt(n) | 0));
    const tempContext = createContext2D(nW, nH);
    tempContext.drawImage(canvas, 0, 0, nW, nH);

    context.imageSmoothingEnabled = false;
    context.drawImage(
        tempContext.canvas,
        0, 0, tempContext.canvas.width, tempContext.canvas.height,
        0, 0, width, height
    );
    return context.canvas;
}

export function setKcolor(canvas, n) {
    const width = canvas.width;
    const height = canvas.height;
    const context = canvas.getContext("2d");

    if (n <= 1) n = Math.round(32 * n);
    n = Math.round(n);

    const imageData = context.getImageData(0, 0, width, height);
    const matrix = getMatrix(imageData);
    const points = matrix.map(p => {
        const result = [p.rgba.r, p.rgba.g, p.rgba.b];
        result.point = p;
        return result;
    });

    const dots = sampleMatrix(points, 1000);
    const centroids = kmeans(dots, n).centroids;
    return posterized(centroids, imageData);
}

export function sampleMatrix(matrix, sampleSize) {
    const result = [];
    const step = Math.floor(matrix.length / sampleSize);
    if (step <= 0) return matrix.slice();

    for (let i = 0; i < matrix.length; i += step) {
        result.push(matrix[Math.max(0, i - Math.floor(Math.random() * step))]);
    }
    return result;
}

export const zip = (a, b) => a.map((j, i) => [j, b[i]]);

export const distance = (a, b) =>
    zip(a, b).map(j => Math.pow(j[1] - j[0], 2))
        .reduce((x, y) => x + y, 0);

export const centroid = points =>
    points.length === 0
        ? []
        : points.reduce((a, b) => b.map((p, i) => a[i] + p))
            .map(p => Math.floor(p / points.length));

export function random(points, k) {
    if (k < 0 || k > points.length) return;
    const set = new Set();
    do {
        set.add(Math.floor(Math.random() * points.length));
    } while (set.size < k);
    return Array.from(set).map(i => points[i]);
}

export function assign(centroids, points) {
    centroids.forEach(c => {
        c.points = [];
        c.variance = 0;
    });

    points.forEach(p => {
        let min = {};
        centroids.forEach((c, j) => {
            if (j === 0) {
                min.centroid = c;
                min.distance = distance(c, p);
            }
            const newDistance = distance(c, p);
            if (min.distance > newDistance) {
                min.centroid = c;
                min.distance = newDistance;
            }
        });

        min.centroid.variance += min.distance;
        min.centroid.points.push(p);
    });

    centroids.forEach(c => {
        c.variance /= c.points.length;
    });
}

export function kmeans(points, k, centroids, maxIterations = 25, tolerance = 3) {
    if (!centroids) centroids = random(points, k);
    assign(centroids, points);

    let moved = true;
    let iterations = 0;

    while (moved && iterations < maxIterations) {
        iterations++;
        moved = false;

        for (let i = 0; i < centroids.length; i++) {
            const newCentroid = centroid(centroids[i].points);
            if (distance(centroids[i], newCentroid) > Math.pow(tolerance, 2)) {
                moved = true;
                centroids[i] = newCentroid;
            }
        }

        if (moved) assign(centroids, points);
    }

    return {centroids, iterations};
}

export function getMatrix(imageData) {
    const result = [];
    let x = 0;
    let y = 0;

    result.height = imageData.height;
    result.width = imageData.width;

    for (let i = 0; i < imageData.data.length; i += 4) {
        result.push({
            rgba: {
                r: imageData.data[i],
                g: imageData.data[i + 1],
                b: imageData.data[i + 2],
                a: imageData.data[i + 3]
            },
            position: {x, y}
        });

        if (x >= result.width - 1) {
            x = 0;
            y++;
        } else {
            x++;
        }
    }

    result.maxLab = 0;
    result.minLab = 0;
    return result;
}

export function posterized(centroids, imageData) {
    const context = createContext2D(imageData.width, imageData.height);
    const canvas = context.canvas;
    const imageData2 = context.getImageData(
        0, 0, imageData.width, imageData.height
    );

    for (let i = 0; i < imageData.data.length; i += 4) {
        const rgb = [
            imageData.data[i],
            imageData.data[i + 1],
            imageData.data[i + 2]
        ];

        const closest = {
            centroid: centroids[0],
            distance: distance(rgb, centroids[0])
        };

        for (let j = 1; j < centroids.length; j++) {
            const d = distance(rgb, centroids[j]);
            if (d < closest.distance) {
                closest.centroid = centroids[j];
                closest.distance = d;
            }
        }

        imageData2.data[i] = closest.centroid[0];
        imageData2.data[i + 1] = closest.centroid[1];
        imageData2.data[i + 2] = closest.centroid[2];
        imageData2.data[i + 3] = 255;
    }

    context.putImageData(imageData2, 0, 0);
    return canvas;
}

export function custom(canvas, d, callback) {
    return callback(canvas, d);
}

export function blur(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `blur(${n}px)`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

export function brightness(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `brightness(${n})`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

export function contrast(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `contrast(${n})`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

export function grayscale(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `grayscale(${n})`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

export function invert(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `invert(${n})`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

export function opacity(canvas, n) {
    const context = canvas.getContext("2d");
    const tempCanvas = createCanvas(canvas.width, canvas.height);
    const tempContext = tempCanvas.getContext("2d");

    tempContext.globalAlpha = n;
    tempContext.drawImage(canvas, 0, 0);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(tempCanvas, 0, 0);
    return canvas;
}

export function saturate(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `saturate(${n})`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

export function sepia(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `sepia(${n})`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

export function transform_toColor(canvas, n, color = "#09f") {
    const context = canvas.getContext("2d");
    context.save();
    context.globalAlpha = n;
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

function normalizedValue(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

function sourceImage(canvas) {
    const source = createCanvas(canvas.width, canvas.height);
    source.getContext("2d").drawImage(canvas, 0, 0);
    return source;
}

function putPixels(canvas, pixels) {
    canvas.getContext("2d").putImageData(pixels, 0, 0);
    return canvas;
}

function sampleBilinear(data, width, height, x, y) {
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    const fx = x - x0;
    const fy = y - y0;

    const i00 = (y0 * width + x0) * 4;
    const i10 = (y0 * width + x1) * 4;
    const i01 = (y1 * width + x0) * 4;
    const i11 = (y1 * width + x1) * 4;
    const out = [0, 0, 0, 0];

    for (let c = 0; c < 4; c++) {
        const a = data[i00 + c] * (1 - fx) + data[i10 + c] * fx;
        const b = data[i01 + c] * (1 - fx) + data[i11 + c] * fx;
        out[c] = a * (1 - fy) + b * fy;
    }
    return out;
}

function remapPixels(canvas, mapper) {
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const source = sourceImage(canvas);
    const input = source.getContext("2d").getImageData(0, 0, width, height);
    const output = context.createImageData(width, height);
    const src = input.data;
    const dst = output.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const mapped = mapper(x, y, width, height);
            const pixel = sampleBilinear(src, width, height, mapped[0], mapped[1]);
            const i = (y * width + x) * 4;
            dst[i] = pixel[0];
            dst[i + 1] = pixel[1];
            dst[i + 2] = pixel[2];
            dst[i + 3] = pixel[3];
        }
    }
    return putPixels(canvas, output);
}


export function spiral(canvas, value) {
    const n = normalizedValue(value);
    const turns = n * 3 * Math.PI;
    const maxRadius = Math.hypot(canvas.width, canvas.height) / 2;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    return remapPixels(canvas, (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const radius = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) + turns * (radius / maxRadius);
        return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
}

export function radial(canvas, value) {
    const n = normalizedValue(value);
    const strength = n * 0.9;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.hypot(cx, cy);
    return remapPixels(canvas, (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.hypot(dx, dy);
        if (!r) return [x, y];
        const factor = 1 + strength * (r / maxRadius) ** 2;
        return [cx + dx * factor, cy + dy * factor];
    });
}

export function orbit(canvas, value) {
    const n = normalizedValue(value);
    const angle = n * Math.PI * 2;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return remapPixels(canvas, (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        return [cx + dx * cos + dy * sin, cy - dx * sin + dy * cos];
    });
}

export function wave(canvas, value) {
    const n = normalizedValue(value);
    const amplitude = n * Math.min(canvas.width, canvas.height) * 0.18;
    const cycles = 1 + n * 7;
    return remapPixels(canvas, (x, y, width, height) => [
        x,
        y + Math.sin((x / width) * Math.PI * 2 * cycles) * amplitude
    ]);
}

export function flow(canvas, value) {
    const n = normalizedValue(value);
    const amount = n * Math.min(canvas.width, canvas.height) * 0.25;
    return remapPixels(canvas, (x, y, width, height) => {
        const nx = x / width;
        const ny = y / height;
        return [
            x + Math.sin(ny * Math.PI * 4 + nx * 2) * amount,
            y + Math.cos(nx * Math.PI * 4 + ny * 2) * amount
        ];
    });
}


export function hexbin(canvas, value) {
    const n = normalizedValue(value);
    const minSize = 2;
    const maxSize = Math.max(3, Math.min(canvas.width, canvas.height) / 8);
    const radius = minSize + n * (maxSize - minSize);
    const context = canvas.getContext("2d");
    const source = sourceImage(canvas);
    const output = createCanvas(canvas.width, canvas.height);
    const out = output.getContext("2d");
    out.clearRect(0, 0, output.width, output.height);

    const dx = radius * Math.sqrt(3);
    const dy = radius * 1.5;
    for (let row = 0, y = radius; y < canvas.height + radius; row++, y += dy) {
        const offset = row % 2 ? dx / 2 : 0;
        for (let x = radius + offset; x < canvas.width + radius; x += dx) {
            const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
            const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
            const pixel = source.getContext("2d").getImageData(sx, sy, 1, 1).data;
            out.fillStyle = `rgba(${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3] / 255})`;
            out.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = Math.PI / 3 * i;
                const px = x + radius * Math.cos(a);
                const py = y + radius * Math.sin(a);
                if (i === 0) out.moveTo(px, py); else out.lineTo(px, py);
            }
            out.closePath();
            out.fill();
        }
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(output, 0, 0);
    return canvas;
}


export function halftone(canvas, value) {
    const n = normalizedValue(value);
    const minRadius = 0.75;
    const maxCell = Math.max(3, Math.min(canvas.width, canvas.height) / 14);
    const cell = minRadius + n * (maxCell - minRadius);
    const source = sourceImage(canvas);
    const input = source.getContext("2d");
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = cell / 2; y < canvas.height; y += cell) {
        for (let x = cell / 2; x < canvas.width; x += cell) {
            const sx = Math.min(canvas.width - 1, Math.floor(x));
            const sy = Math.min(canvas.height - 1, Math.floor(y));
            const p = input.getImageData(sx, sy, 1, 1).data;
            const luminance = (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
            const radius = (1 - luminance) * cell * 0.48;
            if (radius <= 0) continue;
            context.fillStyle = `rgba(${p[0]},${p[1]},${p[2]},${p[3] / 255})`;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
    }
    return canvas;
}

export function edge(canvas, value) {
    const n = normalizedValue(value);
    const source = sourceImage(canvas);
    const context = source.getContext("2d");
    const input = context.getImageData(0, 0, canvas.width, canvas.height);
    const output = context.createImageData(canvas.width, canvas.height);
    const src = input.data;
    const dst = output.data;
    const threshold = n * 255;

    const luminance = (x, y) => {
        x = Math.max(0, Math.min(canvas.width - 1, x));
        y = Math.max(0, Math.min(canvas.height - 1, y));
        const i = (y * canvas.width + x) * 4;
        return 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
    };

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const gx = -luminance(x - 1, y - 1) - 2 * luminance(x - 1, y) - luminance(x - 1, y + 1)
                + luminance(x + 1, y - 1) + 2 * luminance(x + 1, y) + luminance(x + 1, y + 1);
            const gy = -luminance(x - 1, y - 1) - 2 * luminance(x, y - 1) - luminance(x + 1, y - 1)
                + luminance(x - 1, y + 1) + 2 * luminance(x, y + 1) + luminance(x + 1, y + 1);
            const magnitude = Math.min(255, Math.hypot(gx, gy));
            const v = magnitude >= threshold ? magnitude : magnitude * n;
            const i = (y * canvas.width + x) * 4;
            dst[i] = dst[i + 1] = dst[i + 2] = v;
            dst[i + 3] = 255;
        }
    }
    return putPixels(canvas, output);
}

export function flowField(canvas, value) {
    const n = normalizedValue(value);
    const source = sourceImage(canvas);
    const input = source.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    const data = input.data;
    const width = canvas.width;
    const height = canvas.height;
    const step = 1 + n * 7;
    const strength = n * Math.min(width, height) * 0.18;
    return remapPixels(canvas, (x, y) => {
        const xi = Math.max(1, Math.min(width - 2, Math.round(x)));
        const yi = Math.max(1, Math.min(height - 2, Math.round(y)));
        const lum = (px, py) => {
            const i = (py * width + px) * 4;
            return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        };
        const dx = lum(xi + 1, yi) - lum(xi - 1, yi);
        const dy = lum(xi, yi + 1) - lum(xi, yi - 1);
        const len = Math.hypot(dx, dy) || 1;
        return [x - (dy / len) * strength * step / 4, y + (dx / len) * strength * step / 4];
    });
}

export function shear(canvas, value) {
    const n = normalizedValue(value);
    const amount = (n - 0.5) * 2;
    const maxShear = 0.8;
    return drawWithTransform(canvas, (context, source, width, height) => {
        context.transform(1, 0, amount * maxShear, 1, -amount * maxShear * height / 2, 0);
        context.drawImage(source, 0, 0);
    });
}

export function warp(canvas, value) {
    const n = normalizedValue(value);
    const strength = n * 0.9;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    return remapPixels(canvas, (x, y) => {
        const nx = (x - cx) / cx;
        const ny = (y - cy) / cy;
        const radial = nx * nx + ny * ny;
        const factor = 1 + strength * radial;
        return [cx + (x - cx) / factor, cy + (y - cy) / factor];
    });
}

export function fisheye(canvas, value) {
    const n = normalizedValue(value);
    const strength = n;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.hypot(cx, cy);
    return remapPixels(canvas, (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.hypot(dx, dy);
        if (!r) return [x, y];
        const rn = r / maxRadius;
        const mapped = rn === 0 ? 0 : Math.tan(rn * Math.atan(1 + strength * 3)) / Math.tan(Math.atan(1 + strength * 3));
        const factor = mapped / rn;
        return [cx + dx * factor, cy + dy * factor];
    });
}

export function ripple(canvas, value) {
    const n = normalizedValue(value);
    const amplitude = n * Math.min(canvas.width, canvas.height) * 0.08;
    const frequency = 4 + n * 16;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    return remapPixels(canvas, (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.hypot(dx, dy);
        if (!r) return [x, y];
        const offset = Math.sin(r / Math.max(1, Math.min(canvas.width, canvas.height)) * Math.PI * frequency) * amplitude;
        return [x + dx / r * offset, y + dy / r * offset];
    });
}

export function twist(canvas, value) {
    const n = normalizedValue(value);
    const maxAngle = n * Math.PI * 2;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.hypot(cx, cy);
    return remapPixels(canvas, (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.hypot(dx, dy);
        const angle = maxAngle * (1 - Math.min(1, r / maxRadius));
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
    });
}