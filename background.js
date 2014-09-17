chrome.browserAction.onClicked.addListener(function(activeTab) {
    var files = ["lib/jquery-2.0.3.min.js","lib/jquery-ui-1.10.4.custom.min.js","lib/jquery.migrate.min.js","utils.j","backendApi.js","lib/rangy-core.js", "lib/rangy-classapplier.js","lib/rangy-highlighter.js"];
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
