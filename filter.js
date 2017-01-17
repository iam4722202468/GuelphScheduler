var mongodb = require('mongodb'),
	MongoClient = mongodb.MongoClient,
	url = 'mongodb://localhost:27017/scheduleDB';

days = ['Mon', 'Tues', 'Wed', 'Thur', 'Fri']

function safeRateObject(dataObject) {
	
	try {
		dataObject = JSON.parse(dataObject)
	} catch(err) {
		dataObject = {}
	}
	
	var newObject = {}
	var safeArrayRadio = ['classLength', 'endTime', 'startTime', 'timeBetween', 'consecutiveClasses']
	var safeArray = ['daysOff', 'teacherRating', 'longestClassAllowed'] //case for longestClasAllowed, 4 chars
	
	safeArrayRadio.forEach(function(key) {
		if(dataObject.hasOwnProperty(key+'Radio') && dataObject.hasOwnProperty(key)) {
			if(!isNaN(dataObject[key]) && dataObject[key].length == 1 &&
				(dataObject[key+'Radio'] == "0" || dataObject[key+'Radio'] == "1")) {
				if(dataObject[key+'Radio'] == "0")
					newObject[key] = [parseInt(dataObject[key]), -1]
				else
					newObject[key] = [parseInt(dataObject[key]), 1]
			} else {
				newObject[key] = [0, -1]
			}
		} else {
			newObject[key] = [0, -1]
		}
	});
	
	safeArray.forEach(function(key) {
		if(dataObject.hasOwnProperty(key)) {
			if(!isNaN(dataObject[key]) && (dataObject[key].length == 1 || (key == "longestClassAllowed" && dataObject[key].length <= 4 && dataObject[key].length > 0))) {
				newObject[key] = parseInt(dataObject[key])
			} else {
				newObject[key] = 0
			}
		} else {
			newObject[key] = 0
		}
	});
	
	orderedWeightObject = [
		newObject['teacherRating'],
		newObject['startTime'][0], newObject['startTime'][1], 
		newObject['daysOff'],
		newObject['classLength'][0], newObject['classLength'][1],
		newObject['timeBetween'][0], newObject['timeBetween'][1],
		newObject['longestClassAllowed'],
		newObject['endTime'][0], newObject['endTime'][1],
		newObject['consecutiveClasses'][0], newObject['consecutiveClasses'][1]
	];
	
	return orderedWeightObject
}

function stringToObject(dataString) {
	var dataArray = dataString.split(',')
	
	var currentObject = {'Days':[], 'Times':['','']}
	
	for(var x in dataArray)
	{
		if(dataArray[x].substr(0, 'starttime'.length) == 'starttime' && dataArray[x].length == "starttime:00:00".length)
		{
			checkTime = dataArray[x].substr('starttime:'.length, 5).split(':')
			
			if(parseInt(checkTime[0]) < 24 && parseInt(checkTime[1]) < 60) //ensures valid time
				currentObject['Times'][0] = dataArray[x].substr('starttime:'.length, 5)
		
		} else if(dataArray[x].substr(0, 'endtime'.length) == 'endtime' && dataArray[x].length == "endtime:00:00".length) {
			checkTime = dataArray[x].substr('endtime:'.length, 5).split(':')
			
			if(parseInt(checkTime[0]) < 24 && parseInt(checkTime[1]) < 60) //ensures valid time
				currentObject['Times'][1] = dataArray[x].substr('endtime:'.length, 5)
		
		} else
			for(dayName in days)
				if(dataArray[x] == days[dayName]+":true")
					currentObject['Days'].push(days[dayName])
	}
	return currentObject
}

function createFilterDBID(toParse, rateData, callback_) {
	var inBlocked = false
	var inUse = false
	
	var filterObject = {'Blocked':[], 'Needed':{}, 'Weight':safeRateObject(rateData)}
	var currentString = ""
	
	for(var x = 0; x < toParse.length; x++) {
		if(toParse[x] == '{') {
			currentString = ""
			inBlocked = true
		} else if(toParse[x] == '[') {
			currentString = ""
			inUse = true
		} else if(toParse[x] == '}') {
			filterObject['Blocked'].push(stringToObject(currentString))
			currentString = ""
		} else if(toParse[x] == ']') {
			filterObject['Needed'] = stringToObject(currentString)
			currentString = ""
		} else if(inBlocked || inUse)
			currentString += toParse[x]
	}
	
	MongoClient.connect(url, function (err, db) {
		if (err)
			console.log('Unable to connect to the mongoDB server. Error:', err);
		else {
			var collection = db.collection('filters');
			collection.insertOne(filterObject, function(err, result) {
				db.close();
				callback_(result.insertedId)
			});
		}
	});
}

module.exports.createFilterDBID = createFilterDBID
