$(document).ready(function() {
	$('#collapsed').click(function() {
		render("collapsed");
	});
	$('#expanded').click(function() {
		render("expanded");
	});
	$('#moments').click(function() {
		render("moments");
	});
  
  //JS object to hold the raw data + functions for filtering
  var fullData = function(data){  
    this.apps = data["apps"];
    this.windows = data["window"];
    this.windowevents = data ["windowevents"];
    this.urls = data["url"];
    this.urlevents = data["urlevents"];
    this.images = data["images"];
    this.words = data["words"];
  }
  fullData.prototype.filterWords = function(dateRange) {
      var filteredText = this.words.filter(function (el) {
        return (el.time <= dateRange[1] && el.time >= dateRange[0]);
      }); 
      return filteredText;
  };   
  fullData.prototype.filterApps = function(dateRange) {
      
        // filter app data for the date
        var filteredWins = this.windowevents.filter(function (el) {
          return (el.start <= dateRange[1] && el.start >= dateRange[0]) ||
          (el.end <= dateRange[1] && el.end >= dateRange[0]);
        });

        var filteredUrls = this.urlevents.filter(function (el) {
          return (el.start <= dateRange[1] && el.start >= dateRange[0]) ||
          (el.end <= dateRange[1] && el.end >= dateRange[0]);
        });

        //get most used windows
        var wHist = {}
        for(i=0; i<filteredWins.length; i++){
          var time_diff = filteredWins[i].end - filteredWins[i].start
          if(time_diff > 0.0){
            wHist[filteredWins[i].windowid] ? wHist[filteredWins[i].windowid]+=time_diff : wHist[filteredWins[i].windowid]=time_diff;
          }
        }

        var wArray = [];
        for(var key in wHist){
          wArray.push([wHist[key], key, this.windows[key-1].name]);
        }
        wArray.sort(function(a, b) {return b[0] - a[0]});

        //get the most used urls
        var urlHist = {}
        for(i=0; i<filteredUrls.length; i++){
          var time_diff = filteredUrls[i].end - filteredUrls[i].start
          if(time_diff > 0.0){
            urlHist[filteredUrls[i].urlid] ? urlHist[filteredUrls[i].urlid]+=time_diff : urlHist[filteredUrls[i].urlid]=time_diff;
          }
        }

        var urlArray = [];
        for(var key in urlHist){
          urlArray.push([urlHist[key], key, this.urls[key-1].host, this.urls[key-1].url, this.urls[key-1].title]);
        }
        urlArray.sort(function(a, b) {return b[0] - a[0]});

        //combine urls and windows to get duration of app use
        var filteredApps = filteredWins.concat(filteredUrls);
        return filteredApps;
  };
  fullData.prototype.filterAppTimes = function(dateRange){  
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
  
    
    var appTimes = appActiveTime(this.filterApps(dateRange))
    var appTimesArray = [];
    for(var key in appTimes){
      appTimesArray.push([key, this.apps[parseInt(key)-1].name, appTimes[key]]);
    }
    appTimesArray.sort(function(a, b) {return b[2] - a[2]});
    return appTimesArray;
  };
  fullData.prototype.filterAppsByTime = function(dateRange){
    // get most used applications in time slices
    var appsByTime = calculateActivity(this.filterApps(dateRange), dateRange[0], dateRange[1]);  
    return appsByTime;
  }

//TODO: fix brushing
//TODO: extract brushing to toggle
//TODO: change buttons to toggle

// -------------------------------------------------
// set constants
// -------------------------------------------------
	// set dimensions
	var m = [10, 0, 0, 100]; //top right bottom left margins
  var svgWidth = $("svg").width();
  var w =  svgWidth - m[1] ; //practical width of chart
	var barHeight = 24;
	var tickOffset = barHeight + 5
	var cHeight = 42; //height of compressed timeline
	var eHeight = 100; //height of expanded timeline
	var eBarPadding = 2;
	var transitionTime = 1000; //duration of d3 transitions
  var brush;
	
	// set colors
  var timelineColors = ['#2F81AE','#A42510','#DE9D18','#256384','#C0400D',
              '#E1C020','#1C4766','#DD5C00','#96AC53','#132D45',
  '#DE7C0F','#599780'];
 
  // var activityColors = ['#4394F7','#60B632','#EE7C15','#A24DDA','#F2CC20',
  //   '#E4454C'];


	var activityColors = ['black','gray','black','gray','black','gray'];

// -------------------------------------------------
// draw containers
// -------------------------------------------------
	// main display svg
	var main = d3.select("svg")
		.attr("class", "main");

	// container for tooltip
	var tooltip = d3.select("body").append("div")
		.attr("class", "tooltip");

	// add jQuery datepicker
	$("#datepicker").datepicker({dateFormat: "MM d, yy", onSelect: function(){render();} });
	$("#datepicker").datepicker("setDate", "0");

	//DRAW ALL THE THINGS!
	render();

	function render(type) {
		
		var dateRange = getDate();
    // console.log(dateRange);
    
		var x = d3.scale.linear()
			.domain(dateRange)
      .range([m[3],w])
      .clamp(1);   //turn on range clamping to prevent out of bounds for multiday events   
	  	 	
    d3.json("../extract.json", function(error, json){
        if (error) return console.warn(error);

        var data = json;
        var raw = new fullData(data);         
        
    switch(type){
				case "collapsed":
					console.log("render COLLAPSED");
			    d3.selectAll("g").remove();
      		drawAxis();
	        drawCompressed(x,raw,dateRange);          
					break;
				case "expanded":
					console.log("render EXPANDED");
          d3.selectAll("g").remove();
        	drawAxis();
          drawExpanded(x,raw,dateRange);
          break;
				case "moments":
					console.log("render MOMENTS");
          d3.selectAll("g").remove();
          drawAxis();
					drawMoments(x,raw,dateRange);
					break;
				case "hide":
					console.log("render HIDE");
					brushing ^= true;
					break;	
				default:
					console.log("render DEFAULT");
					d3.selectAll("g").remove();
        	drawAxis();
	        drawCompressed(x,raw,dateRange);
          // setupBrush(x,raw);
          drawActivity(x,raw,dateRange);
          drawExpanded(x,raw,dateRange);
          // drawMoments(x,raw,dateRange);
					break;
			}//end switch	
			
      drawKeywords(dateRange, raw);
      drawKeyframes(dateRange,raw);
      renderDayStats(dateRange,raw);
    });//end d3.json	
	}

	// update the dayview to the newly selected date. Called by the datepicker
	function refresh(){
		d3.selectAll(".brush").remove();  //remove brush container
		d3.selectAll(".brush").call(brush.clear());	 //reset svg brush
		render(); //now draw the things (again)
	}
	
	//get the date range from datepicker
	function getDate(x){
		//get time again -- may have changed
    
		selectedDate = $( "#datepicker" ).datepicker("getDate");
		dayStart = Date.parse(selectedDate)/1000.0 //+ selectedDate.getTimezoneOffset()*60.0;
		dayEnd = dayStart + 24*60*60; //show one day of data
		return [dayStart,dayEnd];
	}


// -------------------------------------------------
// brush functions
// -------------------------------------------------
	// setup brush elemetns
	function setupBrush(x,raw){

		brush = d3.svg.brush()
			.x(x) //xscale of the brush is the x scale of the chart
			.on("brush", function(){updateBrushed(x,raw);}) //<--- on BRUSH event, only expanded timeline is redrawn
			.on("brushEnd",brushEnd(raw)); //<-- on BRUSHEND, expanded redrawn to date frame if brush is empty
	  
		var area = main.append("g")
	    .attr("class", "brush")
	    .call(brush)
	    .selectAll("rect")
	    .attr("y", 4)
			.attr("height", barHeight + 2);			
	}

	// redraws expanded based on brush
	function updateBrushed(x,raw){
		
    console.log("updatedBrushed");
       
    //get brush boundaries
    minExtent = brush.extent()[0];
    maxExtent = brush.extent()[1];

		//LINEAR SCALE for number of apps
		//TODO this scale works, but it too big, accounting for total num of apps, not just the apps used today
		var y = d3.scale.linear()
			.domain([0, raw.apps.length])
			.range([0, raw.apps.length * (barHeight + 2 * eBarPadding)]);

		//scale for brushed timeline
		var xb = d3.scale.linear()
			.domain([minExtent, maxExtent])
			.range([0, w]);

		//get new data based on brush extents
    var filteredApps = raw.filterApps([minExtent,maxExtent]);
		brushApps = filteredApps.filter(function (el) {
			return (el.start <= maxExtent && el.start >= minExtent) ||
			(el.end <= maxExtent && el.end >= minExtent);
		});

		//TODO this does not seem the most d3 way to do this data update
		d3.select(".eTimeline").selectAll(".ebarContainer").remove(); //remove ebars

		var ebars = d3.select("eTimeline").append("g")
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
			.on("mouseover", function(d){ barMouseover(d,raw,x); })
			.on("mousemove", function(d){ barMousemove(raw,x); })
			.on("mouseout", function(d){ barMouseout(raw); });

			//ebars.exit().remove();

		//TODO add keyframe filtering

	}

	// redraws expanded if brush is empty
	function brushEnd(raw){
		//if the brush is empty, redraw the timeline based on date
    if(brush.empty()){ render();}
    // render();
		//get brush boundaries
    // minExtent = brush.extent()[0];
    // maxExtent = brush.extent()[1];

    // drawKeyframes(minExtent, maxExtent,raw);
    // drawKeywords(minExtent, maxExtent, raw);

	}


// -------------------------------------------------
// timeline rendering functions
// -------------------------------------------------
	//write summary data to the top of the page
	function renderDayStats(dateRange,raw){
		console.log("renderDayStats");
    
    filteredApps = raw.filterApps(dateRange);
    totalWordCount = raw.filterWords(dateRange).length;
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
			.attr("transform", "translate("+0+"," + tickOffset + ")")
      .call(xAxis)
			.selectAll("text") //move text for tick marks
			.attr("y", 12)
			.attr("x", 0)
			.style("text-anchor", "center")
			.style("fill", "#666");
	}
	
	//draw signifier of activity recognition
	function drawActivity(x,raw,dateRange){
    var appsTimes = raw.filterAppsByTime(dateRange);
    // eTimeline.attr('height', barHeight*appTimesArray.length)
    // main.attr("height", cHeight + barHeight*(appTimesArray.length+1) + m[0] + m[2])
		console.log("drawActivity");
    
		//draw or re-draw timeline container
    d3.selectAll(".aTimeline").remove();
		
		var aTimeline = d3.select("svg")
			.append("g")
      .attr("transform", "translate(" + 0 + ","+0+")")//start @ x = 0, y = 5
  		.attr("width", w)
			.attr("height", cHeight)
			.attr("class", "aTimeline");
		
    var abars = aTimeline.selectAll(".abar")
			.data(appsTimes);

		abars.enter().append("rect")
			.attr("class", function(d) {return "abar" + d.value})
			.attr("x", function(d) {return x(d.start);})
      // .attr("y", barHeight + 3) //below compressed
      .attr("y", 0) //above compressed
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
	}
		
	// draw compressed timeline
	function drawCompressed(x,raw,dateRange){			
		console.log("drawCompressed");
		//draw or re-draw timeline container
    d3.selectAll(".cTimeline").remove();
		
		var cTimeline = d3.select("svg")
			.append("g")
      .attr("transform", "translate(" + 0 + ",5)")//start @ x = 0, y = 5
			.attr("width", w)
			.attr("height", cHeight)
			.attr("class", "cTimeline");
		
		var cbars = cTimeline.selectAll(".cbar")
			.data(raw.filterApps(dateRange));

		cbars.enter()
			.append("rect")
			.attr("class", 'cbar')		
			.attr("width",0)
			.on("mouseover", function(d){ barMouseover(d,raw,x); })
			.on("mousemove", function(d){ barMousemove(raw,x); })
			.on("mouseout", function(d){ barMouseout(raw,dateRange); });	
		
		cbars
      // .transition()
      // .duration(transitionTime)
     //       .ease("sin-in-out")	
			.attr("x", function(d) {return x(d.start);})   //x = scaled value of start time	
			.attr("y", 0)
			.attr("height", barHeight)
			.attr("width", function(d) {return ( x(d.end) - x(d.start)); }) //x = value of scaled(end) - scaled(start)
			.style("fill", function(d) {return timelineColors[raw.filterAppTimes(dateRange).findIndex(function(v){return v[0]==d.appid}) % 12]})
		
		cbars.exit().remove();
	}

	//draw expanded timeline
	function drawExpanded(x,raw,dateRange){
		
    var lanes = raw.apps.length;
    var filteredApps = raw.filterApps(dateRange)
    var appTimesArray = raw.filterAppTimes(dateRange);
		
    var y = d3.scale.linear()
      .domain([0, lanes])
			.range([0, lanes * (barHeight + 2 * eBarPadding)]);

  	//draw or re-draw timeline container
    d3.selectAll(".eTimeline").remove();
		
    //container for expanded timeline
		var eTimeline = main.append("g")
		  .attr("transform","translate("+0+","+ (cHeight+m[0]) + ")") //start @ x = 0, y = under cTimeline
    	.attr("width", w)
			.attr("height", eHeight)
			.attr("class", "eTimeline");
	  
    //draw the lane lines
		lanelines = eTimeline.append("g")
        .attr("class","laneContainer")
        .selectAll(".laneLine")
        .data(appTimesArray);
    
    lanelines.enter()
        .append("line")
			  .attr("x1", m[3])
			  .attr("y1", function(d, i) {return y(i);})
			  .attr("x2", w)
			  .attr("y2", function(d, i) {return y(i);})
			  .attr("stroke", "lightgray")
			  .attr("class","laneLine");
    
    lanelines.exit().remove();
    
  	//add text for app labels
  	elabels = eTimeline.append("g")
        .attr("class","labelContainer")
        .selectAll(".laneText")
        .data(appTimesArray);
    
  	elabels.enter()
        .append("text")
  			.text(function(d) {return d[1];})
        .attr("x",m[3])
        .attr("y", function(d, i) {return y(i)+12})
  			.attr("dy", ".5ex")
  			.attr("text-anchor", "start")
  			.style("font-size", "11px")
        .style("text-anchor","end")
  			.style("fill", function(d, i){return timelineColors[i%12];})
        .style("font-size", function(d) { return (Math.min( 12, Math.min(m[3], (m[3] - 8) / this.getComputedTextLength() * 24)))+ "px"; })  //scale font-size to fit in margin
  			.attr("class", "laneText");
    
    elabels.exit().remove();  
   
    //draw the bars
		ebars = eTimeline.append("g")
			  .attr("class","ebarContainer")
			  .selectAll(".ebar")
        .data(filteredApps, function(d){return d.id;});
      
		//draw the actual expanded timeline bars
		ebars.enter()
        .append("rect")
			  .attr("class","ebar")
        .attr("y", function(d) {return y(appTimesArray.findIndex(function(v){return v[0]==d.appid})) + eBarPadding;})
        .attr("x", function(d) {return x(d.start);})
        .style("fill", function(d) {return timelineColors[appTimesArray.findIndex(function(v){return v[0]==d.appid}) % 12]})
        .attr("width", function(d) {return ( x(d.end) - x(d.start)); }) //x = value of scaled(end) - scaled(start)
        .attr("height", barHeight)
        .on("mouseover", function(d){ barMouseover(d,raw,x); })
        .on("mousemove", function(d){ barMousemove(raw,x); })
        .on("mouseout", function(d){ barMouseout(raw,dateRange); });

	  ebars.exit().remove();
	}

	//draw moments [appevents] as circles 
//   function drawMoments(x,raw,dateRange){
//
//     var filteredApps = raw.filterApps(dateRange);
//
//     d3.selectAll(".mTimeline").remove();
//
//     var mTimeline = d3.select("svg").append("g")
//         .attr("class","mTimeline")
//         .selectAll("circle")
//         .data(filteredApps);
//
//     mTimeline.enter()
//       .append("circle")
//       .attr("cx", function(d) {return x(d.start);})
//       .attr("cy", 50)
//       .attr("r", 5)
//       .style("fill", function(d){return activityColors[d.appid % 6]})
//       .style("fill-opacity", 1.0)
//       .style("stroke", function(d){return activityColors[d.appid % 6]})
//       .style("stroke-width", 1.5)
//       .on("mouseover", function(d){ barMouseover(d); })
//       .on("mousemove", function(d){ barMousemove(); })
//       .on("mouseout", function(d){ barMouseout(); });
//
//     mTimeline.exit().remove();
//   }
	
	// draw keywords
	function drawKeywords(dateRange, raw){
		//100 most common english words

    console.log("drawKeywords");
    start = dateRange[0];
    end = dateRange[1];
    words = raw.filterWords(dateRange);
    apps = raw.filterApps(dateRange)
    windows = raw.windows;
    appTimesArray = raw.filterAppTimes(dateRange);


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
      'these','give','day','most','us'];

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
          // console.log(windows.length)
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
    else { d3.selectAll(".keyword").remove();}
	}

	//draw keyframes
	function drawKeyframes(dateRange,raw){
		
    start = dateRange[0];
    end = dateRange[1];
    numKeyframes = 12;
		keyframeFiles = []
		filteredImages = $.grep(raw.images, function(e){ return e.time >= start && e.time <= end; });
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


// -------------------------------------------------
// mouseover functions
// -------------------------------------------------
	function barMouseover(d,raw,x){    
	  // get divs ready for screenshot image
	  d3.selectAll('.keyframe').remove()
	  d3.select('#imageContainer').append('img')
	  	.attr('id', 'screenshot')
	  	.attr('name', 'screenshot')
    
	  tooltip.html(raw.apps[d.appid-1].name)
	  	.style("left", (d3.event.pageX) + "px")
	  	.style("top", (d3.event.pageY - 28) + "px")
	  	.style("visibility", "visible");
    
	  // get image
	  var t = x.invert(d3.event.pageX)
	  var result = $.grep(raw.images, function(e){ return e.time >= t; });
	  if (result.length >= 1)
    {
	  	$('#screenshot').attr("src", result[0].image)
	  }
	  else{$('#screenshot').attr("src","")}
	}
  
	function barMousemove(raw,x){
    
		// var b = d3.select("brush");
//     //set x scale depending on if brushing is used
//     if (b.empty()) {
//       var x = d3.scale.linear()
//       .domain([dayStart, dayEnd])
//       .range([m[3],w]);
//     }
//     else {
//       var x = d3.scale.linear()
//       .domain([minExtent, maxExtent])
//       .range([0, w]);
//     }

		// move tooltip
		tooltip.style("left", (d3.event.pageX) + "px")
			.style("top", (d3.event.pageY - 28) + "px");

		// update image
		var t = x.invert(d3.event.pageX)
		var result = $.grep(raw.images, function(e){ return e.time >= t && e.time<=t+60.0; }); //get only 60s worth of images
		if (result.length >= 1) {
			$('#screenshot').attr("src", result[0].image)
		}
		else{
			$('#screenshot').attr("src","")
		}
	}

	function barMouseout(raw,dateRange){
		
    dayStart = dateRange[0];
    dayEnd = dateRange[1]; 
    
    tooltip.style("visibility", "hidden");
		d3.select('#screenshot').remove()
		
				// decide what keyframes to draw based on whether brushing selected or not
    if(brush != null)
    {
        if (brush.extent()[1] != dayStart)
        {
			   drawKeyframes(brush.extent()[0], brush.extent()[1], raw);
        }
      }
    else     
      {drawKeyframes(dateRange,raw);}
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



//------ORIGINAL DATA SCRAPING FUNCTIONS
// -------------------------------------------------
// data scraping
// -------------------------------------------------
  // function getFilteredWords(start, end, words){
  //   filteredText = words.filter(function (el) {
  //     return (el.time <= end && el.time >= start);
  //   });
  //
  //   return filteredText
  // }
  //
  // function getTimelineData(start,end,data){
  //
  //   // filter app data for the date
  //   filteredWins = windowevents.filter(function (el) {
  //     return (el.start <= end && el.start >= start) ||
  //     (el.end <= end && el.end >= start);
  //   });
  //
  //   filteredUrls = urlevents.filter(function (el) {
  //     return (el.start <= end && el.start >= start) ||
  //     (el.end <= end && el.end >= start);
  //   });
  //
  //   //get most used windows
  //   wHist = {}
  //   for(i=0; i<filteredWins.length; i++){
  //     var time_diff = filteredWins[i].end - filteredWins[i].start
  //     if(time_diff > 0.0){
  //       wHist[filteredWins[i].windowid] ? wHist[filteredWins[i].windowid]+=time_diff : wHist[filteredWins[i].windowid]=time_diff;
  //     }
  //   }
  //
  //   wArray = [];
  //   for(var key in wHist){
  //     wArray.push([wHist[key], key, windows[key-1].name]);
  //   }
  //   wArray.sort(function(a, b) {return b[0] - a[0]});
  //
  //   //get the most used urls
  //   urlHist = {}
  //   for(i=0; i<filteredUrls.length; i++){
  //     var time_diff = filteredUrls[i].end - filteredUrls[i].start
  //     if(time_diff > 0.0){
  //       urlHist[filteredUrls[i].urlid] ? urlHist[filteredUrls[i].urlid]+=time_diff : urlHist[filteredUrls[i].urlid]=time_diff;
  //     }
  //   }
  //
  //   urlArray = [];
  //   for(var key in urlHist){
  //     urlArray.push([urlHist[key], key, urls[key-1].host, urls[key-1].url, urls[key-1].title]);
  //   }
  //   urlArray.sort(function(a, b) {return b[0] - a[0]});
  //
  //   //combine urls and windows to get duration of app use
  //   filteredApps = filteredWins.concat(filteredUrls);
  //
  //   // get a list of the apps used today, ordered by duration of use
  //   var appActiveTime = function(ae){
  //     var hist = {};
  //     for(i=0; i<ae.length; i++){
  //       var time_diff = ae[i].end - ae[i].start
  //       if(time_diff > 0.0){
  //         hist[ae[i].appid] ? hist[ae[i].appid]+=time_diff : hist[ae[i].appid]=time_diff;
  //       }
  //     }
  //     return hist;
  //   };
  //
  //   appTimes = appActiveTime(filteredApps)
  //
  //   appTimesArray = [];
  //   for(var key in appTimes){
  //     appTimesArray.push([key, apps[parseInt(key)-1].name, appTimes[key]]);
  //   }
  //   appTimesArray.sort(function(a, b) {return b[2] - a[2]});
  //
  //   // eTimeline.attr('height', barHeight*appTimesArray.length)
  //   main.attr("height", cHeight + barHeight*(appTimesArray.length+1) + m[0] + m[2])
  //
  //   // get most used applications in time slices
  //   appsByTime = calculateActivity(filteredApps, dayStart, dayEnd);
  //
  //   return [filteredApps, appTimesArray, appsByTime]
  // }
  //
  //---------ORIGINAL DATA HANDLING---------------------
  //       numApps = apps.length;
  //       windows = data["window"];
  //       windowevents = data ["windowevents"];
  //       urls = data["url"];
  //       urlevents = data["urlevents"];
  //       images = data["images"];
  //       words = getFilteredWords(dateRange[0], dateRange[1], json["words"]);
  //       timelineData = getTimelineData(dateRange[0], dateRange[1],data)
  //       filteredApps = timelineData[0]
  //       appTimesArray = timelineData[1]
  //       appsByTime = timelineData[2]
  
  
