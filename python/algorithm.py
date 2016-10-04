import copy
import sys
from scrape import convertTime
from bson.objectid import ObjectId

import pymongo
from pymongo import MongoClient
from rate import getRatings

from threading import Thread

client = MongoClient('localhost', 27017)
db = client.scheduleDB

sessions = db.tempSessions
filters = db.filters

data = sessions.find_one({"_id": ObjectId(sys.argv[1])})

if sys.argv[2] != "":
	currentFilter = filters.find_one({"_id": ObjectId(sys.argv[2])})
	
	filters.remove({"_id": ObjectId(sys.argv[2])})
	
	starttime = currentFilter['Needed']['Times'][0].replace(":","")
	endtime = currentFilter['Needed']['Times'][1].replace(":","")
	
	validDays = currentFilter['Needed']['Days']
	blockedTimes = {}
	blockedTimes['Blocked'] = currentFilter['Blocked']
	
	weightObject = currentFilter['Weight']
else:
	starttime = ""
	endtime = ""
	validDays = []
	blockedTimes = {'Blocked':[]}
	weightObject = [0, 0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, -1] #default
	
workingCounter = 0;
classType = ['LEC', 'SEM', 'LAB']

classData = data['Classes']

workingSchedules = []

def checkLimits(data, teacher, className):
	if validDays != []:
		for dayName in data['Days']:
			if not dayName in validDays:
				return False
	
	if starttime != "" and int(data['Times'][0]) < int(starttime):
		return False
	if endtime != "" and int(data['Times'][1]) > int(endtime):
		return False
	return True

def getSchedules(classData, daysOn):
	generateSchedules(classData)
	return workingCounter

def generateSchedules(data):
	generateIndividual(data, [], {})

def compareBlocked(classes):
	for x in blockedTimes['Blocked']:
		if not compareTo(x,classes):
			return False
	return True

def compareTo(classOne, classTwo): #return true if it works
	for indexOne,findDayOne in enumerate(classOne['Days']):
		for indexTwo,findDayTwo in enumerate(classTwo['Days']):
			if findDayOne == findDayTwo:
				#print classOne['Times'], classTwo['Times']
				
				if classOne['Times'][0] == classTwo['Times'][0]:
					return False
				
				if classOne['Times'][0] < classTwo['Times'][0]: #['1000', '1120'] ['1050', '1720']
					if classOne['Times'][1] > classTwo['Times'][0]:
						return False
				
				if classTwo['Times'][0] < classOne['Times'][0]: #['1050', '1720'] ['1000', '1120']
					if classTwo['Times'][1] > classOne['Times'][0]:
						return False
	
	#print classTwo
	#print "_______________________________________"
	return True

def checkConflicts(data):
	toCompare = []
	for toSlice in range(0, len(data)):
		toCompare = []
		for x in data[toSlice]:							#get info that it's going to compare to
			for y in classType:
				if y in x:
					if not (compareBlocked(data[toSlice][y]) and checkLimits(data[toSlice][y], data[toSlice]['Teacher'], data[toSlice]['Name'])):
						return False
					toCompare.append(data[toSlice][y])
		
		for classInfo in data[toSlice+1:]:				#loop through and check to see if it works
			for x in classType:
				if x in classInfo:
					#print classInfo[x]
					#print toCompare
					for comparing in toCompare:
						if not (compareTo(comparing, classInfo[x])):
							return False
	return True

generatingThreads = []

def generateIndividual(data, generated, newElement):
	global workingCounter
	if(newElement != {}):
		generated.append(newElement)
	
	if len(generated) >= len(data):
		if(checkConflicts(generated)):
			workingSchedules.append(generated)
			workingCounter += 1
		#if checkConflicts(generated):
		#	print generated
		#	print "__________________________________"
		return
	
	currentKey = data.keys()[len(generated)]
	
	while data[currentKey] == []:
		del data[currentKey]
		currentKey = data.keys()[len(generated)]
	
	for x in (data[currentKey]):
		if(checkConflicts(generated)): #check for conflicts before going deeper
			if len(generated) == 1:
				generatingThreads.append(Thread(target = generateIndividual, args = (data,copy.deepcopy(generated),x, )))
				generatingThreads[-1].start()
			else:
				generateIndividual(data,copy.deepcopy(generated),x)

#raise ValueError(classData)

print getSchedules(classData, [])
print getRatings(workingSchedules, weightObject)
