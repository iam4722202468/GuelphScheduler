from operator import itemgetter

from averageRating import calculateFinal

days = ['Mon', 'Tues', 'Wed', 'Thur', 'Fri'] #removed saturday and sunday

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
				timeBetweenClasses[i] += int(x[0]) - int(lastIndex[1]) #accounts for 10 minutes between classes
				
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

with open('workfile', 'r') as content_file:
	content = content_file.read()

a = eval(content)

ratings = []

dayScheduleObject = organizeClassDays(a)

ratings.append(3.2)
ratings.append(mostConsecutiveClasses(dayScheduleObject))
ratings.append(rateClassLength(dayScheduleObject))
ratings.append(getDaysOff(dayScheduleObject))
print calculateFinal(ratings, [], [])
