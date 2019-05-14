var _LOGDEBUG = false;
var _INITIALIZED_HISTORY_WORKER = false;
var controller = null;
var OVERLAY_OPEN = false;

function DbgLog(msg) {
    if ( _LOGDEBUG ) {
        console.info(msg);
    }
}

function SteamCommunityController() {
    var _self = this;    

    this.inputName = "hw-steamid";
    this.SteamId = '';
    this.Session = '';

    this.Initialize = function() {

        document.addEventListener('mgg_init', (e) => {
            _self.SteamId = e.detail.steamid;
            _self.Session = e.detail.session;

            DbgLog("SteamId: " + _self.SteamId);
            DbgLog("Session: " + _self.Session);
        });

        if ( document.getElementById(_self.inputName) != null ) {
            DbgLog("Already initialized");
            return;
        }

        var script = document.createElement('script');
        var inline = '\
            var e = new CustomEvent("mgg_init", { \
                detail: { \
                    steamid: g_steamID, \
                    session: g_sessionID \
                } \
            }); \
            document.dispatchEvent(e); \
            document.currentScript.remove();';

        document.head.appendChild(script).text = inline;
        _INITIALIZED_HISTORY_WORKER = true;
    };

    this.GetSteamID = function() {
        return _self.SteamId;
    };

    this.GetSession = function() {
        return _self.Session;
    };

    this.IsLoggedIn = function() {
        var steamId = _self.GetSteamID();
        return steamId != false && steamId != "false";
    };
}

function ShowUploadOverlay(tpl) {
    document.body.innerHTML += tpl;

    //Close Overlay Event
    document.getElementById('__mgg-close-overlay').onclick = function(e) {
        let el = document.getElementById('__mgg-upload-overlay');

        el.classList.remove('shown');
        setTimeout(() => {
            el.remove();
            OVERLAY_OPEN = false;
        }, 750); //css transition is set to 750ms
    };

    //Upload Button Clicked
    document.getElementById('__mgg-upload-button').onclick = function(e) {

        //Disable upload button
        e.target.disabled = true;
        e.target.innerText = 'Uploading..';

        //Update close button text
        let closeButton = document.getElementById('__mgg-close-overlay');
        closeButton.innerText = 'Cancel';

        //Show loader
        document.getElementById('__mgg-loader').style = "display: flex;";

        //Update text
        let text = document.getElementById('__mgg-text');
        text.innerText = 'Hold on tight! We are currently uploading your matches.';

        chrome.runtime.sendMessage({
            msg: 'UploadMatches',
            steamid: controller.GetSteamID(),
            session: controller.GetSession()
        });
    };

    //slow show, 750ms
    //Timeout is just to give the styles some time to load, hehe
    setTimeout(() => {
        let el = document.getElementById('__mgg-upload-overlay');
        el.classList.add('shown');
        OVERLAY_OPEN = true;
    }, 50);
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    DbgLog("Message received: " + request.msg);

    if (request.msg == "TriggerUploadOverlay") {
        sendResponse({
            handled: true
        });

        if (!OVERLAY_OPEN) {
            ShowUploadOverlay(request.tpl);
        }

        return;
    }

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

    if (request.msg == "MatchUploadDone") {
        sendResponse({
            handled: true
        });

        //hide loader
        document.getElementById('__mgg-loader').style = "display: none;";

        let closeButton = document.getElementById('__mgg-close-overlay');
        closeButton.innerText = 'Close';

        let uploadButton = document.getElementById('__mgg-upload-button');
        
        let text = document.getElementById('__mgg-text');
        
        if (request.status == 0) {
            text.innerText = 'Your matches have been uploaded succesfully!';
            uploadButton.innerText = 'Done';            
        }
        if (request.status == -1) {
            text.innerText = 'There are currently no matches that we could upload.'
            uploadButton.innerText = 'Failed';
            return;
        }
        if (request.status == -2) {
            text.innerText = 'An unknown error occured. Please try again later.'
            uploadButton.innerText = 'Failed';
            return;
        }
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