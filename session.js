var mongodb = require('mongodb'),
	MongoClient = mongodb.MongoClient,
	url = 'mongodb://localhost:27017/scheduleDB';
			
var timeoutTime = 20 * 60 * 1000;
function checkTimeout(currentSessions) {
	for(x in currentSessions)
		if(Date.now() - currentSessions[x]['LastActionTime'] > timeoutTime)
		{
			MongoClient.connect(url, function (err, db) {
				if (err)
					console.log('Unable to connect to the mongoDB server. Error:', err);
				else {
					var collection = db.collection('tempSessions');
					
					var query = {}
					query['SessionID'] = x;
					
					collection.remove(query);
					db.close();
				}
			});
			
			delete currentSessions[x];
			console.log("deleted " + x);
		}
}

function generateHash() {
	var hash = "";
	for(var x = 0; x <= 9; x++) {
		currentChar = Math.floor(Math.random() * 36);
		if(currentChar > 9)
			hash += String.fromCharCode(currentChar + 55);
		else
			hash += currentChar;
		
		if(x == 9)
			return hash;
	}
}

function getInfo(req, currentSessions) {
	var sessionID = req.csession['ID'];
	
	if(!sessionID || !(sessionID in currentSessions)) {
		sessionID = generateHash()
		
		currentSessions[sessionID] = {};
		//currentSessions[sessionID]['Count'] = 1;
		currentSessions[sessionID]['LastActionTime'] = Date.now();
		
		req.csession['ID'] = sessionID;
		
		req.csflush(); //sync cookies make sure to call before response
		//return "Your New Hash is " + sessionID;
		return ""
	} else {
		//currentSessions[sessionID]['Count'] += 1;
		currentSessions[sessionID]['LastActionTime'] = Date.now();
		
		req.csflush();
		//return "You have visited this page " + currentSessions[sessionID]['Count'].toString()
		return ""
	}
}

function generateSchedules(SessionID, callback_) {
	MongoClient.connect(url, function (err, db) {
		if (err)
			console.log('Unable to connect to the mongoDB server. Error:', err);
		else {
			var collection = db.collection('tempSessions');
			
			collection.find({'SessionID':SessionID}).toArray(function(err, docs){
				db.close();
				if(docs[0] !== undefined)
					callback_(docs[0].Classes);
				else
					callback_("{}");
			});
		}
	});
}

/*function IDtoDBID(SessionID, callback_) {
	MongoClient.connect(url, function (err, db) {
		if (err)
			console.log('Unable to connect to the mongoDB server. Error:', err);
		else {
			var collection = db.collection('tempSessions');
			
			collection.find({'SessionID':SessionID}).toArray(function(err, docs){
				db.close();
				if(docs[0] !== undefined)
					callback_(docs[0].id_);
				else
					callback_("None");
			});
		}
	});
}*/ //not needed anymore

function removeOldSessions() {
	MongoClient.connect(url, function (err, db) {
		if (err)
			console.log('Unable to connect to the mongoDB server. Error:', err);
		else {
			var collection = db.collection('tempSessions');

			collection.drop();
			db.close();
		}
	});
}

module.exports.getInfo = getInfo
module.exports.checkTimeout = checkTimeout;
module.exports.removeOldSessions = removeOldSessions;
module.exports.generateSchedules = generateSchedules;
