# Media Panel Devtool Web Extension for Firefox

https://addons.mozilla.org/en-US/firefox/addon/devtools-media-panel/

This a web extension adaption of the aboutmedia addon https://github.com/jyavenard/aboutmedia with additions for webrtc.

It creates a new 'Media-Webrtc' tab in the Firefox developer tools panel - currently supported in Firefox 54+

Instructions for building for release and submitting to Add-on Dev Hub:
1. Run 'npm install'.
2. Run './browserify_production.sh'
3. Checkin extension/bundle.js if needed (anything changed in src/app)
4. Update version number in extension/manifest.json
5. Run './release_addon.sh'
6. Run './release_code.sh'
7. Login to Add-on Developer Hub (https://addons.mozilla.org/en-US/developers)
8. Upload new version.
9. Include these instructions with the source code:
> The non-obfuscated/minified source code is included with this submission and
> also available here:
> https://github.com/mjfroman/media-devtools-panel-react
>
> The bundle.js file can be reproduced by:
> 1. run npm install
> 2. run ./browserify_production.sh


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
    1. For video: try https://youtube.com
    2. For webrtc: https://webrtc.github.io/samples/src/content/peerconnection/pc1/
9. There should be a new 'Media-Webrtc' tab

