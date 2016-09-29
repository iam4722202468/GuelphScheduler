var express = require('express')
var app = express()
var bodyParser = require('body-parser');
var PythonShell = require('python-shell');
var ejs = require('ejs');
var fs = require('fs');

var expressSession = require('express-session');

app.use(expressSession({
  secret: 'asdf123',
  resave: false,
  saveUninitialized: true
}))

var sessionManager = require('./session.js')
var filter = require('./filter.js')

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('./'));

var currentSessions = {}
var currentlyInUse = []

var interval = 1 * 60 * 1000; /*
setInterval(function() {
	sessionManager.checkTimeout(currentSessions)
}, interval);*/

app.get('/', function (req, res) {
  res.sendFile("index.html", { root: __dirname });
});

function doAlgorithm(DBID, SessionID, filterID, req, callback_) {
	options = {
		args: [DBID, filterID]
	};
	
	currentSessions[SessionID]['DBID'] = DBID;
	
	if(currentlyInUse.indexOf(req.session['ID']) > -1) //don't let user spam refresh button (uses a lot of cpu...)
	{
		console.log("you are being hacked by " + req.headers['x-forwarded-for'])
		callback_('1337 haxor') //actually being hacked if this is sent
	}
	else
	{
		currentlyInUse.push(req.session['ID'])
		
		PythonShell.run('./python/algorithm.py', options, function(err, returnData) {
			if (err) throw err;
			
			if(filterID != "") {
				var index = currentlyInUse.indexOf(req.session['ID'])
				currentlyInUse.splice(index, 1);
				
				callback_(returnData);
			} else {
				fs.readFile('editor.html', 'utf-8', function(err, content) {
					if (err) {
						var index = currentlyInUse.indexOf(req.session['ID'])
						currentlyInUse.splice(index, 1);
						
						callback_('error occurred');
						return;
					}
					
					var renderedHtml = ejs.render(content, {schedules:returnData, SessionID:SessionID});
					
					var index = currentlyInUse.indexOf(req.session['ID'])
					currentlyInUse.splice(index, 1);
					
					callback_(renderedHtml);
				});
			}
		});
	}
}

app.post('/rebuild', function(req,res) {
	//create filter db and get ID
	
	filter.createFilterDBID(req.body.criteria, req.body.rateData, function(filterID) {
		sessionManager.generateSchedules(req.body.SessionID, function(data) {
			if(currentSessions[req.body.SessionID] === undefined)
				res.send("Invalid SessionID")
			else {
				var toReturn = sessionManager.getInfo(req, currentSessions);
				doAlgorithm(currentSessions[req.body.SessionID]['DBID'], req.session['ID'], filterID, req, function(a) {
					res.send(a);
				});
			}
		});
	});
})

app.post('/', function(req,res) {
	argsArray = []
	
	var toReturn = sessionManager.getInfo(req, currentSessions)
	
	if(Object.keys(req.body).length > 29)
		res.send("ERROR: Too much information sent");
	else {
		for(var x in req.body)
			argsArray.push(x + ":" + req.body[x])
		
		var options = {
			args: [req.session['ID'], JSON.stringify(argsArray)]
		};
		
		PythonShell.run('./python/main.py', options, function(err, outputArray) {
			if (err) throw err;
		//	outputArray = ['57731d4b23fca520121ab123']
			
			if(outputArray !== null)
				doAlgorithm(outputArray[0], req.session['ID'], "", req, function(a) {
					res.send(a + "<br>" + toReturn);
				});
			else
				res.send("error, something went wrong");
			
		});
	}

});

//{"SessionID" : "HXT207UGT7", "Classes" : { "CHEM*1040" : [ 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "8886", 	"Spots" : "12 / 22", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", "Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Wed" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "8891", 	"Spots" : "6 / 22", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Wed" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "8892", 	"Spots" : "5 / 24", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1430", 	"1720" ] }, 	"ID" : "8884", "Spots" : "1 / 22", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "8895", 	"Spots" : "10 / 12", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "8896", 	"Spots" : "12 / 24", 	"Teacher" : "TBA  TBA" } ], "MATH*1200" : [ 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Tues", "Thur" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "MATH*1200", 	"LAB" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"1230", 	"1320" ] }, 	"ID" : "7057", 	"Spots" : "7 / 200", 	"Teacher" : "M. Demers" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "MATH*1200", 	"LAB" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"1230", 	"1320" ] }, 	"ID" : "7058", 	"Spots" : "20 / 200", 	"Teacher" : "M. Demers, K. Levere" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1430", 	"1520" ] }, 	"Name" : "MATH*1200", 	"LAB" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"1230", 	"1320" ] }, 	"ID" : "7059", 	"Spots" : "10 / 185", 	"Teacher" : "K. Levere, M. Demers" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1430", 	"1520" ] }, 	"Name" : "MATH*1200", 	"LAB" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"1230", 	"1320" ] }, 	"ID" : "7060", 	"Spots" : "35 / 185", 	"Teacher" : "K. Levere" } ], "CIS*1500" : [ 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Tues", "Thur" ], 	"Times" : [ 	"1600", 	"1720" ] }, 	"Name" : "CIS*1500", 	"LAB" : { 	"Place" : "THRN, Room 2418", 	"Days" : [ 	"Mon" ], 	"Times" : [ 	"0830", 	"1020" ] }, 	"ID" : "5717", 	"Spots" : "1 / 40", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1600", 	"1720" ] }, 	"Name" : "CIS*1500", 	"LAB" : { 	"Place" : "THRN, Room 2418", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"1230", 	"1420" ] }, 	"ID" : "5718", 	"Spots" : "17 / 40", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1600", 	"1720" ] }, 	"Name" : "CIS*1500", 	"LAB" : { 	"Place" : "THRN, Room 2418", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"0830", 	"1020" ] }, 	"ID" : "5719", 	"Spots" : "1 / 40", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1600", 	"1720" ] }, 	"Name" : "CIS*1500", 	"LAB" : { 	"Place" : "THRN, Room 2418", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1230", 	"1420" ] }, 	"ID" : "5722", 	"Spots" : "2 / 40", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1600", 	"1720" ] }, 	"Name" : "CIS*1500", 	"LAB" : { 	"Place" : "THRN, Room 2418", 	"Days" : [ 	"Mon" ], 	"Times" : [ 	"1030", 	"1220" ] }, 	"ID" : "5723", 	"Spots" : "3 / 40", 	"Teacher" : "TBA  TBA" } ], "SPAN*1100" : [ 	{ 	"LEC" : { 	"Place" : "ANNU, Room 156", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1130", 	"1220" ] }, 	"Name" : "SPAN*1100", 	"LAB" : { 	"Place" : "MCKN, Room 020", 	"Days" : [ 	"Mon" ], 	"Times" : [ 	"0930", 	"1020" ] }, 	"ID" : "7995", 	"Spots" : "1 / 23", 	"Teacher" : "R. Gomez" }, 	{ 	"LEC" : { 	"Place" : "ANNU, Room 156", 	"Days" : [ 	"Mon", "Wed" ], 	"Times" : [ 	"1130", 	"1220" ] }, 	"Name" : "SPAN*1100", 	"LAB" : { 	"Place" : "ANNU, Room 002", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"1130", 	"1220" ] }, 	"ID" : "7998", 	"Spots" : "5 / 22", 	"Teacher" : "R. Gomez" }, 	{ 	"LEC" : { 	"Place" : "ANNU, Room 156", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1330", 	"1420" ] }, 	"Name" : "SPAN*1100", 	"LAB" : { 	"Place" : "MCKN, Room 020", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"1330", 	"1420" ] }, 	"ID" : "7999", 	"Spots" : "5 / 23", 	"Teacher" : "R. Gomez" }, 	{ 	"LEC" : { 	"Place" : "ANNU, Room 156", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1330", 	"1420" ] }, 	"Name" : "SPAN*1100", 	"LAB" : { 	"Place" : "ANNU, Room 002", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"1330", 	"1420" ] }, 	"ID" : "8001", "Spots" : "1 / 22", 	"Teacher" : "R. Gomez" } ] } }
//{ "_id" : ObjectId("5784413f23fca57de15130bc"), "SessionID" : "G07XKK5YO0", "Classes" : { "CHEM*1040" : [ 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1630", "1720" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2102", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5535", 	"Spots" : "1 / 23", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Mon", "Wed", 	"Fri" ], 	"Times" : [ 	"1630", 	"1720" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2102", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"1430", 	"1720" ] }, 	"ID" : "5537", "Spots" : "1 / 23", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1630", 	"1720" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2102", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "5538", 	"Spots" : "1 / 23", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1630", "1720" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2102", 	"Days" : [ 	"Wed" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5540", 	"Spots" : "1 / 24", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Mon", "Wed", 	"Fri" ], 	"Times" : [ 	"1630", 	"1720" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2102", 	"Days" : [ 	"Wed" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5541", "Spots" : "1 / 23", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1630", 	"1720" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2102", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5544", 	"Spots" : "1 / 23", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1630", "1720" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2102", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1430", 	"1720" ] }, 	"ID" : "5547", 	"Spots" : "1 / 23", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Mon", "Wed", 	"Fri" ], 	"Times" : [ 	"1630", 	"1720" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2102", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "5549", "Spots" : "1 / 23", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1630", 	"1720" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2102", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5550", 	"Spots" : "1 / 23", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1300", "1420" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2103", 	"Days" : [ 	"Mon" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "5556", 	"Spots" : "1 / 24", 	"Teacher" : "R. Reed" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Tues", "Thur" ], 	"Times" : [ 	"1300", 	"1420" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2103", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5557", 	"Spots" : "1 / 23", 	"Teacher" : "R. Reed" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1300", 	"1420" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2103", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"1430", 	"1720" ] }, 	"ID" : "5560", 	"Spots" : "1 / 23", 	"Teacher" : "R. Reed" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1300", 	"1420" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2103", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "5561", 	"Spots" : "2 / 22", 	"Teacher" : "R. Reed" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1300", 	"1420" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2103", 	"Days" : [ 	"Wed" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5564", 	"Spots" : "1 / 23", 	"Teacher" : "R. Reed" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1300", 	"1420" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2103", 	"Days" : [ 	"Wed" ], 	"Times" : [ 	"1430", 	"1720" ] }, 	"ID" : "5565", 	"Spots" : "2 / 23", 	"Teacher" : "R. Reed" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1300", 	"1420" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2103", 	"Days" : [ 	"Wed" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "5567", 	"Spots" : "1 / 23", 	"Teacher" : "R. Reed" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1300", 	"1420" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2103", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1430", 	"1720" ] }, 	"ID" : "5572", 	"Spots" : "2 / 22", 	"Teacher" : "R. Reed" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1300", 	"1420" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2103", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "5574", 	"Spots" : "1 / 23", 	"Teacher" : "R. Reed" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1300", 	"1420" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2103", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5576", 	"Spots" : "1 / 23", 	"Teacher" : "R. Reed" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1300", 	"1420" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2104", 	"Days" : [ 	"Mon" ], 	"Times" : [ 	"1430", 	"1720" ] }, 	"ID" : "5580", 	"Spots" : "1 / 23", 	"Teacher" : "R. Reed" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2104", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5585", 	"Spots" : "1 / 23", 	"Teacher" : "A. Houmam" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2104", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"1430", 	"1720" ] }, 	"ID" : "5586", "Spots" : "1 / 23", 	"Teacher" : "A. Houmam" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2104", 	"Days" : [ 	"Wed" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5590", 	"Spots" : "1 / 24", 	"Teacher" : "A. Houmam" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2104", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5597", 	"Spots" : "1 / 23", 	"Teacher" : "A. Houmam" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2104", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1430", 	"1720" ] }, 	"ID" : "5598", 	"Spots" : "1 / 23", 	"Teacher" : "A. Houmam" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2104", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5603", 	"Spots" : "1 / 23", 	"Teacher" : "A. Houmam" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", "Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2104", 	"Days" : [ 	"Mon" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5604", 	"Spots" : "1 / 23", 	"Teacher" : "A. Houmam" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1130", 	"1220" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2105", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "5616", 	"Spots" : "10 / 22", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1130", 	"1220" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2105", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5622", 	"Spots" : "2 / 22", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", 	"Wed", "Fri" ], 	"Times" : [ 	"1130", 	"1220" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2105", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1430", 	"1720" ] }, 	"ID" : "5624", 	"Spots" : "1 / 24", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1130", 	"1220" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2105", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "5625", 	"Spots" : "1 / 24", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1130", 	"1220" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2105", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "5628", 	"Spots" : "1 / 23", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Mon", 	"Wed", "Fri" ], 	"Times" : [ 	"1130", 	"1220" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2103", 	"Days" : [ 	"Mon" ], 	"Times" : [ 	"1430", 	"1720" ] }, 	"ID" : "5630", 	"Spots" : "1 / 23", 	"Teacher" : "J. Prokipcak" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Mon" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "8890", 	"Spots" : "24 / 24", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Mon" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "8885", "Spots" : "24 / 24", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "8886", 	"Spots" : "1 / 23", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Tues" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "8889", 	"Spots" : "3 / 23", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Wed" ], 	"Times" : [ 	"0830", 	"1120" ] }, 	"ID" : "8891", 	"Spots" : "1 / 23", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1430", 	"1720" ] }, 	"ID" : "8884", 	"Spots" : "1 / 23", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", "Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "8895", 	"Spots" : "1 / 23", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "CHEM*1040", 	"LAB" : { 	"Place" : "SSC, Room 2101", 	"Days" : [ 	"Thur" ], 	"Times" : [ 	"1900", 	"2150" ] }, 	"ID" : "8896", 	"Spots" : "1 / 24", 	"Teacher" : "TBA  TBA" } ], "MATH*1200" : [ 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "MATH*1200", 	"LAB" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"1230", 	"1320" ] }, 	"ID" : "7057", 	"Spots" : "45 / 250", 	"Teacher" : "M. Demers" }, 	{ 	"LEC" : { 	"Place" : "WMEM, Room 103", 	"Days" : [ 	"Tues", "Thur" ], 	"Times" : [ 	"1730", 	"1850" ] }, 	"Name" : "MATH*1200", 	"LAB" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"1230", 	"1320" ] }, 	"ID" : "7058", 	"Spots" : "46 / 250", 	"Teacher" : "M. Demers, K. Levere" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Mon", 	"Wed", 	"Fri" ], 	"Times" : [ 	"1430", 	"1520" ] }, 	"Name" : "MATH*1200", 	"LAB" : { 	"Place" : "ROZH, Room 104", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"1230", 	"1320" ] }, 	"ID" : "7060", 	"Spots" : "2 / 185", 	"Teacher" : "K. Levere" } ], "CIS*1500" : [ 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1600", 	"1720" ] }, 	"Name" : "CIS*1500", 	"LAB" : { 	"Place" : "THRN, Room 2418", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"0830", 	"1020" ] }, 	"ID" : "5714", 	"Spots" : "1 / 40", 	"Teacher" : "TBA  TBA" }, 	{ 	"LEC" : { 	"Place" : "ROZH, Room 101", 	"Days" : [ 	"Tues", 	"Thur" ], 	"Times" : [ 	"1600", 	"1720" ] }, 	"Name" : "CIS*1500", 	"LAB" : { 	"Place" : "THRN, Room 2418", 	"Days" : [ 	"Fri" ], 	"Times" : [ 	"1230", 	"1420" ] }, 	"ID" : "5718", 	"Spots" : "1 / 40", 	"Teacher" : "TBA  TBA" } ] } }

var server = app.listen(3128, function() {
	//sessionManager.removeOldSessions();
	
	var host = server.address().address
	var port = server.address().port
  
	console.log('Listening at http://%s:%s', host, port)
});
