var map = null;

$(document).ready(function(){
	$('#xmlUploadForm').submit(handleXMLUpload);
	map = initializeMap('mapid');
});

var initializeMap = function(divId) {
	var myMap = L.map(divId).setView([ 55.8577701, -4.2324588], 13);
	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
		maxZoom: 18,
		id: 'mapbox.streets',
		accessToken: 'pk.eyJ1IjoiY29uc3RlbGF2ZW50IiwiYSI6ImNqbmZ5aXV3bTBpcXQza3M1aTBiZDVxMjQifQ.c6HhtoZksNvG54HGI-3ttg'
	}).addTo(myMap);
	
	return myMap;
}

var handleXMLUpload = function(e) {
	e.preventDefault();
	getAndProcessXMLData();
}

var getAndProcessXMLData = function() {
	var file = $('#xmlFileInput').prop('files')[0];
	var reader = new FileReader();

	reader.onload = function() {
		var text = reader.result;
		var xml = $.parseXML(text);
		$xml = $(xml);
		
		parseData($xml);
	};
	reader.readAsText(file);
}

var parseData = function(xmlData) {
	var trailData = {};
	
	trailData.name = xmlData.find('trk').find('name').text();
	trailData.points = [];
	
	xmlData.find('trkpt').each(function(index) {
		var point = $(this);
		trailData.points.push({
			'lat': point.attr('lat'),
			'long': point.attr('lon'),
			'elev': point.find('ele').text()
		});
	});
	
	mapTrail(trailData);
}

var mapTrail = function(trailData) {
	var trailPoints = []
	
	$.each(trailData.points, function(index, point) {
		trailPoints.push([point.lat, point.long]);
	});
	
	L.polyline(trailPoints, {color: 'red'}).addTo(map);
	map.flyTo(trailPoints[0]);
}

