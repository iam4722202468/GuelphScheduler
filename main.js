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

var interval = 1 * 60 * 1000;/*
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
		
		//PythonShell.run('./python/main.py', options, function(err, outputArray) {
		//	if (err) throw err;
			outputArray = ['57731d4b23fca520121ab123']
			
			if(outputArray !== null)
				doAlgorithm(outputArray[0], req.session['ID'], "", req, function(a) {
					res.send(a + "<br>" + toReturn);
				});
			else
				res.send("error, something went wrong");
			
		//});
	}

});

var server = app.listen(3128, function() {
	//sessionManager.removeOldSessions();
	
	var host = server.address().address
	var port = server.address().port
  
	console.log('Listening at http://%s:%s', host, port)
});
