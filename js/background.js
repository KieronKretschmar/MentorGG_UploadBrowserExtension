var InterfaceTarget = 'https://extension-upload.mentor.gg/v1/extension-upload';
var UserPressedOpenLoginPage = false;
var ActiveTabId = -1;
var OverlayTemplate = '';

var Helper = {
    GetCurrentTab: function (fn) {
        chrome.tabs.query({ active: true }, function (tabs) {
            fn(tabs[0]);
        });
    },
    URL: {
        IsMatchHistory: function (url) {
            if (url.match(/^http([s]?):\/\/.*steamcommunity.com\/profiles\/[0-9]+\/gcpd\/730\/\?tab=matchhistorycompetitive/)) {
                return true;
            }

            return false;
        },
        IsSteamCommunity: function (url) {
            if (url.match(/^http([s]?):\/\/.*steamcommunity.*/)) {
                return true;
            }

            return false;
        }
    }
};

function SetPopupAvailability(state) {
    if ( state ) {
        chrome.browserAction.setPopup({popup: 'popup.html'});
        chrome.browserAction.setBadgeText({text: ''});
    } else {
        chrome.browserAction.setPopup({popup: ''});
        chrome.browserAction.setBadgeText({text: '\u2713'});
    }
}

function WaitForInitialization(onInit) {
    chrome.tabs.sendMessage(ActiveTabId, { 
        msg: "IsInitialized" 
    }, response => {
        if ( chrome.runtime.lastError )
            return;

        if ( response !== undefined ) {
            if (response.status == true) {
                onInit();
            } else {
                setTimeout(function () {
                    WaitForInitialization(onInit);
                }, 100);
            }
        }
    });
}

function OnInitialized() {
    chrome.tabs.sendMessage(ActiveTabId, { 
        msg: "GetLoginState" 
    }, response => {

        //Steam user is currently logged in
        if ( response.loginState ) {
            if (UserPressedOpenLoginPage) {
                UserPressedOpenLoginPage = false;

                chrome.tabs.sendMessage(ActiveTabId, {
                    msg: "TriggerUploadOverlay",
                    tpl: OverlayTemplate
                }, response => {
            
                });
            }

            SetPopupAvailability(false);
        } 
        //Steam user is currently NOT logged in
        else {
            //Thus, display 'Go to login page'
            SetPopupAvailability(true);
        }
    });
}

function SendUploadDoneMessage(statusCode, fnHandled) {
    Helper.GetCurrentTab(tab => {
        chrome.tabs.sendMessage(tab.id, { 

            msg: "MatchUploadDone",
            status: statusCode

        }, response => {

        });
    });
}

function OnTabURLChange(newUrl) {
    if (Helper.URL.IsSteamCommunity(newUrl)) {
        WaitForInitialization(OnInitialized);
    } else {
        SetPopupAvailability(true);
    }
}

//This can only be called when no popup is set
//So we always inject our overlay
chrome.browserAction.onClicked.addListener(tab => {

    chrome.tabs.sendMessage(tab.id, {
        msg: "TriggerUploadOverlay",
        tpl: OverlayTemplate
    }, response => {

    });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    ActiveTabId = activeInfo.tabId;

    Helper.GetCurrentTab(tab => {
        if ( tab != null ) {
            OnTabURLChange(tab.url);
        }
    });
    
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    ActiveTabId = tabId;

    if ( tab != null ) {
        OnTabURLChange(tab.url);
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);

    if ( request.msg == 'SetUserPressedOpenLoginPage' ) {
        UserPressedOpenLoginPage = true;
        sendResponse({success: true});
        return;
    }

    if ( request.msg == 'UploadMatches' ) {
        //This should theoretically never happen
        //So for now we aren't handling it
        if ( !request.steamid ) {
            return;
        }

        let uploadData = [];

        var GetMatches = function(token, fnDone) {
            $.ajax({
                type: "GET",
                url: "https://steamcommunity.com/profiles/" + request.steamid + "/gcpd/730",
                data: {
                    sessionid: request.session,
                    ajax: 1,
                    tab: "matchhistorycompetitive",
                    continue_token: token
                }
            }).done(function (data) { 
                
                if (!data.html) {
                    fnDone();
                    return;
                }

                let times = data.html.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}\s{1}[0-9]{2}:[0-9]{2}:[0-9]{2}\sGMT)/g);
                let links = data.html.match(/(http([s]?):\/\/replay[0-9]+.valve.net\/730\/[0-9_]+.dem.bz2)/g);

                console.log("DemoLinks: " + links);
                console.log("DemoTimes: " + times);

                if (times != null && links != null) {
                    //if links.length != times.length then
                    //the match has been so long ago that the demo is no longer available
                    for ( let i = 0; i < links.length; i++ ) {

                        // replace dashes with whitespace in "2019-09-06" for FF and IE compatibility
                        let isoMatchDate = new Date(times[i].replace(/-/g, ' ')).toISOString();
                        uploadData.push({
                            url: links[i],
                            time: isoMatchDate,
                            steamId: request.steamid,
                        });
                    }

                    if ( data.continue_token && links.length == times.length ) {
                        GetMatches(data.continue_token, fnDone);
                    } else {
                        fnDone();
                    }
                }
                else
                {
                    fnDone();
                }
            }).fail(function(jqXHR) {
                console.log(jqHXR);
                alert(jqXHR);
            });
        };

        GetMatches(null, function() {
            if ( uploadData.length <= 0 ) {
                SendUploadDoneMessage(-1);
                return;
            }
            

                $.ajax({
                type: "POST",
                url: InterfaceTarget,
                data: JSON.stringify({
                    matches: uploadData
                }),
                crossDomain: true,
                contentType: "application/json",
                dataType: "json",
                cache: false,
                async: true,
                success: function (msg) {
                    SendUploadDoneMessage(0);
                },
                error: function (jxhr) {
                    console.log(jxhr.responseText);
                    SendUploadDoneMessage(-2);
                }
            });
        });
    }
});

//Load popup html
$.ajax({
    url: chrome.extension.getURL('overlay.html'),
    dataType: 'html',
    success: data => {
        OverlayTemplate = data;
    }
});

if (chrome.browserAction.setBadgeBackgroundColor) {
    chrome.browserAction.setBadgeBackgroundColor({ color: [254, 70, 0, 255] });
}

if (chrome.browserAction.setBadgeTextColor) {
    chrome.browserAction.setBadgeTextColor({ color: [255, 255, 255, 255] });    
}