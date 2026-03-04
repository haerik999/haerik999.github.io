---
title: "Godot 4.6 Android APK 빌드 - Headless Export 및 PCK 로딩 이슈"
date: 2026-03-04
category: "Backend/Game"
excerpt: "Godot 4.6.x에서 Android APK를 빌드할 때 발생하는 headless export, PCK 로딩 문제와 실전 해결 방법을 정리합니다."
tags:
  - Godot
  - Android
  - Export
  - Gradle
  - GameDev
---

Godot 4.6.x에서 Android APK를 빌드할 때 발생하는 주요 이슈와 해결 방법을 정리한다.

## 환경

| 항목 | 버전 |
|------|------|
| Godot | 4.6.1 stable |
| OS | Ubuntu Linux (6.8.0-101-generic) |
| Android SDK | ~/Android/Sdk |
| JDK | OpenJDK 21 |
| Build Tools | 35.0.0 |
| NDK | 28.2.13676358 |

---

## 이슈 1: Headless CLI Export의 빈 에러 메시지

### 증상

```bash
godot --headless --export-debug "Android" build/android/game.apk
```

```
Cannot export project with preset 'Android' due to configuration errors:

at: ...
```

`configuration errors:` 뒤에 에러 내용이 출력되지 않는다.

### 원인

Godot 4.6의 알려진 버그. headless 모드에서 설정 유효성 검사 에러 메시지가 빈 문자열로 출력된다.

- [godotengine/godot#1757](https://github.com/godotengine/godot/issues/1757)
- [godotengine/godot#83042](https://github.com/godotengine/godot/issues/83042)

### 효과 없는 시도들

아래 방법들은 모두 이 빈 에러를 해결하지 못한다:

| 시도 | 결과 |
|------|------|
| `editor_settings-4.6.tres`에 keystore 정보 수동 추가 | Godot이 다음 실행 시 해당 항목 삭제 |
| `export_presets.cfg`에 keystore 경로 직접 지정 | 동일한 빈 에러 |
| `GODOT_ANDROID_KEYSTORE_DEBUG_*` 환경 변수 설정 | 동일한 빈 에러 |
| `--editor --quit`으로 reimport 후 재시도 | 동일한 빈 에러 |
| `project.godot`의 `config/features` 버전 수정 | 동일한 빈 에러 |
| `gradle_build/use_gradle_build=true` 활성화 | 동일한 빈 에러 |

### 대응

GUI 에디터에서 익스포트하면 실제 에러 메시지를 확인할 수 있다. CLI로 빌드해야 한다면 Gradle 직접 빌드를 사용한다(아래 해결책 참조).

---

## 이슈 2: APK 내 main.pck를 로딩하지 못하는 문제

### 증상

`--export-pack`으로 .pck 파일을 생성하고 APK의 `assets/main.pck`에 넣은 뒤 실행하면:

```
Couldn't load project data at path '.' (또는 '/'). Is the .pck file missing?
```

### 시도한 방법들

**ZIP 직접 조립:**

```bash
cp android_debug.apk game.apk
zip game.apk assets/main.pck
zipalign -v 4 game.apk game-aligned.apk
apksigner sign --ks debug.keystore game-aligned.apk
```

**Gradle 빌드:**

```bash
unzip android_source.zip -d android/build/
cp game.pck android/build/src/main/assets/main.pck
cd android/build && ./gradlew assembleDebug
```

**noCompress 설정 추가:**

```groovy
android {
    aaptOptions {
        noCompress 'pck'
    }
}
```

`Defl:N`(압축) → `Stored`(비압축)으로 변경 확인 후에도 동일한 에러 발생.

### 근본 원인: Godot 4.6 Android는 main.pck를 탐색하지 않는다

Godot 4.6 소스 코드(`platform/android/java/`, `core/config/project_settings.cpp`) 분석 결과, Android 런타임의 프로젝트 데이터 로딩 순서는 다음과 같다:

| 순서 | 탐색 대상 | 상태 |
|------|----------|------|
| 1 | `--main-pack` 인자 | `disable_path_overrides=yes`로 컴파일되어 비활성화 |
| 2 | 실행 파일과 동일 이름의 .pck | Android에는 독립 실행 파일 없음 |
| 3 | `assets.sparsepck` (4.5+) | 수동 빌드 시 생성되지 않음 |
| 4 | `assets/project.godot` 또는 `assets/project.binary` | 수동 빌드 시 존재하지 않음 |

**`main.pck`를 찾는 로직이 없다.** `--export-pack`으로 생성되는 단일 .pck 파일은 데스크탑/웹 전용 포맷이다.

### 배경: Godot 4.5의 변경사항

Godot 4.5부터 Android 익스포트에 Sparse bundle 포맷이 도입되어, 단일 .pck 방식은 Android에서 더 이상 동작하지 않는다.

- [godotengine/godot#105984](https://github.com/godotengine/godot/pull/105984) - Sparse bundle PCK support
- [godotengine/godot#108805](https://github.com/godotengine/godot/issues/108805) - Android export broken after 4.4.1→4.5
- [godotengine/godot#114528](https://github.com/godotengine/godot/issues/114528) - assets.sparsepck Android export fails

---

## 해결책: 프로젝트 파일을 개별적으로 assets에 복사

APK의 `assets/` 디렉토리에 프로젝트 파일을 개별적으로 배치하고 Gradle로 빌드한다.

### 빌드 스크립트

```bash
#!/bin/bash
set -e

GODOT_PROJECT_DIR="/path/to/your/project"
ANDROID_BUILD_DIR="$GODOT_PROJECT_DIR/android/build"

# 1. assets 디렉토리 초기화
rm -rf "$ANDROID_BUILD_DIR/src/main/assets/"*

# 2. Godot 임포트 캐시 복사
cp -r "$GODOT_PROJECT_DIR/.godot" \
      "$ANDROID_BUILD_DIR/src/main/assets/.godot"

# 3. 프로젝트 파일 복사
cp "$GODOT_PROJECT_DIR/project.godot" \
   "$ANDROID_BUILD_DIR/src/main/assets/"

# 4. 소스 디렉토리들 복사
for dir in scripts scenes assets; do
  if [ -d "$GODOT_PROJECT_DIR/$dir" ]; then
    cp -r "$GODOT_PROJECT_DIR/$dir" \
          "$ANDROID_BUILD_DIR/src/main/assets/$dir"
  fi
done

# 5. .import 파일들 복사 (원본 경로 유지)
find "$GODOT_PROJECT_DIR" \
     -name "*.import" \
     -not -path "*/android/*" \
     -not -path "*/.godot/*" \
     -exec cp --parents {} "$ANDROID_BUILD_DIR/src/main/assets/" \;

# 6. Gradle로 APK 빌드
cd "$ANDROID_BUILD_DIR"
./gradlew assembleStandardDebug \
  -Pexport_package_name=com.example.game \
  -Pexport_version_code=1 \
  -Pexport_version_name=1.0.0 \
  -Pexport_enabled_abis="armeabi-v7a|arm64-v8a" \
  -Pdebug_keystore_file="$HOME/.android/debug.keystore" \
  -Pdebug_keystore_password=android \
  -Pdebug_keystore_alias=androiddebugkey \
  -Pperform_signing=true \
  -Pperform_zipalign=true
```

### config.gradle 설정

`android/build/config.gradle`의 버전을 실제 설치된 SDK에 맞게 수정해야 한다:

```groovy
ext {
    buildToolsVersion = "35.0.0"
    ndkVersion = "28.2.13676358"
    compileSdkVersion = 35
    targetSdkVersion = 35
    minSdkVersion = 21
}
```

설치된 버전 확인:

```bash
ls ~/Android/Sdk/build-tools/
ls ~/Android/Sdk/ndk/
```

### build.gradle 설정

```groovy
android {
    aaptOptions {
        noCompress 'pck'
        noCompress 'so'
    }
}
```

---

## 주의사항 요약

| 항목 | 내용 |
|------|------|
| Headless 빈 에러 | Godot 4.6 알려진 버그. GUI 에디터에서 실제 에러 확인 가능 |
| main.pck 미지원 | Godot 4.6 Android 런타임은 `main.pck`를 탐색하지 않음 |
| `--export-pack` | 데스크탑/웹 전용. Android에서는 개별 파일 배치 필요 |
| `--main-pack` | 4.6 Android 템플릿에서 `disable_path_overrides=yes`로 비활성화 |
| APK 내 .pck 압축 | Godot은 메모리 매핑으로 읽으므로 반드시 비압축(`noCompress`) 필요 |
| config.gradle 버전 | `android_source.zip` 기본값과 설치된 SDK 버전 불일치 가능. 확인 필수 |
| 4.4.x 가이드 | Godot 4.5+에서 Android 익스포트 방식이 변경됨. 이전 가이드 그대로 사용 불가 |

### GUI vs CLI 차이

GUI 에디터 익스포트는 내부적으로 개별 파일 복사 방식을 사용한다. CLI `--export-debug`는 headless 에러 버그로 인해 설정 부족을 알려주지 않고 실패한다. CLI로 빌드하려면 Gradle 직접 빌드를 사용해야 한다.

---

## 참고 링크

- [godotengine/godot#108805](https://github.com/godotengine/godot/issues/108805) - Android export broken after 4.4.1→4.5
- [godotengine/godot#114528](https://github.com/godotengine/godot/issues/114528) - assets.sparsepck Android export fails
- [godotengine/godot#105984](https://github.com/godotengine/godot/pull/105984) - Sparse bundle PCK support PR
- [godotengine/godot#109551](https://github.com/godotengine/godot/issues/109551) - Keystore env var validation issue
- [godotengine/godot#1757](https://github.com/godotengine/godot/issues/1757) - Headless export doesn't show errors
- [godotengine/godot#83042](https://github.com/godotengine/godot/issues/83042)
