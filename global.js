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
  // alphabetical, as before
  const models = Array.from(new Set(data.map((d) => d.model))).sort();
  const dropdownModels = ["Select All", ...models];

  // one shade of green per model, spread across the gradient
  const color = d3.scaleOrdinal(
    models,
    d3.quantize((t) => d3.interpolateGreens(0.3 + 0.65 * t), models.length),
  );

  // Create dropdown container
  const filter = d3.select("#model-dropdown");

  filter.html(`
    <button id="filter-btn">
    ▼ Model: All
    </button>
    <div id="filter-menu" class="hidden"></div>
  `);

  const menu = d3.select("#filter-menu");

  menu
    .selectAll("label")
    .data(dropdownModels)
    .join("label")
    .attr("class", "option")
    .html(
      (d) => `
      <input type="checkbox" value="${d}">
      ${d}
    `,
    );

  d3.select("#filter-btn").on("click", () => {
    menu.classed("hidden", !menu.classed("hidden"));
  });

  // gridlines + axis
  const axis = svg
    .append("g")
    .attr("transform", `translate(0,${height - m.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(10)
        .tickFormat(d3.format("$~s"))
        .tickSize(-(height - m.top - m.bottom)) // lines extend up through the plot
        .tickSizeOuter(0), // no side lines at the ends
    );

  // thick bottom line
  axis.select(".domain").attr("stroke", "#444").attr("stroke-width", 2);

  // faint gridlines
  axis.selectAll(".tick line").attr("stroke", "#e5e7eb");

  // short dark tick marks going down from the thick line
  axis
    .selectAll(".tick")
    .append("line")
    .attr("y1", 0)
    .attr("y2", 6)
    .attr("stroke", "#444")
    .attr("stroke-width", 2);

  // push labels down so they clear the tick marks
  axis.selectAll(".tick text").attr("y", 10).attr("font-size", 14);

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
  const dots = svg
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



  // 当前三个滑块的筛选范围，默认包含全部数据
  const ranges = {
    year: d3.extent(data, (d) => d.year),
    km: d3.extent(data, (d) => d.km),
    imperfections: d3.extent(data, (d) => d.imperfections),
  };

  // 一辆车必须同时满足全部筛选条件
  function matchesFilters(d, selectedModels, selectedTransmissions) {
    const modelMatch =
      selectedModels.length === 0 || selectedModels.includes(d.model);

    const transmissionMatch =
      selectedTransmissions.includes(d.transmission);

    const yearMatch =
      d.year >= ranges.year[0] && d.year <= ranges.year[1];

    const kmMatch =
      d.km >= ranges.km[0] && d.km <= ranges.km[1];

    const imperfectionsMatch =
      d.imperfections >= ranges.imperfections[0] &&
      d.imperfections <= ranges.imperfections[1];

    return (
      modelMatch &&
      transmissionMatch &&
      yearMatch &&
      kmMatch &&
      imperfectionsMatch
    );
  }

  // Highlight selected model
  function updateModelHighlight() {
    const selectedModels = menu
      .selectAll("input:checked")
      .nodes()
      .map((d) => d.value)
      .filter((d) => d !== "Select All");

    const selectedTransmissions = d3
      .select("#transmission-filter")
      .selectAll("input:checked")
      .nodes()
      .map((d) => d.value);

    const showAll = selectedModels.length === 0;

    const button = d3.select("#filter-btn");

    if (showAll) {
      button.text("▼ Model: All");
    } else {
      button.text(`▼ Model (${selectedModels.length})`);
    }

    dots
      .attr("fill", (d) =>
        matchesFilters(d, selectedModels, selectedTransmissions)
          ? color(d.model)
          : "#dddddd"
      )
      .attr("opacity", (d) =>
        matchesFilters(d, selectedModels, selectedTransmissions)
          ? 1
          : 0.25
      );
    
    
  }

  d3.select("#transmission-filter")
    .selectAll("input")
    .on("change", updateModelHighlight);

  menu.selectAll("input").on("change", function () {
    if (this.value === "Select All") {
      const checked = this.checked;

      menu.selectAll("input").property("checked", checked);
    } else {
      const allModels = menu
        .selectAll("input")
        .nodes()
        .filter((d) => d.value !== "Select All");

      const checkedModels = allModels.filter((d) => d.checked);

      menu
        .select('input[value="Select All"]')
        .property("checked", checkedModels.length === allModels.length);
    }
    
    rangeResets.forEach((range) => range.reset());

    updateModelHighlight();
  });

  d3.select("#clear-filters").on("click", () => {
    menu.selectAll("input").property("checked", false); // models back to "All"
    menu.classed("hidden", true); // close the dropdown
    d3.select("#transmission-filter")
      .selectAll("input")
      .property("checked", true); // both transmissions on
    updateModelHighlight(); // redraw dots + button label
  });

  // 连接滑块：更新范围后，立即更新圆点颜色
  const rangeResets = [
    setupRange(document.querySelector("#year-filter"), (range) => {
      ranges.year = range;
      updateModelHighlight();
    }),

    setupRange(document.querySelector("#km-filter"), (range) => {
      ranges.km = range;
      updateModelHighlight();
    }),

    setupRange(document.querySelector("#imperfections-filter"), (range) => {
      ranges.imperfections = range;
      updateModelHighlight();
    }),
  ];
}

// import data and draw the plot
d3.csv(BASE_PATH + "resale_car_clean.csv", (d) => ({
  model: d.model,
  price: +d.USD_price,
  year: +d.Manufacturing_year,
  km: +d["KM driven"],
  owner: +d.Ownership,
  transmission: +d.Transmission_Manual === 1 ? "Manual" : "Automatic",
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
  loNum.addEventListener("change", () => {
    lo.value = loNum.value;
    update(lo);
  });
  hiNum.addEventListener("change", () => {
    hi.value = hiNum.value;
    update(hi);
  });
  update();

  // clear all filters
  return {
    reset() {
      lo.value = min;
      hi.value = max;
      update(); // syncs the number inputs and the filled bar
    },
  };
}

// Prototype only logs the selected range. To filter the chart, keep the loaded
// data in a variable and redraw with e.g. data.filter(d => d.km >= lo && d.km <= hi).

// setupRange(document.querySelector("#year-filter"), ([lo, hi]) => {
//   console.log("year range:", lo, hi);
// });

// setupRange(document.querySelector("#km-filter"), ([lo, hi]) => {
//   console.log("km range:", lo, hi);
// });

// setupRange(document.querySelector("#imperfections-filter"), ([lo, hi]) => {
//   console.log("imperfections range:", lo, hi);
// });

// reset all sliders


document.querySelector("#clear-filters").addEventListener("click", () => {
  rangeResets.forEach((r) => r.reset());
});

// clicking outside the dropdown menu closes it
document.addEventListener("click", (event) => {
  const dropdown = document.querySelector("#model-dropdown");
  const menu = document.querySelector("#filter-menu");
  if (!dropdown || !menu) return;

  // ignore clicks inside the dropdown (button or checkbox list)
  if (!dropdown.contains(event.target)) {
    menu.classList.add("hidden");
  }
});
