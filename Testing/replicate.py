import urllib, urllib2, cookielib
import json

cookies = cookielib.LWPCookieJar()
handlers = [
    urllib2.HTTPHandler(),
    urllib2.HTTPSHandler(),
    urllib2.HTTPCookieProcessor(cookies)
    ]
    
opener = urllib2.build_opener(*handlers)

def fetch(uri, curData, curMethod):
	req = urllib2.Request(uri)
	req.get_method = lambda: curMethod
	return opener.open(req)
    
def getToken():
	cookieInfo = ""
	tokenName = ""
	for cookie in cookies:
		if cookie.name == "LASTTOKEN":
			tokenName = cookie.value
		cookieInfo += cookie.name + "=" + cookie.value + "; "
	return {"info":cookieInfo, "name":tokenName}

opener.addheaders.append(('Cookie', '9879409250=5082368436*Y*202330560547814; LASTTOKEN=9879409250'))

curURL = 'https://webadvisor.uoguelph.ca/WebAdvisor/WebAdvisor?TOKENIDX=9879409250&CONSTITUENCY=WBST&type=P&pid=ST-WESTS12A'
res = fetch(curURL, {}, "GET")

print res.read()
