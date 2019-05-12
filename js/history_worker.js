var _LOGDEBUG = false;
var _INITIALIZED_HISTORY_WORKER = false;
var controller = null;

function DbgLog(msg) {
    if ( _LOGDEBUG ) {
        console.info(msg);
    }
}

function SteamCommunityController() {
    var _self = this;    

    this.inputName = "hw-steamid";

    this.Initialize = function() {
        if ( document.getElementById(_self.inputName) != null ) {
            DbgLog("Already initialized");
            return;
        }

        var script = document.createElement('script');
        var inline = '\
            var input = document.createElement("input"); \
            input.id = "' + _self.inputName + '"; \
            input.type = "hidden"; \
            input.value = g_steamID || false; \
            document.head.appendChild(input);';

        document.head.appendChild(script).text = inline;
        _INITIALIZED_HISTORY_WORKER = true;
    }

    this.GetSteamID = function() {
        return document.getElementById(_self.inputName).value;
    }

    this.IsLoggedIn = function() {
        var steamId = _self.GetSteamID();
        return steamId != false && steamId != "false";
    }

    this.GetMatchData = function() {
        var arr = [];
        var tbodies = document.querySelectorAll(".csgo_scoreboard_inner_left tbody");        

        for ( var i = 0; i < tbodies.length; i++ ) {
            var tbody = tbodies[i];
            
            var timestamp = tbody.children[1].children[0].innerHTML;
            var replaytag = tbody.querySelector('a[href]');

            var match = timestamp.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}\s{1}[0-9]{2}:[0-9]{2}:[0-9]{2}\sGMT)/);

            if (!match)
                continue;

            if (replaytag == null) {
                continue;
            }        

            if(!replaytag.href.match(/^http([s]?):\/\/replay[0-9]+.valve.net\/730\/[0-9_]+.dem.bz2/))
                continue;

            arr.push({
                url: replaytag.href,
                time: new Date(match[0]).getTime() / 1000
            });
        }

        return arr;
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    DbgLog("Message received: " + request.msg);

    if (request.msg == "IsInitialized") {

        sendResponse({
            status: _INITIALIZED_HISTORY_WORKER
        });

        return;
    }

    if (request.msg == "GetLinks") {

        sendResponse({
            data: controller.GetMatchData()
        });

        return;
    }    

    if (request.msg == "GetLoginState") {
        sendResponse({
            loginState: controller.IsLoggedIn(),
            steamId: controller.GetSteamID()
        });
        return;
    }


});

DbgLog("History Worker loaded");

controller = new SteamCommunityController();
controller.Initialize();

if ( _LOGDEBUG ) {
    if (controller.IsLoggedIn()) {
        DbgLog("User is logged in: " + controller.GetSteamID());
    } else {
        DbgLog("User is not logged in");
    }
}