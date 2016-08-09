import urllib2
import time
#https://www.youtube.com/watch?v=O_eSGhRCdgo
import pymongo
from pymongo import MongoClient

from operator import itemgetter

from finalRating import calculateFinal

client = MongoClient('localhost', 27017)
db = client.scheduleDB
cache = db.teacherCache

days = ['Mon', 'Tues', 'Wed', 'Thur', 'Fri']

def organizeClassDays(scheduleObject):
	allClasses = []
	for searchDay in days:
		classesThatDay = []
		
		for x in scheduleObject:
			for classType in x:
				if classType == 'LEC' or classType == 'LAB' or classType == 'SEM':
					for dayInClass in x[classType]['Days']:
						if dayInClass == searchDay:
							classesThatDay.append(x[classType]['Times'])
		
		allClasses.append(sorted(classesThatDay, key=itemgetter(0)))
	return allClasses

def mostConsecutiveClasses(daysScheduleObject):
	mostConsecutiveClassesThatDay = [0,0,0,0,0]
	timeBetweenClasses = [0,0,0,0,0]
	longestConsecutiveClassTime = [0,0,0,0,0]
	
	timeBeforeCounter = [0,0,0,0,0] #do time by day, this way you can tell where the single day classes are
	timeAfterCounter = [0,0,0,0,0]
	
	startConsecutiveTime = 0
	
	for i,classesThatDay in enumerate(daysScheduleObject): #doesn't account for long single labs (those are normally necessary)
		isConsecutive = False
		currentCounter = 0
		lastIndex = None
		
		for x in classesThatDay:
			if lastIndex == None:
				lastIndex = x
				longestConsecutiveClassTime[i] = int(x[1]) - int(x[0])
			else:
				timeBetweenClasses[i] += int(x[0]) - int(lastIndex[1]) #includes 10 minutes between classes
				
				if int(x[0]) - int(lastIndex[1]) == 10:
					if currentCounter == 0:
						startConsecutiveTime = int(lastIndex[0])
					
					if int(x[1]) - startConsecutiveTime > longestConsecutiveClassTime[i]:
						longestConsecutiveClassTime[i] = int(x[1]) - startConsecutiveTime
					
					isConsecutive = True
					currentCounter += 1
					
					if mostConsecutiveClassesThatDay[i] < currentCounter:
							mostConsecutiveClassesThatDay[i] = currentCounter
				else:
					if currentCounter != 0:
						currentCounter = 0
						isConsecutive = False
				
				lastIndex = x
		
		if len(classesThatDay) > 0:
			timeBeforeCounter[i] = int(classesThatDay[0][0]) - 800
			timeAfterCounter[i] = 2200 - int(classesThatDay[-1][1])
	
	return [mostConsecutiveClassesThatDay, timeBetweenClasses, longestConsecutiveClassTime, [timeBeforeCounter, timeAfterCounter]]

def getDaysOff(daysScheduleObject):
	daysOff = [True, True, True, True, True]
	
	for i,x in enumerate(daysScheduleObject):
		if len(x) > 0:
			daysOff[i] = False
	return daysOff

def rateClassLength(daysScheduleObject):
	#return class length category object per day
		#[ <short 90>, <medium 120>, <other> ]
	
	totalLengthByDay = []
	
	for day in daysScheduleObject:
		today = [0,0,0]
		
		for classTimes in day:
			if int(classTimes[1]) - int(classTimes[0]) == 90:
				today[0] += 1
			elif int(classTimes[1]) - int(classTimes[0]) == 120:
				today[1] += 1
			else:
				today[2] += 1
			
		totalLengthByDay.append(today)
	return totalLengthByDay
	
def rateTeacher(scheduleObject):
	ratingArray = []
	
	if scheduleObject['Teacher'] == "TBA  TBA":
		return -1
	for x in scheduleObject['Teacher'].split(", "):
		
		tryToFind = cache.find_one({"teacherName": x})
		
		doRequest = False
		
		if tryToFind != None:
			if time.time() - tryToFind['updateTime'] >= 24*60*60: #update if it hasn't been done in 24 hours
				doRequest = True
			else:
				ratingArray.append(tryToFind['rating'])
		else:
			doRequest = True
		
		if doRequest:
			oldX = x
			x = "+".join(x.replace(".", "").split(" "))
			
			requestURL = "http://search.mtvnservices.com/typeahead/suggest/?solrformat=true&rows=10&callback=callback&q=" + x + "+AND+schoolid_s%3A1426&defType=edismax&qf=teacherfullname_t^1000+autosuggest&bf=pow(total_number_of_ratings_i%2C2.1)&sort=&siteName=rmp&rows=20&start=0&fl=pk_id+teacherfirstname_t+teacherlastname_t+total_number_of_ratings_i+averageratingscore_rf+schoolid_s"
			
			response = urllib2.urlopen(requestURL)
			html = response.read()
			teacherObject = eval(html[9:-3])
			teacherRating = teacherObject['response']['docs'][0]['averageratingscore_rf']
			ratingArray.append(teacherRating)
			
			cache.update({'teacherName':oldX}, {'$set':{'rating':teacherRating, 'teacherName': oldX, 'updateTime':time.time()}}, upsert=True)
	
	if len(ratingArray) > 0: #incase something goes wrong it won't crash
		return sum(ratingArray) / float(len(ratingArray))
	else:
		return -1

def getIndividualRatings(scheduleObject): #get all ratings
	#teacher, <insert other ratings>
	ratings = []
	
	teacherTotalRating = 0
	totalTeacherCount = 0 #count non TBA teachers
	for x in scheduleObject:
		if x['rateData'][0] != -1:
			teacherTotalRating += x['rateData'][0]
			totalTeacherCount += 1
	
	if totalTeacherCount == 0:
		ratings.append(-1)
	else:
		ratings.append(teacherTotalRating/float(totalTeacherCount))
	
	dayScheduleObject = organizeClassDays(scheduleObject)
	
	ratings.append(mostConsecutiveClasses(dayScheduleObject))
	ratings.append(rateClassLength(dayScheduleObject))
	ratings.append(getDaysOff(dayScheduleObject))
	
	return ratings

def getRatings(classData, weight): #could make faster by only including what is needed
	minMax = [[-1,-1], [-1,-1], [-1,-1], [-1,-1], [-1,-1]]
	
	for x in classData:
		for className in x:
			className['rateData'] = [rateTeacher(className)]
		
		x.append({'ratings':getIndividualRatings(x)})
		
		#time between classes
		currentSums = [sum(x[-1]['ratings'][1][1]), sum(x[-1]['ratings'][1][3][0]), sum(x[-1]['ratings'][1][3][1]), sum(x[-1]['ratings'][1][2]), sum(x[-1]['ratings'][1][0])]
		
		# class time inbetween, time before, time after
		
		for i,x in enumerate(currentSums):
			if minMax[i][0] == -1 or minMax[i][0] > x:
				minMax[i][0] = x
			if minMax[i][1] == -1 or minMax[i][1] < x:
				minMax[i][1] = x
	
	for x in classData:
		x.append({'finalRating':calculateFinal(x[-1]['ratings'], weight, minMax)})
	
	#order classData
	classData.sort(key=lambda x: x[-1]['finalRating'], reverse=True)
	
	newObject = []
	
	counter = 0
	lastRating = -1
	
	for x in classData:
		if counter == 10:
			break
		else:
			if lastRating == -1 or x[-1]['finalRating'] != lastRating or lastRating == 0 or lastRating == classData[-1][-1]['finalRating']: #ensure schedules aren't too similar, or no rating system
				del x[-2]
				newObject.append(x)
				counter += 1
				lastRating = x[-1]['finalRating']
	
	return newObject
