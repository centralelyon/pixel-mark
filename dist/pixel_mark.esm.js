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

function datumFor(element, data) {
    return element.__data__;
}

const transforms = {
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
            throw new Error(`Unknown transform: ${type}`);
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

    return { centroids, iterations };
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
        if (!strategy) throw new Error(`Unknown fit: ${type}`);
        strategy.function([w, h], d);

        setImageHref(element, d.__canvas.toDataURL(IMAGE_MIME));
    }

    return elements;
}

function fit_repeat(containerSize, d) {
    const context = d.__canvas.getContext("2d");
    if (d.__clipath) context.clip(d.__clipath);
    context.drawImage(d.__img, 0, 0, containerSize[0], containerSize[1]);
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


const fits = {
    clip: {function: fit_clip},
    stretch: {function: fit_stretch},
    carve: {function: fit_carve},
    repeat: {function: fit_repeat}
};

function shape(elements, type = "rect", option, callback) {
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

function shape_rect(containerSize, d) {
    const context = d.__canvas.getContext("2d");
    context.clearRect(0, 0, ...containerSize);
    d.__clipath = undefined;
    context.drawImage(d.__img, 0, 0, containerSize[0], containerSize[1]);
}

function shape_circle(containerSize, d, r) {
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

function shape_path(containerSize, d, path) {
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

const shapes = {
    rect: {function: shape_rect},
    circle: {function: shape_circle},
    path: {function: shape_path}
};

function asSelectionMethod(fn) {
    return function (...args) {
        fn(this.nodes(), ...args);
        return this;
    };
}


async function initPixScale(data, images, callback) {
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

export { fit, initPixScale, shape, transform };
