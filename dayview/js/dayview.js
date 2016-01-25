$(document).ready(function() {
	//set dimensions
	var m = [12, 12, 12, 0]; //top right bottom left  margins
	var w = window.innerWidth - m[1] - m[3] - 4; //replace with actual window width
	var barHeight = 20;
	var cHeight = 32; //height of compressed timeline
	var eHeight = 500; //height of expanded timeline
	var kHeight = 400;
	var eBarPadding = 2;
	var timelineColors = ['#4394F7','#60B632','#EE7C15','#A24DDA','#F2CC20', '#E4454C']

	 //add datepicker
	$("#datepicker").datepicker({dateFormat: "MM d, yy", onSelect: function(date) {renderTimeline();} });
	$("#datepicker").datepicker("setDate", "0");

	// add container for tooltip
	var tooltip = d3.select("body").append("div")
		.attr("class", "tooltip");

	//add main display svg
	var main = d3.select("body")
		.append("svg")
		.attr("width", w + m[1] + m[3])
		.attr("height", cHeight + eHeight + kHeight + m[0] + m[2])
		.attr("class", "main");

	//add container for main compressed timeline
	var cTimeline = main.append("g")
		.attr("transform", "translate(" + m[3] + ",0)")//start @ x = 75
		.attr("width", w)
		.attr("height", cHeight)
		.attr("class", "cTimeline");

	//background rectangle for compressed timeline
	var cTimelineBackground = cTimeline.append("rect")
		.attr("x", m[3])
		.attr("y", 0)
		.attr("height", barHeight)
		.attr("width", w)
		.attr('class', 'timelineBackground');

	//add container for expanded timeline
	var eTimeline = main.append("g")
		.attr("transform", "translate(" + m[3] + "," + (cHeight + m[0]) + ")")//start @ x = 75, y = under cTimeline
		.attr("width", w)
		.attr("height", eHeight)
		.attr("class", "eTimeline");

	var keywordGroup = main.append('g')
		.attr("transform", "translate(" + m[3] + "," + (cHeight + eHeight + m[0]) + ")")//start @ x = 75, y = under cTimeline
		.attr('width', w)
		.attr('height', kHeight);

	renderTimeline();

	function renderTimeline(){

		//get start and end time of the day we are viewing
		selectedDate = $( "#datepicker" ).datepicker("getDate");
		timeBegin = Date.parse(selectedDate)/1000.0 //+ selectedDate.getTimezoneOffset()*60.0;
		timeEnd = timeBegin + 24*60*60; //show one day of data

			//wrapper function for using json data to render SVG objects
		d3.json("../extract.json", function(error, json){
				 if (error) return console.warn(error);

				 // get the data for today
				 data = json;
				 filteredData = data['appevents'].filter(function (el) {
					  return (el.start <= timeEnd && el.start >= timeBegin) ||
					  (el.end <= timeEnd && el.end >= timeBegin);
				 });

				 if(filteredData.length == 0){
					  $('#stats').html("<p>You have no recordings for this date<\/p>")
				 }
				 else{
					  var recordedTime = 0.0
					  for (i = 0; i < filteredData.length; i++) {
							recordedTime += filteredData[i].end - filteredData[i].start
					  }
					  recordedTime = (recordedTime / 3600)
					  recordedTime = recordedTime.toFixed(1)
					  $('#stats').html("<p>You recorded " + recordedTime.toString() + " hours<\/p>")
				 }

				 //prep data to draw expanded timeline
				 lanes = data["apps"];
				 items = data["appevents"];
				 laneLength = lanes.length;
			 
				 //prep image and word data
				 images = data['images']
				 words = data['words']
				 filteredWords = words.filter(function (el) {
					  return (el.time <= timeEnd && el.time >= timeBegin);
				 });

				 //set scales
				 var x = d3.scale.linear()
							.domain([timeBegin, timeEnd]) //sets the scale's input domain to the specified array of numbers
							.range([m[3],w]);  //sets the scale's output range to the specified array of values

				 y = d3.scale.linear()
					  .domain([0, laneLength])
					  .range([0, laneLength * (barHeight + 2 * eBarPadding)]);

				//draw timeline axis
				var t1 = selectedDate;
				var t2 = new Date(t1.getTime());
				t2.setDate(t2.getDate() + 1);

				var xScale = d3.time.scale()
					 .domain([t1, t2])
					 .range([m[3], w]);

				var xAxis = d3.svg.axis()
					 .scale(xScale)
					 .orient("bottom");

				d3.selectAll(".axis").remove(); //remove any existing axis

				main.append("g") //redraw the timeline axis
					  .attr("class", "axis")
					  .attr("transform", "translate("+m[3]+"," + barHeight + ")")
					  .call(xAxis)
					  .selectAll("text") //move text for tick marks
					  .attr("y", 8)
					  .attr("x", 0)
					  .style("text-anchor", "center")
					  .style("fill", "#666");

				//********************************************************
				//draw compressed timeline
				//********************************************************
				cTimeline.selectAll("g").remove(); //remove bars for redraw

				cbars = cTimeline.append("g").selectAll(".cbar")
					  .data(filteredData);

				cbars.enter().append("rect")
					  .attr("class", 'cbar')
					  .attr("x", function(d) {return x(d.start);})   //x = scaled value of start time
					  .attr("y", 0)
					  .attr("width", function(d) {return ( x(d.end) - x(d.start)); }) //x = value of scaled(end) - scaled(start)
					  .attr("height", barHeight)
					  .style("fill", function(d){return timelineColors[d.appid % 6]})
					  .on("mouseover", function(d) {
							tooltip.html(lanes[d.appid-1].name)
								 .style("left", (d3.event.pageX) + "px")
								 .style("top", (d3.event.pageY - 28) + "px")
								 .style("visibility", "visible");
								 //get image
								 var t = x.invert(d3.event.pageX)
								 var result = $.grep(images, function(e){ return e.time >= t; });
								 if (result.length >= 1) {$('#screenshot').attr("src", result[0].image)}
								 else{$('#screenshot').attr("src","")}})
					  .on("mousemove", function(d) {
							tooltip.style("left", (d3.event.pageX) + "px")
								 .style("top", (d3.event.pageY - 28) + "px");
							var t = x.invert(d3.event.pageX)
							var result = $.grep(images, function(e){ return e.time >= t; });
							if (result.length >= 1) {$('#screenshot').attr("src", result[0].image)}
							else{$('#screenshot').attr("src","")}})
					  .on("mouseout", function(d) {
							tooltip.style("visibility", "hidden");
							$('#screenshot').attr("src","")});

				cbars.exit().remove();

			
				//********************************************************
				//draw expanded timeline
				//********************************************************
				eTimeline.selectAll("g").remove(); //remove everything in eTimeline for redraw

				//draw the lane lines
				eTimeline.append("g").selectAll(".laneLine")
				 	.data(lanes)
				 	.enter().append("line")
					.attr("x1", m[3])
				 	.attr("y1", function(d, i) {return y(i);})
				 	.attr("x2", w)
				 	.attr("y2", function(d, i) {return y(i);})
				 	.attr("stroke", "lightgray")
					.attr("class","laneLine");

				 // not sure why we are filtering here
				ebars = eTimeline.append("g").selectAll(".ebar")
					.data(filteredData, function(d) { return d.id; });

				//draw the actual expanded timeline bars
				ebars.enter().append("rect")
					  .attr("class","ebar")
					  .attr("y", function(d) {return y(d.appid-1) + eBarPadding;})
				.attr("x", function(d) {return x(d.start);})
					  .style("fill", function(d) {return timelineColors[d.appid % 6]})
					  // .attr("width", function(d) {return x(timeBegin + d.end - d.start);}) //from original
				.attr("width", function(d) {return ( x(d.end) - x(d.start)); }) //x = value of scaled(end) - scaled(start)
					  .attr("height", barHeight)
					  .on("mouseover", function(d) {
							tooltip.html(lanes[d.appid-1].name)
								 .style("left", (d3.event.pageX) + "px")
								 .style("top", (d3.event.pageY - 28) + "px")
								 .style("visibility", "visible");
							//get image
							var t = x.invert(d3.event.pageX)
							var result = $.grep(images, function(e){ return e.time >= t; });
							if (result.length >= 1) {$('#screenshot').attr("src", result[0].image)}
							else{$('#screenshot').attr("src","")}})
					  .on("mousemove", function(d) {
							tooltip.style("left", (d3.event.pageX) + "px")
								 .style("top", (d3.event.pageY - 28) + "px");
							var t = x.invert(d3.event.pageX)
							var result = $.grep(images, function(e){ return e.time >= t; });
							if (result.length >= 1) {$('#screenshot').attr("src", result[0].image)}
							else{$('#screenshot').attr("src","")}})
					  .on("mouseout", function(d) {
							tooltip.style("visibility", "hidden");
							$('#screenshot').attr("src","")});

				ebars.exit().remove();

				//add text for app labels
				eTimeline.append("g").selectAll(".laneText")
					 .data(lanes)
					 .enter().append("text")
					 .text(function(d) {return d.name;})
					 .attr("x", m[3])
					 .attr("y", function(d, i) {return y(i)+10;})
					 .attr("dy", ".5ex")
					 .attr("text-anchor", "start")
							.style("font-size", "11px")
							.style("fill", '#666')
					// .style("font-size", function(d) { return (Math.min( 12, Math.min(m[3], (m[3] - 8) / this.getComputedTextLength() * 24)))+ "px"; })  //scale font-size to fit in margin
					 		.attr("class", "laneText");

				//********************************************************
				//keyword stuff
				//********************************************************
			 	keywords = keywordGroup.selectAll('.keywords')
					 .data(filteredWords)

			 	keywords.enter().append('text')
					 .text(function(d) {return d.top;})
					 .attr("x", m[3])
					 .attr("y", function(d, i) {return y(i)+10;})
					 .attr('class', 'keywords');

			 	keywords.exit().remove();

		});   //end d3.json
	}//end renderTimeline()
});