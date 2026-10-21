#!/usr/bin/env bash
# 안드로이드 APK 빌드 — Gradle 없이 Android SDK 빌드 도구(aapt2 · d8 · zipalign · apksigner)로 직접 패키징한다.
# 필요: JDK 17+, Android SDK(platforms;android-34, build-tools;34.0.0), node, zip
#       + 최신 R8(D8) jar: $ANDROID_HOME/r8/r8.jar (https://dl.google.com/dl/android/maven2/com/android/tools/r8/)
# 사용법: ANDROID_HOME=/opt/android-sdk tools/build-android.sh   →  releases/cisa-master.apk
# 새 버전 배포: android/version.json 의 versionCode(+1)·versionName·notes 수정 → 빌드 → APK와 version.json 함께 커밋
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="${ANDROID_HOME:-/opt/android-sdk}"
BT="$SDK/build-tools/34.0.0"
JAR="$SDK/platforms/android-34/android.jar"
OUT="$ROOT/dist/android"
KS="$ROOT/android/keystore/cisa-master.jks"
VC=$(node -p "require('$ROOT/android/version.json').versionCode")
VN=$(node -p "require('$ROOT/android/version.json').versionName")

rm -rf "$OUT" && mkdir -p "$OUT/gen" "$OUT/classes" "$OUT/dex" "$OUT/assets/www"
# 1) 웹앱 전체를 앱 안에 포함 (인터넷 없이 동작)
cp "$ROOT/index.html" "$OUT/assets/www/"
cp -r "$ROOT/css" "$ROOT/js" "$ROOT/assets" "$ROOT/data" "$OUT/assets/www/"
# 2) 리소스 컴파일·링크 (매니페스트에 버전 주입)
"$BT/aapt2" compile --dir "$ROOT/android/res" -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$JAR" --manifest "$ROOT/android/AndroidManifest.xml" \
  --java "$OUT/gen" --version-code "$VC" --version-name "$VN" --min-sdk-version 24 --target-sdk-version 34 \
  -A "$OUT/assets" "$OUT/res.zip"
# 3) 자바 컴파일 → dex
javac -encoding UTF-8 -source 1.8 -target 1.8 -Xlint:-options -nowarn -bootclasspath "$JAR:$BT/core-lambda-stubs.jar" -d "$OUT/classes" \
  $(find "$ROOT/android/java" "$OUT/gen" -name '*.java')
# build-tools 34의 d8은 JDK 21이 만든 클래스에서 충돌하므로 최신 R8의 D8을 우선 사용 (없으면 내장 d8)
R8="${R8_JAR:-$SDK/r8/r8.jar}"
if [ -f "$R8" ]; then D8=(java -cp "$R8" com.android.tools.r8.D8); else D8=("$BT/d8"); fi
"${D8[@]}" --release --min-api 24 --lib "$JAR" --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
# 4) 패키징 → 정렬 → 서명
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q "$OUT/unsigned.apk" classes.dex)
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
mkdir -p "$ROOT/releases"
"$BT/apksigner" sign --ks "$KS" --ks-key-alias cisa --ks-pass pass:cisa-master --key-pass pass:cisa-master \
  --out "$ROOT/releases/cisa-master.apk" "$OUT/aligned.apk"
"$BT/apksigner" verify "$ROOT/releases/cisa-master.apk"
echo "완료: releases/cisa-master.apk ($(du -h "$ROOT/releases/cisa-master.apk" | cut -f1)) · v$VN ($VC)"
