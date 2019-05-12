var InterfaceTarget = 'http://mentor.gg:99/api/demos';
var SteamId = 0
var Session = 0;

var Helper = {
    GetCurrentTab: function (fn) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
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

function OnInitialized() {
    Helper.GetCurrentTab(function (tab) {
        chrome.tabs.sendMessage(tab.id, { msg: "GetLoginState" }, function (response) {
            //User is not logged in
            if (!response.loginState) {
                $('.open-login').show();
                $('.upload-matches').hide();
            }
            //User is logged in
            else {
                SteamId = response.steamId;
                Session = response.session;

                $('.open-login').hide();
                $('.upload-matches').show();

                $('.n').hide();
                $('.y').show();
            }
        });
    });
}

function WaitForInitialization(onInit) {
    Helper.GetCurrentTab(function (tab) {
        chrome.tabs.sendMessage(tab.id, { msg: "IsInitialized" }, function (response) {
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
    });
}

$(function () {
    $('.open-login').click(function () {
        chrome.tabs.create({ url: 'https://steamcommunity.com/login/' });
        window.close();
    });

    $('.upload-matches').click(function () {

        $('.overlay[name="status"]').fadeIn(500, function() {

            let uploadData = [];

            var GetMatches = function(token, fnDone) {
                $.ajax({
                    type: "GET",
                    url: "https://steamcommunity.com/profiles/" + SteamId + "/gcpd/730",
                    data: {
                        sessionid: Session,
                        ajax: 1,
                        tab: "matchhistorycompetitive",
                        continue_token: token
                    }
                }).done(function(data) {                                                        
                    let times = data.html.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}\s{1}[0-9]{2}:[0-9]{2}:[0-9]{2}\sGMT)/g);
                    let links = data.html.match(/(http([s]?):\/\/replay[0-9]+.valve.net\/730\/[0-9_]+.dem.bz2)/g);

                    //if links.length != times.length then
                    //the match has been so long ago that the demo is no longer available
                    for ( let i = 0; i < links.length; i++ ) {
                        uploadData.push({
                            url: links[i],
                            time: new Date(times[i]).getTime() / 1000
                        });
                    }

                    if ( data.continue_token && links.length == times.length ) {
                        GetMatches(data.continue_token, fnDone);
                    } else {
                        fnDone();
                    }

                }).fail(function(jqXHR) {
                    console.log(jqHXR);
                    alert(jqXHR);
                });
            };

            GetMatches(null, function() {
                if ( uploadData.length <= 0 ) {
                    $('.overlay[name="status"]').html($('#status-no-matches').html());
                    return;
                }

                $.ajax({
                    type: "POST",
                    url: InterfaceTarget,
                    data: JSON.stringify({
                        list: uploadData
                    }),
                    crossDomain: true,
                    contentType: "application/json",
                    dataType: "json",
                    cache: false,
                    async: true,
                    success: function (msg) {
                        $('.overlay[name="status"]').html($('#status-done').html());
                    },
                    error: function (jxhr) {
                        console.log(jxhr.responseText);
                        $('.overlay[name="status"]').html($('#status-error').html());
                    }
                });
            });
        });

    });

    Helper.GetCurrentTab(function (tab) {
        if (Helper.URL.IsSteamCommunity(tab.url)) {
            WaitForInitialization(OnInitialized);
        } else {
            $('.overlay[name="wrong-page"]').show();
        }
    });
});