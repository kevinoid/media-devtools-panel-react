#!/bin/sh
# run this script from inside the repo to build a release file
CWD=`pwd`
BASENAME=`basename $CWD`
VERSION_NUM=`grep "\"version\"\:" extension/manifest.json | egrep -o ": \"(.*)\"," | sed -n "s/: \"\(.*\)\",/\1/p"`
echo "current directory: $CWD"
echo "base directory: $BASENAME"
echo "version num: $VERSION_NUM"
git clean -fdx
cd ..
tar czf dev-tools-media-src-$VERSION_NUM.tar.gz $BASENAME

