# Media Panel Devtool Web Extension for Firefox

https://addons.mozilla.org/en-US/firefox/addon/devtools-media-panel/

This a web extension adaption of the aboutmedia addon https://github.com/jyavenard/aboutmedia with additions for webrtc.

It creates a new 'Media-Webrtc' tab in the Firefox developer tools panel - currently supported in Firefox 54+

Instructions for building for release:
1. Run 'npm install'.
2. Run './browserify_production.sh'

Instructions for building for development:
1. Run 'npm install'.
2. Run './watchify_bundle.sh'

Instructions for installing manually:

1. Clone/download repo
2. Open Firefox
3. Go to 'about:debugging'
4. Click 'Load Temporary Add-on' button
5. Navigate to 'extension' subdirectory in repo
6. Open any file in this directory
7. There should be a new 'Media Panel' addon listed under 'Extensions'
8. Navigate to page with video element and/or webrtc and open developer tools (F12)
9. There should be a new 'Media-Webrtc' tab

