var InterfaceTarget = 'http://mentor.gg:99/api/demos';
var SteamId = 0


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

function UpdateListener(tabId, changeInfo, tab) {
    if (tabId == tab.id && changeInfo.status !== undefined && changeInfo.status == "complete") {

        //Make sure content script is loaded
        WaitForInitialization(function () {
            Helper.GetCurrentTab(function (currentTab) {
                if (Helper.URL.IsMatchHistory(currentTab.url)) {

                    chrome.tabs.sendMessage(currentTab.id, { msg: "GetLinks" }, function (response) {
                        if ( response.data.length <= 0 ) {
                            $('.overlay[name="status"]').html($('#status-no-matches').html());
                            return;
                        }

                        $.ajax({
                            type: "POST",
                            url: InterfaceTarget,
                            data: JSON.stringify({
                                list: response.data
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

                } else {
                    alert('The current active tab is not your competitive match history');
                }
            });
        });

        chrome.tabs.onUpdated.removeListener(UpdateListener);
    }
}

$(function () {
    $('.open-login').click(function () {
        chrome.tabs.create({ url: 'https://steamcommunity.com/login/' });
        window.close();
    });

    $('.upload-matches').click(function () {

        $('.overlay[name="status"]').fadeIn(500, function() {
            Helper.GetCurrentTab(function (tab) {
                var newURL = "https://steamcommunity.com/profiles/" + SteamId + "/gcpd/730/?tab=matchhistorycompetitive";
    
                chrome.tabs.onUpdated.addListener(UpdateListener);
    
                //Could check if current URL is already match history, but this gives us a clean refresh for everything
                //So just, always and in every case: redirect to match history! :-)
                chrome.tabs.update(tab.id, { url: newURL });

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