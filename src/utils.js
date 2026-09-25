export const IMAGE_MIME = "image/png";

export function autoRatio(img, width, height) {
    const tw = testContainerSize(width);
    const th = testContainerSize(height);

    if (tw && th) return [+width, +height];
    if (tw && !th) return [+width, img.naturalHeight * width / img.naturalWidth];
    if (!tw && th) return [img.naturalWidth * height / img.naturalHeight, +height];
    return [+img.naturalWidth, +img.naturalHeight];
}

export function testContainerSize(size) {
    return !(size === null || size === undefined || size === "" || size === 0 || size === "0");
}


export function toElements(elements) {
    if (elements instanceof Element) return [elements];
    if (elements && typeof elements[Symbol.iterator] === "function") {
        return Array.from(elements);
    }
    throw new TypeError("Expected an SVG element or an iterable of SVG elements");
}


export function createCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

export function createContext2D(width, height) {
    const canvas = createCanvas(width, height);
    return canvas.getContext("2d");
}

export function setImageHref(element, value) {
    element.setAttribute("href", value);
    element.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", value);
}

export async function loadImage(url) {
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

export function attachImage(datum, img) {
    datum.__img = img;
    datum.__canvas = createCanvas(img.naturalWidth, img.naturalHeight);
    datum.__canvas.getContext("2d").drawImage(img, 0, 0);
    return datum;
}
