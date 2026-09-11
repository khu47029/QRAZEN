#!/usr/bin/env bash
# Test helper: runs the three-step upload handshake (presign -> PUT -> complete).
# Usage: upload.sh <cookie-jar> <qrCodeId> <contentVersionId> <file> <mimeType>
# Prints "<step>=<http_code>" per step so callers can assert on real responses.
set -u

JAR="$1"; QR="$2"; VER="$3"; FILE="$4"; MIME="$5"
BASE="${BASE_URL:-http://localhost:3000}"
NAME="$(basename "$FILE")"
SIZE="$(wc -c < "$FILE" | tr -d ' ')"

PRE="$(curl -s -w '\n%{http_code}' -b "$JAR" -X POST \
  -H 'Content-Type: application/json' \
  -d "{\"qrCodeId\":\"$QR\",\"contentVersionId\":\"$VER\",\"filename\":\"$NAME\",\"mimeType\":\"$MIME\",\"sizeBytes\":$SIZE}" \
  "$BASE/api/uploads/presign")"

PRE_CODE="$(printf '%s' "$PRE" | tail -n1)"
PRE_BODY="$(printf '%s' "$PRE" | sed '$d')"
echo "presign=$PRE_CODE"
if [ "$PRE_CODE" != "200" ]; then echo "$PRE_BODY"; exit 1; fi

# Parse via stdin — avoids Windows/bash path translation on temp files.
read -r UPLOAD_URL KEY <<<"$(printf '%s' "$PRE_BODY" | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  const j=JSON.parse(s);console.log(j.uploadUrl+' '+j.storageKey);});")"

echo "PUT=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X PUT \
  -H "Content-Type: $MIME" --data-binary "@$FILE" "$BASE$UPLOAD_URL")"

CMP="$(curl -s -w '\n%{http_code}' -b "$JAR" -X POST \
  -H 'Content-Type: application/json' \
  -d "{\"qrCodeId\":\"$QR\",\"contentVersionId\":\"$VER\",\"storageKey\":\"$KEY\",\"originalFilename\":\"$NAME\",\"mimeType\":\"$MIME\",\"sizeBytes\":$SIZE}" \
  "$BASE/api/uploads/complete")"

echo "complete=$(printf '%s' "$CMP" | tail -n1)"
printf '%s' "$CMP" | sed '$d'
echo
