window.onload = function() {
    document.getElementById('open-login-page').onclick = function() {
        chrome.runtime.sendMessage({
            msg: 'SetUserPressedOpenLoginPage'
        }, response => {});
    };
};