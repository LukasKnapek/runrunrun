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
	calculateTime(data);
	calculateElevation(data);
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


		$('#time').text(timeCalculation(date, date2)); 
	}

	if(data.length > 1){
		length = data[1]["BasicData"]["Times"].length - 1;
		if(data[1]["BasicData"]["Times"][0] === ""){
			$('#time2').text("No time data");
		}
		else if (data[1]["BasicData"]["Times"][length] === "") {
			
			$('#time2').text("No time data");
		}
		else {
			var date3 = new Date(data[1]["BasicData"]["Times"][0]);
			var date4 = new Date(data[1]["BasicData"]["Times"][length]);


			$('#time2').text(timeCalculation(date3, date4)); 
		}
	}

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

		return time;

}

function calculateDistance(data){

}

function calculateElevation(data){
	
	var elevations = data[0]["BasicData"]["Elevations"];
	var total = 0;
	for(var i = 0; i < elevations.length; i++){
		total = total + parseInt(elevations[i]);
	}
	$('#elevation').text(Math.round(total / elevations.length)); 
	if(data.length > 1){
		elevations = data[1]["BasicData"]["Elevations"];
		total = 0;
		for(var i = 0; i < elevations.length; i++){
			total = total + parseInt(elevations[i]);
		}
		$('#elevation2').text(Math.round(total / elevations.length));
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
	//flyToPoint(data[0]["BasicData"]["Locations"][0]);
	//THERES AN ERROR WITH THIS LINE WHEN TRYING TO FLY TO THE POINT?? but only with multiple
	//BECAUSE THE FIRST ONE IS COMPLETELY BLANK?? WHYY??

	calculateData(data);
}

function mapTrack(pointLocations) {
	L.polyline(pointLocations, {color: 'red'}).addTo(map);
}

function flyToPoint(point) {
	map.flyTo(point);
}

