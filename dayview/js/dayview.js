$(document).ready(function() {

// -------------------------------------------------
// set constants
// -------------------------------------------------
	// set dimensions
	var m = [12, 12, 12, 0]; //top right bottom left margins
	var w = window.innerWidth - m[1] - m[3] - 4;
	var barHeight = 24;
	var tickOffset = barHeight + 5
	var cHeight = 42; //height of compressed timeline
	var eHeight = 100; //height of expanded timeline
	var eBarPadding = 2;

	// set colors
	var timelineColors = ['#2F81AE','#A42510','#DE9D18','#256384','#C0400D',
							'#E1C020','#1C4766','#DD5C00','#96AC53','#132D45',
							'#DE7C0F','#599780']
	var activityColors = ['#4394F7','#60B632','#EE7C15','#A24DDA','#F2CC20',
							'#E4454C']

// -------------------------------------------------
// draw containers
// -------------------------------------------------
	// main display svg
	var main = d3.select("body")
		.append("svg")
		.attr("width", w + m[1] + m[3])
		.attr("height", cHeight + eHeight + m[0] + m[2])
		.attr("class", "main");

	// container for main compressed timeline
	var cTimeline = main.append("g")
		.attr("transform", "translate(" + m[3] + ",5)")//start @ x = 0, y = 5
		.attr("width", w)
		.attr("height", cHeight)
		.attr("class", "cTimeline");

	//background rectangle for compressed timeline
	var cTimelineBackground = cTimeline.append("rect")
		.attr("x", m[3])
		.attr("y", 0)
		.attr("width", w)
		.attr('class', 'timelineBackground');

	//container for expanded timeline
	var eTimeline = main.append("g")
		.attr("transform", "translate(" + m[3] + "," + (cHeight + m[0]) + ")") //start @ x = 75, y = under cTimeline
		.attr("width", w)
		.attr("height", eHeight)
		.attr("class", "eTimeline");

	// container for tooltip
	var tooltip = d3.select("body").append("div")
		.attr("class", "tooltip");

	// add jQuery datepicker
	$("#datepicker").datepicker({dateFormat: "MM d, yy", onSelect: function(){refreshDayview();} });
	$("#datepicker").datepicker("setDate", "0");


	//DRAW ALL THE THINGS!
	renderDayview();

// -------------------------------------------------
// renders both timelines
// -------------------------------------------------
	function renderDayview(){

		//get time again -- may have changed
		selectedDate = $( "#datepicker" ).datepicker("getDate");
		dayStart = Date.parse(selectedDate)/1000.0 //+ selectedDate.getTimezoneOffset()*60.0;
		dayEnd = dayStart + 24*60*60; //show one day of data

		//wrapper function for using json data to render SVG objects
		d3.json("../extract.json", function(error, json){
			if (error) return console.warn(error);

			//not sure why this needs to be declared again - ARF investigating
			var x = d3.scale.linear()
				.domain([dayStart, dayEnd])
				.range([m[3],w]);

			// get the data that we will use today
			apps = json["apps"];
			windows = json["window"]
			urls = json['url']
			numApps = apps.length;
			images = json['images'];

			words = getFilteredWords(dayStart, dayEnd, json['words']);

			timelineData = getTimelineData(dayStart, dayEnd, json['windowevents'], json['urlevents']);
			filteredApps = timelineData[0]
			appTimesArray = timelineData[1]
			appsByTime = timelineData[2]

			// draw everything
			drawAxis();
			drawCompressed(x);
			drawExpanded(x);
			drawKeywords(dayStart, dayEnd, words, apps, windows);
			drawKeyframes(dayStart, dayEnd);
			setupBrush(x);
			renderDayStats(filteredApps, words.length);


		});	//end d3.json
	}	//end renderDayview()

// -------------------------------------------------
// data scraping
// -------------------------------------------------
	function getFilteredWords(start, end, words){
		filteredText = words.filter(function (el) {
			return (el.time <= end && el.time >= start);
		});

		return filteredText
	}

	function getTimelineData(start, end, windowevents, urlevents){
		// filter app data for the date
		filteredWins = windowevents.filter(function (el) {
			return (el.start <= end && el.start >= start) ||
			(el.end <= end && el.end >= start);
		});

		filteredUrls = urlevents.filter(function (el) {
			return (el.start <= end && el.start >= start) ||
			(el.end <= end && el.end >= start);
		});

		//get most used windows
		wHist = {}
		for(i=0; i<filteredWins.length; i++){
			var time_diff = filteredWins[i].end - filteredWins[i].start
			if(time_diff > 0.0){
				wHist[filteredWins[i].windowid] ? wHist[filteredWins[i].windowid]+=time_diff : wHist[filteredWins[i].windowid]=time_diff;
			}
		}

		wArray = [];
		for(var key in wHist){
			wArray.push([wHist[key], key, windows[key-1].name]);
		}
		wArray.sort(function(a, b) {return b[0] - a[0]});

		//get the most used urls
		urlHist = {}
		for(i=0; i<filteredUrls.length; i++){
			var time_diff = filteredUrls[i].end - filteredUrls[i].start
			if(time_diff > 0.0){
				urlHist[filteredUrls[i].urlid] ? urlHist[filteredUrls[i].urlid]+=time_diff : urlHist[filteredUrls[i].urlid]=time_diff;
			}
		}

		urlArray = [];
		for(var key in urlHist){
			urlArray.push([urlHist[key], key, urls[key-1].host, urls[key-1].url, urls[key-1].title]);
		}
		urlArray.sort(function(a, b) {return b[0] - a[0]});

		//combine urls and windows to get duration of app use
		filteredApps = filteredWins.concat(filteredUrls);

		// get a list of the apps used today, ordered by duration of use
		var appActiveTime = function(ae){
			var hist = {};
			for(i=0; i<ae.length; i++){
				var time_diff = ae[i].end - ae[i].start
				if(time_diff > 0.0){
					hist[ae[i].appid] ? hist[ae[i].appid]+=time_diff : hist[ae[i].appid]=time_diff;
				}
			}
			return hist;
		};

		appTimes = appActiveTime(filteredApps)

		appTimesArray = [];
		for(var key in appTimes){
			appTimesArray.push([key, apps[parseInt(key)-1].name, appTimes[key]]);
		}
		appTimesArray.sort(function(a, b) {return b[2] - a[2]});

		eTimeline.attr('height', barHeight*appTimesArray.length)
		main.attr("height", cHeight + barHeight*(appTimesArray.length+1) + m[0] + m[2])

		// get most used applications in time slices
		appsByTime = calculateActivity(filteredApps, dayStart, dayEnd);

		return [filteredApps, appTimesArray, appsByTime]
	}


// -------------------------------------------------
// brush functions
// -------------------------------------------------
	// setup brush elemetns
	function setupBrush(x){
	  	//svg brush elements
		brush = d3.svg.brush()
	  		.x(x) //xscale of the brush is the x scale of the chart
			.on("brush", function(){updateBrushed(x);}) //<--- on BRUSH event, only expanded timeline is redrawn
			.on("brushend",brushEnd); //<-- on BRUSHEND, expanded redrawn to date frame if brush is empty

	  	var area = main.append("g")
	        .attr("class", "brush")
	        .call(brush)
	        .selectAll("rect")
	        .attr("y", 4)
			.attr("height", barHeight + 2);
	}

	// redraws expanded based on brush
	function updateBrushed(x){
		//get brush boundaries
		minExtent = brush.extent()[0];
		maxExtent = brush.extent()[1];

		//LINEAR SCALE for number of apps
		//TODO this scale works, but it too big, accounting for total num of apps, not just the apps used today
		var y = d3.scale.linear()
			.domain([0, numApps])
			.range([0, numApps * (barHeight + 2 * eBarPadding)]);

		//scale for brushed timeline
		var xb = d3.scale.linear()
			.domain([minExtent, maxExtent])
			.range([0, w]);

		//get new data based on brush extents
		brushApps = filteredApps.filter(function (el) {
			return (el.start <= maxExtent && el.start >= minExtent) ||
			(el.end <= maxExtent && el.end >= minExtent);
		});

		//TODO this does not seem the most d3 way to do this data update
		eTimeline.selectAll(".ebarContainer").remove(); //remove ebars

		var ebars = eTimeline.append("g")
			.attr("class","ebarContainer")
			.selectAll(".ebar")
			.data(brushApps, function(d) {return d.id; });

		//draw the actual expanded timeline bars
		ebars.enter().append("rect")
			.attr("class","ebar")
			.attr("y", function(d) {return y(appTimesArray.findIndex(function(v){return v[0]==d.appid})) + eBarPadding;})
			.attr("x", function(d) {return xb(d.start);})
			.style("fill", function(d) {return timelineColors[appTimesArray.findIndex(function(v){return v[0]==d.appid}) % 12]})
			// .attr("width", function(d) {return x(dayStart + d.end - d.start);}) //from original
			.attr("width", function(d) {return ( xb(d.end) - xb(d.start)); }) //x = value of scaled(end) - scaled(start)
			.attr("height", barHeight)
			.on("mouseover", function(d){ barMouseover(d); })
			.on("mousemove", function(d){ barMousemove(); })
			.on("mouseout", function(d){ barMouseout(); });

			//ebars.exit().remove();

		//TODO add keyframe filtering

	}

	// redraws expanded if brush is empty
	function brushEnd(){
		//if the brush is empty, redraw the timeline based on date
		if(brush.empty()){ renderDayview();}

		//get brush boundaries
		minExtent = brush.extent()[0];
		maxExtent = brush.extent()[1];

		drawKeyframes(minExtent, maxExtent);
		drawKeywords(minExtent, maxExtent, words);

	}


// -------------------------------------------------
// timeline rendering functions
// -------------------------------------------------
	//write summary data to the top of the page
	function renderDayStats(filteredApps, totalWordCount){
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
	}

	//draw main timeline axis
	function drawAxis(){
		var t1 = selectedDate;
		var t2 = new Date(t1.getTime());
		t2.setDate(t2.getDate() + 1);

		var xAxisScale = d3.time.scale()
			.domain([t1, t2])
			.range([m[3], w]);

		var xAxis = d3.svg.axis()
			.scale(xAxisScale)
			.orient("bottom");

		d3.selectAll(".axis").remove(); //remove any existing axis

		main.append("g") //redraw the timeline axis
			.attr("class", "axis")
			.attr("transform", "translate("+m[3]+"," + tickOffset + ")")
			.call(xAxis)
			.selectAll("text") //move text for tick marks
			.attr("y", 12)
			.attr("x", 0)
			.style("text-anchor", "center")
			.style("fill", "#666");
	}

	// draw compressed timeline
	function drawCompressed(x){
		cTimeline.selectAll("g").remove(); //remove bars for redraw

		abars = cTimeline.append("g").selectAll(".abar")
				.data(appsByTime);

		abars.enter().append("rect")
			.attr("class", function(d) {return "abar abar" + d.value})
			.attr("x", function(d) {return x(d.start);})
			.attr("y", barHeight + 3)
			.attr("width", function(d) {return ( x(d.end) - x(d.start) - 1.5); }) //x = value of scaled(end) - scaled(start) - border width
			.attr("height", 4)
			.style("fill", function(d){return activityColors[d.value % 6]})
			.style("fill-opacity", 1.0)
			.style("stroke", function(d){return activityColors[d.value % 6]})
			.style("stroke-width", 1.5)
			.on("mouseover", function(d) {
				d3.selectAll(".abar" + d.value).style("fill-opacity", 0.4);
			})
			.on("mouseout", function(d) {
				d3.selectAll(".abar" + d.value).style("fill-opacity", 1.0);
			});

		abars.exit().remove();

		cbars = cTimeline.append("g").selectAll(".cbar")
			.data(filteredApps);

		cbars.enter().append("rect")
			.attr("class", 'cbar')
			.attr("x", function(d) {return x(d.start);})   //x = scaled value of start time
			.attr("y", 0)
			.attr("width", function(d) {return ( x(d.end) - x(d.start)); }) //x = value of scaled(end) - scaled(start)
			.attr("height", barHeight)
			.style("fill", function(d) {return timelineColors[appTimesArray.findIndex(function(v){return v[0]==d.appid}) % 12]})
			//.on("mouseover", function(d){ barMouseover(d); })
			//.on("mousemove", function(d){ barMousemove(); })
			//.on("mouseout", function(d){ barMouseout(); });

		cbars.exit().remove();
	}

	//draw expanded timeline
	function drawExpanded(x){
		y = d3.scale.linear()
			.domain([0, numApps])
			.range([0, numApps * (barHeight + 2 * eBarPadding)]);

		eTimeline.selectAll("g").remove(); //remove everything in eTimeline for redraw

		//draw the lane lines
		eTimeline.append("g").selectAll(".laneLine")
			.data(appTimesArray)
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
			.attr("y", function(d) {return y(appTimesArray.findIndex(function(v){return v[0]==d.appid})) + eBarPadding;})
			.attr("x", function(d) {return x(d.start);})
			.style("fill", function(d) {return timelineColors[appTimesArray.findIndex(function(v){return v[0]==d.appid}) % 12]})
				// .attr("width", function(d) {return x(dayStart + d.end - d.start);}) //from original
			.attr("width", function(d) {return ( x(d.end) - x(d.start)); }) //x = value of scaled(end) - scaled(start)
			.attr("height", barHeight)
			.on("mouseover", function(d){ barMouseover(d); })
			.on("mousemove", function(d){ barMousemove(); })
			.on("mouseout", function(d){ barMouseout(); });

		ebars.exit().remove();

		//add text for app labels
		eTimeline.append("g").selectAll(".laneText")
			.data(appTimesArray)
			.enter().append("text")
			.text(function(d) {return d[1];})
			.attr("x", m[3])
			.attr("y", function(d, i) {return y(i)+10;})
			.attr("dy", ".5ex")
			.attr("text-anchor", "start")
			.style("font-size", "11px")
			.style("fill", function(d, i){return timelineColors[i%12];})
				// .style("font-size", function(d) { return (Math.min( 12, Math.min(m[3], (m[3] - 8) / this.getComputedTextLength() * 24)))+ "px"; })  //scale font-size to fit in margin
			.attr("class", "laneText");
	}

	// draw keywords
	function drawKeywords(start, end, words, apps, windows){
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

		// get only words typed in our desired time period
		filteredWords = words.filter(function (el) {
			return (el.time <= end && el.time >= start);
		});

		// get a histogram of word freqencies by app and window
		var wordFreqs = {};
		for(i=0; i<filteredWords.length; i++){
			t = filteredWords[i].text
			a = filteredWords[i].app
			w = filteredWords[i].window
			time = filteredWords[i].time
			// if the word has a length and is not in the list of common words
			if(t.length>0 && $.inArray(t, common) == -1){
				if(wordFreqs[t]){
					if(wordFreqs[t][a]){
						if(wordFreqs[t][a][w]){ wordFreqs[t][a][w].push(time) }
						else{ wordFreqs[t][a][w] = [time]};
					}
					else{
						object = {}
						object[w] = [time]
						wordFreqs[t][a] = object;
					}
				}
				else{
					topObject = {}
					object = {}
					object[w] = [time]
					topObject[a] = object
					wordFreqs[t] = topObject;
				}
			}
		}

		//convert into an array
		wordFreqsArray = []
		for(var w in wordFreqs){
			for(var a in wordFreqs[w]){
				for(var wi in wordFreqs[w][a]){
					times = wordFreqs[w][a][wi]
					wordFreqsArray.push([w, a, wi, times.length, times])
				}
			}
		}

		// filter for counts over one
		countsOverOne = wordFreqsArray.filter(function (el) { return (el[3] > 1);});

		//sort the array
		countsOverOne.sort(function(a, b) {return b[3] - a[3]})

		if(countsOverOne.length > 0){

			textSize = d3.scale.log()
				.domain([2, countsOverOne[0][3]])
				.range([12, 36]);

			var keywords = d3.select('#keywordParagraph').selectAll('.keyword')
				.data(countsOverOne);

			keywords.enter().append('span')
				.attr('class', 'keyword');



			keywords.text(function(d) {return d[0];})
				.style('color', function(d){return timelineColors[appTimesArray.findIndex(function(v){return v[0]==(d[1])}) % 12];})
				.style('font-size', function(d){return String(parseInt(textSize(d[3]))) + "px"})
				.on('mouseover', function(d){
					console.log(windows.length)
					tooltip.html(apps[d[1]-1].name + ": " + windows[d[2]-1].name)
						.style("left", (d3.event.pageX) + "px")
						.style("top", (d3.event.pageY - 28) + "px")
						.style("visibility", "visible");
				})
				.on('mousemove', function(d){
					tooltip.style("left", (d3.event.pageX) + "px")
						.style("top", (d3.event.pageY - 28) + "px");
				})
				.on('mouseout', function(d){
					tooltip.style("visibility", "hidden");
				});

			keywords.exit().remove();
		}
	}

	//draw keyframes
	function drawKeyframes(start, end){
		numKeyframes = 12;
		keyframeFiles = []
		filteredImages = $.grep(images, function(e){ return e.time >= start && e.time <= end; });
		if(filteredImages.length < numKeyframes){
			numKeyframes = filteredImages.length
		}

		for(i=0; i<numKeyframes; i++){
			ind = parseInt(i/(numKeyframes-1)*(filteredImages.length-1))
			keyframeFiles.push(filteredImages[ind])
		}

		d3.select('#screenshot').remove()

		keyframes = d3.select('#imageContainer').selectAll('img')
			.data(keyframeFiles)

		keyframes.enter().append('img')
			.attr('class', 'keyframe')

		keyframes.attr('src', function(d){return d.image})
			.on('mouseover', function(d){
				tooltip.html(d.image.substring(31,33) + ':' + d.image.substring(33,35) + ':' + d.image.substring(35,37))
					.style("left", (d3.event.pageX) + "px")
					.style("top", (d3.event.pageY - 28) + "px")
					.style("visibility", "visible");
			})
			.on('mousemove', function(d){
				tooltip.style("left", (d3.event.pageX) + "px")
					.style("top", (d3.event.pageY - 28) + "px");
			})
			.on('mouseout', function(d){
				tooltip.style("visibility", "hidden");
			});

		keyframes.exit().remove()
	}

	// update the dayview to the newly selected date. Called by the datepicker
	function refreshDayview(){
		d3.selectAll(".brush").remove();  //remove brush container
		d3.selectAll(".brush").call(brush.clear());	 //reset svg brush
		renderDayview(); //now draw the things (again)
	}


// -------------------------------------------------
// mouseover functions
// -------------------------------------------------
	function barMouseover(d){
    	//set x scale depending on if brushing is used
		if (brush.empty()) {
			var x = d3.scale.linear()
			.domain([dayStart, dayEnd])
			.range([m[3],w]);
		}
		else {
			var x = d3.scale.linear()
			.domain([minExtent, maxExtent])
			.range([0, w]);
		}

		// get divs ready for screenshot image
		d3.selectAll('.keyframe').remove()
		d3.select('#imageContainer').append('img')
			.attr('id', 'screenshot')
			.attr('name', 'screenshot')

		tooltip.html(apps[d.appid-1].name)
			.style("left", (d3.event.pageX) + "px")
			.style("top", (d3.event.pageY - 28) + "px")
			.style("visibility", "visible");

		// get image
		var t = x.invert(d3.event.pageX)
		var result = $.grep(images, function(e){ return e.time >= t; });
		if (result.length >= 1){
			$('#screenshot').attr("src", result[0].image)
		}
		else{
			$('#screenshot').attr("src","")
		}
	}

	function barMousemove(){
    	//set x scale depending on if brushing is used
		if (brush.empty()) {
			var x = d3.scale.linear()
			.domain([dayStart, dayEnd])
			.range([m[3],w]);
		}
		else {
			var x = d3.scale.linear()
			.domain([minExtent, maxExtent])
			.range([0, w]);
		}

		// move tooltip
		tooltip.style("left", (d3.event.pageX) + "px")
			.style("top", (d3.event.pageY - 28) + "px");

		// update image
		var t = x.invert(d3.event.pageX)
		var result = $.grep(images, function(e){ return e.time >= t && e.time<=t+60.0; }); //get only 60s worth of images
		if (result.length >= 1) {
			$('#screenshot').attr("src", result[0].image)
		}
		else{
			$('#screenshot').attr("src","")
		}
	}

	function barMouseout(){
		tooltip.style("visibility", "hidden");
		d3.select('#screenshot').remove()
		// decide what keyframes to draw based on whether brushing selected or not
		if (brush.extent()[1] == dayStart){
			drawKeyframes(dayStart, dayEnd);
		}
		else{
			drawKeyframes(brush.extent()[0], brush.extent()[1]);
		}
	}


// -------------------------------------------------
// activity recognition
// -------------------------------------------------
	function calculateActivity(filteredApps, dayStart, dayEnd) {
		appsByTime = []
		taskMap = {}
		for (i = dayStart; i <= dayEnd; i += 1800) {
			temporalApps = filteredApps.filter(function(el) {
				return el.start < i + 1800 && el.start > i;
			});

			appCounts = {}

			temporalApps.forEach(function(element, index) {
				appCounts[element['appid']] = appCounts[element['appid']] + 1 || 1;
			});
			keysSorted = Object.keys(appCounts).sort(function(a,b){return appCounts[b]-appCounts[a]}).slice(0, 3);
			if (keysSorted.length < 3)
				continue;
			keysSorted.sort()
			keysSorted = keysSorted.join("")
			if (!(keysSorted in taskMap)) {
				taskMap[keysSorted] = Object.keys(taskMap).length + 1;
			}

			appsByTime.push({"start": i, "end": i + 1800, "value": taskMap[keysSorted]});
		}

		return appsByTime;
	}

	function getCbarValue(d, appsByTime) {
		for (var i = 0; i < appsByTime.length; i++) {
			el = appsByTime[i]
			if(d.start > el.start && d.start < el.end) {
				return el.value;
			}
		}
		return -1;
	}

});	//end (document).ready()
