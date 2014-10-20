chrome.browserAction.onClicked.addListener(function(activeTab) {
    var files = ["lib/jquery-2.0.3.min.js","lib/jquery-ui-1.10.4.custom.min.js","lib/jquery.migrate.min.js","lib/rangy-core.js", "lib/rangy-classapplier.js","lib/rangy-highlighter.js"];
    var loaded = [];
    for (var i =0, file; file = files[i]; i++){
	chrome.tabs.executeScript({
	    file:file,
	},function(){
	    loaded.push(file);
	    if(files.length == loaded.length){
		chrome.tabs.executeScript({
		    file:"contentscript.js"
		});
	    }
	});
    }
});

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
	var query = request.rdfazerQuery;
	var url = request.rdfazerUrl;
	$.ajax({
	    headers: { 
		Accept : "application/sparql-results+json,application/json,text/html,application/xhtml+xml,application/xml; charset=utf-8"		
	    },
	    url:url,
	    data:{
		query:query,
		format:"application/sparql-results+json",
		output:"json"
	    },
	    success:function(result){
		sendResponse({result:result, success:true});
	    },
	    error:function(result){
		sendResponse({result:result, success:false});
	    }
	});
	return true; // sending asynchronous response
    }
);
