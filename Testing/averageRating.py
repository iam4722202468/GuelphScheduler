
#[3.2,	[[1, 0, 1, 0, 2],	[330, 0, 220, 180, 20],	[190, 120, 190, 120, 290],	[[230, 800, 530, 800, 430],	[350, 480, 350, 50, 680]]],	[[2, 1, 1], [0, 1, 0], [2, 1, 0], [0, 1, 1], [3, 0, 0]],	[False, False, False, False, False]]
#		consecutive classes							longest consecutive class time							time after counter	[1][3][1]															days without classes (true for no class)
#teacher rating				time between classes								time before counter	[1][3][0]							size slots of classes	

def calculateFinal(ratingsObject, weight, minMax):
	minMax = [[750, 1820], [1350, 2790], [1880, 2340], [580, 1270], [0, 4]]
	
	#averages:
		# average time between classes					0
	
	weight = [1, 1, 1, 1, 1, -1, 1, 1, 290, 1, -1, 1, 1]
	#								   longest class allowed
	calculated = 0
	
	#weight: importance of
		# High Teacher Rating							0
		# Class Time Start (see below)					1
		# 	-1 = early start | 1 = late start			2
		# Days Off										3
		# Short or long Class Times (see below)			4
		#	-1 = short classes | 1 = long classes		5
		# Time between classes							6
		#	-1 = lots of time | 1 = no time				7
		# Longest class time allowed					8
		# Class Time End (see below)					9
		# 	-1 = early end | 1 = late end				10
		# consecutive Classes (see below)				11
		# 	-1 = low | 1 = high							12
	
	if max(ratingsObject[1][2]) > weight[8]: #remove if classes exceed max time
		return -1
	
	#Time between classes
	maxSubMin = float(minMax[0][1]) - float(minMax[0][0])
	timeBetweenClasses = (maxSubMin - (sum(ratingsObject[1][1]) - float(minMax[0][0])))/maxSubMin*10
	
	if weight[7] == -1:
		timeBetweenClasses = 10 - timeBetweenClasses
	
	#time Before
	maxSubMin = float(minMax[1][1]) - float(minMax[1][0])
	timeBefore = (maxSubMin - (sum(ratingsObject[1][3][0]) - float(minMax[1][0])))/maxSubMin*10
	
	if weight[2] == 1:
		timeBefore = 10 - timeBefore
	
	#time After
	maxSubMin = float(minMax[2][1]) - float(minMax[2][0])
	
	timeAfter = (maxSubMin - (sum(ratingsObject[1][3][1]) - float(minMax[2][0])))/maxSubMin*10
	
	if weight[10] == 1:
		timeAfter = 10 - timeAfter
	
	#short or long classes
	
	maxSubMin = float(minMax[3][1]) - float(minMax[3][0])
	classLength = (maxSubMin - (sum(ratingsObject[1][2]) - float(minMax[3][0])))/maxSubMin*10
	
	if weight[7] == -1:
		classLength = 10 - classLength
	
	daysOffCounter = ratingsObject[3].count(True) / float(7) * 10
	
	#Consecutive Classes
	maxSubMin = float(minMax[4][1]) - float(minMax[4][0])
	consecutiveClasses = (maxSubMin - (sum(ratingsObject[1][0]) - float(minMax[4][0])))/maxSubMin*10
	
	if weight[12] == 1:
		consecutiveClasses = 10 - consecutiveClasses
		
	print consecutiveClasses
	
	calculated += weight[3] * daysOffCounter
	
	calculated += timeBetweenClasses * weight[6]
	calculated += timeBefore * weight[1]
	calculated += timeAfter * weight[9]
	calculated += consecutiveClasses * weight[11]
	
	calculated += weight[0] * ratingsObject[0] * 2 	#teacher rating
	
	return calculated
