#!/usr/bin/env bash

rm ./src/database/comic-data.sqlite
rm ./src/database/preferences.sqlite
echo "[INFO] Databases Deleted"

rm -rf ./tmp-decompressor
rm -rf ./tmp-thumbnails
echo "[INFO] Temp Files Deleted"