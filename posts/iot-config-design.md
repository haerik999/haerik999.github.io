---
title: "설정 관리와 소프트웨어 설계 - IoT 센서 데이터 파이프라인 (4)"
date: 2026-02-23
category: IoT
excerpt: "설정 외부화, 재연결 전략, Graceful Shutdown, 로깅, 에러 처리 - 24시간 운영 가능한 안정적인 IoT 파이프라인을 만드는 설계 원칙을 이해한다."
---

# 설정 관리와 소프트웨어 설계

코드를 작성한 뒤 실제로 운영할 수 있는 수준으로 만들기 위한 설계 개념들을 다룬다. 하드코딩된 IP와 포트를 파일로 분리하고, 연결이 끊겨도 자동으로 복구되며, Ctrl+C를 눌렀을 때 깔끔하게 종료되는 코드를 어떻게 만드는지 이해한다.

이전 글: [[iot-hardware-serial|하드웨어와 시리얼 통신]], [[iot-network-mqtt|네트워크와 MQTT]], [[iot-influxdb-grafana|InfluxDB와 Grafana]]

---

## 파이프라인에서의 위치

이번 글에서 다루는 내용은 Collector와 Writer 컴포넌트 전체에 걸쳐 있다.

```
[Arduino]
     | 시리얼
     v
[Collector]  <-- 설정 파일 읽기, 재연결, 로깅, Graceful Shutdown
     | MQTT Publish
     v
[MQTT 브로커]
     | MQTT Subscribe
     v
[Writer]     <-- 설정 파일 읽기, 에러 처리, Graceful Shutdown
     |
     v
[InfluxDB] -> [Grafana]
```

---

## 설정 외부화

### 문제: 하드코딩의 위험

처음 IoT 파이프라인을 만들면 코드 안에 이런 값들이 박혀 있게 된다.

```python
# collector/main.py - 하드코딩된 상태
MQTT_BROKER = "192.168.0.58"
MQTT_PORT = 1883
SERIAL_PORT = "COM5"
SERIAL_BAUDRATE = 115200
INFLUX_TOKEN = "my-super-secret-token"
```

브로커 IP가 바뀌면 코드를 열어서 수정해야 한다. 더 심각한 문제는 `INFLUX_TOKEN`을 코드에 넣고 GitHub에 올리면 토큰이 그대로 공개된다. 공개 저장소에 한 번 올라간 시크릿은 삭제해도 히스토리에 남는다.

### 해결 원칙: 변하는 것을 분리하라

설정 외부화의 핵심은 "무엇이 변하는가"를 파악하는 것이다.

| 분류 | 예시 | 저장 위치 |
|------|------|----------|
| 일반 설정 | 포트, IP, 토픽 이름, baudrate | `config.yaml` |
| 민감 정보 | 비밀번호, API 토큰 | `.env` (Git 제외) |
| 코드 로직 | 파싱 규칙, 데이터 처리 | `main.py` |

환경이 달라져도 코드 로직은 변하지 않는다. 변하는 것은 어느 서버에, 어느 포트로, 어떤 자격증명으로 접속하느냐다. 이 부분만 분리하면 코드는 그대로 두고 설정 파일만 바꿔서 다른 환경에서 실행할 수 있다.

---

## YAML 설정 파일

### YAML이란

YAML(YAML Ain't Markup Language)은 사람이 읽기 쉬운 데이터 직렬화 형식이다. Mosquitto, InfluxDB, Grafana, Kubernetes 등 거의 모든 현대 인프라 도구가 YAML 설정을 사용한다.

기본 문법은 간단하다. 들여쓰기(2칸 공백)로 계층 구조를 표현하고, `#`으로 주석을 단다.

```yaml
# collector/config.yaml
serial:
  port: 'COM5'
  baudrate: 115200

mqtt:
  broker: '192.168.0.58'
  port: 1883
  topic_prefix: 'sensor'
  # username: "mqtt_user"
  # password: "mqtt_password"
```

### Python에서 읽기

```python
import yaml

with open("config.yaml") as f:
    config = yaml.safe_load(f)

broker = config["mqtt"]["broker"]   # "192.168.0.58"
port = config["mqtt"]["port"]       # 1883
```

`yaml.load()` 대신 반드시 `yaml.safe_load()`를 써야 한다. `yaml.load()`는 YAML 파일에 포함된 임의의 Python 객체를 역직렬화할 수 있어 악의적인 YAML 파일이 코드를 실행할 수 있는 보안 취약점이 된다.

### 다른 형식과의 비교

| 형식 | 장점 | 단점 |
|------|------|------|
| YAML | 사람이 읽기 쉽고, 주석 가능, 계층 구조 자연스러움 | 들여쓰기에 민감 |
| JSON | 어디서나 지원, 엄격한 형식 | 주석 불가, 중괄호가 많아 읽기 불편 |
| INI | 단순함 | 중첩 구조 표현 어려움 |
| TOML | 타입이 명확하고 직관적 | 아직 덜 보편적 |

Python 생태계에서 일반 설정에는 YAML이 사실상 표준이다.

### 자주 하는 실수: 탭 문자

YAML에서 탭 문자는 허용되지 않는다. 들여쓰기는 반드시 공백으로 해야 한다.

```yaml
# 올바름 - 공백 2칸
mqtt:
  broker: '192.168.0.58'

# 오류 - 탭 문자 사용 금지
mqtt:
	broker: '192.168.0.58'
```

탭과 공백이 섞이면 `yaml.scanner.ScannerError`가 발생하는데, 눈으로 구분하기 어려워서 에디터에서 탭을 공백으로 자동 변환하는 설정을 켜두는 것이 좋다.

---

## 환경변수와 .env

### 민감 정보는 YAML도 위험하다

`config.yaml`은 Git에 올리는 파일이다. 토큰이나 비밀번호를 YAML에 넣으면 커밋 히스토리에 영원히 남는다. 민감 정보는 `.env` 파일로 관리하고, `.gitignore`에 `.env`를 추가해서 Git에 올라가지 않도록 해야 한다.

```bash
# .env 파일 (절대 Git에 올리지 않음)
INFLUX_TOKEN=my-super-secret-token
INFLUX_ORG=iot
MQTT_PASSWORD=secret123
```

```python
# Python에서 .env 로드
from dotenv import load_dotenv
import os

load_dotenv()  # .env 파일을 읽어서 환경변수로 등록

token = os.getenv("INFLUX_TOKEN")
if not token:
    raise ValueError("INFLUX_TOKEN 환경변수가 설정되지 않았습니다")
```

`python-dotenv` 라이브러리가 `.env` 파일을 읽어서 `os.environ`에 등록해준다. 이후 `os.getenv()`로 접근하면 된다.

### .env.example: 협업을 위한 템플릿

`.env`는 Git에 올리지 않으므로, 다른 사람이 이 프로젝트를 받으면 어떤 환경변수가 필요한지 알 수 없다. 그래서 실제 값 없이 키 목록만 담은 `.env.example`을 Git에 올린다.

```bash
# .env.example (Git에 올림 - 값은 비워둠)
INFLUX_TOKEN=
INFLUX_ORG=
MQTT_PASSWORD=
```

새로운 개발자는 `.env.example`을 복사해서 `.env`를 만들고 값을 채운다.

### YAML과 .env의 역할 분담

| 항목 | YAML | .env |
|------|------|------|
| MQTT 브로커 IP | O | |
| MQTT 포트 | O | |
| MQTT 비밀번호 | | O |
| InfluxDB URL | O | |
| InfluxDB 토큰 | | O |
| 시리얼 포트 | O | |

판단 기준은 단순하다. Git에 올려도 되는 값은 YAML, 절대 올리면 안 되는 값은 `.env`.

설정값이 적용되는 우선순위는 일반적으로 다음과 같다.

```
실제 환경변수 > .env 파일 > config.yaml > 코드 기본값
```

배포 서버에서는 `.env` 파일 없이 환경변수를 직접 주입하는 방식이 더 일반적이다.

---

## 파이프라인 아키텍처

### 전체 데이터 흐름

데이터가 Arduino에서 Grafana까지 어떻게 흐르는지 전체 그림을 이해해야 문제가 생겼을 때 어느 단계에서 막혔는지 파악할 수 있다.

```
[Arduino + DHT22]
      |
      | 시리얼 UART (USB, 115200bps)
      | 형식: "#T,25.3,24.1\n"
      v
[Python Collector]
      |  - config.yaml에서 설정 읽기
      |  - 시리얼 포트 열기
      |  - 라인 파싱 (#T, #H 구분)
      |  - JSON 페이로드 생성
      | MQTT Publish (QoS 0)
      | 토픽: sensor/temperature, sensor/humidity
      v
[MQTT 브로커 (Mosquitto)]
      |  - 메시지 중계
      |  - 여러 Subscriber에 동시 전달 가능
      | MQTT Subscribe
      v
[Python Writer]
      |  - JSON 페이로드 파싱
      |  - InfluxDB Point 생성
      |  - 시계열 데이터로 저장
      | HTTP API (influxdb-client)
      v
[InfluxDB]
      |  - 시계열 데이터 저장
      |  - Flux 쿼리로 조회
      | HTTP API (쿼리)
      v
[Grafana 대시보드]
      - 실시간 그래프 시각화
```

### 각 컴포넌트의 입출력 경계

각 컴포넌트는 명확한 입력/출력 형식을 가진다. 이 경계를 이해하면 어느 단계에서 데이터 변환이 일어나는지 알 수 있다.

```
Collector 입력:  시리얼 바이트 스트림  "#T,25.3,24.1\n"
Collector 출력:  MQTT JSON  {"ir_temp": 25.3, "ambient_temp": 24.1, "timestamp": "..."}

Writer 입력:     MQTT JSON  {"ir_temp": 25.3, ...}
Writer 출력:     InfluxDB Point  measurement=sensor_data, field=ir_temp, value=25.3
```

Collector 처리 흐름:

```python
# 1단계: 시리얼에서 raw 데이터 읽기
line = ser.readline().decode('utf-8', errors='ignore').strip()

# 2단계: 파싱 (어떤 종류의 데이터인지 구분)
if line.startswith('#T,'):
    parts = line[3:].split(',')
    process_temperature(parts, timestamp)

# 3단계: MQTT로 발행
payload = {"ir_temp": float(parts[0]), "ambient_temp": float(parts[1])}
mqtt_client.publish("sensor/temperature", json.dumps(payload))
```

Writer 처리 흐름:

```python
def on_message(client, userdata, msg):
    # 1단계: MQTT 메시지 수신
    payload = json.loads(msg.payload.decode())

    # 2단계: 토픽 구분
    if msg.topic == "sensor/temperature":

        # 3단계: InfluxDB에 저장
        point = Point("sensor_data").field("ir_temp", payload["ir_temp"])
        write_api.write(bucket=INFLUX_BUCKET, record=point)
```

### 파이프라인 디버깅 순서

Grafana에 데이터가 안 보일 때, 무작정 코드를 뒤지는 것보다 파이프라인을 앞에서 뒤로 순서대로 확인하는 것이 빠르다.

```
1. Arduino 시리얼 출력 확인 (Serial Monitor)
2. Collector 로그 확인 (시리얼 파싱되는지)
3. MQTT 브로커에서 메시지 수신 확인 (mosquitto_sub)
4. Writer 로그 확인 (DB 쓰기 성공하는지)
5. InfluxDB 데이터 확인 (Data Explorer)
```

---

## 느슨한 결합

### 강한 결합의 문제

만약 Collector가 Writer를 직접 호출한다면 어떻게 될까?

```
강한 결합:
Collector --직접 HTTP 호출--> Writer --> InfluxDB
  - Collector가 Writer의 IP, 포트를 알아야 함
  - Writer가 다운되면 Collector도 실패
  - Writer를 2개로 늘리려면 Collector 코드 수정 필요
```

Writer가 재시작되는 10초 동안 Collector도 데이터를 발행하지 못한다. Writer를 두 대로 늘리려면 Collector 코드에 두 번째 Writer 주소를 추가해야 한다.

### MQTT 브로커가 분리자 역할을 한다

```
느슨한 결합 (이 프로젝트):
Collector --> [MQTT 브로커] --> Writer --> InfluxDB
  - Collector는 브로커 주소만 알면 됨
  - Writer가 다운되어도 Collector는 계속 발행
  - Writer 2개를 동시에 붙여도 Collector 코드 변경 없음
```

핵심은 Collector와 Writer가 서로의 존재를 모른다는 것이다.

```python
# Collector는 Writer를 전혀 모름
# 단지 "sensor/temperature" 토픽에 메시지를 보낼 뿐
mqtt_client.publish("sensor/temperature", json.dumps(payload))

# Writer는 Collector를 전혀 모름
# 단지 "sensor/#" 토픽을 구독할 뿐
client.subscribe("sensor/#")
```

### 느슨한 결합의 실용적 이점

| 상황 | 강한 결합 | 느슨한 결합 |
|------|----------|------------|
| Writer 재시작 | Collector 발행 실패 | Collector 영향 없음 |
| Writer 2개로 확장 | Collector 코드 수정 필요 | Collector 코드 변경 없음 |
| Writer를 다른 DB로 교체 | Collector에 새 엔드포인트 추가 | 토픽만 동일하면 투명 |
| 데이터 분석용 구독자 추가 | Collector 수정 필요 | 브로커에 새 구독자만 추가 |

### 트레이드오프: 브로커가 단일 장애점

느슨한 결합이 무조건 좋은 것은 아니다.

| 장점 | 단점 |
|------|------|
| 컴포넌트 독립적 배포/재시작 | 메시지 전달 보장이 복잡해짐 |
| 확장이 쉬움 | 디버깅 시 전체 흐름 추적이 어려움 |
| 한 컴포넌트 장애가 전체로 전파되지 않음 | 브로커 자체가 단일 장애점(SPOF) |

MQTT 브로커가 죽으면 Collector도 Writer도 모두 영향받는다. 소규모 IoT 프로젝트에서는 이 트레이드오프를 받아들이는 것이 현실적이다.

---

## 재연결 전략

### IoT 환경에서 연결은 항상 끊긴다

Arduino를 재부팅하면 시리얼이 끊기고, 네트워크가 일시적으로 불안정하면 MQTT 연결이 끊긴다. 재연결 로직이 없으면 한 번 끊긴 후 프로그램을 수동으로 재시작해야 한다. 24시간 운영하는 IoT 파이프라인에서 이는 허용할 수 없다.

### 재연결 전략의 핵심 요소

1. **감지**: 연결이 끊겼다는 것을 알아야 한다
2. **대기**: 즉시 재시도하면 서버에 부하가 걸리므로 일정 시간 대기
3. **재시도**: 루프로 반복 시도
4. **복구**: 연결 성공 시 정상 동작 재개

### 시리얼 재연결: 중첩 while 루프 패턴

```python
while True:  # 외부 루프 = 시리얼 재연결 루프
    try:
        ser = serial.Serial(SERIAL_PORT, SERIAL_BAUDRATE, timeout=1)
        print(f"[Serial] Connected to {SERIAL_PORT}")

        while True:  # 내부 루프 = 데이터 읽기 루프
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            process_line(line)

    except serial.SerialException as e:
        print(f"[Serial] Error: {e}, retrying in {RECONNECT_DELAY}s")
        time.sleep(RECONNECT_DELAY)
    # SerialException이 발생하면 외부 루프로 돌아가서 재연결 시도
```

내부 루프는 정상 동작 중에 계속 실행된다. 시리얼이 끊기면 `SerialException`이 발생하고, `except` 블록에서 대기 후 외부 루프가 다시 `serial.Serial()`을 호출해 재연결을 시도한다. Arduino를 뽑았다가 다시 꽂으면 자동으로 재연결된다.

### MQTT 재연결: 별도 스레드 패턴

```python
def mqtt_reconnect():
    global mqtt_stop_retry
    while not mqtt_stop_retry:  # 성공할 때까지 루프
        try:
            mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
            mqtt_client.loop_start()
            break  # 성공하면 루프 탈출
        except Exception as e:
            print(f"[MQTT] Failed: {e}, retrying in {RECONNECT_DELAY}s")
            time.sleep(RECONNECT_DELAY)

# 초기 연결 실패 시 별도 스레드에서 재연결 시도
try:
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
except Exception:
    thread = threading.Thread(target=mqtt_reconnect, daemon=True)
    thread.start()
```

MQTT 재연결은 별도 스레드에서 처리한다. 메인 스레드가 시리얼 읽기를 계속하면서, 백그라운드에서 MQTT 재연결을 시도하는 구조다.

`daemon=True`는 중요하다. 메인 프로세스가 종료될 때 이 스레드도 자동으로 종료된다. `daemon=False`이면 재연결 스레드가 살아있어서 Ctrl+C를 눌러도 프로그램이 완전히 종료되지 않는다.

### Exponential Backoff

이 프로젝트는 단순한 고정 대기 방식을 쓴다.

```python
time.sleep(RECONNECT_DELAY)  # 항상 5초
```

더 정교한 방식은 지수 백오프(Exponential Backoff)다. 재시도할수록 대기 시간을 늘려서 서버에 연속적인 요청이 몰리는 것을 방지한다.

```python
# 지수 백오프
delay = min(base_delay * (2 ** attempt), max_delay)
time.sleep(delay)  # 5초 -> 10초 -> 20초 -> ... -> 최대 300초
```

소규모 IoT 프로젝트에서는 고정 대기로도 충분하다. 브로커나 DB가 한동안 다운되더라도 5초마다 재시도하는 것이 운영상 문제가 되지 않는다.

---

## Graceful Shutdown

### 강제 종료의 문제

그냥 프로세스를 강제 종료하면 여러 문제가 생긴다.

- 시리얼 포트가 잠겨서 다음 실행 시 "포트 사용 중" 오류
- MQTT 연결이 제대로 닫히지 않아 브로커에 좀비 세션
- InfluxDB write API를 닫지 않으면 버퍼에 있는 데이터 유실

Graceful Shutdown은 종료 신호를 받았을 때 열린 연결을 닫고 진행 중인 작업을 완료한 뒤 종료하는 것이다.

### 종료 신호의 종류

| 신호 | 발생 | Python 동작 |
|------|------|------------|
| `SIGINT` | Ctrl+C | `KeyboardInterrupt` 예외로 변환 |
| `SIGTERM` | `kill &lt;pid>` | 기본적으로 즉시 종료, signal 핸들러로 처리 가능 |
| `SIGKILL` | `kill -9 &lt;pid>` | 강제 종료, 핸들러 없음 |

### KeyboardInterrupt와 finally

Python에서 Ctrl+C는 `KeyboardInterrupt` 예외로 변환된다. `try/except/finally` 구조로 처리한다.

```python
try:
    while True:
        line = ser.readline()
        process_line(line)

except KeyboardInterrupt:
    print("\nShutting down...")

finally:
    # try/except 어느 경로로 나가든 반드시 실행됨
    ser.close()
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
```

`finally` 블록의 핵심은 예외가 발생하든, 정상 종료되든 반드시 실행된다는 것이다. 리소스 해제 코드는 항상 `finally`에 넣는다.

### Collector의 Graceful Shutdown 구현

중첩 루프 구조에서 Graceful Shutdown은 두 단계로 처리된다.

```python
while True:  # 외부 루프 (시리얼 재연결)
    try:
        ser = serial.Serial(SERIAL_PORT, SERIAL_BAUDRATE, timeout=1)

        try:
            while True:  # 내부 루프 (데이터 읽기)
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                process_line(line)

        except KeyboardInterrupt:     # Ctrl+C 감지 (내부)
            print("\nShutting down...")
            break                      # 외부 루프도 탈출

        finally:
            ser.close()               # 시리얼 포트 닫기

    except KeyboardInterrupt:         # 외부 루프에서도 잡기
        break
    except serial.SerialException as e:
        time.sleep(RECONNECT_DELAY)

# 루프 완전히 종료 후
mqtt_client.loop_stop()
mqtt_client.disconnect()
```

### Writer의 Graceful Shutdown

Writer는 구조가 더 단순하다. `loop_forever()`가 블로킹 호출이어서 Ctrl+C가 거기서 발생한다.

```python
try:
    mqtt_client.loop_forever()

except KeyboardInterrupt:
    print("\nShutting down...")

finally:
    mqtt_client.disconnect()
    influx_client.close()      # InfluxDB 클라이언트 종료 (버퍼 플러시)
```

`influx_client.close()`가 중요하다. InfluxDB Python 클라이언트는 내부적으로 write 요청을 버퍼링할 수 있는데, `close()`를 호출해야 남은 버퍼가 플러시된다. 호출하지 않으면 마지막으로 받은 데이터 일부가 DB에 저장되지 않을 수 있다.

### signal 모듈로 SIGTERM도 처리하기

`systemd`나 Docker로 서비스를 관리하면 종료 시 `SIGTERM`을 보낸다. `KeyboardInterrupt`는 `SIGINT`만 처리하므로, `SIGTERM`도 처리하려면 `signal` 모듈을 써야 한다.

```python
import signal
import sys

def handle_shutdown(signum, frame):
    print("\nShutting down...")
    ser.close()
    mqtt_client.disconnect()
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)
```

---

## 로깅

### print()의 한계

현재 많은 IoT 파이프라인 코드가 전부 `print()`로 상태를 출력한다.

```python
print(f"[MQTT] Connected to {MQTT_BROKER}:{MQTT_PORT}")
print(f"[MQTT] Connection failed: {reason_code}")
print(f"[T] IR: {parts[0]} C | Ambient: {parts[1]} C")
```

`print()`는 두 가지 치명적인 약점이 있다. 타임스탬프가 없어서 언제 연결이 끊겼는지 알 수 없고, 레벨 구분이 없어서 중요한 에러와 일반 정보가 섞인다. 24시간 돌아가는 IoT 파이프라인에서 새벽 3시에 연결이 끊겼다면, 아침에 출근해서 언제 무슨 일이 있었는지 로그로 파악해야 한다.

### logging 모듈

Python 표준 라이브러리의 `logging` 모듈은 이 문제를 해결한다.

**로그 레벨:**

| 레벨 | 값 | 언제 사용 |
|------|-----|---------|
| `DEBUG` | 10 | 세부 내부 동작, 개발 시에만 |
| `INFO` | 20 | 정상 동작 확인 (연결, 데이터 수신) |
| `WARNING` | 30 | 비정상이지만 계속 동작 가능 |
| `ERROR` | 40 | 기능 실패, 처리 필요 |
| `CRITICAL` | 50 | 시스템 중단 수준 |

레벨 설정을 `INFO`로 하면 `DEBUG` 메시지는 출력되지 않는다. 운영 중에는 `INFO`로 설정해서 노이즈를 줄이고, 문제가 생기면 `DEBUG`로 내려서 세부 동작을 확인한다.

### 기본 설정

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)
```

출력 예시:
```
2024-01-15 14:32:01 [INFO] [Serial] Connected to COM5
2024-01-15 14:32:05 [INFO] [T] IR: 25.3 C | Ambient: 24.1 C
2024-01-15 14:35:12 [WARNING] [MQTT] Connection lost, retrying...
2024-01-15 14:35:17 [INFO] [MQTT] Reconnected
2024-01-15 14:40:00 [ERROR] [Serial] Error: device disconnected
```

타임스탬프와 레벨이 자동으로 붙어서 나온다.

### 파일과 콘솔 동시 출력

운영 환경에서는 터미널을 닫아도 로그가 보존되어야 한다. 파일 핸들러를 추가하면 된다.

```python
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# 콘솔 핸들러 (INFO 이상만)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# 파일 핸들러 (DEBUG 이상 전부)
file_handler = logging.FileHandler("collector.log")
file_handler.setLevel(logging.DEBUG)

formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
console_handler.setFormatter(formatter)
file_handler.setFormatter(formatter)

logger.addHandler(console_handler)
logger.addHandler(file_handler)
```

콘솔에는 `INFO` 이상만 출력하고, 파일에는 `DEBUG`까지 모두 기록한다. 평소에는 콘솔에서 간결하게 보고, 문제가 생기면 파일 로그에서 상세 내용을 확인한다.

### print()에서 logging으로 전환

```python
# 기존 (print)
print(f"[MQTT] Connected to {MQTT_BROKER}:{MQTT_PORT}")
print(f"[MQTT] Connection failed: {reason_code}")
print(f"[Serial] Error: {e}")

# 개선 (logging)
logger.info(f"[MQTT] Connected to {MQTT_BROKER}:{MQTT_PORT}")
logger.error(f"[MQTT] Connection failed: {reason_code}")
logger.error(f"[Serial] Error: {e}")
```

---

## 에러 처리 전략

### 에러를 어디서 잡을 것인가

`try/except`를 모든 곳에 넣으면 에러가 조용히 삼켜져서 실제 버그를 발견하기 어렵다. 반대로 하나도 없으면 예상치 못한 곳에서 프로그램이 죽는다. 핵심 원칙은 다음 네 가지다.

1. **복구 가능한 에러는 잡아서 처리**: 시리얼 연결 끊김 → 재시도
2. **복구 불가능한 에러는 위로 올리기**: 잘못된 설정 파일 → 즉시 종료
3. **모든 Exception을 잡는 것은 피하기**: 진짜 버그를 숨김
4. **에러를 잡으면 반드시 로그 남기기**: 조용히 무시하지 않기

### 넓은 예외 vs 좁은 예외

```python
# 나쁜 예 - 모든 예외를 잡음
try:
    process_line(line)
except Exception:
    pass  # 버그도 조용히 삼켜버림

# 좋은 예 - 예상되는 예외만 잡음
try:
    ser = serial.Serial(SERIAL_PORT, SERIAL_BAUDRATE)
except serial.SerialException as e:
    logger.error(f"시리얼 연결 실패: {e}")
    time.sleep(RECONNECT_DELAY)
```

### 에러 처리 위치 결정 기준

에러마다 복구 가능성이 다르다. 그에 따라 잡는 위치도 달라진다.

```
시리얼 연결 실패
  -> 복구 가능 (재시도)
  -> 바깥 루프에서 잡기

MQTT 연결 실패
  -> 복구 가능 (재시도)
  -> 별도 스레드에서 잡기

JSON 파싱 실패 (메시지 하나)
  -> 복구 가능 (그 메시지만 버리고 다음 메시지 처리)
  -> on_message 내부에서 잡기

설정 파일 없음
  -> 복구 불가능 (프로그램 시작 불가)
  -> 잡지 말고 올리기 (프로그램 종료)
```

### 계층적 에러 처리

실제 코드에서는 에러 처리가 계층을 이룬다. 바깥층은 연결 레이어, 안쪽은 데이터 처리 레이어를 담당한다.

```python
# 가장 바깥층 - 프로그램 진입점 (복구 불가능한 에러)
try:
    config = load_config("config.yaml")
except FileNotFoundError:
    print("config.yaml을 찾을 수 없습니다")
    sys.exit(1)

# 중간층 - 연결 레이어 (복구 가능한 에러)
while True:
    try:
        ser = serial.Serial(SERIAL_PORT, SERIAL_BAUDRATE)
    except serial.SerialException as e:
        logger.warning(f"재연결 시도: {e}")
        time.sleep(RECONNECT_DELAY)
        continue

    # 가장 안쪽 - 데이터 처리 레이어 (한 건 실패해도 계속)
    while True:
        try:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            process_line(line)
        except ValueError as e:
            logger.warning(f"파싱 실패, 건너뜀: {e}")  # 한 줄만 버림
```

### writer의 on_message에서 Exception을 잡는 이유

`writer/main.py`의 `on_message`에는 `except Exception`이 허용된다.

```python
def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        point = Point("sensor_data").field("ir_temp", payload["ir_temp"])
        write_api.write(bucket=INFLUX_BUCKET, record=point)
    except Exception as e:
        logger.error(f"메시지 처리 실패: {e}")
        # 이 메시지 실패해도 다음 메시지는 계속 처리됨
```

`on_message`는 MQTT 라이브러리가 호출하는 콜백이다. 여기서 예외가 전파되면 MQTT 구독 루프 자체가 죽을 수 있다. 메시지 하나 처리 실패가 전체 구독을 중단시키지 않도록 보호하는 것이 목적이다. 단, 어떤 에러인지 반드시 로그를 남겨야 한다.

---

## Producer-Consumer 패턴

### 생산자와 소비자

이 파이프라인의 구조를 데이터 흐름 관점에서 보면 Producer-Consumer 패턴이다.

```
[Producer]                     [Consumer]
Collector                      Writer
  |                               |
  |  데이터 생산                    |  데이터 소비
  |  (초당 2개 메시지)               |  (DB 쓰기, 느릴 수 있음)
  |                               |
  +---------- [Queue] -----------+
              MQTT 브로커
              (버퍼 역할)
```

Collector는 시리얼에서 데이터를 읽어서 MQTT에 발행하는 생산자다. Writer는 MQTT에서 메시지를 받아서 DB에 저장하는 소비자다. 그 사이에 MQTT 브로커가 큐 역할을 한다.

### 속도 불일치를 큐가 흡수한다

Collector가 초당 2개의 메시지를 생산하는데, Writer가 DB에 쓰는 속도가 느리다면 어떻게 될까?

```
정상:
Collector: 1초에 메시지 2개 생산
Writer: 1초에 메시지 10개 처리 가능
-> 브로커 큐가 쌓이지 않음, 정상 동작

Writer가 느린 경우:
Collector: 1초에 메시지 2개 생산
Writer: 1초에 메시지 0.5개 처리 (DB가 느림)
-> 브로커 큐 계속 증가 -> 메모리 압박 -> 메시지 유실 가능
-> QoS 1로 높이거나 Writer DB 성능 확인 필요
```

Producer와 Consumer의 처리 속도가 달라도 큐가 일시적인 차이를 흡수한다. 이 때문에 Collector와 Writer를 별도 프로세스로, 심지어 별도 서버에서 실행해도 된다.

### 다양한 큐 구현의 스펙트럼

Producer-Consumer 패턴은 큐의 구현 방식만 다를 뿐, 구조는 동일하다.

```
queue.Queue:  스레드 간 데이터 전달 (프로세스 내부)
MQTT 브로커:  프로세스 간 데이터 전달 (네트워크)
Redis:        서버 간 고속 데이터 전달 (인메모리)
Kafka:        서비스 간 대용량 데이터 전달 (엔터프라이즈)
```

Python 내부에서 스레드로 처리하는 예시:

```python
import queue
import threading

data_queue = queue.Queue()

def producer():
    while True:
        data = read_serial()
        data_queue.put(data)  # 큐에 넣기

def consumer():
    while True:
        data = data_queue.get()  # 큐에서 꺼내기
        write_to_db(data)

threading.Thread(target=producer, daemon=True).start()
threading.Thread(target=consumer, daemon=True).start()
```

MQTT 브로커는 이것을 네트워크 수준으로 확장한 것이다. 개념은 동일하다.

### Pub/Sub과의 관계

Producer-Consumer는 데이터 흐름 관점의 패턴 이름이고, Pub/Sub은 메시징 구조의 이름이다. 동전의 양면이다. MQTT의 Publish가 생산이고, Subscribe가 소비다. MQTT 브로커가 큐(토픽)를 관리한다.

이 패턴 덕분에:
- Collector와 Writer를 서로 다른 터미널에서 따로 시작해도 된다
- Writer를 재시작해도 브로커에 쌓인 메시지가 남아있다 (QoS 1 이상일 때)
- 나중에 데이터 분석용 Consumer를 하나 더 붙여도 Collector 수정이 필요없다

---

## 정리

이번 글에서 다룬 설계 원칙들은 코드를 "동작하게" 만드는 것을 넘어 "운영 가능하게" 만드는 것이다.

| 원칙 | 해결하는 문제 |
|------|-------------|
| 설정 외부화 | 환경이 바뀌어도 코드 수정 없이 실행 가능 |
| YAML / .env | 일반 설정과 민감 정보를 적절한 위치에 관리 |
| 느슨한 결합 | 컴포넌트 독립성, 장애 격리, 확장 용이 |
| 재연결 전략 | 일시적 연결 끊김에도 자동 복구 |
| Graceful Shutdown | 리소스 정리, 데이터 유실 방지 |
| logging 모듈 | 타임스탬프와 레벨을 갖춘 운영 가능한 로그 |
| 에러 처리 전략 | 복구 가능한 에러는 처리, 불가능한 에러는 빠르게 실패 |
| Producer-Consumer | 속도 불일치 흡수, 컴포넌트 독립 실행 |

이 원칙들은 IoT에만 국한된 것이 아니다. 24시간 운영되는 모든 서버 프로세스에 적용된다. IoT 파이프라인은 이 원칙들을 배우기에 구체적이고 명확한 맥락을 제공한다.
