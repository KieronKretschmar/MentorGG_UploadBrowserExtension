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
            input.setAttribute("steamid", g_steamID); \
            input.setAttribute("session", g_sessionID); \
            document.head.appendChild(input);';

        document.head.appendChild(script).text = inline;
        _INITIALIZED_HISTORY_WORKER = true;
    };

    this.GetSteamID = function() {
        return document.getElementById(_self.inputName).getAttribute("steamid");
    };

    this.GetSession = function() {
        return document.getElementById(_self.inputName).getAttribute("session");
    };

    this.IsLoggedIn = function() {
        var steamId = _self.GetSteamID();
        return steamId != false && steamId != "false";
    };
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    DbgLog("Message received: " + request.msg);

    if (request.msg == "IsInitialized") {

        sendResponse({
            status: _INITIALIZED_HISTORY_WORKER
        });

        return;
    }

    if (request.msg == "GetLoginState") {
        sendResponse({
            loginState: controller.IsLoggedIn(),
            steamId: controller.GetSteamID(),
            session: controller.GetSession()
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