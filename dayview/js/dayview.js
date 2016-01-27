$(document).ready(function() {

	//set dimensions
	var m = [12, 12, 12, 0]; //top right bottom left  margins
	var w = window.innerWidth - m[1] - m[3] - 4; //replace with actual window width
	var barHeight = 20;
	var cHeight = 32; //height of compressed timeline
	var eHeight = 500; //height of expanded timeline
	var kHeight = 400;
	var eBarPadding = 2;
	var timelineColors = ['#2F81AE','#A42510','#DE9D18','#256384','#C0400D','#E1C020','#1C4766','#DD5C00','#96AC53','#132D45','#DE7C0F','#599780']
	//var timelineColors = ['#4394F7','#60B632','#EE7C15','#A24DDA','#F2CC20', '#E4454C']

	//add datepicker
	$("#datepicker").datepicker({dateFormat: "MM d, yy", onSelect: function(date) {renderTimeline();} });
	$("#datepicker").datepicker("setDate", "0");
	//get start and end time of the day we are viewing
	selectedDate = $( "#datepicker" ).datepicker("getDate");
	timeBegin = Date.parse(selectedDate)/1000.0 //+ selectedDate.getTimezoneOffset()*60.0;
	timeEnd = timeBegin + 24*60*60; //show one day of data

	//set horizontal scale
	var x = d3.scale.linear()
		.domain([timeBegin, timeEnd]) //sets the scale's input domain to the specified array of numbers
		.range([m[3],w]);  //sets the scale's output range to the specified array of values

	//********************************************************
	//draw containers
	//********************************************************
	// container for tooltip
	var tooltip = d3.select("body").append("div")
		.attr("class", "tooltip");

	// main display svg
	var main = d3.select("body")
		.append("svg")
		.attr("width", w + m[1] + m[3])
		.attr("height", cHeight + eHeight + kHeight + m[0] + m[2])
		.attr("class", "main");

	//container for main compressed timeline
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

	//container for expanded timeline
	var eTimeline = main.append("g")
		.attr("transform", "translate(" + m[3] + "," + (cHeight + m[0]) + ")")//start @ x = 75, y = under cTimeline
		.attr("width", w)
		.attr("height", eHeight)
		.attr("class", "eTimeline");

	//svg container for keyword
	// var keywordSVG = d3.select("#detailsContainer").append('svg')
	// 	.attr('height', '100%');
	// var keywordGroup = keywordSVG.append('g');

  //svg brush elements
	// var brush = d3.svg.brush()
//   .x(x) //xscale of the brush is the x scale of the chart
//   // .extent([timeBegin, timeEnd]) //extent is current time range
//   .on("brush", updateBrushed) //<--- on BRUSH event, only expanded timeline is redrawn
// 	.on("brushend",brushEnd); //<-- on BRUSHEND, expanded redrawn to date frame if brush is empty
//
//   var area = main.append("g")
//                 .attr("class", "x brush")
//                 .call(brush)
//                 .selectAll("rect")
//                 .attr("y", 1)
// 								.attr("height", barHeight - 1);
//

	//DRAW ALL THE THINGS!
	renderTimeline();

	//-------------------------------------------------
	//renders both timelines
	//-------------------------------------------------
	function renderTimeline(){

		//get time again -- may have changed
		selectedDate = $( "#datepicker" ).datepicker("getDate");
		timeBegin = Date.parse(selectedDate)/1000.0 //+ selectedDate.getTimezoneOffset()*60.0;
		timeEnd = timeBegin + 24*60*60; //show one day of data

		//wrapper function for using json data to render SVG objects
		d3.json("../extract.json", function(error, json){
			if (error) return console.warn(error);


			//not sure why this needs to be declared again ---ARF investigating
			var x = d3.scale.linear()
				.domain([timeBegin, timeEnd]) //sets the scale's input domain to the specified array of numbers
				.range([m[3],w]);  //sets the scale's output range to the specified array of values

			//********************************************************
			//wrangle the data
			//********************************************************
			data = json;
			apps = data["apps"];
			items = data["appevents"];
			images = data['images'];
			words = data['words'];
			laneLength = apps.length;

			//filter app data for the date
			filteredApps = items.filter(function (el) {
				return (el.start <= timeEnd && el.start >= timeBegin) ||
				(el.end <= timeEnd && el.end >= timeBegin);
			});

			//get only text typed today
			filteredWords = words.filter(function (el) {
				return (el.time <= timeEnd && el.time >= timeBegin);
			});

			//get most used words by application
			wordsByApp = new Array(apps.length).join(".").split(".");
			for (i = 0; i < filteredWords.length; i++) {
				wordsByApp[filteredWords[i].app] += (" " + filteredWords[i].text)
			}

			//reusable wordcount function
			var wordcnt = function(s){
				var hist = {};
				var words = s.split(/[\s*\.*\,\;\+?\#\|:\-\/\\\[\]\(\)\{\}$%&0-9*]/);
				for(j=0; j<words.length; j++){
					if(words[j].length>0){
						hist[words[j]] ? hist[words[j]]+=1 : hist[words[j]]=1;
					}
				}
				return hist;
			};

			//get word frequencies per app
			countsByApp = new Array(apps.length).join(".").split(".");
			for(i = 0; i<wordsByApp.length; i++) {
				countsByApp[i] = wordcnt(wordsByApp[i]);
			}

			//get total word count across all application
			totalWordCount = 0
			for(i = 0; i<countsByApp.length; i++) {
				for(var key in countsByApp[i]){
					totalWordCount += countsByApp[i][key]
				}
			}

			//get word freqencies in form we can use for d3 (i.e. an array instead of a Javascript object)
			sortedCountsByApp = new Array(apps.length).join(".").split(".");
			for(i=0; i<countsByApp.length; i++){
				var sortedCounts = [];
				for(var word in countsByApp[i]){
					sortedCounts.push([word, countsByApp[i][word]])
  				  	sortedCounts.sort(function(a, b) {return b[1] - a[1]})
				}
				sortedCountsByApp[i] = sortedCounts
			}

			totalSortedCounts = []
			//100 most common english words
			common = ['the','be','to','of','and','a','in','that','have','i',
				'it','for','not','on','with','he','as','you','do','at','this',
				'but','his','by','from','they','we','say','her','she','or','an',
				'will','my','one','all','would','there','their','what','so',
				'up','out','if','about','who','get','which','go','me','when',
				'make','can','like','time','no','just','him','know','take',
				'people','into','year','your','good','some','could','them',
				'see','other','than','then','now','look','only','come','its',
				'over','think','also','back','after','use','two','how','our',
				'work','first','well','way','even','new','want','because','any',
				'these','give','day','most','us']
			for(i=0; i<sortedCountsByApp.length; i++){
				for(j=0; j<sortedCountsByApp[i].length; j++){
					if($.inArray(sortedCountsByApp[i][j][0], common) == -1){ //returns -1 if value not in the array
						totalSortedCounts.push([sortedCountsByApp[i][j][0], sortedCountsByApp[i][j][1], apps[i].id, apps[i].name])
					}
				}
			}
			totalSortedCounts.sort(function(a, b) {return b[1] - a[1]})

			//********************************************************
			//write summary data to the top of the page
			//********************************************************
			if(filteredApps.length == 0){
			  	$('#stats').html("<p>You have no recordings for this date<\/p>")
			}
			else{
			  	var recordedTime = 0.0
			  	for (i = 0; i < filteredApps.length; i++) {
					recordedTime += filteredApps[i].end - filteredApps[i].start
			 	}
			  	recordedTime = (recordedTime / 3600)
			  	recordedTime = recordedTime.toFixed(1)
			  	$('#stats').html(
				  	"<p>" + recordedTime.toString() + " hours recorded<\/p>\
				  	<p>" + totalWordCount + " words typed<\/p>")
			}

			//TODO: decide which sections need to be functions and which can be main

			drawAxis();
			//********************************************************
			//draw main timeline axis
			//********************************************************
			function drawAxis(){
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
			}

			drawCompressed();
			//********************************************************
			//draw compressed timeline
			//********************************************************
			function drawCompressed(){
				cTimeline.selectAll("g").remove(); //remove bars for redraw

				cbars = cTimeline.append("g").selectAll(".cbar")
					  .data(filteredApps);

				cbars.enter().append("rect")
					  .attr("class", 'cbar')
					  .attr("x", function(d) {return x(d.start);})   //x = scaled value of start time
					  .attr("y", 0)
					  .attr("width", function(d) {return ( x(d.end) - x(d.start)); }) //x = value of scaled(end) - scaled(start)
					  .attr("height", barHeight)
					  .style("fill", function(d){return timelineColors[d.appid % 12]})
					  .on("mouseover", function(d) {
							tooltip.html(apps[d.appid-1].name)
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
			}

			drawExpanded();
			//********************************************************
			//draw expanded timeline
			//********************************************************
		  	function drawExpanded(){

				y = d3.scale.linear()
					.domain([0, laneLength])
					.range([0, laneLength * (barHeight + 2 * eBarPadding)]);

				eTimeline.selectAll("g").remove(); //remove everything in eTimeline for redraw

				//draw the lane lines
				eTimeline.append("g").selectAll(".laneLine")
				 	.data(apps)
				 	.enter().append("line")
					.attr("x1", m[3])
				 	.attr("y1", function(d, i) {return y(i);})
				 	.attr("x2", w)
				 	.attr("y2", function(d, i) {return y(i);})
				 	.attr("stroke", "lightgray")
					.attr("class","laneLine");

				 // not sure why we are filtering here
				ebars = eTimeline.append("g")
					.attr("class","ebarContainer")
					.selectAll(".ebar")
					.data(filteredApps, function(d) { return d.id; });

				//draw the actual expanded timeline bars
				ebars.enter().append("rect")
					  .attr("class","ebar")
					  .attr("y", function(d) {return y(d.appid-1) + eBarPadding;})
				.attr("x", function(d) {return x(d.start);})
					  .style("fill", function(d) {return timelineColors[d.appid % 12]})
					  // .attr("width", function(d) {return x(timeBegin + d.end - d.start);}) //from original
				.attr("width", function(d) {return ( x(d.end) - x(d.start)); }) //x = value of scaled(end) - scaled(start)
					  .attr("height", barHeight)
					  .on("mouseover", function(d) {
							tooltip.html(apps[d.appid-1].name)
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
					 .data(apps)
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
			}

			drawKeywords();
			//********************************************************
			//draw keywords
			//********************************************************
		 	function drawKeywords(){

				countsOverOne = totalSortedCounts.filter(function (el) { return (el[1] > 1);});

				textSize = d3.scale.log()
					.domain([1, countsOverOne[0][1]])
		    		.range([12, 36]);

				//console.log(parseInt(textSize(6)))

				var keywords = d3.select('#keywordParagraph').selectAll('.keyword')
					.data(countsOverOne);

				keywords.enter().append('span')
					.attr('class', 'keyword');

				keywords.text(function(d) {return d[0];})
					.style('color', function(d){return timelineColors[(d[2]+1) % 12];})
					.style('font-size', function(d){return String(parseInt(textSize(d[1]))) + "px"});

				keywords.exit().remove();

 				//keywords.text(function(d) {return apps[d.app-1].name+": " +d.text;});


			}
		});	//end d3.json
	}	//end renderTimeline()

	//-------------------------------------------------
	//redraws expanded based on brush
	//-------------------------------------------------
	function updateBrushed(){
		var minExtent = brush.extent()[0];
		var maxExtent = brush.extent()[1];

		//scale for brushed timeline
		var xb = d3.scale.linear()
			.domain([minExtent, maxExtent])
    		.range([0, w]);

		//get new data based on brush extents
	  	filteredApps = data['appevents'].filter(function (el) {
			return (el.start <= maxExtent && el.start >= minExtent) ||
				(el.end <= maxExtent && el.end >= minExtent);
		});
	    console.log("numitems " + filteredApps.length);

		eTimeline.selectAll(".ebarContainer").remove(); //remove ebars

		var ebars = eTimeline.append("g")
			.attr("class","ebarContainer")
		  .selectAll(".ebar")
			.data(filteredApps, function(d) {return d.id; });

		//draw the actual expanded timeline bars
		ebars.enter().append("rect")
			  .attr("class","ebar")
			  .attr("y", function(d) {return y(d.appid-1) + eBarPadding;})
		.attr("x", function(d) {return xb(d.start);})
			  .style("fill", function(d) {return timelineColors[d.appid % 12]})
			  // .attr("width", function(d) {return x(timeBegin + d.end - d.start);}) //from original
		.attr("width", function(d) {return ( xb(d.end) - xb(d.start)); }) //x = value of scaled(end) - scaled(start)
			  .attr("height", barHeight)
			  .on("mouseover", function(d) {
					tooltip.html(apps[d.appid-1].name)
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

		//ebars.exit().remove();
	}

	//-------------------------------------------------
	//redraws expanded if brush is empty
	//-------------------------------------------------
	function brushEnd(){
		//if the brush is empty, redraw the timeline based on date
		if (brush.empty()) renderTimeline();
	}
});	//end (document).ready()
