from selenium import webdriver
driver = webdriver.PhantomJS(service_args=['--ignore-ssl-errors=true', '--ssl-protocol=any'])
driver.set_window_size(1120, 550)

postfields = {"VAR1":"F16", "DATE.VAR1":"", "DATE.VAR2":"", "LIST.VAR1_CONTROLLER":"LIST.VAR1", "LIST.VAR1_MEMBERS":"LIST.VAR1*LIST.VAR2*LIST.VAR3*LIST.VAR4", "LIST.VAR1_MAX":"5", "LIST.VAR2_MAX":"5", "LIST.VAR3_MAX":"5", "LIST.VAR4_MAX":"5", "LIST.VAR1_1":"", "LIST.VAR2_1":"", "LIST.VAR3_1":"", "LIST.VAR4_1":"", "LIST.VAR1_2":"", "LIST.VAR2_2":"", "LIST.VAR3_2":"", "LIST.VAR4_2":"", "LIST.VAR1_3":"", "LIST.VAR2_3":"", "LIST.VAR3_3":"", "LIST.VAR4_3":"", "LIST.VAR1_4":"", "LIST.VAR2_4":"", "LIST.VAR3_4":"", "LIST.VAR4_4":"", "LIST.VAR1_5":"", "LIST.VAR2_5":"", "LIST.VAR3_5":"", "LIST.VAR4_5":"", "VAR7":"", "VAR8":"", "VAR3":"", "VAR6":"", "VAR21":"", "VAR9":"", "SUBMIT_OPTIONS":""}

curURL = 'https://webadvisor.uoguelph.ca/WebAdvisor/WebAdvisor?&CONSTITUENCY=WBST&type=P&pid=ST-WESTS12A'
driver.get(curURL)

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

#driver.page_source.encode('utf-8').strip()
print driver.page_source
