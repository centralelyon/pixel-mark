import * as d3 from 'd3';

const IMAGE_MIME = "image/png";

function autoRatio(img, width, height) {
    const tw = testContainerSize(width);
    const th = testContainerSize(height);

    if (tw && th) return [+width, +height];
    if (tw && !th) return [+width, img.naturalHeight * width / img.naturalWidth];
    if (!tw && th) return [img.naturalWidth * height / img.naturalHeight, +height];
    return [+img.naturalWidth, +img.naturalHeight];
}

function testContainerSize(size) {
    return !(size === null || size === undefined || size === "" || size === 0 || size === "0");
}


function toElements(elements) {
    if (elements instanceof Element) return [elements];
    if (elements && typeof elements[Symbol.iterator] === "function") {
        return Array.from(elements);
    }
    throw new TypeError("Expected an SVG element or an iterable of SVG elements");
}


function createCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

function createContext2D(width, height) {
    const canvas = createCanvas(width, height);
    return canvas.getContext("2d");
}

function setImageHref(element, value) {
    element.setAttribute("href", value);
    element.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", value);
}

async function loadImage(url) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;

    if (image.complete && image.naturalWidth) return image;

    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error(`Unable to load image: ${url}`));
    });

    return image;
}

function attachImage(datum, img) {
    datum.__img = img;
    datum.__canvas = createCanvas(img.naturalWidth, img.naturalHeight);
    datum.__canvas.getContext("2d").drawImage(img, 0, 0);
    return datum;
}

function datumFor(element, data) {
    return element.__data__;
}

const transforms = {
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

function transform(elements, type, callback, dataCallback, custom) {
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

function countSq(canvas, n) {
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

function dotted(canvas, n) {
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

function grid(canvas, n) {
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

function pixelate(canvas, n) {
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

function setKcolor(canvas, n) {
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

function sampleMatrix(matrix, sampleSize) {
    const result = [];
    const step = Math.floor(matrix.length / sampleSize);
    if (step <= 0) return matrix.slice();

    for (let i = 0; i < matrix.length; i += step) {
        result.push(matrix[Math.max(0, i - Math.floor(Math.random() * step))]);
    }
    return result;
}

const zip = (a, b) => a.map((j, i) => [j, b[i]]);

const distance = (a, b) =>
    zip(a, b).map(j => Math.pow(j[1] - j[0], 2))
        .reduce((x, y) => x + y, 0);

const centroid = points =>
    points.length === 0
        ? []
        : points.reduce((a, b) => b.map((p, i) => a[i] + p))
            .map(p => Math.floor(p / points.length));

function random(points, k) {
    if (k < 0 || k > points.length) return;
    const set = new Set();
    do {
        set.add(Math.floor(Math.random() * points.length));
    } while (set.size < k);
    return Array.from(set).map(i => points[i]);
}

function assign(centroids, points) {
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

function kmeans(points, k, centroids, maxIterations = 25, tolerance = 3) {
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

function getMatrix(imageData) {
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

function posterized(centroids, imageData) {
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

function blur(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `blur(${n}px)`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

function brightness(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `brightness(${n})`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

function contrast(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `contrast(${n})`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

function grayscale(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `grayscale(${n})`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

function invert(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `invert(${n})`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

function opacity(canvas, n) {
    const context = canvas.getContext("2d");
    const tempCanvas = createCanvas(canvas.width, canvas.height);
    const tempContext = tempCanvas.getContext("2d");

    tempContext.globalAlpha = n;
    tempContext.drawImage(canvas, 0, 0);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(tempCanvas, 0, 0);
    return canvas;
}

function saturate(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `saturate(${n})`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

function sepia(canvas, n) {
    const context = canvas.getContext("2d");
    context.save();
    context.filter = `sepia(${n})`;
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

function transform_toColor(canvas, n, color = "#09f") {
    const context = canvas.getContext("2d");
    context.save();
    context.globalAlpha = n;
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(canvas, 0, 0);
    context.restore();
    return canvas;
}

function normalizedValue$1(value) {
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


function spiral(canvas, value) {
    const n = normalizedValue$1(value);
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

function radial(canvas, value) {
    const n = normalizedValue$1(value);
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

function orbit(canvas, value) {
    const n = normalizedValue$1(value);
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

function wave(canvas, value) {
    const n = normalizedValue$1(value);
    const amplitude = n * Math.min(canvas.width, canvas.height) * 0.18;
    const cycles = 1 + n * 7;
    return remapPixels(canvas, (x, y, width, height) => [
        x,
        y + Math.sin((x / width) * Math.PI * 2 * cycles) * amplitude
    ]);
}

function flow(canvas, value) {
    const n = normalizedValue$1(value);
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


function hexbin(canvas, value) {
    const n = normalizedValue$1(value);
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


function halftone(canvas, value) {
    const n = normalizedValue$1(value);
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

function edge(canvas, value) {
    const n = normalizedValue$1(value);
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

function flowField(canvas, value) {
    const n = normalizedValue$1(value);
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

function shear(canvas, value) {
    const n = normalizedValue$1(value);
    const amount = (n - 0.5) * 2;
    const maxShear = 0.8;
    return drawWithTransform(canvas, (context, source, width, height) => {
        context.transform(1, 0, amount * maxShear, 1, -amount * maxShear * height / 2, 0);
        context.drawImage(source, 0, 0);
    });
}

function warp(canvas, value) {
    const n = normalizedValue$1(value);
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

function fisheye(canvas, value) {
    const n = normalizedValue$1(value);
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

function ripple(canvas, value) {
    const n = normalizedValue$1(value);
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

function twist(canvas, value) {
    const n = normalizedValue$1(value);
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

const fits = {
    clip: {function: fit_clip},
    stretch: {function: fit_stretch},
    carve: {function: fit_carve},
    repeat: {function: fit_repeat},
    centerCrop: {defaultRange: [0, 1], function: fit_centerCrop},
    focus: {defaultRange: [0, 1], function: fit_focus},
    saliencyCrop: {defaultRange: [0, 1], function: fit_saliencyCrop},
    warp: {defaultRange: [0, 1], function: fit_warp},
    mesh: {defaultRange: [0, 1], function: fit_mesh},
    squeeze: {defaultRange: [0, 1], function: fit_squeeze},
    bend: {defaultRange: [0, 1], function: fit_bend},
    cylinder: {defaultRange: [0, 1], function: fit_cylinder},
    sphere: {defaultRange: [0, 1], function: fit_sphere},
    spere: {defaultRange: [0, 1], function: fit_sphere}
};

function fit(elements, type = "stretch", callback) {
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

        const strategy = fits[type];
        if (!strategy) throw new Error(`Unknown fit: "${type}".  Valid fits: ${Object.keys(fits).join(", ")} `);
        strategy.function([w, h], d);

        setImageHref(element, d.__canvas.toDataURL(IMAGE_MIME));

    }

    return elements;
}

function fit_repeat(containerSize, d) {
    const context = d.__canvas.getContext("2d");
    if (d.__clipath) context.clip(d.__clipath);

    const pattern = context.createPattern(d.__img, "repeat");
    context.fillStyle = pattern;
    context.fillRect(0, 0, containerSize[0], containerSize[1]);
}

function fit_stretch(containerSize, d) {
    const context = d.__canvas.getContext("2d");
    if (d.__clipath) context.clip(d.__clipath);
    context.drawImage(d.__img, 0, 0, containerSize[0], containerSize[1]);
}

function fit_carve(containerSize, d) {
    let tempCanvas;
    const containerRatio = containerSize[0] / containerSize[1];
    const imageRatio = d.__img.naturalWidth / d.__img.naturalHeight;

    if (containerRatio === imageRatio) {
        d.__canvas.getContext("2d").drawImage(
            d.__img, 0, 0, containerSize[0], containerSize[1]
        );
        return;
    }

    if (d.__img.naturalWidth > containerSize[0]) {
        tempCanvas = carved(d.__img, containerSize[0]);
    } else if (d.__img.naturalHeight > containerSize[1]) {
        tempCanvas = verticalCarve(d.__img, containerSize[1]);
    } else {
        tempCanvas = createCanvas(containerSize[0], containerSize[1]);
        tempCanvas.getContext("2d").drawImage(
            d.__img, 0, 0, containerSize[0], containerSize[1]
        );
    }

    const context = d.__canvas.getContext("2d");
    if (d.__clipath) context.clip(d.__clipath);
    context.drawImage(tempCanvas, 0, 0, containerSize[0], containerSize[1]);
}

function fit_clip(containerSize, d) {
    const image = d.__img;
    const context = d.__canvas.getContext("2d");
    image.naturalWidth / image.naturalHeight;
    const containerRatio = containerSize[0] / containerSize[1];

    if (d.__clipath) context.clip(d.__clipath);

    if (containerRatio < 1) {
        if (containerSize[0] < image.naturalWidth) {
            context.drawImage(
                image,
                0, 0, image.naturalWidth, image.naturalHeight,
                -(image.naturalWidth - containerSize[0]) / 2,
                0,
                image.naturalWidth,
                containerSize[1]
            );
        }
    } else if (containerSize[1] < image.naturalHeight) {
        context.drawImage(
            image,
            0, 0, image.naturalWidth, image.naturalHeight,
            0,
            -(image.naturalHeight - containerSize[1]) / 2,
            containerSize[0],
            image.naturalHeight
        );
    }
}


function verticalCarve(canvas, expectedHeight) {
    const temp = createCanvas(canvas.height, canvas.width);
    const tempContext = temp.getContext("2d");
    tempContext.save();
    tempContext.translate(temp.width / 2, temp.height / 2);
    tempContext.rotate(Math.PI / 2);
    tempContext.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    tempContext.restore();

    const carvedCanvas = carved(temp, expectedHeight);
    const result = createCanvas(carvedCanvas.height, carvedCanvas.width);
    const resultContext = result.getContext("2d");
    resultContext.save();
    resultContext.translate(result.width / 2, result.height / 2);
    resultContext.rotate(-Math.PI / 2);
    resultContext.drawImage(
        carvedCanvas,
        -carvedCanvas.width / 2,
        -carvedCanvas.height / 2
    );
    resultContext.restore();
    return result;
}

function carved(canvas, expectedWidth) {
    const height = canvas.height;
    const width = canvas.width;

    const context = createContext2D(width, height);
    context.drawImage(canvas, 0, 0, width, height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;

    const input = context.getImageData(0, 0, width, height);
    const inputData = input.data;
    const inputData32 = new Uint32Array(inputData.buffer);

    const originalColumns = new Uint16Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) originalColumns[x + y * width] = x;
    }

    const costMap = new Float64Array(width * height);
    const {sqrt, min, max, SQRT1_2} = Math;

    const pixelOrder = (() => {
        const buffer = new ArrayBuffer(2);
        const u8 = new Uint8Array(buffer);
        const u16 = new Uint16Array(buffer);
        u8[0] = 0xAA;
        u8[1] = 0xBB;
        if (u16[0] === 0xBBAA) return "ABGR";
        if (u16[0] === 0xAABB) return "RGBA";
        throw new Error("Unsupported platform endianness");
    })();

    const dPixel = pixelOrder === "RGBA"
        ? (p0, p1) => {
            const rgba0 = inputData32[p0];
            const rgba1 = inputData32[p1];
            const r0 = rgba0 >>> 24;
            const g0 = (rgba0 >> 16) & 0xFF;
            const b0 = (rgba0 >> 8) & 0xFF;
            const r1 = rgba1 >>> 24;
            const g1 = (rgba1 >> 16) & 0xFF;
            const b1 = (rgba1 >> 8) & 0xFF;
            const r = r0 - r1, g = g0 - g1, b = b0 - b1;
            const y = r * 0.2124681075446384 +
                g * 0.4169973963260294 + b * 0.08137907133969426;
            const i = r * 0.3258860837850668 -
                g * 0.14992193838645426 - b * 0.17596414539861255;
            const q = r * 0.0935501584120867 -
                g * 0.23119531908149002 + b * 0.13764516066940333;
            return sqrt(y * y + i * i + q * q);
        }
        : (p0, p1) => {
            const abgr0 = inputData32[p0];
            const abgr1 = inputData32[p1];
            const r0 = abgr0 & 0xFF;
            const g0 = (abgr0 >> 8) & 0xFF;
            const b0 = (abgr0 >> 16) & 0xFF;
            const r1 = abgr1 & 0xFF;
            const g1 = (abgr1 >> 8) & 0xFF;
            const b1 = (abgr1 >> 16) & 0xFF;
            const r = r0 - r1, g = g0 - g1, b = b0 - b1;
            const y = r * 0.2124681075446384 +
                g * 0.4169973963260294 + b * 0.08137907133969426;
            const i = r * 0.3258860837850668 -
                g * 0.14992193838645426 - b * 0.17596414539861255;
            const q = r * 0.0935501584120867 -
                g * 0.23119531908149002 + b * 0.13764516066940333;
            return sqrt(y * y + i * i + q * q);
        };

    costMap[0] = dPixel(0, 1);
    for (let x = 1; x < width - 1; x++) costMap[x] = dPixel(x - 1, x + 1);
    costMap[width - 1] = dPixel(width - 2, width - 1);

    for (let y = 1; y < height; y++) {
        const line = y * width;
        const previous = line - width;

        {
            const Cu = dPixel(line, line + 1) * 2;
            const Cr = dPixel(previous, line + 1);
            const Mu = costMap[previous] + Cu;
            const Mr = costMap[previous + 1] + Cu + Cr;
            costMap[line] = Mu < Mr ? Mu : Mr;
        }

        for (let x = 1; x < width - 1; x++) {
            const Cl = dPixel(x + previous, x - 1 + line);
            const Cu = dPixel(x - 1 + line, x + 1 + line);
            const Cr = dPixel(x + previous, x + 1 + line);
            const Clr = SQRT1_2 * dPixel(x - 1 + line, x + 1 + previous);
            const Crl = SQRT1_2 * dPixel(x + 1 + line, x - 1 + previous);
            const Ml = costMap[x - 1 + previous] + Cu + Cl + Crl;
            const Mu = costMap[x + previous] + Cu + Clr + Crl;
            const Mr = costMap[x + 1 + previous] + Cu + Cr + Clr;
            const M = Mr < Mu ? Mr : Mu;
            costMap[x + line] = M < Ml ? M : Ml;
        }

        {
            const x = width - 1;
            const Cl = dPixel(x + previous, x - 1 + line);
            const Cu = dPixel(x - 1 + line, x + line);
            const Ml = costMap[x - 1 + previous] + Cu + Cl;
            const Mu = costMap[x + previous] + Cu * 2;
            costMap[x + line] = Ml < Mu ? Ml : Mu;
        }
    }

    let inputEnd = width - 1;

    while (inputEnd > expectedWidth) {
        let y = height - 1;
        let line = y * width;
        let xMin = 0;
        let costMin = costMap[line];

        for (let x = 1; x < inputEnd; x++) {
            const xCost = costMap[x + line];
            if (xCost < costMin) {
                costMin = xCost;
                xMin = x;
            }
        }

        while (y >= 0) {
            let i = xMin;
            let idx = i + line;

            while (i < inputEnd) {
                inputData32[idx] = inputData32[idx + 1];
                originalColumns[idx] = originalColumns[idx + 1];
                idx++;
                i++;
            }

            y--;
            line = y * width;
            if (y < 0) break;

            costMin = costMap[xMin + line];
            if (costMap[max(0, xMin - 1) + line] < costMin) {
                xMin = max(0, xMin - 1);
                costMin = costMap[xMin + line];
            }
            if (costMap[min(inputEnd, xMin + 1) + line] < costMin) {
                xMin = min(inputEnd, xMin + 1);
                costMin = costMap[xMin + line];
            }
        }

        inputEnd--;

        if (xMin === 0) {
            costMap[0] = dPixel(0, 1);
            costMap[1] = dPixel(0, 2);
        } else if (xMin >= inputEnd) {
            costMap[inputEnd - 1] = dPixel(inputEnd - 2, inputEnd);
            costMap[inputEnd] = dPixel(inputEnd - 1, inputEnd);
        } else {
            costMap[xMin - 1] = dPixel(max(0, xMin - 2), xMin);
            costMap[xMin] = dPixel(xMin - 1, xMin + 1);
            costMap[xMin + 1] = dPixel(xMin, min(inputEnd, xMin + 2));
        }

        let xStart = max(0, xMin - 1);
        let xEnd = min(xMin + 1, inputEnd);

        for (let y2 = 1; y2 < height; y2++) {
            const row = y2 * width;
            const previous = row - width;
            let x = xStart;

            if (x === 0) {
                const Cu = dPixel(row, row + 1) * 2;
                const Cr = dPixel(previous, row + 1);
                const Mu = costMap[previous] + Cu;
                const Mr = costMap[previous + 1] + Cu + Cr;
                costMap[row] = Mu < Mr ? Mu : Mr;
            } else {
                const Cl = dPixel(x + previous, x - 1 + row);
                const Cu = dPixel(x - 1 + row, x + 1 + row);
                const Cr = dPixel(x + previous, x + 1 + row);
                const Clr = SQRT1_2 * dPixel(x - 1 + row, x + 1 + previous);
                const Crl = SQRT1_2 * dPixel(x + 1 + row, x - 1 + previous);
                const Ml = costMap[x - 1 + previous] + Cu + Cl + Crl;
                const Mu = costMap[x + previous] + Cu + Clr + Crl;
                const Mr = costMap[x + 1 + previous] + Cu + Cr + Clr;
                const M = Mr < Mu ? Mr : Mu;
                costMap[x + row] = M < Ml ? M : Ml;
            }

            while (++x < xEnd) {
                const Cl = dPixel(x + previous, x - 1 + row);
                const Cu = dPixel(x - 1 + row, x + 1 + row);
                const Cr = dPixel(x + previous, x + 1 + row);
                const Ml = costMap[x - 1 + previous] + Cu + Cl;
                const Mu = costMap[x + previous] + Cu;
                const Mr = costMap[x + 1 + previous] + Cu + Cr;
                const M = Mr < Mu ? Mr : Mu;
                costMap[x + row] = M < Ml ? M : Ml;
            }

            if (x === inputEnd) {
                const Cl = dPixel(x + previous, x - 1 + row);
                const Cu = dPixel(x - 1 + row, x + row);
                const Ml = costMap[x - 1 + previous] + Cu + Cl;
                const Mu = costMap[x + previous] + Cu * 2;
                costMap[x + row] = Ml < Mu ? Ml : Mu;
            } else {
                const Cl = dPixel(x + previous, x - 1 + row);
                const Cu = dPixel(x - 1 + row, x + 1 + row);
                const Cr = dPixel(x + previous, x + 1 + row);
                const Ml = costMap[x - 1 + previous] + Cu + Cl;
                const Mu = costMap[x + previous] + Cu;
                const Mr = costMap[x + 1 + previous] + Cu + Cr;
                const M = Mr < Mu ? Mr : Mu;
                costMap[x + row] = M < Ml ? M : Ml;
            }

            xStart = max(0, xStart - 1);
            xEnd = min(inputEnd, xEnd + 1);
        }
    }

    context.putImageData(input, 0, 0, 0, 0, expectedWidth, height);

    const resultContext = createContext2D(expectedWidth, height);
    resultContext.drawImage(
        context.canvas,
        0, 0, expectedWidth, height,
        0, 0, expectedWidth, height
    );
    return resultContext.canvas;
}


function fitCanvasBase(containerSize, d) {
    const context = d.__canvas.getContext("2d");
    context.clearRect(0, 0, containerSize[0], containerSize[1]);
    if (d.__clipath) context.clip(d.__clipath);
    return context;
}

function normalizedFocus(d) {
    const focus = Array.isArray(d.__focus) ? d.__focus : [0.5, 0.5];
    return [
        Math.max(0, Math.min(1, Number(focus[0]) || 0.5)),
        Math.max(0, Math.min(1, Number(focus[1]) || 0.5))
    ];
}

function coverScale(containerSize, image) {
    return Math.max(
        containerSize[0] / image.naturalWidth,
        containerSize[1] / image.naturalHeight
    );
}

function fitSourceScale(containerSize, image) {
    return Math.min(
        containerSize[0] / image.naturalWidth,
        containerSize[1] / image.naturalHeight
    );
}

function drawCentered(context, image, width, height, containerSize) {
    const x = (containerSize[0] - width) / 2;
    const y = (containerSize[1] - height) / 2;
    context.drawImage(image, x, y, width, height);
}

function fit_centerCrop(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    const context = fitCanvasBase(containerSize, d);
    const contain = fitSourceScale(containerSize, d.__img);
    const cover = coverScale(containerSize, d.__img);
    const scale = contain + (cover - contain) * n;
    drawCentered(context, d.__img,
        d.__img.naturalWidth * scale,
        d.__img.naturalHeight * scale,
        containerSize);
    return d.__canvas;
}

function fit_focus(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    const context = fitCanvasBase(containerSize, d);
    const focus = normalizedFocus(d);
    // 0 is contain; 1 is a cover crop centered on the requested focal point.
    const contain = fitSourceScale(containerSize, d.__img);
    const cover = coverScale(containerSize, d.__img);
    const scale = contain + (cover - contain) * n;
    const sw = d.__img.naturalWidth * scale;
    const sh = d.__img.naturalHeight * scale;
    const maxX = Math.max(0, sw - containerSize[0]);
    const maxY = Math.max(0, sh - containerSize[1]);
    context.drawImage(d.__img, -maxX * focus[0], -maxY * focus[1], sw, sh);
    return d.__canvas;
}

function saliencyPoint(image) {
    const sampleW = Math.min(128, image.naturalWidth);
    const sampleH = Math.max(1, Math.round(image.naturalHeight * sampleW / image.naturalWidth));
    const sample = createCanvas(sampleW, sampleH);
    const ctx = sample.getContext("2d", {willReadFrequently: true});
    ctx.drawImage(image, 0, 0, sampleW, sampleH);
    const pixels = ctx.getImageData(0, 0, sampleW, sampleH).data;
    let total = 0, sx = 0, sy = 0;
    const luminance = (x, y) => {
        const i = (y * sampleW + x) * 4;
        return 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    };
    for (let y = 1; y < sampleH - 1; ++y) {
        for (let x = 1; x < sampleW - 1; ++x) {
            const gx = Math.abs(luminance(x + 1, y) - luminance(x - 1, y));
            const gy = Math.abs(luminance(x, y + 1) - luminance(x, y - 1));
            const i = (y * sampleW + x) * 4;
            const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / (3 * 255);
            const weight = (gx + gy) * (0.35 + 0.65 * brightness);
            total += weight;
            sx += x * weight;
            sy += y * weight;
        }
    }
    if (!total) return [0.5, 0.5];
    return [sx / total / Math.max(1, sampleW - 1), sy / total / Math.max(1, sampleH - 1)];
}

function fit_saliencyCrop(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    const context = fitCanvasBase(containerSize, d);
    const point = d.__saliency || saliencyPoint(d.__img);
    const focus = [
        Math.max(0, Math.min(1, point[0])),
        Math.max(0, Math.min(1, point[1]))
    ];
    const contain = fitSourceScale(containerSize, d.__img);
    const cover = coverScale(containerSize, d.__img);
    const scale = contain + (cover - contain) * n;
    const sw = d.__img.naturalWidth * scale;
    const sh = d.__img.naturalHeight * scale;
    const maxX = Math.max(0, sw - containerSize[0]);
    const maxY = Math.max(0, sh - containerSize[1]);
    context.drawImage(d.__img, -maxX * focus[0], -maxY * focus[1], sw, sh);
    return d.__canvas;
}

function drawMappedImage(containerSize, d, mapper, value) {
    const context = fitCanvasBase(containerSize, d);
    const image = d.__img;
    const w = containerSize[0], h = containerSize[1];
    const source = createCanvas(image.naturalWidth, image.naturalHeight);
    const sourceCtx = source.getContext("2d");
    sourceCtx.drawImage(image, 0, 0);
    const src = sourceCtx.getImageData(0, 0, source.width, source.height);
    const out = context.createImageData(w, h);
    const sw = source.width, sh = source.height;
    for (let y = 0; y < h; ++y) {
        for (let x = 0; x < w; ++x) {
            const uv = mapper(x / Math.max(1, w - 1), y / Math.max(1, h - 1), value);
            const sx = Math.max(0, Math.min(sw - 1, uv[0] * (sw - 1)));
            const sy = Math.max(0, Math.min(sh - 1, uv[1] * (sh - 1)));
            const x0 = Math.floor(sx), y0 = Math.floor(sy);
            const x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1);
            const tx = sx - x0, ty = sy - y0;
            const oi = (y * w + x) * 4;
            for (let c = 0; c < 4; ++c) {
                const a = src[(y0 * sw + x0) * 4 + c];
                const b = src[(y0 * sw + x1) * 4 + c];
                const c0 = src[(y1 * sw + x0) * 4 + c];
                const e = src[(y1 * sw + x1) * 4 + c];
                out.data[oi + c] = a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c0 * (1 - tx) * ty + e * tx * ty;
            }
        }
    }
    context.putImageData(out, 0, 0);
    // putImageData ignores the current clipping region, so re-apply a stored
    // shape mask after pixel mapping.
    if (d.__clipath) {
        context.save();
        context.globalCompositeOperation = "destination-in";
        context.fill(d.__clipath);
        context.restore();
    }
    return d.__canvas;
}

function fit_warp(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    return drawMappedImage(containerSize, d, (u, v, amount) => {
        const dx = u - 0.5, dy = v - 0.5;
        const r2 = dx * dx + dy * dy;
        const k = 1 + amount * 2.5 * r2;
        return [0.5 + dx * k, 0.5 + dy * k];
    }, n);
}

function fit_mesh(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    return drawMappedImage(containerSize, d, (u, v, amount) => {
        const x = u + amount * 0.12 * Math.sin(Math.PI * v) * Math.sin(2 * Math.PI * u);
        const y = v + amount * 0.12 * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * v);
        return [x, y];
    }, n);
}

function fit_squeeze(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    return drawMappedImage(containerSize, d, (u, v, amount) => {
        const k = 1 - 0.75 * amount;
        return [0.5 + (u - 0.5) * k, v];
    }, n);
}

function fit_bend(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    return drawMappedImage(containerSize, d, (u, v, amount) => {
        const angle = (u - 0.5) * Math.PI * amount;
        const radius = 0.5 / Math.max(0.15, amount || 1);
        if (amount < 1e-6) return [u, v];
        return [
            0.5 + Math.sin(angle) * radius,
            v + (1 - Math.cos(angle)) * radius * (v - 0.5) * 0.5
        ];
    }, n);
}

function fit_cylinder(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    return drawMappedImage(containerSize, d, (u, v, amount) => {
        if (amount < 1e-6) return [u, v];
        const theta = (u - 0.5) * Math.PI * amount;
        const x = 0.5 + Math.sin(theta) / Math.max(1e-6, Math.sin(Math.PI * amount / 2));
        return [Math.max(0, Math.min(1, x)), v];
    }, n);
}

function fit_sphere(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    return drawMappedImage(containerSize, d, (u, v, amount) => {
        if (amount < 1e-6) return [u, v];
        const x = u - 0.5;
        const y = v - 0.5;
        const r2 = x * x + y * y;
        const factor = 1 + amount * 1.5 * Math.max(0, 0.25 - r2);
        return [0.5 + x * factor, 0.5 + y * factor];
    }, n);
}

function normalizedValue(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

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

function shape(elements, type = "rect", option, callback) {
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

//somehow this trick is needed to get nodes in selections
function asSelectionMethod(fn) {
    return function (...args) {
        fn(this.nodes(), ...args);
        return this;
    };
}


async function initPixScale(data, images, callback) {
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

export { fit, initPixScale, shape, transform };
