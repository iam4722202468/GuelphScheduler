#!/usr/bin/python
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select

from BeautifulSoup import BeautifulSoup
import time
import copy

import pymongo
from pymongo import MongoClient

client = MongoClient('localhost', 27017)
db = client.scheduleDB
cache = db.scrapeCache

def getDays(data):
	data = data.getText()[4:].encode("ascii").split(', ')
	return data

def convertTime(x):
	if(x[-2:] == "AM"):
		return x[:2] + x[-4:-2]
	else:
		if int(x[:2]) == 12:
			return x[:2] + x[-4:-2]
		else:
			return str(int(x[:2])+12) + x[-4:-2]

def getTimes(data):
	data = data.getText().encode("ascii").split(' - ')
	
	for index,x in enumerate(data):
		data[index] = convertTime(x)
	return data

def getPlace(data):
	return data.getText().encode("ascii")
	
def parseData(driver):
	data = driver.page_source.replace("a0:","").replace(":a0","").replace("a2:","").replace(":a2","").replace("a4:","").replace(":a4","").replace("a6:","").replace(":a6","").replace("a8:","").replace(":a8","").replace("a10:","").replace(":a10","")
	
	soup = BeautifulSoup(data)
	classData = {}
	lastFoundPlace = data.find('windowIdx')
	
	while True:
		foundPlace = data.find('<tr>', lastFoundPlace)
		
		if foundPlace == -1:
			for x in copy.deepcopy(classData):
				if classData[x] == []:
					del classData[x]
			return classData
		
		foundEnd = data.find('</tr>', foundPlace)
		lastFoundPlace = foundEnd
		allInfo = BeautifulSoup(data[foundPlace:foundEnd])
		
		spots = allInfo.findAll('p')[4].getText().encode("ascii")
		
		classID = allInfo.find('a', {"href":"javascript:void(0);"}) #url to get for extra Info
		courseCode = classID.getText()[:9].encode("ascii")
		sectionID = classID.getText().split("(")[1][:4].encode("ascii")
		credit = allInfo.findAll('p')[5].getText().encode("ascii")
		teacher = allInfo.findAll('p')[3].getText().encode("ascii")
		
		if courseCode[-1:] == '*':
			courseCode = courseCode[:-1]
		
		if not courseCode in classData:
			classData[courseCode] = []
		
		sectionData = {}
		scrapedInfo = [allInfo.find('div', {"class":"meet LEC"}), allInfo.find('div', {"class":"meet LAB"}), allInfo.find('div', {"class":"meet SEM"})]
		
		if scrapedInfo[0] != None and str(scrapedInfo[0]).find("(more)") != -1:
			tryToFind = cache.find_one({"Key": sectionID})
			if tryToFind != None:
				scrapedInfo = [None, None, None]
				
				for index in range(0, 2):
					if tryToFind['Data'][index] != None:
						#raise ValueError(BeautifulSoup(tryToFind['Data'][index]).findAll('div'))
						scrapedInfo[index] = BeautifulSoup(tryToFind['Data'][index]).findAll('div')[0]
			else:
				driver.execute_script(str(classID.get('onclick')))
				time.sleep(1.5)
				driver.switch_to_window(driver.window_handles[-1])
				
				newPage = driver.page_source.replace("a0:","").replace(":a0","").replace("a2:","").replace(":a2","").replace("a4:","").replace(":a4","").replace("a6:","").replace(":a6","").replace("a8:","").replace(":a8","").replace("a10:","").replace(":a10","")
				driver.close();
				driver.switch_to_window(driver.window_handles[0])
				allInfo = BeautifulSoup(newPage)
				scrapedInfo = [allInfo.find('div', {"class":"meet LEC"}), allInfo.find('div', {"class":"meet LAB"}), allInfo.find('div', {"class":"meet SEM"})]
				
				cache.insert_one({'Data':[str(scrapedInfo[0]), str(scrapedInfo[1]), str(scrapedInfo[2])], 'Key': sectionID})
		
		for meetIndex, x in enumerate(scrapedInfo):
			if x != None:
				tempData = {}
				
				for index,y in enumerate(x.findAll('div')):
					if(index == 0):
						tempData['Days'] = getDays(y)
					elif(index == 1):
						tempData['Times'] = getTimes(y)
					elif(index == 2):
						tempData['Place'] = getPlace(y)
				if meetIndex == 0:
					sectionData['LEC'] = tempData
				elif meetIndex == 1:
					sectionData['LAB'] = tempData
				elif meetIndex == 2:
					sectionData['SEM'] = tempData
					
				sectionData['ID'] = sectionID
				sectionData['Name'] = courseCode
				sectionData['Teacher'] = teacher
				sectionData['Spots'] = spots
		
		if sectionData != {}:
			classData[courseCode].append(sectionData)
