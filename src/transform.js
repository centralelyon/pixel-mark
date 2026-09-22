
import {toElements, setImageHref, createCanvas, createContext2D, IMAGE_MIME} from "./utils.js"
import {datumFor} from "./data.js";

export const transforms = {
    pixel: { defaultRange: [], function: pixelate },
    kcolor: { defaultRange: [1, 10], function: setKcolor },
    blur: { defaultRange: [2, 0], function: blur },
    opacity: { defaultRange: [0, 1], function: opacity },
    sepia: { defaultRange: [1, 0], function: sepia },
    invert: { defaultRange: [1, 0.1], function: invert },
    saturate: { defaultRange: [0, 3], function: saturate },
    brightness: { defaultRange: [0.1, 2], function: brightness },
    contrast: { defaultRange: [0.15, 3], function: contrast },
    grayscale: { defaultRange: [1, 0], function: grayscale },
    dotted: { defaultRange: [0.025, 0.25], function: dotted },
    grid: { defaultRange: [0.025, 0.25], function: grid },
    countSq: { defaultRange: [0, 1], function: countSq },
    toColor: { defaultRange: [], function: transform_toColor }
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
            throw new Error(`Unknown transform: ${type}`);
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

    return { centroids, iterations };
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
            position: { x, y }
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
