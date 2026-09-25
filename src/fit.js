import {autoRatio, createCanvas, IMAGE_MIME, setImageHref, createContext2D, toElements} from "./utils.js"
import {datumFor} from "./data.js";


export const fits = {
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

export function fit(elements, type = "stretch", callback) {
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

export function fit_repeat(containerSize, d) {
    const context = d.__canvas.getContext("2d");
    if (d.__clipath) context.clip(d.__clipath);

    const pattern = context.createPattern(d.__img, "repeat");
    context.fillStyle = pattern;
    context.fillRect(0, 0, containerSize[0], containerSize[1]);
}

export function fit_stretch(containerSize, d) {
    const context = d.__canvas.getContext("2d");
    if (d.__clipath) context.clip(d.__clipath);
    context.drawImage(d.__img, 0, 0, containerSize[0], containerSize[1]);
}

export function fit_carve(containerSize, d) {
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

export function fit_clip(containerSize, d) {
    const image = d.__img;
    const context = d.__canvas.getContext("2d");
    const imageRatio = image.naturalWidth / image.naturalHeight;
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


export function verticalCarve(canvas, expectedHeight) {
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

export function carved(canvas, expectedWidth) {
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

export function fit_centerCrop(containerSize, d, value = 1) {
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

export function fit_focus(containerSize, d, value = 1) {
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

export function fit_saliencyCrop(containerSize, d, value = 1) {
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

export function fit_warp(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    return drawMappedImage(containerSize, d, (u, v, amount) => {
        const dx = u - 0.5, dy = v - 0.5;
        const r2 = dx * dx + dy * dy;
        const k = 1 + amount * 2.5 * r2;
        return [0.5 + dx * k, 0.5 + dy * k];
    }, n);
}

export function fit_mesh(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    return drawMappedImage(containerSize, d, (u, v, amount) => {
        const x = u + amount * 0.12 * Math.sin(Math.PI * v) * Math.sin(2 * Math.PI * u);
        const y = v + amount * 0.12 * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * v);
        return [x, y];
    }, n);
}

export function fit_squeeze(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    return drawMappedImage(containerSize, d, (u, v, amount) => {
        const k = 1 - 0.75 * amount;
        return [0.5 + (u - 0.5) * k, v];
    }, n);
}

export function fit_bend(containerSize, d, value = 1) {
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

export function fit_cylinder(containerSize, d, value = 1) {
    const n = normalizedValue(value);
    return drawMappedImage(containerSize, d, (u, v, amount) => {
        if (amount < 1e-6) return [u, v];
        const theta = (u - 0.5) * Math.PI * amount;
        const x = 0.5 + Math.sin(theta) / Math.max(1e-6, Math.sin(Math.PI * amount / 2));
        return [Math.max(0, Math.min(1, x)), v];
    }, n);
}

export function fit_sphere(containerSize, d, value = 1) {
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