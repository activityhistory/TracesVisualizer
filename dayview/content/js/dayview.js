$(document).ready(function() {
	
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

	// set dimensions
	var m = [10, 0, 0, 100]; //top right bottom left margins
  var svgWidth = $("svg").width();
  var svgHeight = $("svg").height();
  var w =  svgWidth - m[1] ; //practical width of chart
	var barHeight = 24;
	var tickOffset = 10;
	var cHeight = 42; //height of compressed timeline
	var eHeight = 100; //height of expanded timeline
	var eBarPadding = 2;
	var transitionTime = 1000; //duration of d3 transitions
  var startCompressed = svgHeight-(barHeight*2);
  var startCompressedAxis = svgHeight-barHeight;
  var startExpanded = 100;
  var startExpandedAxis = 0;
  
  // set colors
  var timelineColors = ['#2F81AE','#A42510','#DE9D18','#256384','#C0400D',
              '#E1C020','#1C4766','#DD5C00','#96AC53','#132D45',
  '#DE7C0F','#599780'];
 
  // var activityColors = ['#4394F7','#60B632','#EE7C15','#A24DDA','#F2CC20',
  //   '#E4454C'];

	var activityColors = ['black','gray','black','gray','black','gray'];

  
  // draw containers
	var main = d3.select("svg")
		.attr("class", "main");

	// container for tooltip
	var tooltip = d3.select("body").append("div")
		.attr("class", "tooltip");

	// add jQuery datepicker
	$("#datepicker").datepicker({dateFormat: "MM d, yy", onSelect: function(){refresh();} });
	$("#datepicker").datepicker("setDate", "0");

  var myBrush = d3.svg.brush();
   
	//DRAW ALL THE THINGS!
	render();

  //get the date range from datepicker
	function render(type,extent) {
		
		var dateRange = getDate();
    if (extent) //override date with brush extent
    {
      console.log("extent" +extent);
      dateRange[0]= extent[0];
      dateRange[1]= extent[1];
    }
    
		var x = d3.scale.linear()
			.domain(dateRange)
      .range([m[3],w])
      .clamp(1);   //range clamping to prevent out of bounds for multiday events   
          
     $.get("extract", function(json){

        var data = json;
        var raw = new fullData(data);         
           
        if (raw.filterApps(dateRange).length > 0)//only draw if the date is not empty
        {  
          console.log("render DEFAULT");
		    	d3.selectAll("g").remove();
	        drawCompressed(x,raw,dateRange);
          drawActivity(x,raw,dateRange);
          drawExpanded(x,raw,dateRange);
          // drawMoments(x,raw,dateRange);
		       
          myBrush
            .x(x)
            .on("brush", function(){updateBrushed(raw);}); 
           
          var brushArea = d3.select("svg")
            .append("g")
            .attr("class", "brush")        
            .call(myBrush)
            .selectAll("rect")
            .attr("y", (svgHeight-(barHeight*2)))
            .attr("height", barHeight + 2);
        }
        else {
          d3.selectAll("g").remove();//remove all the gs... b/c it might be a date change
        }
          
        drawKeywords(dateRange, raw);
        drawKeyframes(dateRange,raw);
        renderDayStats(dateRange,raw);
     });//end d3.json	
	}

	//clear the brush and redraw default based on newly selected date. 
	function refresh(){
    console.log("refresh");
		d3.selectAll("brush").call(myBrush.clear());	 //reset svg brush
		render(); //now draw the things (again)
	}
	
	//get the date range from datepicker
	function getDate(){
		selectedDate = $( "#datepicker" ).datepicker("getDate");
		dayStart = Date.parse(selectedDate)/1000.0 //+ selectedDate.getTimezoneOffset()*60.0;
		dayEnd = dayStart + 24*60*60; //show one day of data
	 	return [dayStart,dayEnd];
	}

// -------------------------------------------------
// brush functions
// -------------------------------------------------
  // redraws expanded based on brush
  function updateBrushed(raw){
    console.log("updateBrushed");
   
    //get brush boundaries
    minExtent = myBrush.extent()[0];
    maxExtent = myBrush.extent()[1];
    
    if (minExtent==maxExtent){
      emptyDate= getDate();
      minExtent = emptyDate[0];
      maxExtent = emptyDate[1];
    }
  
    var xb = d3.scale.linear()
      .domain([minExtent, maxExtent])
      .range([m[3],w])
      .clamp(1);   //turn on range clamping to prevent out of bounds for multiday events    
      
    drawExpanded(xb,raw,[minExtent,maxExtent]); 
    drawKeywords([minExtent,maxExtent], raw);
    drawKeyframes([minExtent,maxExtent],raw);
    renderDayStats([minExtent,maxExtent],raw);
  }
  
// -------------------------------------------------
// timeline rendering functions
// -------------------------------------------------
	function drawAxis(type,starty,dateRange){
		var t1 = new Date(dateRange[0]*1000);
		var t2 = new Date(dateRange[1]*1000);

		var xAxisScale = d3.time.scale()
			.domain([t1, t2])
      .range([m[3], w]);   

		var xAxis = d3.svg.axis()
			.scale(xAxisScale)
			.orient("bottom");

    d3.selectAll(".e").remove();
    var axes = d3.select("svg")
      .append("g") //redraw the timeline axis
      .attr("class", ""+type+"axis")
			.attr("transform", "translate("+0+"," + starty + ")")
      .call(xAxis)
			.selectAll("text") //move text for tick marks
			.attr("y", tickOffset)
			.attr("x", 0)
			.style("text-anchor", "center")
			.style("fill", "#666");
	}
 	
	// draw compressed timeline
	function drawCompressed(x,raw,dateRange){			
		
    console.log("drawCompressed");		
    drawAxis("c ",startCompressedAxis,dateRange);
    
    //draw or re-draw timeline container
    d3.selectAll(".cTimeline").remove();
		
		var cTimeline = d3.select("svg")
			.append("g")
      .attr("transform", "translate(" + 0 + ","+startCompressed+")")//start @ x = 0, y = 5
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
		
    console.log("drawExpanded");
    drawAxis("e ",startExpandedAxis,dateRange);
    
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
  
	// draw keywords
	function drawKeywords(dateRange, raw){
		//100 most common english words

    console.log("drawKeywords");
    start = dateRange[0];
    end = dateRange[1];
    words = raw.filterWords(dateRange);
    apps = raw.apps;
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
    if(myBrush != null)
    {
        if (myBrush.extent()[1] != dayStart)
        {
			   drawKeyframes([myBrush.extent()[0], myBrush.extent()[1]], raw);
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




 
  
