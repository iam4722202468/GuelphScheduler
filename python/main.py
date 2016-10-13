#!/usr/bin/python
import sys
from selenium import webdriver

from BeautifulSoup import BeautifulSoup
from scrape import parseData

import pymongo
from pymongo import MongoClient

client = MongoClient('localhost', 27017)
db = client.scheduleDB
sessions = db.tempSessions

#raise ValueError(sys.argv)

#python main.py {"course 0":"CIS","level 0":"","number 0":"1500","section 0":"","mon":"on","tues":"on","wed":"on","thu":"on","starttime":"06:00","endtime":"13:00"}
allInfo = eval(sys.argv[2])

mainArgs = ["course", "level", "number", "section"]
#10, 11, ...

sortedInfo = {}

for x in allInfo:
	for y in mainArgs:
		if x.split(" ")[0] == y:
			keyName = x.split(" ")[1][:x.split(" ")[1].find(":")]
			if not keyName in sortedInfo:
				sortedInfo[keyName] = []
			sortedInfo[x.split(" ")[1][:x.split(" ")[1].find(":")]].append(x[len(y) + len(keyName) + 2:])

driver = webdriver.PhantomJS(service_args=['--ignore-ssl-errors=true', '--ssl-protocol=any'])
driver.set_window_size(1120, 550)

curURL = 'https://webadvisor.uoguelph.ca/WebAdvisor/WebAdvisor?&CONSTITUENCY=WBST&type=P&pid=ST-WESTS12A'
driver.get(curURL)

postfields = {"VAR1":"W17", "DATE.VAR1":"", "DATE.VAR2":"", "LIST.VAR1_CONTROLLER":"LIST.VAR1", "LIST.VAR1_MEMBERS":"LIST.VAR1*LIST.VAR2*LIST.VAR3*LIST.VAR4", "LIST.VAR1_MAX":"5", "LIST.VAR2_MAX":"5", "LIST.VAR3_MAX":"5", "LIST.VAR4_MAX":"5", "LIST.VAR1_1":"", "LIST.VAR2_1":"", "LIST.VAR3_1":"", "LIST.VAR4_1":"", "LIST.VAR1_2":"", "LIST.VAR2_2":"", "LIST.VAR3_2":"", "LIST.VAR4_2":"", "LIST.VAR1_3":"", "LIST.VAR2_3":"", "LIST.VAR3_3":"", "LIST.VAR4_3":"", "LIST.VAR1_4":"", "LIST.VAR2_4":"", "LIST.VAR3_4":"", "LIST.VAR4_4":"", "LIST.VAR1_5":"", "LIST.VAR2_5":"", "LIST.VAR3_5":"", "LIST.VAR4_5":"", "VAR7":"", "VAR8":"", "VAR3":"", "VAR6":"", "VAR21":"", "VAR9":"", "SUBMIT_OPTIONS":""}

try:
    for index, x in enumerate(sortedInfo):
        postfields["LIST.VAR1_"+str(index+1)] = sortedInfo[x][0]
        postfields["LIST.VAR2_"+str(index+1)] = sortedInfo[x][1]
        postfields["LIST.VAR3_"+str(index+1)] = sortedInfo[x][2]
        postfields["LIST.VAR4_"+str(index+1)] = sortedInfo[x][3]

    #http://stackoverflow.com/questions/133925/javascript-post-request-like-a-form-submit#133997
    driver.execute_script('''function post(path, params) {
        method = "post"

        var form = document.createElement("form");
        form.setAttribute("method", method);
        form.setAttribute("action", path);

        for(var key in params) {
            if(params.hasOwnProperty(key)) {
                var hiddenField = document.createElement("input");
                hiddenField.setAttribute("type", "hidden");
                hiddenField.setAttribute("name", key);
                hiddenField.setAttribute("value", params[key]);
                form.appendChild(hiddenField);
            }
        }

        var hiddenField = document.createElement("input");
        hiddenField.setAttribute("type", "submit");
        hiddenField.setAttribute("value", "Submit");
        hiddenField.setAttribute("class", "findme");
        form.appendChild(hiddenField);

        document.body.appendChild(form);
    } post("''' + driver.current_url + '''", ''' + str(postfields) + ''')''')

    driver.find_elements_by_class_name("findme")[0].click()

    print str(sessions.insert_one({'SessionID':str(sys.argv[1]), 'Classes':parseData(driver)}).inserted_id)
        
    driver.quit()
except:
	driver.quit()
