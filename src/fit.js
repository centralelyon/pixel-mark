import {autoRatio, createCanvas, IMAGE_MIME, setImageHref, createContext2D, toElements} from "./utils.js"
import {datumFor} from "./data.js";

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
        if (!strategy) throw new Error(`Unknown fit: ${type}`);
        strategy.function([w, h], d);

        setImageHref(element, d.__canvas.toDataURL(IMAGE_MIME));
    }

    return elements;
}

export function fit_repeat(containerSize, d) {
    const context = d.__canvas.getContext("2d");
    if (d.__clipath) context.clip(d.__clipath);
    context.drawImage(d.__img, 0, 0, containerSize[0], containerSize[1]);
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


export const fits = {
    clip: {function: fit_clip},
    stretch: {function: fit_stretch},
    carve: {function: fit_carve},
    repeat: {function: fit_repeat}
};