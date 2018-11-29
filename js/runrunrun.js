var map = null;				// Stores the Leaflet map
var runs = [];				// Stores information about individual GPX files (runs)
var dataPollerInterval;

$(document).ready(function(){
	$('#xmlUploadForm').submit(xmlUploadHandler);
	map = initializeMap('mapid');
});

function initializeMap(divId) {
	var myMap = L.map(divId).setView([ 55.8577701, -4.2324588], 13);
	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
		maxZoom: 18,
		id: 'mapbox.streets',
		accessToken: 'pk.eyJ1IjoiY29uc3RlbGF2ZW50IiwiYSI6ImNqbmZ5aXV3bTBpcXQza3M1aTBiZDVxMjQifQ.c6HhtoZksNvG54HGI-3ttg'
	}).addTo(myMap);
	
	return myMap;
}

/* Load the XML as an object, pass it to parsing functions */
function getXMLData() {
	runs = [];
	var files = $('#xmlFileInput').prop('files');
	
	// Async function for reading and parsing the files
	var readerFunction = function() {
		var text = this.result;

		try {
			$('#warning').text('');
			var xml = $.parseXML(text);
		} catch(e) {
			$('#warning').text('The provided file is not a valid GPX file');
		}
		$xml = $(xml);
		
		dataLoadHandler($xml);
	};
	
	// Task JS with reading and parsing the files
	for (var i=0; i<files.length; i++) {
		var file = files.item(i);
		var reader = new FileReader();
		reader.onload = readerFunction;
		reader.onerror = function () {
			console.log("error!");
		}
		reader.readAsText(file);
	}
	
	// Periodically check whether all the files have been read/parsed
	dataPollerInterval = setInterval(function() { dataPoller(files.length); }, 500);
}


/** Event handlers **/

/* Check whether all n runs have been parsed and loaded form uploaded files */
function dataPoller(nRuns) {
	// Wait until we have the same number of runs as the number of uploaded files
	if (runs.length == nRuns) {
		clearInterval(dataPollerInterval);
		visualizeData(runs);
	}
}

/* Once a file is uploaded, prevent default submit action and process it instead */
function xmlUploadHandler(e) {
	e.preventDefault(this);
	getXMLData();
}

/* Once XML from the file is loaded, parse the data to a dictionary */
function dataLoadHandler(xmlData) {
	var basicParsedData = {
		"Locations": [], // [lat, long]
		"Elevations": [],
		"Times": [],
		"TrackName": ""
	};
	
	// Garmin-specific extension data
	var garminParsedData = {
		"ATemperatures": [],
		"WTemperatures": [],
		"Depths": [],
		"HeartRates": [],
		"Cadences": []
	};

	basicParsedData = parseTrackDetails(xmlData);
	basicParsedData["TrackName"] = parseName(xmlData);
	garminParsedData = parseGarminExtensions(xmlData);

	
	// Store the data
	parsedData = {
		"BasicData": basicParsedData,
		"GarminData": garminParsedData
	}
	runs.push(parsedData);
}


/** Parsing methods **/

function parseName(xml) {
	var name = xml.find('trk').find('name').text();
	if (!name) name = "Unnamed track";

	return name;
}

function parseTrackDetails(xml) {
	var trackPoints = {
		"Locations": [],
		"Elevations": [],
		"Times": []
	}
	
	xml.find('trkpt').each(function(index) {
		var point = $(this);
		
		trackPoints["Locations"].push([point.attr('lat'), point.attr('lon')]);
		trackPoints["Elevations"].push(point.find('ele').text());
		trackPoints["Times"].push(point.find('time').text());
	});
	
	return trackPoints;
}

function parseGarminExtensions(xml) {
	var extensions = {
		"ATemperatures": [],
		"WTemperatures": [],
		"Depths": [],
		"HeartRates": [],
		"Cadences": []
	};
		
	xml.find("ns3\\:TrackPointExtension").each(function(index) {
		var point = $(this);
		extensions["ATemperatures"].push(point.find('ns3\\:atemp').text());
		extensions["WTemperatures"].push(point.find('ns3\\:wtemp').text());
		extensions["Depths"].push(point.find('ns3\\:depth').text());
		extensions["HeartRates"].push(point.find('ns3\\:hr').text());
		extensions["Cadences"].push(point.find('ns3\\:cad').text());
	});
	
	// Check for non-occuring extensions and mark then as null
	for (var e in extensions) {
		if (extensions[e].join('') == '') extensions[e] = null;
	}
	return extensions;
}

/** Calculation functions **/
function calculateData(data){
	var distance = calculateDistance(data);
	var time = calculateTime(data);
	var speed = calculateSpeed(data, distance, time);
	calculateElevation(data);
	calculateHeart(data);
	mapGraph(data);
	if (data.length > 1){
		mapGraph2(data);
		findWinner(speed);
	}
}



function mapGraph(data) {

	var elevations = [];
	for(var i=0; i<data[0]["BasicData"]["Elevations"].length; i++){
		var point = {y:parseInt(data[0]["BasicData"]["Elevations"][i])};
		elevations.push(point);
	}

	var heartrate = [];
	for(var i=0; i<data[0]["GarminData"]["HeartRates"].length; i++){
		var point = {y:parseInt(data[0]["GarminData"]["HeartRates"][i])};
		heartrate.push(point);
	}
     
	var chart = new CanvasJS.Chart("chartContainer", {
		animationEnabled: true,
		theme: "light2",
		title:{
			text: "Statistics"
		},
		axisY:{
			includeZero: false
		},
		legend: {
			cursor: "pointer",
			verticalAlign: "top",
			horizontalAlign: "center",
			dockInsidePlotArea: true,
		},
		data: [{        
			type: "line",     
			name: "Elevation",
			showInLegend: true,  
			dataPoints: elevations
		},
		{        
			type: "line",     
			name: "HeartRate",
			showInLegend: true,  
			dataPoints: heartrate
		}]
		});
		chart.render();

	}        

function mapGraph2(data) {

	var elevations = [];
	for(var i=0; i<data[data.length-1]["BasicData"]["Elevations"].length; i++){
		var point = {y:parseInt(data[data.length-1]["BasicData"]["Elevations"][i])};
		elevations.push(point);
	}

	var heartrate = [];
	for(var i=0; i<data[data.length-1]["GarminData"]["HeartRates"].length; i++){
		var point = {y:parseInt(data[data.length-1]["GarminData"]["HeartRates"][i])};
		heartrate.push(point);
	}
     
	var chart = new CanvasJS.Chart("chartContainer2", {
		animationEnabled: true,
		theme: "light2",
		title:{
			text: "Statistics"
		},
		axisY:{
			includeZero: false
		},
		axisX:{
			title: "Data Point"
		},
		legend: {
			cursor: "pointer",
			verticalAlign: "top",
			horizontalAlign: "center",
			dockInsidePlotArea: true,
		},
		data: [{        
			type: "line",     
			name: "Elevation",
			showInLegend: true,  
			dataPoints: elevations
		},
		{        
			type: "line",     
			name: "HeartRate",
			showInLegend: true,  
			dataPoints: heartrate
		}]
		});
		chart.render();

	}        


function calculateTime(data){

	
	var length = data[0]["BasicData"]["Times"].length - 1;
	if(data[0]["BasicData"]["Times"][0] === ""){
		$('#time').text("No time data");
	}
	else if (data[0]["BasicData"]["Times"][length] === "") {
		
		$('#time').text("No time data");
	}
	else {
		var date = new Date(data[0]["BasicData"]["Times"][0]);
		var date2 = new Date(data[0]["BasicData"]["Times"][length]);

		var timefirst = timeCalculation(date, date2);
		$('#time').text(timefirst[0]); 
	}
	var time2;
	if(data.length > 1){
		length = data[data.length-1]["BasicData"]["Times"].length - 1;
		if(data[data.length-1]["BasicData"]["Times"][0] === ""){
			$('#time2').text("No time data");
		}
		else if (data[data.length-1]["BasicData"]["Times"][length] === "") {
			
			$('#time2').text("No time data");
		}
		else {
			var date3 = new Date(data[data.length-1]["BasicData"]["Times"][0]);
			var date4 = new Date(data[data.length-1]["BasicData"]["Times"][length]);

			var timelast = timeCalculation(date3, date4);
			$('#time2').text(timelast[0]); 

		}
		time2 = timelast[1];
	}

	return [timefirst[1], time2];

}

function timeCalculation(date, date2){

	var mins = 0;
	var hours = 0;
	var secs = 0;

	if(date2.getMinutes() < date.getMinutes() && date2.getSeconds() < date.getSeconds()){
		hours = date2.getHours() - date.getHours() - 1;
		mins = date2.getMinutes() - date.getMinutes() + 60 - 1;
	
		seconds = date2.getSeconds() - date.getSeconds() + 60;
	}
	else if(date2.getMinutes() < date.getMinutes()){
		hours = date2.getHours() - date.getHours() - 1;
		mins = date2.getMinutes() - date.getMinutes() + 60;
	
		seconds = date2.getSeconds() - date.getSeconds();
	}
	else if(date2.getSeconds() < date.getSeconds()){
		hours = date2.getHours() - date.getHours();
		mins = date2.getMinutes() - date.getMinutes() - 1;
	
		seconds = date2.getSeconds() - date.getSeconds() + 60;
	}
	else {

		hours = date2.getHours() - date.getHours();
		mins = date2.getMinutes() - date.getMinutes();
		seconds = date2.getSeconds() - date.getSeconds();
	}

	var time = hours.toString() + " hours " + mins.toString() + " minutes " + seconds.toString() + " seconds";


	var totaltime = (hours * 60 * 60) + (mins * 60) + seconds;

	return [time, totaltime];

}

function calculateDistance(data){

	var distances = data[0]["BasicData"]["Locations"];

	var latlng1 = L.latLng(distances[0][0],distances[0][1]);
	var latlng2 = L.latLng(distances[distances.length-1][0],distances[distances.length-1][1])

	var distance = latlng1.distanceTo(latlng2);
	
	$('#distance').text(Math.round(distance) + "m");

	if(data.length > 1){
		distances = data[data.length-1]["BasicData"]["Locations"];

		latlng1 = L.latLng(distances[0][0],distances[0][1]);
		latlng2 = L.latLng(distances[distances.length-1][0],distances[distances.length-1][1])

		var distancelast = latlng1.distanceTo(latlng2);
	
		$('#distance2').text(Math.round(distance) + "m");
	
	}
	return [distance, distancelast];

	//latlng.distanceTo(lat,long)

}

function calculateSpeed(data, distance, time){
	var firstspeed = distance[0] / time[0];
	$('#speed').text(firstspeed.toFixed(2) + "m/s");
	
	if(data.length > 1){

		var lastspeed = distance[1] / time[1];
		$('#speed2').text(lastspeed.toFixed(2) + "m/s");
		return [firstspeed, lastspeed];
	}
	return firstspeed;

	
}

function findWinner(speed){
	if(speed[0] > speed[1]){
		$('#winner').text("Left Runner!");
	}
	else if (speed[1] > speed[0]) {
		$('#winner').text("Right Runner!");
	}
	else {
		$('#winner').text("Neither, It's a Draw!");
	}
}

function calculateElevation(data){
	
	var elevations = data[0]["BasicData"]["Elevations"];
	var total = 0;
	for(var i = 0; i < elevations.length; i++){
		total = total + parseInt(elevations[i]);
	}
	$('#elevation').text(Math.round(total / elevations.length)); 
	if(data.length > 1){
		elevations = data[data.length-1]["BasicData"]["Elevations"];
		total = 0;
		for(var i = 0; i < elevations.length; i++){
			total = total + parseInt(elevations[i]);
		}
		$('#elevation2').text(Math.round(total / elevations.length));
	}

}

function calculateHeart(data){
	
	var heartrates = data[0]["GarminData"]["HeartRates"];
	var total = 0;
	for(var i = 0; i < heartrates.length; i++){
		total = total + parseInt(heartrates[i]);
	}
	$('#heartrate').text(Math.round(total / heartrates.length)); 
	if(data.length > 1){
		heartrates = data[data.length-1]["GarminData"]["HeartRates"];
		total = 0;
		for(var i = 0; i < heartrates.length; i++){
			total = total + parseInt(heartrates[i]);
		}
		$('#heartrate2').text(Math.round(total / heartrates.length));
	}

}




/** Visualisations **/

function visualizeData(data) {
	// See dataLoadHandler for the structure of the data
	
	// Map the first run
	for(var i = 0; i < data.length; i++){
		mapTrack(data[i]["BasicData"]["Locations"]);
	}

	// Fly to the first point location of the first run
	flyToPoint(data[0]["BasicData"]["Locations"][0]);

	calculateData(data);
}

function mapTrack(pointLocations) {
	L.polyline(pointLocations, {color: 'red'}).addTo(map);
}

function flyToPoint(point) {
	map.flyTo(point);
}

