#!/bin/sh
# run this script from inside the repo to build the release addon to publish
CWD=`pwd`
VERSION_NUM=`grep "\"version\"\:" extension/manifest.json | egrep -o ": \"(.*)\"," | sed -n "s/: \"\(.*\)\",/\1/p"`
echo "current directory: $CWD"
echo "version num: $VERSION_NUM"

cd extension && zip -r -FS ../../dev-tools-media-$VERSION_NUM.zip *

