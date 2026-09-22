const {
    initPixScale,
    fit,
    shape,
    transform
} = pixel_mark;

const width = 700;
const height = 500;
const margin = 30;

d3.csv("./presidents.csv", d3.autoType).then(async (data) => {

    const images = data.map(d => d["Portrait URL"]);

    const dataset = await initPixScale(data, images);

    const svg = d3.select("#main");

    const domain = d3.extent(
        data.map(d =>
            d["Very Favorable %"] +
            d["Somewhat Favorable %"] -
            d["Very Unfavorable %"] -
            d["Somewhat Unfavorable %"]
        )
    );

    const time = data.map(d => d["First Inauguration Date"]);

    const xScale = d3.scaleTime(
        [time[0], time[time.length - 1]],
        [margin, width - margin * 2]
    );

    const yScale = d3.scaleLinear(
        domain,
        [height - margin * 2, margin]
    );



    const marks = svg
        .append("g")
        .attr("class", "marks");

    const gx = svg
        .append("g")
        .attr("transform", `translate(${margin},${height - margin})`)
        .call(d3.axisBottom(xScale));

    const gy = svg
        .append("g")
        .attr("transform", `translate(${margin},0)`)
        .call(d3.axisLeft(yScale));


    // ------------------------------------------------
    // Live editor
    // ------------------------------------------------

    const editor = document.querySelector("#code");
    const error = document.querySelector("#error");


    function runCode() {

        // Remove only the marks.
        // The axes remain untouched.
        marks.selectAll("*").remove();

        error.textContent = "";

        try {

            /*
             * The important trick:
             *
             * The user's code thinks "svg" is the SVG
             * selection, but we give it the marks group.
             */
            const code = editor.value;

            const run = new Function(
                "d3",
                "svg",
                "dataset",
                "xScale",
                "yScale",
                "width",
                "height",
                "margin",
                code
            );

            run(
                d3,
                marks,
                dataset,
                xScale,
                yScale,
                width,
                height,
                margin
            );

        } catch (e) {
            error.textContent = e.stack || e.message;
        }
    }


    // Run initially
    runCode();


    // Run whenever the code changes
    let timeout;

    editor.addEventListener("input", () => {
        clearTimeout(timeout);

        timeout = setTimeout(() => {
            runCode();
        }, 150);
    });

});