function sendMessage (messagePayload, messageHandler){
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, messagePayload, messageHandler);
    });
}

var Rdfazer = {
    currentRange:null, 
    baseURI:"http://localhost",
    //* stores the current HTML page in the rdfazer component for storing it as a source when needed. TODO use and store the HTML
    storeCurrentHTML: function() {
	this.destroy();
        this.currentHTML = document.getElementsByTagName("html")[0].outerHTML;

	var locallink = document.createElement('a');
	locallink.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.currentHTML));
	locallink.setAttribute('download', 'rdfazer.html');
	locallink.click();
    },
    
    init: function(){
        var rdfazerIF = $("#rdfazerInterface")[0];
        if(rdfazerIF){
            return rdfazerIF;
        }else{
            rangy.init();

            this.addCss();
            this.addInterface();
	    this.addSettings();
        }
    },
    addInterface: function(){
        var self=this;
        $("body").append("<div id='rdfazerInterface'></div>");
        $('#rdfazerInterface').load(chrome.extension.getURL("interface.html"),function(){
            var rdfazer= $("#rdfazerInterface");
            $(".rdfazerhead button.switch").click(function(){
                rdfazer.toggleClass("left");
            });
            $(".rdfazerhead button.open").click(function(){
                rdfazer.toggleClass("open");
            });
            $(".rdfazerhead button.remove").click(function(){
                self.destroy();
            });
            $(".rdfazerhead button.save").click(function(){
                self.storeCurrentHTML();
            });
            self.addDialog();
            self.showHighlights();
        });
    },

    addSettings:function(){
	var self = this;
	this.configBak = $.extend(true,{},this.config);
	this.loadConfig(function(){
	    $("body").append("<div id='rdfazer-settings' title='Settings'></div>");
	    var settings = $("#rdfazer-settings");
	    var dialog = settings.load(chrome.extension.getURL("settings.html"),function(){
		settings.dialog({
                    autoOpen: false,
                    height: 500,
                    width: 720,
                    modal: true,
		    buttons:[{text:"Save", click:function(){
			var config = self.readConfig();
			self.saveConfig(config);

			dialog.dialog('close');
		    }},{text:"Remove config", click:function(){
			var config = self.readConfig();
			var profileNumber = 0;
			for (var prop in config.profiles){
			    profileNumber++;
			}
			if(profileNumber<=1){
			    self.message("error","Can't remove the final profile");
			}else{
			    var profile= config.profile;
			    self.removeProfile(profile);
			}
			dialog.dialog('close');
		    }},{text:"Reset", click:function(){
			self.resetConfig();
			dialog.dialog('close');
		    }}],
		    dialogClass: "rdfazersettingswrap"
		});
		
		$("#rdfazer-settings select.rdfazer-configs").change(function(){
		    var selectedConfig=$(this).val();
		    self.fillSettings(selectedConfig);
		});

		$(".rdfazerhead button.settings").click(function(){
		    self.reloadSettingsDialog();
		    dialog.dialog( "open" );
		});		

		$("#rdfazer-settings button.rdfazer-new-config").click(function(){
		    self.newConfigDialog();
		});

	    });
	});
    },

    newConfigDialog:function(){
	var self = this;
	var dialog=$("<div class='rdfazer-new-config-dialog' title='Copy config'><div><span class='label'>Name</span><input class='rdfazer-new-config-text' type='text'></div><div><span class='label'>Copy</span><select class='rdfazer-configs'></select></div></div>");
	$("body").append(dialog);
	dialog.dialog({
	    height: 220,
	    width: 500,
	    modal: true,
	    buttons: [{text:"Ok", click:function(){
		var copy=$(this).find("select").val();
		var name=$(this).find("input").val();
		if(!name || name == ""){
		    name = "new profile";
		}
		
		var count = 0;
		var userName = name;
		while(self.config.profiles[name]){
		    count++;
		    name = userName + count;
		}
		self.config.profiles[name]=$.extend(true,{},self.config.profiles[copy]);
		self.config.profile = name;
		self.fillSettings();
		dialog.dialog("destroy").remove();
	    }}],
	    close:function(){
		dialog.dialog("destroy").remove();
	    },
	    dialogClass: "rdfazer-new-configwrap"
	});
	var select= $(".rdfazer-new-config-dialog select.rdfazer-configs");
	for(var profile in self.config.profiles){
	    select.append("<option value='"+profile+"'"+(self.config.profile == profile?" selected":"")+" >"+profile+"</option>");
	}

    },

    readConfig:function(){
	var config = $.extend(true, {}, this.config);
	config.sparql = $("#rdfazer-settings input[name='sparql']").val();
	config.profile = $("#rdfazer-settings select.rdfazer-configs").val();
	
	var selectedSpecs = $("#rdfazer-settings .configspecs .prop");
	for(var i=0, prop; prop = selectedSpecs[i]; i++){
	    var name = $(prop).find(".label").text();
	    var value = $($(prop).find("input")[0] || $(prop).find("textarea")[0]).val();
	    
	    config.profiles[config.profile][name]=value;
	}
	return config;
    },

    reloadSettingsDialog:function(){
	$("#rdfazer-settings input[name='sparql']").val(this.config.sparql);
	this.fillSettings();
    },

    fillSettings:function(selectedProfile){
	var selectedProfile = selectedProfile || this.config.profile;
	var profileSelect = $("#rdfazer-settings select.rdfazer-configs");
	profileSelect.empty();
	$("#rdfazer-settings .configspecs").empty();
	for(var profile in this.config.profiles){
	    profileSelect.append("<option value='"+profile+"'"+(selectedProfile == profile?" selected":"")+">"+profile+"</profile>");
	}
	
	var active = this.config.profiles[selectedProfile];
	for(var prop in active){
	    if(prop != "storedInfo"){
		var info = $("<div class='prop'><span class='label'>"+prop+"</span></div>");
		if(prop == "query"){
		    var val = active[prop];
		    //best effort
		    var lines = val.split(/\r\n|\r|\n/).length +2;
		    info.append($("<textarea class='propvalue' rows='"+lines+"'>"+val+"</textarea>"));
		}else{
		    info.append($("<input class='propvalue' type='text' value=\""+active[prop]+"\">"));
		}
		$("#rdfazer-settings .configspecs").append(info);		
	    }
	}

    },

    destroy:function(){
        $('#rdfazerInterface').remove();
        $('#rdfazerdialog').dialog('destroy').remove();
        $('#rdfazer-settings').dialog('destroy').remove();
    },

    addHighlightToSelection:function(name,url,uris){
        var highlighter = rangy.createHighlighter();
        var localHighlightUri = "_:rdfazer"+(new Date()).getTime();

        highlighter.addClassApplier(rangy.createCssClassApplier("highlight", {
            ignoreWhiteSpace: true,
            elementTagName: "a",
            elementProperties: {
                href: url,
                onclick: function() {
                    var highlight = highlighter.getHighlightForElement(this);
                    if (window.confirm("Delete this highlight (URL " + url + ")?")) {
                        highlighter.removeHighlights( [highlight] );
                    }
                    return false;
                }
            },
            elementAttributes: {
                about: localHighlightUri,
                title: name
            }
        }));

        highlighter.highlightRanges("highlight",[this.currentRange]);

        this.addHighlightedConcept(localHighlightUri,uris);
    },

    addHighlightedConcept:function(localHighlightUri,uris){
        var conceptsDiv = $("#rdfazerconcepts");
        if(conceptsDiv.length==0){
            $("body").append("<div id='rdfazerconcepts' style='display:none'></div>");
            conceptsDiv = $("#rdfazerconcepts");
        }

        conceptsDiv.append("<div about='"+localHighlightUri+"'><div rel='"+this.baseURI+"/highlightFor'></div></div>");
        
        var relation = $("#rdfazerconcepts div[about='"+localHighlightUri+"'] div[rel='"+this.baseURI+"/highlightFor']");

        for(var i=0, uri; uri=uris[i]; i++){
	    var about = $("<div about='"+uri+"'></div>");
            relation.append(about);
        }

        this.showHighlights();
    },

    readAndAddHighlight:function(){
        var name = $("#rdfazerdialog input[name='label']").val();
        var url = $("#rdfazerdialog input[name='href']").val();
        var uriInputs = $("#rdfazerdialog input.uri");
        var uris = [];
        for(var i=0,uri;uri=uriInputs[i]; i++){
            uris.push($(uri).val());
        }
        
        this.addHighlightToSelection(name,url,uris);
    },

    addDialog:function(){
        var self=this;
	$("body").append("<div id='rdfazerdialog' title='Add new highlight'></div>");

        $('#rdfazerdialog').load(chrome.extension.getURL("dialog.html"),function(){
	    $(".rdfazer-dialog-tabs").tabs();

	    var dialog = $( "#rdfazerdialog" ).dialog({
                autoOpen: false,
                height: 500,
                width: 720,
                modal: true,
		dialogClass: "rdfazerdialogwrap",
                close: function() {
                    var uriInputs = $("#rdfazerdialog input.uri");
                    for(var i=1, uri; uri=uriInputs[i];i++){
                        $(uri).remove();
                    }
                }
            });
            
            $(".rdfazerhead button.highlight").click(function(){
                self.currentRange = rangy.getSelection().getRangeAt(0);
		$("#rdfazer-search input").val(self.currentRange.toString());
		if($("#rdfazer-search").attr("aria-expanded")=="true"){
		    setTimeout(function(){
			$("#rdfazer-search input").focus();
		    },100);
		}else{
		    setTimeout(function(){
			$("#rdfazer-manual input[name='label']").focus();
		    },100);
		}
                dialog.dialog( "open" );
            });
	    
	    $("#rdfazerdialog button.highlight").click(function(){
                self.readAndAddHighlight();
                dialog.dialog( "close" );
	    });

	    $("#rdfazerdialog input[name='href']").change(function(){
		var url=$(this).val();
		url = decodeURIComponent(url);
		var uri = url.substring(url.lastIndexOf("http:"));
		if(uri && uri.length>0){
		    $("#rdfazerdialog input.uri").first().val(uri);		    
		}
	    });

            $("#rdfazerdialog button.adduri").click(function(){
                $("#rdfazerdialog .uris").append('<input type="text" value="http://localhost/show-concept/1" class="uri text ui-widget-content ui-corner-all">');
            });
            $("#rdfazerdialog button.removeuri").click(function(){
                $("#rdfazerdialog .uris").children().last().remove();
            });

	    self.setupSearch(dialog);
        });
    },

    addCss:function(){
        var css = document.createElement("link");
        css.href = chrome.extension.getURL("contentscript.css");
        css.type = "text/css";
        css.rel = "stylesheet";
	var jqueryUI = document.createElement("link");
	jqueryUI.href = chrome.extension.getURL("lib/jquery-ui.css");
        jqueryUI.type = "text/css";
        jqueryUI.rel = "stylesheet";
        document.getElementsByTagName("head")[0].appendChild(css).appendChild(jqueryUI);
    },
    
    showHighlights:function(){
        var content = $("#rdfazerInterface .rdfazercontent");
        content.empty();
        
        var highlights = $(".highlight[about]");
	// keep track of where the highlights are and do not overlap
	var highlightSpots = [];
        
        for(var i=0, highlight; highlight=highlights[i]; i++){
            var node = $(highlight);
            var highlightURI = node.attr("about");
            var urinodes = $("#rdfazerconcepts div[about='"+highlightURI+"'] div[rel='http://localhost/highlightFor'] > div[about]");
            var uris = [];
            for(var j=0, uri; uri=urinodes[j]; j++){
                uris.push($(uri).attr("about"));
            }
	    var tag=this.buildHighlightTag(content,node,uris,highlightURI,highlightSpots);          
        }

    },

    buildHighlightTag:function(content,node,uris,highlightURI,highlightSpots){
	var tag=$("<a class='highlightTag' highlight= '"+highlightURI+"' href='"+node.attr("href")+"'>"+uris.join(", ")+"</a>");

	var top = node.offset().top;
	var takenSpot = null;
	while(takenSpot = this.highlightSpotTaken(highlightSpots,top)){
	    top = takenSpot.top + takenSpot.height + 3;
	}

        tag.css({ top: top+"px" });

	tag.hover(function(){
            var highlightURI=$(this).attr("highlight");
            $(".highlight[about='"+highlightURI+"']").addClass("hover");
        },function(){
            var highlightURI=$(this).attr("highlight");
            $(".highlight[about='"+highlightURI+"']").removeClass("hover");
        });

        content.append(tag);
	highlightSpots.push({top:top, height:tag.height()});
    },
    // really inefficient, but there should not be that many highlights, right...
    highlightSpotTaken:function(highlightSpots,top){
	for(var i = 0, spot; spot = highlightSpots[i]; i++){
	    if(spot.top<= top && spot.height>= top-spot.top){
		return spot;
	    }
	}
	return false;
    },

    setupSearch:function(dialog){
	var self = this;
	var search= $("#rdfazer-search .buttons input").keypress(function(e){
	    if(e.which==13){
		self.doSearch($(this).val());
	    }
	});

	$("#rdfazer-search button.highlight-searches").click(function(){
	    self.highlightAcceptedSearches();
            dialog.dialog( "close" );
	});
	$("#rdfazer-search button.clear-searches").click(function(){
	    self.clearResults(true);
	});

    },

    highlightAcceptedSearches:function(){
	var checked=$("#rdfazer-search .search-results input:checked");
	var label;
	var uris=[];
	var url;
	for( var i=0, input; input=checked[i];i++){
	    var resultDiv= input.parentNode.parentNode;
	    var result=resultDiv.searchResult;
	    label= resultDiv.searchResult[resultDiv.searchResultLabel].value;
	    var uri = result.target.value;
	    url= this.uriToUrl(uri);
	    uris.push(uri);		
	}
	if(uris.length>0){
	    this.addHighlightToSelection(label,url,uris);
	}
    },

    uriToUrl:function(uri){
	var funbody = "return "+this.getConfigProp("uriToUrl")+";";
	var fun = new Function('uri',funbody);
	return fun(uri);
    },

    doSearch:function(searchTerm){
	var query = "";
	var self = this;
	query = this.getConfigProp("query").replace(/\$searchTerm/g,searchTerm);
	this.toggleLoading();
	this.sparqlQuery(query, function(data){
	    self.showResults(data.head.vars,data.results.bindings);
	    self.toggleLoading();
	},function(result){
	    self.message("error","Could not query the server for matching terms."+(result.responseText?"\nServer response:\n"+result.responseText:""));
	    self.toggleLoading();
	});
    },
    
    toggleLoading:function(){
	$("#rdfazerdialog .searchloading").toggleClass("hidden");
    },

    clearResults:function(all){
	if(all){
	    $("#rdfazer-search .search-container").empty();
	    return;
	}else{
	    var unchecked=$("#rdfazer-search .search-container input:checkbox:not(:checked)");
	    for(var i = 0, check; check = unchecked[i]; i++){
		$(check.parentNode.parentNode).remove();
	    }
	}
    },

    showResults:function(vars,bindings){
	this.clearResults();
	for(var i = 0, binding; binding = bindings [i]; i++){
	    var container = $('<div class="rdfazer-searchresult">'+
			      '<div class="rdfazer-searchresult-head">'+
			      '<span class="toggle">+</span><span class="rdfazer-hcontent"></span><input type="checkbox"></input></div>' +
			      '<div class="searchresult-body hidden"></div>' + 
			      '</div>');
	    var labelProperty = this.getConfigProp("labelProperty");
	    var useAsLabel=$.inArray(labelProperty,vars)?labelProperty:vars[0];

	    container.find(".rdfazer-hcontent").html(binding[useAsLabel].value);
	    var details = ""

	    for(var j = 0, varname; varname = vars [j]; j++){
		details += "<div><span>"+varname+":</span><span>"+binding[varname].value+"</span></div>"
	    }    
	    container.find(".toggle").click(function(event){
		$(this).parent().parent().find(".searchresult-body").toggleClass("hidden");
		event.stopPropagation();
	    });
	    container.find(".rdfazer-searchresult-head").click(function(){
		var checkbox=$($(this).parent()).find("input");
		checkbox.prop("checked", !checkbox.prop("checked"));
	    });
	    container.find("input").click(function(event){
		event.stopPropagation();
	    });
	    
	    container.find(".searchresult-body").append(details);
	    $("#rdfazer-search .search-container").append(container);	    

	    container[0].searchResult = binding;
	    container[0].searchResultLabel = useAsLabel;
	}
    },

    message:function(type,message){
	var message = $("<div class='rdfazermessage "+type+"'><div class='rdfazermessage-content'>"+message+"</div></div>");
	$("body").prepend(message);
	setTimeout(function(){
	    message.addClass("open");
	},0);
	setTimeout(function(){
	    message.addClass("fade");
	},5000);
	setTimeout(function(){
	    message.remove();
	},7000);
	message.click(function(){
	    this.remove();
	});
    },

    sparqlQuery:function(query,success,error){
	/* for the interested reader that would like to know why the headers are a mess:
	   virtuoso. */
	$.ajax({
	    headers: { 
		Accept : "application/sparql-results+json,application/json,text/html,application/xhtml+xml,application/xml; charset=utf-8",
		"Content-Type": "text/plain; charset=utf-8"
	    },
	    url:this.getConfigProp("sparql"),
	    data:{
		query:query,
		format:"application/sparql-results+json"
	    },
	    success:success,
	    error:error
	});
    },

    saveConfig:function(config){
	var self = this;
	chrome.storage.local.set(config, function() {
	    self.config = config;
            self.message('Info','Settings saved');
        });
    },

    removeProfile:function(profile){
	var self = this;
	var config = this.config;
	if(config.profile == profile){
	    for(var other in config.profiles){
		if(other != profile){
		    config.profile = other;
		}
	    }
	}
	delete config.profiles[profile]
	chrome.storage.local.set(config, function() {
	    self.config = config;
            self.message('Info','Profile removed');
        });
    },

    loadConfig:function(callback){
	var self = this;
	chrome.storage.local.get(null,function(config) {
	    $.extend(self.config,config)
	    callback();
        });
    },

    resetConfig:function(){
	chrome.storage.local.clear();
	this.config=$.extend(true,{},this.configBak);
        this.message('Info','Settings reset');
    },

    getConfigProp:function(property) {
	var config = this.config;
	var result = config[property];
	if ( !result ){
	    result=config.profiles[config.profile][property];
	}
	return result;
    },

    config: {
	sparql:"http://localhost:8890/sparql",
	profile:"esco",
	profiles: {
	    esco: {
		query: "select ?target ?label (group_concat(distinct(?labels),\"; \") as ?altLabels) (group_concat(distinct(?types), \"; \") as ?types)\n where { \n{ ?target a <http://ec.europa.eu/esco/model#Occupation> . } \nUNION\n { ?target a <http://ec.europa.eu/esco/model#Skill> . } \n?target <http://www.w3.org/2008/05/skos-xl#prefLabel> ?thing3. ?thing3 <http://www.w3.org/2008/05/skos-xl#literalForm> ?label .\n ?target <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?types .\n{ ?target <http://www.w3.org/2008/05/skos-xl#prefLabel> ?thing1. \n?thing1 <http://www.w3.org/2008/05/skos-xl#literalForm> ?plabels . \nFILTER (bif:contains(?plabels,\"'$searchTerm*'\")) . \nFILTER (lang(?plabels) = \"en\") . } \nUNION\n { ?target <http://www.w3.org/2008/05/skos-xl#altLabel> ?thing2.\n ?thing2 <http://www.w3.org/2008/05/skos-xl#literalForm> ?plabels .\n FILTER (bif:contains(?plabels,\"'$searchTerm*'\")) . \nFILTER (lang(?plabels)= \"en\") . \n} \nOPTIONAL {?target <http://www.w3.org/2008/05/skos-xl#altLabel> ?thing4\n. ?thing4 <http://www.w3.org/2008/05/skos-xl#literalForm> ?labels\n. FILTER (lang (?labels) = \"en\") \n}\nFILTER (lang (?label) = \"en\") \n} GROUP BY ?target ?label",
		uriToUrl:"'https://ec.europa.eu/esco/web/guest/concept/-/concept/thing/en/' +uri",
		labelProperty:"label",
		labelPredicate:"http://www.w3.org/2004/02/skos/core#prefLabel",
		storedInfo: {
		    label: {store:"<meta property='http://www.w3.org/2004/02/skos/core#prefLabel' content='$label'>"},
		    altLabels: {store:"<meta property='http://www.w3.org/2004/02/skos/core#altLabel' content='$altLabels'>", csv:";"},
		    types: {store:"<div rel='http://www.w3.org/1999/02/22-rdf-syntax-ns#type'><span about='$types'></span></div>", csv:";"}
		}
	    },
	    "default (skos)": {
		query: "select ?target ?label (group_concat(distinct(?labels),\"; \") as ?altLabels)\n (group_concat(distinct(?types), \"; \") as ?types) where {\n ?target <http://www.w3.org/2004/02/skos/core##prefLabel> ?label .\n ?target <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?types .\n{ ?target <http://www.w3.org/2004/02/skos/core#prefLabel> ?plabels .\n FILTER (bif:contains(?plabels,\"'$searchTerm*'\")) . }\n UNION {\n ?target <http://www.w3.org/2004/02/skos/core#altLabel> ?plabels .\n FILTER (bif:contains(?plabels,\"'$searchTerm*'\")) .\n } OPTIONAL {\n?target <http://www.w3.org/2004/02/skos/core#altLabel> ?labels.\n FILTER (lang (?labels) = \"en\") }\nFILTER (lang (?label) = \"en\") \n} GROUP BY ?target ?label",
		uriToUrl:"uri",
		labelProperty:"label",
		labelPredicate:"http://www.w3.org/2004/02/skos/core#prefLabel",
		storedInfo: {
		    label: {store:"<meta property='http://www.w3.org/2004/02/skos/core#prefLabel' content='$value'>"},
		    altLabels: {store:"<meta property='http://www.w3.org/2004/02/skos/core#altLabel' content='$value'>", csv:";"},
		    types: {store:"<div rel='http://www.w3.org/1999/02/22-rdf-syntax-ns#type'><span about='$value'></span></div>", csv:";"}
		}
	    }

	}
    }
};

Rdfazer.init();
