# MentorGGAddOn
Chrome/Firefox extension for MENTOR.GG

# Testing in Chrome
* Go to [chrome://extensions/](chrome://extensions/) and enable developer mode
* Load unpacked extension and select the manifest.json
* If you want to debug popup.js, right click the popup window and inspect element
* If you want to debug history_worker.js, open debug tools for steamcommunity.com (it gets injected there)

# Testing in Firefox
* Go to [about:debugging](about:debugging) and "temporarily load add-on"
* Select any of the files, preferably manifest.json
* If you want to debug, enable extension debugging and click debug button (this is bad as fuck though, typical FF)
* If you want to debug history_worker.js, open debug tools for steamcommunity.com (it gets injected there)

# Making Changes
* Any of the meta information can be changed in the manifest.json file
* Never edit the *.css file(s), always edit the *.less files and compile them instead

# Deploying to the respective stores
* [Chrome](https://developer.chrome.com/webstore/publish)
* [Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/Distribution/Submitting_an_add-on)

# Note for extension inspectors of the FireFox / Chrome Store
We use the official minified jquery-3.3.1.min.js
We use .less file(s) that are compiled to .css files. 