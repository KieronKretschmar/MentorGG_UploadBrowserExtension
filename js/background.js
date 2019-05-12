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

var default_icon = {
    "19": "icons/icon_19.png",
    "38": "icons/icon_38.png"
};

var highlight_icon = {
    "19": "icons/icon_highlight_19.png",
    "38": "icons/icon_highlight_38.png"
};

function updateIcon(tab) {
    if (Helper.URL.IsSteamCommunity(tab.url)) {
        chrome.browserAction.setIcon({ path: highlight_icon });
    } else {
        chrome.browserAction.setIcon({ path: default_icon });
    }
}

function updateIconOnUpdated(tabId, changeInfo, tab) {
    Helper.GetCurrentTab(updateIcon);
}

function updateIconOnActivated(tabId, selectInfo) {
    Helper.GetCurrentTab(updateIcon);
}

chrome.tabs.onUpdated.addListener(updateIconOnUpdated);
chrome.tabs.onActivated.addListener(updateIconOnActivated);
