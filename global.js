import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Detect local server vs GitHub Pages
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/" // Local server
    : "/Used-Car-Market-Research/"; // GitHub Pages repo name

function drawBeeswarm(data, { width = 900, height = 500, r = 4.5 } = {}) {
  const m = { top: 20, right: 24, bottom: 44, left: 24 };

  const svg = d3
    .select("#chart")
    .html("")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // price scale
  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.price))
    .nice()
    .range([m.left, width - m.right]);

  // color by model
  const models = Array.from(new Set(data.map((d) => d.model))).sort();
  const color = d3.scaleSequential(d3.interpolateGreens).domain([0, 100]);

  // axis
  svg
    .append("g")
    .attr("transform", `translate(0,${height - m.bottom})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("~s")));

  // beeswarm layout
  const cy = (height - m.bottom + m.top) / 2;
  const nodes = data.map((d) => ({ ...d, x: x(d.price), y: cy }));

  const sim = d3
    .forceSimulation(nodes)
    .force("x", d3.forceX((d) => x(d.price)).strength(1))
    .force("y", d3.forceY(cy).strength(0.06))
    .force("collide", d3.forceCollide(r + 0.6))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();

  // dots
  svg
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) =>
      Math.max(m.top + r, Math.min(height - m.bottom - r, d.y)),
    )
    .attr("r", r)
    .attr("fill", (d) => color(d.model));
}

d3.csv(BASE_PATH + "resale_car_clean.csv", (d) => ({
  model: d.model,
  price: +d.USD_price,
  year: +d.Manufacturing_year,
  km: +d["KM driven"],
  owner: +d.Ownership,
  imperfections: +d.Imperfections,
})).then((data) => {
  drawBeeswarm(data);
});



function setupRange(el, onChange) {
  const [lo, hi] = el.querySelectorAll('input[type="range"]');
  const [loNum, hiNum] = el.querySelectorAll('input[type="number"]');
  const fill = el.querySelector(".fill");
  const min = +lo.min;
  const max = +lo.max;

  function update(source) {
    let a = +lo.value;
    let b = +hi.value;
    if (a > b) source === hi ? (b = a) : (a = b); // thumbs can't cross
    lo.value = loNum.value = a;
    hi.value = hiNum.value = b;
    fill.style.left = ((a - min) / (max - min)) * 100 + "%";
    fill.style.right = (1 - (b - min) / (max - min)) * 100 + "%";
    // When both thumbs sit at the far right, the min thumb must be on top
    // or it can't be dragged back left.
    lo.style.zIndex = a > (min + max) / 2 ? 2 : 1;
    onChange([a, b]);
  }

  lo.addEventListener("input", () => update(lo));
  hi.addEventListener("input", () => update(hi));
  loNum.addEventListener("change", () => { lo.value = loNum.value; update(lo); });
  hiNum.addEventListener("change", () => { hi.value = hiNum.value; update(hi); });
  update();
}

// Prototype only logs the selected range. To filter the chart, keep the loaded
// data in a variable and redraw with e.g. data.filter(d => d.km >= lo && d.km <= hi).
setupRange(document.querySelector("#year-filter"), ([lo, hi]) => {
  console.log("year range:", lo, hi);
});

setupRange(document.querySelector("#km-filter"), ([lo, hi]) => {
  console.log("km range:", lo, hi);
});


setupRange(document.querySelector("#imperfections-filter"), ([lo, hi]) => {
  console.log("imperfections range:", lo, hi);
});
