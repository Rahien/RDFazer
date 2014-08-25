
function sendMessage (messagePayload, messageHandler){
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, messagePayload, messageHandler);
    });
}
function handleServerError(request,status,error,stage){
    var message = "An error occurred during " + stage+".\n"+
        "The server responded with status code '"+status+"' and the error message was:\n'"+error+"'";
    rdfazerMessage(message,"bad-message");
}

function rdfazerMessage(message,classes){
    var body=document.getElementsByTagName("body");
    var messageDiv=document.createElement("div");
    $(messageDiv).addClass(classes+" rdfazerMessage").text(message);
    setTimeout(function(){
        $(messageDiv).addClass(classes+" rdfazerMessage-close")       
        setTimeout(function(){$(messageDiv).remove()},3000);
    },1500);
    $(body[0]).append(messageDiv);
    setTimeout(function(){
        $(messageDiv).addClass("rdfazerMessage-open");
    },0);
}

var Rdfazer = {
    currentRange:null, 
    baseURI:"http://localhost",
    //* stores the current HTML page in the rdfazer component for storing it as a source when needed. TODO use and store the HTML
    storeCurrentHTML: function() {
        this.currentHTML = document.getElementsByTagName("html")[0].outerHTML;
    },
    
    init: function(){
        var rdfazerIF = $("#rdfazerInterface")[0];
        if(rdfazerIF){
            return rdfazerIF;
        }else{
            rangy.init();

            this.addCss();
            this.addInterface();
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
            self.addDialog();
            self.showHighlights();
        });
    },

    destroy:function(){
        $('#rdfazerInterface').remove();
        $('#rdfazerdialog').dialog('destroy').remove();
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
            relation.append("<span about='"+uri+"'></span>");
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
            var dialog = $( "#rdfazerdialog" ).dialog({
                autoOpen: false,
                height: 320,
                width: 450,
                modal: true,
                buttons: {
                    "highlight": function(){
                        self.readAndAddHighlight();
                        dialog.dialog( "close" );
                    },
                    Cancel: function() {
                        dialog.dialog( "close" );
                    }
                },
                close: function() {
                    var uriInputs = $("#rdfazerdialog input.uri");
                    for(var i=1, uri; uri=uriInputs[i];i++){
                        $(uri).remove();
                    }
                }
            });
            
            $(".rdfazerhead button.highlight").click(function(){
                self.currentRange = rangy.getSelection().getRangeAt(0);
                dialog.dialog( "open" );
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
        });
    },

    addCss:function(){
        var link = document.createElement("link");
        link.href = chrome.extension.getURL("contentscript.css");
        link.type = "text/css";
        link.rel = "stylesheet";
        document.getElementsByTagName("head")[0].appendChild(link);
    },
    
    showHighlights:function(){
        var content = $("#rdfazerInterface .rdfazercontent");
        content.empty();
        
        var highlights = $(".highlight[about]");
        
        for(var i=0, highlight; highlight=highlights[i]; i++){
            var node = $(highlight);
            var highlightURI = node.attr("about");
            var urinodes = $("#rdfazerconcepts div[about='"+highlightURI+"'] span");
            var uris = [];
            for(var j=0, uri; uri=urinodes[j]; j++){
                uris.push($(uri).attr("about"));
            }
            var offset = node.offset();
            var tag=$("<a class='highlightTag' highlight= '"+highlightURI+"' href='"+node.attr("href")+"'>"+uris.join(", ")+"</div>");
            tag.css({ top: offset.top+"px" });

            tag.hover(function(){
                var highlightURI=$(this).attr("highlight");
                $(".highlight[about='"+highlightURI+"']").addClass("hover");
            },function(){
                var highlightURI=$(this).attr("highlight");
                $(".highlight[about='"+highlightURI+"']").removeClass("hover");
            });

            content.append(tag);
        }

    }
};

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if(request.type == "initRDFazer"){
            Rdfazer.init();
            sendResponse({status:"ok"});
        } else if(request.type == "getPageContent"){
            var htmlNodes = document.getElementsByTagName("html");
            sendResponse({html:htmlNodes[0].outerHTML});
        }
  });
