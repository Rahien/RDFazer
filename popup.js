
function onWindowLoad() {

  var message = document.querySelector('#message');
  
    var sendMessage = function(messagePayload, messageHandler){
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, messagePayload, messageHandler);
      });
  };
    
}

window.onload = onWindowLoad;
