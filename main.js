"use-strict";

let data = "";
let svgContainer = ""; // keep SVG reference in global scope
let miniChartContainer = "";
const cont = {
    width: 1000,
    height: 500,
    marginAll: 50,
    marginLeft: 50,
}
const miniCont = {
    width: 500,
    height: 500,
    marginAll: 100,
}

window.onload = function () {
    svgContainer = d3.select("#chart")
        .append('svg')
        .attr('width', cont.width)
        .attr('height', cont.height);

    miniChartContainer = d3.select("#miniChart")
        .attr('width', cont.width)
        .append('svg')
        .attr('height', cont.height);

    d3.csv("gapminder.csv")
        .then((d) => makeScatterPlot(d))
}

function makeScatterPlot(csvData) {
    data = csvData.filter((data) => {return data.fertility != "NA" && data.life_expectancy != "NA"})

    let dropDown = d3.select("#filter").append("select")
        .attr("name", "year");

    let fr_data = data.map((row) => parseFloat(row["fertility"]));
    let life_expectancy_data = data.map((row) => parseFloat(row["life_expectancy"]));

    let axesLimits = findMinMax(fr_data, life_expectancy_data);
    let mapFunctions = drawAxes(axesLimits, "fertility", "life_expectancy", svgContainer, cont);

    plotData(mapFunctions);

    makeLabels(svgContainer, cont);

    let distinctYears =  [...new Set(data.map(d => d.year))];
    dropDown.selectAll("option")
           .data(distinctYears)
           .enter()
           .append("option")
           .text(function (d) { return d; })
           .attr("value", function (d) { return d; })
           .attr("selected", function(d){ if(d="2011")return d; 
        else {return}})
           
    showCircles( dropDown.node() );
    dropDown.on("change", function() {
        showCircles(this)
    });
}

function showCircles(me) {
    let selected =  me.value;
    displayOthers = me.checked  ? "inline" : "none";
    display = me.checked ?  "none" : "inline";

    svgContainer.selectAll(".circles")
        .data(data)
        .filter(function(d) {return selected != d.year;})
        .attr("display", displayOthers);
        
    svgContainer.selectAll(".circles")
        .data(data)
        .filter(function(d) {return selected == d.year;})
        .attr("display", display);
}

function plotData(map) {
    data.filter((row) => {
        return row.year == 1960 && row.fertility != "NA" && row.life_expectancy != "NA"
    })
    let pop_data = data.map((row) => +row["population"]);
    let pop_limits = d3.extent(pop_data);
    let pop_map_func = d3.scaleSqrt()
        .domain([pop_limits[0], pop_limits[1]])
        .range([3, 50]);

    let xMap = map.x;
    let yMap = map.y;

    let div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    let toolChart = div.append('svg')
        .attr('width', miniCont.width + 100)
        .attr('height', miniCont.height + 100)

    svgContainer.selectAll('.dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', xMap)
        .attr('cy', yMap)
        .attr('r', (d) => pop_map_func(d["population"]))
        .attr('stroke', "blue")
        .attr('stroke-width', 2)
        .attr('fill', 'white')
        .attr("class", "circles")
        .on("mouseover", (d) => {
            toolChart.selectAll("*").remove()
            div.transition()
                .duration(200)
                .style("opacity", .9);
            plotPopulation(d.country, toolChart)
            div.style("left", (d3.event.pageX) + "px")
               .style("top", (d3.event.pageY - 28) + "px");
            
        })
        .on("mouseout", (d) => {
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

function drawAxes(limits, x, y, svgContainer, cont) {
    let xValue = function (d) {
        return +d[x];
    }

    let xScale = d3.scaleLinear()
        .domain([limits.xMin - 0.5, limits.xMax + 0.5])
        .range([0 + cont.marginAll, cont.width - cont.marginAll])

    let xMap = function (d) {
        return xScale(xValue(d));
    };

    let xAxis = d3.axisBottom().scale(xScale);
    svgContainer.append("g")
        .attr('transform', 'translate(0, ' + (cont.height - cont.marginAll) + ')')
        .call(xAxis);

    let yValue = function (d) {
        return +d[y]
    }

    let yScale = d3.scaleLinear()
        .domain([limits.yMax + 5, limits.yMin - 5])
        .range([0 + cont.marginAll, cont.height - cont.marginAll])

    let yMap = function (d) {
        return yScale(yValue(d));
    };

    let yAxis = d3.axisLeft().scale(yScale);
    svgContainer.append('g')
        .attr('transform', 'translate(' + cont.marginAll + ', 0)')
        .call(yAxis);

    return {
        x: xMap,
        y: yMap,
        xScale: xScale,
        yScale: yScale
    };
}

function findMinMax(x, y) {

    let xMin = d3.min(x);
    let xMax = d3.max(x);

    let yMin = d3.min(y);
    let yMax = d3.max(y);

    return {
        xMin: xMin,
        xMax: xMax,
        yMin: yMin,
        yMax: yMax
    }
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function plotPopulation(country, toolChart) {
    let countryData = data.filter((row) => {return row.country == country})
    let population = countryData.map((row) => parseInt(row["population"]));
    let year = countryData.map((row) => parseInt(row["year"]));

    let axesLimits = findMinMax(year, population);
    let mapFunctions = drawAxes(axesLimits, "year", "population", toolChart, miniCont);
    toolChart.append("path")
        .datum(countryData)
        .attr("fill", "none")
        .attr("stroke", "orange")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
                    .x(function(d) { return mapFunctions.xScale(d.year) })
                    .y(function(d) { return mapFunctions.yScale(d.population) }))
    makeLabels(toolChart, miniCont, "Population Over Time For " + country, "Year", "Population (in Millions)");
}

function makeLabels(svgContainer, cont) {
    svgContainer.append('text')
        .attr('x', 400)
        .attr('y', cont.marginAll / 2 + 10)
        .text( "Fertility vs Life Expectancy (1980)");
    
    svgContainer.append('text')
        .attr('transform', 'translate( 15,' + (cont.height / 2 + 30) + ') rotate(-90)')
        .text('Life Expectancy');

    svgContainer.append('text')
        .attr('x', 500)
        .attr('y', cont.height - 10)
        .text('Fertility');


}