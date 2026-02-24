---
title: "네트워크와 MQTT - IoT 센서 데이터 파이프라인 (2)"
date: 2026-02-23
category: IoT
excerpt: "TCP/IP 기초부터 MQTT Pub/Sub 패턴, Mosquitto 브로커, paho-mqtt 라이브러리까지 - 센서 데이터를 네트워크로 전달하는 과정을 이해한다."
order: 2
---

# 네트워크와 MQTT

이 글은 IoT 센서 데이터 파이프라인 시리즈의 두 번째 편이다. [[iot-hardware-serial|하드웨어와 시리얼 통신]]에서 Arduino가 DHT22 센서 데이터를 읽어 UART로 전송하는 과정을 다뤘다면, 이번에는 Python이 받은 그 데이터를 어떻게 네트워크를 통해 브로커로 전달하는지를 다룬다.

파이프라인에서 이 글이 담당하는 구간:

```
[Python 수집기]
     |
     | MQTT Publish
     v
[MQTT 브로커 (Mosquitto)]
     |
     | MQTT Subscribe
     v
[InfluxDB]
```

이 구간을 이해하려면 네트워크의 기본 동작 방식부터 MQTT 프로토콜의 세부 동작까지 단계적으로 살펴봐야 한다.

---

## TCP/IP - 데이터가 네트워크를 통해 전달되는 방식

### 4계층 모델

실제 인터넷은 4계층으로 구성된 TCP/IP 모델을 사용한다.

```
계층           역할                       프로토콜 예시
-------------------------------------------------------------
Application   앱 간 통신                 HTTP, MQTT, FTP
Transport     신뢰성 있는 전달           TCP, UDP
Internet      목적지 주소 지정 및 라우팅  IP
Network       물리적 전송                Ethernet, Wi-Fi
```

MQTT는 Application 계층 프로토콜이다. 그 아래 TCP(Transport)와 IP(Internet)가 실제 전달을 담당한다. Python 수집기가 MQTT 메시지를 보낼 때 일어나는 일을 계층별로 보면:

```
[Python 앱]
  MQTT 메시지 생성
       |
[TCP 계층]
  데이터를 세그먼트로 분할, 순서 번호 부여
  목적지: IP 주소 + 포트 번호
       |
[IP 계층]
  패킷에 출발지/목적지 IP 주소 부착
  라우터를 통해 목적지 네트워크로 전달
       |
[물리 계층]
  전기 신호 또는 전파로 실제 전송
       |
[브로커 수신]
  역순으로 풀어서 MQTT 메시지 복원
```

### IP 주소 - 목적지를 찾는 방법

IP 주소는 네트워크에 연결된 기기를 식별하는 주소다. IPv4 기준으로 점으로 구분된 4개의 숫자 조합이다.

```
192.168.1.100
 |       |
네트워크  호스트
```

주요 IP 범위:

| 범위          | 의미                             |
|---------------|----------------------------------|
| `127.0.0.1`   | 루프백. 자기 자신을 가리킴       |
| `localhost`   | `127.0.0.1`의 이름. 동일한 주소  |
| `192.168.x.x` | 사설 네트워크 (공유기 내부)      |
| `10.x.x.x`    | 사설 네트워크 (회사, 클라우드)   |
| `0.0.0.0`     | 모든 인터페이스. 서버가 어디서든 받겠다는 의미 |

### 포트 - 어떤 프로세스로 보낼지 구분

하나의 컴퓨터에서 여러 프로그램이 동시에 네트워크를 사용할 수 있다. 포트 번호가 어떤 프로그램으로 데이터를 보낼지 구분한다.

```
[컴퓨터 192.168.1.100]
  +-- :1883  ->  Mosquitto (MQTT 브로커)
  +-- :8086  ->  InfluxDB
  +-- :3000  ->  Grafana
  +-- :22    ->  SSH 서버
```

포트 범위는 0에서 65535까지다.

| 범위            | 구분                  | 예시                            |
|-----------------|-----------------------|---------------------------------|
| 0 ~ 1023        | 잘 알려진 포트        | 22(SSH), 80(HTTP), 443(HTTPS)   |
| 1024 ~ 49151    | 등록된 포트           | 1883(MQTT), 8086(InfluxDB), 3000(Grafana) |
| 49152 ~ 65535   | 동적/임시 포트        | 클라이언트 연결 시 OS가 자동 할당 |

MQTT 기본 포트는 1883이다. IANA에 등록된 표준 포트로, Mosquitto 기본 설정도 이 포트를 사용한다. IP 주소와 포트를 합치면 네트워크 통신의 완전한 주소가 된다.

```
127.0.0.1:1883
|         |
IP 주소   포트 번호
```

```python
# paho-mqtt에서 브로커에 연결할 때
client.connect("localhost", 1883, keepalive=60)
#              |           |
#              IP/호스트명  포트 번호
```

---

## TCP vs UDP - MQTT가 TCP를 선택한 이유

### 두 프로토콜의 차이

| 항목           | TCP                       | UDP                  |
|----------------|---------------------------|----------------------|
| 연결 방식      | 연결 지향 (먼저 연결 맺음) | 비연결 (그냥 보냄)   |
| 데이터 순서    | 보장                      | 보장 안 함           |
| 데이터 전달    | 보장 (ACK + 재전송)        | 보장 안 함           |
| 속도           | 상대적으로 느림            | 빠름                 |
| 헤더 크기      | 20바이트 이상              | 8바이트              |
| 사용 예시      | HTTP, MQTT, FTP, SSH      | DNS, 게임, 스트리밍  |

### TCP가 신뢰성을 보장하는 방법

TCP는 데이터를 세그먼트로 분할할 때 각각에 순서 번호를 붙인다. 순서가 바뀌어 도착해도 올바른 순서로 재조립한다. 데이터를 받으면 ACK(확인 응답)를 보내고, 보낸 쪽은 ACK가 오지 않으면 재전송한다.

```
보내는 쪽         받는 쪽
  |--데이터(1)-->|
  |<----ACK(1)--|
  |--데이터(2)-->|
  |   (유실)     |
  |  (타임아웃)  |
  |--데이터(2)-->|  <- 재전송
  |<----ACK(2)--|
```

### MQTT가 TCP를 선택한 이유

센서 데이터 파이프라인에서 UDP를 사용하면:
- 온도 측정값 하나가 유실되면 InfluxDB에 구멍이 생긴다
- 메시지 순서가 바뀌면 시계열 데이터가 오염된다
- 재전송을 MQTT 레벨에서 직접 구현해야 해서 복잡해진다

TCP가 이 모든 것을 자동으로 처리해주므로 MQTT는 TCP 위에서 메시지 라우팅에만 집중할 수 있다. UDP가 더 빠르지만, 데이터 유실이 허용되지 않는 상황에서 속도보다 신뢰성이 우선이다.

MQTT는 TCP의 신뢰성 오버헤드를 보완하기 위해 프로토콜 자체를 최대한 작게 설계했다. MQTT PUBLISH 패킷의 최소 헤더는 2바이트다. HTTP 요청의 최소 헤더가 수십~수백 바이트인 것과 비교하면 IoT 디바이스에서 MQTT가 선호되는 이유가 명확하다.

---

## MQTT 프로토콜

### 탄생 배경

MQTT(Message Queuing Telemetry Transport)는 1999년 IBM이 원격 파이프라인 모니터링을 위해 개발한 프로토콜이다. 위성 링크를 통해 석유 파이프라인을 모니터링하는 환경에서 탄생했다. 당시 조건은 대역폭이 매우 좁고, 배터리로 동작하며, 연결이 불안정한 상황이었다.

2014년 OASIS 표준으로 채택되었고, 현재 IoT 영역의 표준 메시징 프로토콜로 자리 잡았다.

**설계 목표:**
- 최소한의 코드와 메모리 사용
- 불안정한 네트워크에서도 동작
- 배터리 구동 디바이스에서도 사용 가능
- 기기들 간의 느슨한 연결(Decoupling)

### MQTT 버전

| 버전        | 특징                              | 현황          |
|-------------|-----------------------------------|---------------|
| MQTT 3.1    | 초기 버전                         | 레거시        |
| MQTT 3.1.1  | 가장 널리 쓰임                    | 현재 주류     |
| MQTT 5.0    | 사용자 속성, 공유 구독 등 추가    | 최신, 점진적 채택 중 |

이 프로젝트는 MQTT 3.1.1을 사용한다. paho-mqtt 기본값이기도 하다.

### MQTT 패킷 구조

MQTT 메시지는 세 부분으로 구성된다.

```
[Fixed Header] [Variable Header] [Payload]
   최소 2바이트    (패킷 유형별)   실제 데이터
```

MQTT PUBLISH 패킷의 핵심 필드:
- **Topic**: `sensor/temperature` (어디에 보낼지)
- **Payload**: `25.3` (실제 데이터. 텍스트 또는 바이너리)
- **QoS**: 0, 1, 또는 2 (전달 보장 수준)

### HTTP와의 비교

| 항목         | MQTT                    | HTTP                        |
|--------------|-------------------------|-----------------------------|
| 방향         | 양방향 (Push 가능)      | 단방향 (클라이언트 요청만)  |
| 연결         | 지속 연결               | 요청마다 연결               |
| 헤더 크기    | 2바이트 최소            | 수백 바이트                 |
| 용도         | IoT, 실시간 알림        | 웹 API, 파일 전송           |
| 브로커       | 필요 (Mosquitto 등)     | 불필요                      |

---

## Pub/Sub 패턴

### 전통적인 통신 방식과의 차이

직접 통신(Request/Response) 방식에서는 수집기가 InfluxDB의 IP, 포트, 인증 정보를 알아야 한다. InfluxDB가 변경되면 수집기 코드도 바꿔야 하고, 구독자가 여러 개라면 수집기에서 모두 관리해야 한다.

```
직접 통신:
[Python 수집기]  ->  직접 연결  ->  [InfluxDB]

Pub/Sub 방식:
[Python 수집기]  ->  [Mosquitto]  ->  [InfluxDB 저장 스크립트]
   Publisher         Broker              Subscriber
                                ->  [모니터링 스크립트]
                                ->  [알림 스크립트]
```

Pub/Sub 방식에서 수집기는 브로커만 알면 된다. 구독자가 추가/제거되어도 수집기 코드는 변경이 필요 없다.

### 세 역할

**Publisher (발행자)**
- 데이터를 생성하고 특정 토픽으로 발행
- 누가 구독하는지 모름. 구독자가 없어도 발행
- 이 프로젝트: Arduino 데이터를 받아서 MQTT로 발행하는 Python 수집기

**Broker (중개자)**
- 모든 클라이언트의 연결 관리 (인증, 세션 유지)
- Publisher로부터 받은 메시지를 해당 토픽 구독자 모두에게 전달
- 어떤 클라이언트가 어떤 토픽을 구독하는지 목록 관리
- 이 프로젝트: Mosquitto

**Subscriber (구독자)**
- 관심 있는 토픽을 구독 등록
- 해당 토픽에 메시지가 오면 자동으로 수신
- 이 프로젝트: 수신한 데이터를 InfluxDB에 저장하는 스크립트

### 메시지 흐름

```
1. 구독자가 브로커에 SUBSCRIBE 요청
   Subscriber -> Broker: "sensor/temperature 토픽 구독하겠습니다"
   Broker: 구독 목록에 추가

2. 발행자가 메시지 발행
   Publisher -> Broker: PUBLISH sensor/temperature "25.3"

3. 브로커가 구독자에게 전달
   Broker: "sensor/temperature 구독자 찾기..."
   Broker -> Subscriber: PUBLISH sensor/temperature "25.3"
```

### Decoupling의 세 가지 의미

**공간 분리 (Space Decoupling)**
Publisher와 Subscriber가 서로의 IP 주소/포트를 몰라도 된다. 브로커의 주소만 알면 된다.

**시간 분리 (Time Decoupling)**
Publisher와 Subscriber가 동시에 실행 중일 필요가 없다. QoS 1/2 + Clean Session false 설정 시 Publisher가 보낸 메시지를 Subscriber가 나중에 연결해서 받을 수 있다.

**동기화 분리 (Synchronization Decoupling)**
Publisher는 Subscriber의 응답을 기다리지 않는다. 발행하고 바로 다음 작업으로 진행한다.

### 1:N 구조

하나의 Publisher 메시지를 여러 Subscriber가 동시에 받을 수 있다.

```
[Python 수집기]
  PUBLISH sensor/temperature "25.3"
       |
[Mosquitto 브로커]
  +-->  [InfluxDB 저장 스크립트]
  +-->  [Grafana 라이브 모니터링]
  +-->  [임계값 초과 알림 스크립트]
```

수집기 코드는 변경 없이 새 구독자를 언제든 추가할 수 있다.

---

## MQTT 토픽

### 토픽 구조

토픽은 문자열이다. 슬래시(/)를 구분자로 사용해서 계층 구조를 표현한다.

```
sensor/temperature
  |         |
레벨1     레벨2

building/floor1/room3/temperature
    |       |      |       |
  레벨1   레벨2  레벨3   레벨4
```

- 대소문자 구분: `sensor/Temp`와 `sensor/temp`는 다른 토픽
- UTF-8 문자열 지원
- 길이 제한: 65,535바이트 (실제로는 짧게 유지하는 것이 좋다)

### 와일드카드

와일드카드는 구독 시에만 사용 가능하다. 발행(PUBLISH)에는 와일드카드를 사용할 수 없다.

**`+` (단일 레벨 와일드카드)**

한 레벨의 임의의 문자열과 일치한다.

```
구독: sensor/+/temperature

일치:
  sensor/room1/temperature    (OK)
  sensor/room2/temperature    (OK)
  sensor/outdoor/temperature  (OK)

불일치:
  sensor/temperature          (레벨 수가 다름)
  sensor/room1/sub/temperature (중간에 레벨이 더 있음)
```

**`#` (다중 레벨 와일드카드)**

해당 위치 이후 모든 레벨과 일치한다. 반드시 토픽의 마지막에만 사용 가능하다.

```
구독: sensor/#

일치:
  sensor/temperature         (OK)
  sensor/humidity            (OK)
  sensor/room1/temperature   (OK)
  sensor/room1/sub/temp      (OK)

불일치:
  temperature                (sensor/ 로 시작하지 않음)
```

### `$SYS` 토픽

Mosquitto 브로커가 자동으로 발행하는 시스템 정보 토픽이다. `$`로 시작하는 토픽은 특수 취급된다.

```
$SYS/broker/clients/connected   ->  현재 연결된 클라이언트 수
$SYS/broker/messages/received   ->  수신한 메시지 수
$SYS/broker/uptime              ->  브로커 실행 시간
```

`#`으로 구독해도 `$SYS` 토픽은 포함되지 않는다. 명시적으로 `$SYS/#`로 구독해야 한다.

---

## MQTT QoS

QoS(Quality of Service)는 메시지 전달 보장 수준을 결정한다.

### QoS 0 - 최대 1번 (At Most Once)

메시지를 한 번 보내고 끝. 확인하지 않는다.

```
Publisher          Broker          Subscriber
    |                |                 |
    |-- PUBLISH -->  |                 |
    |                |-- PUBLISH -->   |
    |                |                 |
```

Publisher → Broker 구간과 Broker → Subscriber 구간 모두에서 유실될 수 있다. 재전송이 없어서 가장 빠르다. 유실이 허용되는 실시간 스트리밍처럼 초당 수십 개 이상의 데이터에 적합하다.

### QoS 1 - 최소 1번 (At Least Once)

받았다는 확인(PUBACK)을 받을 때까지 재전송한다.

```
Publisher          Broker          Subscriber
    |                |                 |
    |-- PUBLISH -->  |                 |
    |<-- PUBACK --   |                 |
    |                |-- PUBLISH -->   |
    |                |<-- PUBACK --    |
```

최소 한 번은 반드시 전달된다. 네트워크 불안정으로 PUBACK이 유실되면 메시지를 중복 전송할 수 있다. Subscriber가 같은 메시지를 두 번 받을 수 있다. 이 프로젝트에서 사용하는 레벨이다.

### QoS 2 - 정확히 1번 (Exactly Once)

4단계 핸드셰이크로 정확히 한 번만 전달을 보장한다.

```
Publisher          Broker          Subscriber
    |                |                 |
    |-- PUBLISH -->  |                 |
    |<-- PUBREC --   |                 |
    |-- PUBREL -->   |                 |
    |<-- PUBCOMP --  |                 |
    |                |-- PUBLISH -->   |
    |                |  (동일 과정)    |
```

중복도 유실도 없이 정확히 1번 전달한다. 가장 느리고 오버헤드가 크다. 금융 거래나 중요 명령어 등에 사용한다.

### QoS 레벨 비교

| 항목           | QoS 0     | QoS 1     | QoS 2       |
|----------------|-----------|-----------|-------------|
| 전달 보장      | 없음      | 최소 1번  | 정확히 1번  |
| 중복 가능성    | 없음      | 있음      | 없음        |
| 유실 가능성    | 있음      | 없음      | 없음        |
| 메시지 교환    | 1회       | 2회       | 4회         |
| 속도           | 가장 빠름 | 중간      | 가장 느림   |

### QoS 다운그레이드

Publisher가 QoS 1로 발행하더라도 Subscriber가 QoS 0으로 구독하면, Broker는 낮은 쪽인 QoS 0으로 전달한다.

```
Publisher PUBLISH QoS=1  ->  Broker
Subscriber SUBSCRIBE QoS=0
-> Broker에서 Subscriber로 전달 시: QoS=0 (낮은 쪽 적용)
```

전체 파이프라인에서 원하는 QoS를 보장하려면 Publisher와 Subscriber 모두 동일한 QoS를 사용해야 한다.

### 이 프로젝트에서 QoS 1을 선택한 이유

- **QoS 0 탈락**: 센서 데이터 유실이 누적되면 시계열 데이터에 구멍이 생긴다
- **QoS 2 탈락**: 수백 ms 단위로 측정하는 센서 데이터에 4-way 핸드셰이크는 과도한 오버헤드
- **QoS 1 선택**: 중복 수신은 InfluxDB에서 타임스탬프 기준으로 덮어쓰기 되므로 문제없음

---

## Mosquitto 브로커

Mosquitto는 Eclipse 재단의 오픈소스 MQTT 브로커다. 가볍고 설치가 간단하며 MQTT 3.1.1을 완전히 지원한다.

### 역할

```
[Python 수집기]          [Mosquitto 브로커]        [저장 스크립트]
  PUBLISH ----------->  메시지 수신              SUBSCRIBE
  sensor/temp "25.3"   구독자 목록 조회   ---->  on_message() 호출
                        일치하는 구독자에 전달
```

브로커의 핵심 기능:
- 클라이언트 연결 관리 (인증, 세션 유지)
- 구독 목록 관리 (어떤 클라이언트가 어떤 토픽을 구독하는지)
- 메시지 라우팅 (받은 메시지를 구독자에게 전달)
- QoS 처리 (PUBACK 전송, 재전송 관리)

### 설치

**Linux (Ubuntu/Debian)**

```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
```

**macOS**

```bash
brew install mosquitto
```

**Windows**

Eclipse Mosquitto 공식 사이트(mosquitto.org)에서 설치 파일을 다운로드한다.

### 실행 및 상태 확인

```bash
# 서비스로 실행
sudo systemctl start mosquitto
sudo systemctl enable mosquitto   # 부팅 시 자동 시작

# 상태 확인
sudo systemctl status mosquitto

# 포그라운드 실행 (로그 보면서 테스트)
mosquitto -v   # -v: verbose 로그
```

### 설정 파일

**위치:**
- Linux: `/etc/mosquitto/mosquitto.conf`
- macOS: `/opt/homebrew/etc/mosquitto/mosquitto.conf`
- Windows: `C:\Program Files\mosquitto\mosquitto.conf`

**이 프로젝트의 최소 설정:**

```conf
# mosquitto.conf

# 리스닝 포트
listener 1883

# 인증 없이 연결 허용 (개발용)
allow_anonymous true

# 로그 설정
log_type all
log_dest stdout
```

**인증 추가 시:**

```conf
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
```

```bash
# 사용자 추가
sudo mosquitto_passwd -c /etc/mosquitto/passwd myuser
```

### 명령줄 테스트 도구

`mosquitto-clients` 패키지에 포함된 도구로 브로커 동작을 빠르게 확인할 수 있다.

```bash
# 터미널 1: 구독
mosquitto_sub -h localhost -p 1883 -t "sensor/#" -v
#             |호스트        |포트  |토픽        |verbose

# 터미널 2: 발행
mosquitto_pub -h localhost -p 1883 -t "sensor/temperature" -m "25.3"
#             |호스트        |포트  |토픽                   |메시지
```

터미널 1에서 `sensor/temperature 25.3`이 출력되면 브로커가 정상 동작 중이다.

### 브로커 동작 확인 체크리스트

```bash
# 1. 프로세스 실행 중인지
ps aux | grep mosquitto

# 2. 포트 열려있는지
netstat -an | grep 1883

# 3. 로그 확인 (서비스 모드)
sudo journalctl -u mosquitto -f

# 4. 구독/발행 테스트
mosquitto_sub -h localhost -t "test" &
mosquitto_pub -h localhost -t "test" -m "hello"
```

파이프라인 문제 발생 시 가장 먼저 Mosquitto 상태를 확인한다. 브로커가 실행 중이지 않으면 수집기와 저장 스크립트 모두 동작할 수 없다.

---

## MQTT 연결과 재연결

### 연결 수립 과정

MQTT 연결은 두 단계다.

**1단계: TCP 3-way handshake**

```
Client -> Server: TCP SYN
Server -> Client: TCP SYN-ACK
Client -> Server: TCP ACK
(TCP 연결 완료)
```

**2단계: MQTT CONNECT/CONNACK**

```
Client -> Broker: CONNECT
  {
    client_id: "arduino-collector",
    clean_session: true,
    keepalive: 60,
    username: (옵션),
    password: (옵션)
  }

Broker -> Client: CONNACK
  {
    return_code: 0  (성공)
  }
```

CONNACK 코드:
- `0`: 연결 성공
- `1`: 지원하지 않는 프로토콜 버전
- `2`: 클라이언트 ID 거부
- `3`: 브로커 사용 불가
- `4`: 잘못된 사용자명/비밀번호
- `5`: 인가되지 않음

### Keep-Alive

MQTT는 지속 연결(persistent connection)을 사용하므로 연결이 살아있는지 확인하는 메커니즘이 필요하다.

```
keepalive = 60초  ->  60초마다 PINGREQ/PINGRESP 교환

Client -> Broker: PINGREQ
Broker -> Client: PINGRESP
```

keepalive 시간의 1.5배 동안 아무 메시지도 없으면 브로커가 연결을 끊는다. 데이터를 자주 발행한다면 데이터 자체가 "살아있음" 신호이므로 PINGREQ/PINGRESP는 생략될 수 있다.

### 자동 재연결

Arduino → Python → MQTT 파이프라인은 24시간 동작해야 한다. 네트워크가 잠깐 끊기거나 브로커가 재시작되면 연결이 끊길 수 있다. 자동 재연결을 구현하지 않으면 수동 재시작이 필요한 상황이 생긴다.

```python
import paho.mqtt.client as mqtt

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"예기치 않은 연결 끊김: {rc}")
        # paho-mqtt가 자동으로 reconnect() 시도

client = mqtt.Client()
client.on_disconnect = on_disconnect

# 재연결 간격 설정: 최소 1초, 최대 30초 (지수 백오프)
client.reconnect_delay_set(min_delay=1, max_delay=30)

client.connect("localhost", 1883, keepalive=60)
client.loop_start()  # 백그라운드 스레드에서 자동 재연결 포함한 네트워크 루프
```

### loop_forever() vs loop_start()

| 방식             | 특징                                        | 사용 시점                                |
|------------------|---------------------------------------------|------------------------------------------|
| `loop_forever()` | 블로킹. 현재 스레드에서 네트워크 루프 실행  | 메인 루프가 MQTT인 경우                  |
| `loop_start()`   | 논블로킹. 백그라운드 스레드 생성            | 시리얼 읽기와 MQTT를 병행하는 경우       |
| `loop()`         | 수동으로 한 번만 처리                       | 커스텀 루프 구현 시                      |

Python 수집기는 시리얼 포트를 읽으면서 동시에 MQTT 통신도 해야 하므로 `loop_start()`가 적합하다. 저장 스크립트처럼 MQTT 수신이 주 역할이면 `loop_forever()`를 사용한다.

### 재연결 시 구독 복원

`clean_session=True`(기본값)이면 재연결 시 브로커에 저장된 구독 정보가 사라진다. 재연결 콜백에서 다시 구독해야 한다.

```python
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("브로커 연결 성공")
        # 재연결 포함 모든 연결 시 구독 재등록
        client.subscribe("sensor/#", qos=1)

client.on_connect = on_connect
```

`on_connect` 콜백에서 구독을 등록하면 최초 연결과 재연결 모두에서 구독이 유지된다. 구독 코드를 `on_connect` 밖에 두면 재연결 후 구독이 복원되지 않는 버그가 발생한다.

---

## paho-mqtt 라이브러리

paho-mqtt는 Eclipse Paho 프로젝트의 Python MQTT 클라이언트 라이브러리다. MQTT 연결/발행/구독을 몇 줄의 코드로 구현할 수 있다.

```bash
pip install paho-mqtt
```

### 콜백 기반 동작

paho-mqtt는 콜백(callback) 기반으로 동작한다. 이벤트가 발생하면 등록된 함수가 호출된다.

```python
import paho.mqtt.client as mqtt

# 1. 클라이언트 생성
client = mqtt.Client(client_id="my-client")

# 2. 콜백 등록
client.on_connect = on_connect_callback
client.on_message = on_message_callback
client.on_disconnect = on_disconnect_callback

# 3. 브로커 연결
client.connect("localhost", 1883, keepalive=60)

# 4. 네트워크 루프 시작
client.loop_forever()   # 블로킹
# 또는
client.loop_start()     # 논블로킹 (백그라운드 스레드)
```

### 콜백 함수

**on_connect** - 브로커 연결/재연결 시 호출된다.

```python
def on_connect(client, userdata, flags, rc):
    # rc: 연결 결과 코드 (0=성공)
    if rc == 0:
        print("연결 성공")
        client.subscribe("sensor/#", qos=1)  # 연결 시 구독 등록
    else:
        print(f"연결 실패: {rc}")
```

**on_message** - 구독한 토픽에 메시지가 수신될 때 호출된다.

```python
def on_message(client, userdata, message):
    # message.topic: 수신된 토픽 문자열
    # message.payload: 수신된 메시지 (bytes)
    # message.qos: QoS 레벨
    # message.retain: 리테인 메시지 여부

    topic = message.topic
    payload = message.payload.decode("utf-8")
    print(f"수신: {topic} = {payload}")
```

**on_disconnect** - 연결이 끊어질 때 호출된다.

```python
def on_disconnect(client, userdata, rc):
    if rc == 0:
        print("정상 종료")
    else:
        print(f"비정상 연결 끊김: {rc}")
```

**on_publish** - 발행한 메시지의 전달이 완료될 때 호출된다. QoS 1이면 PUBACK 수신 후, QoS 2이면 PUBCOMP 수신 후다.

```python
def on_publish(client, userdata, mid):
    # mid: 메시지 ID
    print(f"메시지 {mid} 전달 완료")
```

### Publish

```python
# 기본 발행
result = client.publish(topic, payload, qos=0, retain=False)
# result: (rc, mid) 튜플

# 예시
client.publish("sensor/temperature", "25.3", qos=1)

# JSON 발행
import json
data = {"value": 25.3, "unit": "celsius", "timestamp": 1700000000}
client.publish("sensor/temperature", json.dumps(data), qos=1)
```

### Subscribe

```python
# 단일 토픽 구독
client.subscribe("sensor/temperature", qos=1)

# 와일드카드 구독
client.subscribe("sensor/#", qos=1)

# 여러 토픽 동시 구독
client.subscribe([
    ("sensor/temperature", 1),
    ("sensor/humidity", 1),
    ("sensor/pressure", 0),
])
```

### 전체 Publisher 예시

```python
import paho.mqtt.client as mqtt
import json
import time

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("브로커 연결 성공")
    else:
        print(f"연결 실패: {rc}")

client = mqtt.Client(client_id="sensor-publisher")
client.on_connect = on_connect
client.reconnect_delay_set(min_delay=1, max_delay=30)
client.connect("localhost", 1883, keepalive=60)
client.loop_start()

try:
    while True:
        data = {"value": 25.3, "unit": "celsius"}
        client.publish("sensor/temperature", json.dumps(data), qos=1)
        time.sleep(1)
except KeyboardInterrupt:
    client.loop_stop()
    client.disconnect()
```

### 전체 Subscriber 예시

```python
import paho.mqtt.client as mqtt
import json

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        client.subscribe("sensor/#", qos=1)

def on_message(client, userdata, message):
    topic = message.topic
    try:
        payload = json.loads(message.payload.decode("utf-8"))
        print(f"{topic}: {payload}")
        # InfluxDB에 저장하는 코드
    except json.JSONDecodeError as e:
        print(f"JSON 파싱 실패: {e}")

client = mqtt.Client(client_id="influxdb-subscriber")
client.on_connect = on_connect
client.on_message = on_message
client.reconnect_delay_set(min_delay=1, max_delay=30)
client.connect("localhost", 1883, keepalive=60)
client.loop_forever()
```

---

## 토픽 설계와 Payload

### 이 프로젝트의 토픽 구조

```
sensor/
  +-- temperature    ->  온도 데이터
  +-- humidity       ->  습도 데이터
```

| 토픽                  | 데이터       |
|-----------------------|--------------|
| `sensor/temperature`  | 온도 측정값  |
| `sensor/humidity`     | 습도 측정값  |

`sensor/` 계층을 앞에 두는 이유는 나중에 `actuator/`, `status/` 등 다른 종류를 추가할 수 있고, `sensor/#` 하나로 모든 센서 데이터를 구독할 수 있기 때문이다.

### Payload 형식 - JSON

```json
{"value": 25.3, "unit": "celsius", "timestamp": 1700000000}
```

```json
{"value": 60.1, "unit": "percent", "timestamp": 1700000000}
```

단순히 숫자만 보낼 수도 있지만 JSON을 사용하는 이유:
- 단위 정보를 포함할 수 있다
- 타임스탬프를 명시하면 지연 전달 시에도 정확한 시간이 기록된다
- 나중에 필드를 추가하기 쉽다

### 구독 패턴

```python
# 모든 센서 데이터 한 번에 구독
client.subscribe("sensor/#", qos=1)

# 처리 시 토픽으로 구분
def on_message(client, userdata, message):
    topic = message.topic

    if topic == "sensor/temperature":
        process_temperature(message.payload)
    elif topic == "sensor/humidity":
        process_humidity(message.payload)
```

`sensor/#` 구독 덕분에 나중에 `sensor/pressure` 토픽이 추가되어도 구독 코드는 그대로이고 `on_message`에 처리 로직만 추가하면 된다.

### 확장 시나리오

**센서 추가 시:**

```
sensor/temperature  (기존)
sensor/humidity     (기존)
sensor/pressure     (신규 추가)
sensor/co2          (신규 추가)
```

구독 코드 변경: 없음 (`sensor/#`가 자동으로 포함)
발행 코드: 새 토픽만 추가

```python
# 신규 발행만 추가
client.publish("sensor/pressure", json.dumps(pressure_data), qos=1)
```

**여러 Arduino로 확장 시:**

```
device/arduino01/sensor/temperature
device/arduino02/sensor/temperature
```

```python
device_id = "arduino01"
client.publish(f"device/{device_id}/sensor/temperature", payload, qos=1)

# 모든 기기 구독
client.subscribe("device/+/sensor/temperature", qos=1)
# 또는
client.subscribe("device/#", qos=1)
```

### 피해야 할 토픽 설계

```
# 너무 짧고 의미 불명확
t
d/t
sensor

# 불필요하게 긴 계층
home/building/floor1/room1/device/arduino/sensor/temperature/celcius/raw

# 공백 또는 특수문자 포함
sensor temperature    <- 공백 금지
sensor#temperature    <- 와일드카드 문자 토픽에 사용 금지

# 슬래시로 시작
/sensor/temperature   <- 불필요한 빈 최상위 레벨 생성
```

YAGNI 원칙: 지금 필요하지 않은 계층은 추가하지 않는다. 단일 Arduino, 단일 위치인 이 프로젝트에서는 `sensor/temperature`처럼 단순한 구조가 적절하다.

---

## Client ID

### 역할

MQTT 브로커에 연결할 때 각 클라이언트는 자신을 식별하는 고유한 문자열을 제공한다.

```
Client -> Broker: CONNECT
  {
    client_id: "arduino-collector",  <- 이것
    ...
  }
```

- 브로커는 클라이언트 ID로 세션을 관리한다
- MQTT 3.1.1 기준 최대 23바이트 (브로커에 따라 더 길게 허용)
- 영문자, 숫자, `-`, `_` 사용을 권장한다

### ID 중복 시 동작

동일한 Client ID로 새 클라이언트가 연결을 시도하면 기존 연결이 강제 종료된다.

```
[기존 클라이언트] ---- 연결 중 ---- [브로커]
                                        |
[새 클라이언트] ---- CONNECT -----> [브로커]
                                        |
                            기존 연결 강제 종료
                                        |
[기존 클라이언트] <-- DISCONNECT -- [브로커]
[새 클라이언트] ---- 연결 수립 ---- [브로커]
```

이후 기존 클라이언트가 자동 재연결을 시도하면 또 새 클라이언트를 밀어낸다. 두 클라이언트가 번갈아가며 서로를 밀어내는 "연결 전쟁"이 발생할 수 있다.

Mosquitto 로그에서 이 상황이 보인다:

```
New client connected from 127.0.0.1 as arduino-collector
Client arduino-collector already connected, new client disconnecting old.
```

### 해결 방법

**방법 1: 고정 ID + 중복 실행 방지 (이 프로젝트 권장)**

```python
# 역할별로 고정 ID 사용
COLLECTOR_CLIENT_ID = "arduino-collector"
SUBSCRIBER_CLIENT_ID = "influxdb-subscriber"
```

역할이 명확히 분리된 경우 고정 ID가 오히려 유리하다. 브로커 로그에서 어떤 클라이언트인지 바로 알 수 있다.

**방법 2: 무작위 ID (테스트 스크립트용)**

```python
import uuid

client_id = f"test-{uuid.uuid4().hex[:8]}"
client = mqtt.Client(client_id=client_id)
# 예: "test-a3f9c2d1"
```

**방법 3: 빈 문자열 (브로커가 자동 생성)**

```python
client = mqtt.Client(client_id="")
# paho-mqtt가 내부적으로 무작위 ID 생성
```

빈 문자열은 `clean_session=True`와 함께 사용해야 한다. `clean_session=False`에 빈 ID를 사용하면 브로커가 거부할 수 있다.

### Clean Session과의 관계

```python
# clean_session=True (기본값)
# 연결 종료 시 브로커가 세션 정보(구독 목록, 미전달 메시지) 삭제
client = mqtt.Client(client_id="my-client", clean_session=True)

# clean_session=False
# 연결 종료 후에도 세션 정보 유지. 재연결 시 이어서 수신 가능
# -> Client ID가 고정되어 있어야 의미 있음
client = mqtt.Client(client_id="my-client", clean_session=False)
```

이 프로젝트는 `clean_session=True` + 고정 ID 조합을 사용한다. 세션 지속성보다 단순성을 우선하기 때문이다. 재연결 시 구독 복원은 `on_connect` 콜백에서 처리한다.

---

## 전체 구조 정리

이 글에서 다룬 모든 개념이 합쳐지면 다음 파이프라인이 완성된다.

```
[Arduino]
  DHT22 센서 읽기
  UART 전송 (9600bps, 8N1)
       |
       | 시리얼 통신
       v
[Python 수집기]
  pyserial로 수신
  JSON 파싱
  paho-mqtt로 발행
  client_id: "arduino-collector"
  topic: "sensor/temperature", QoS=1
       |
       | TCP 연결 (127.0.0.1:1883)
       | MQTT PUBLISH
       v
[Mosquitto 브로커]
  메시지 수신
  구독자 목록 조회
  QoS 1 PUBACK 전송
       |
       | MQTT PUBLISH
       v
[저장 스크립트]
  client_id: "influxdb-subscriber"
  topic: "sensor/#", QoS=1 구독
  on_connect에서 구독 등록
  on_message에서 InfluxDB 저장
       |
       | HTTP API
       v
[InfluxDB]
  시계열 데이터 저장
```

네트워크 계층에서 보면 Python 수집기와 Mosquitto 브로커, 저장 스크립트가 모두 같은 컴퓨터(127.0.0.1)에서 실행된다. TCP/IP는 루프백 인터페이스를 통해 처리되므로 실제 네트워크 하드웨어를 거치지 않는다.

---

## 관련 문서

- [[iot-hardware-serial|하드웨어와 시리얼 통신]] - Arduino와 Python 사이의 UART 통신
- [[iot-influxdb-grafana|InfluxDB와 Grafana]] - 수신한 데이터를 시계열 DB에 저장하고 시각화
- [[iot-config-design|설정 관리와 소프트웨어 설계]] - 파이프라인 전체의 설정 외부화와 아키텍처 패턴
