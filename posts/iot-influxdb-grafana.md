---
title: "InfluxDB와 Grafana - IoT 센서 데이터 파이프라인 (3)"
date: 2026-02-23
category: IoT
excerpt: "시계열 데이터의 개념부터 InfluxDB 데이터 모델, Grafana 대시보드 구성까지 - 센서 데이터를 저장하고 시각화하는 과정을 이해한다."
order: 3
---

# InfluxDB와 Grafana - IoT 센서 데이터 파이프라인 (3)

이 글은 IoT 센서 데이터 파이프라인 시리즈의 세 번째 글이다. [[iot-hardware-serial|하드웨어와 시리얼 통신]]에서는 Arduino가 DHT22 센서 데이터를 읽어 UART로 전송하는 방법을, [[iot-network-mqtt|네트워크와 MQTT]]에서는 Python이 그 데이터를 받아 MQTT로 브로커에 발행하는 과정을 다뤘다. [[iot-config-design|설정 관리와 소프트웨어 설계]]에서는 파이프라인 전체를 유지보수 가능한 구조로 만드는 방법을 살펴봤다.

이번 글에서는 파이프라인의 후반부를 다룬다. MQTT 브로커에 쌓인 메시지를 구독하여 InfluxDB에 저장하고, Grafana로 시각화하는 과정이다.

```
[MQTT 브로커]
     |
     | MQTT Subscribe
     v
[Python Writer]
     |
     | HTTP API (influxdb-client)
     v
[InfluxDB]
     |
     | Flux Query
     v
[Grafana 대시보드]
```

---

## 시계열 데이터란

센서가 보내는 온도와 습도 데이터는 **시계열 데이터(Time Series Data)**다. 정의하자면, 시간 순서로 인덱싱된 데이터 포인트의 연속이다. 각 포인트는 "언제(timestamp)"와 "무엇(value)"으로 구성된다.

```
시각        값
-----------------------
10:00:00    25.3 C
10:00:01    25.4 C
10:00:02    25.2 C
10:00:03    25.5 C
```

일반 DB의 행이 "사물"을 나타낸다면, 시계열 데이터의 각 포인트는 "어떤 사물의 특정 시점 상태"를 나타낸다. 시계열 데이터에는 네 가지 뚜렷한 특징이 있다.

**시간이 기본 축이다.** 타임스탬프가 없으면 의미가 없다. "온도 25.3도"만으로는 언제 측정한 것인지 알 수 없다.

**Append-only 패턴이다.** 센서는 계속 새로운 측정값을 생성한다. 과거 데이터를 수정하거나 삭제하는 경우는 거의 없다. 일반 DB는 INSERT, UPDATE, DELETE가 고르게 발생하지만, 센서 DB는 INSERT만 발생한다.

**최신 데이터가 가장 중요하다.** 대부분의 쿼리는 "최근 1시간", "오늘" 같은 최신 범위를 조회한다. 1년 전 데이터를 초 단위로 조회하는 경우는 드물다.

**시간이 지나면 정밀도를 낮춰도 된다(다운샘플링).** 실시간 모니터링에는 초 단위 데이터가 필요하지만, 3개월 전 트렌드를 보려면 분 단위 평균으로도 충분하다.

```
raw 데이터 (1초 간격):  하루 = 86,400개 포인트
다운샘플링 후 (1분 평균): 하루 = 1,440개 포인트 (60배 압축)
```

---

## 왜 RDBMS가 아닌 시계열 DB인가

"그냥 MySQL 쓰면 안 되나?"라는 질문을 자주 받는다. 기술적으로는 가능하지만, 시계열 워크로드에서 세 가지 문제가 생긴다.

**대량 INSERT 성능 저하.** 센서가 초당 1회 전송하면 하루에 86,400개의 행이 쌓인다. RDBMS는 INSERT 시마다 B-Tree 인덱스를 재조정하는 오버헤드가 발생한다. 데이터가 쌓일수록 인덱스 재조정 비용이 커진다.

**시간 기반 쿼리의 비효율.** `WHERE recorded_at >= NOW() - INTERVAL 1 HOUR` 같은 쿼리를 효율적으로 처리하려면 시간 컬럼에 인덱스가 필요하다. RDBMS는 시간이 항상 증가하는 성질을 특별히 활용하지 않는다.

**데이터 보존 관리의 어려움.** "30일이 지난 데이터는 자동으로 삭제하고 싶다"는 요구사항에서, RDBMS는 별도의 삭제 스크립트와 cron 스케줄러가 필요하다. 대량 DELETE는 테이블 락을 걸어 서비스에 영향을 줄 수 있다.

시계열 DB는 이 세 가지를 전용 최적화로 해결한다.

**LSM Tree 구조(쓰기 최적화).** 새 데이터를 먼저 메모리(MemTable)에 쓰고 임계치에 도달하면 디스크에 순차 기록한다. 랜덤 쓰기보다 순차 쓰기가 훨씬 빠르므로 대량 INSERT 성능이 향상된다.

```
새 데이터 --> MemTable (메모리)
                  |
                  v (임계치 도달 시 flush)
             SSTable Level 0 (디스크, 순차 기록)
                  |
                  v (Compaction)
             SSTable Level 1 ...
```

**시간 기반 인덱싱.** 타임스탬프를 기본 키의 핵심 요소로 설계하여 시간 범위 쿼리가 효율적이다. 데이터를 시간 순서대로 물리적으로 저장하므로 범위 스캔이 빠르다.

**TTL(Time To Live) 기반 자동 삭제.** Bucket에 Retention Policy를 설정하면 기간이 지난 데이터가 자동으로 삭제된다. 별도 스케줄러 없이 백그라운드에서 효율적으로 처리된다.

```
Bucket Retention: 30d  ->  30일 후 자동 삭제
```

---

## InfluxDB 개요

InfluxDB는 Go 언어로 작성된 오픈소스 시계열 데이터베이스다. IoT, 인프라 모니터링, 실시간 분석 분야에서 가장 널리 사용되는 시계열 DB 중 하나다.

버전에 따라 설계 철학이 크게 다르다. 1.x는 InfluxQL(SQL 유사 문법)을 사용하고 사용자명/비밀번호로 인증한다. 2.x는 함수형 쿼리 언어인 Flux, 토큰 기반 인증, 통합 웹 UI를 도입하여 단순한 DB를 넘어 통합 IoT/모니터링 플랫폼으로 진화했다.

이 프로젝트는 InfluxDB 2.x를 사용한다. 2.x의 세 가지 핵심 개념을 먼저 이해해야 한다.

**Organization(조직):** 멀티테넌트 관리 단위다. 하나의 인스턴스에 여러 조직이 독립적으로 존재할 수 있다. 이 프로젝트는 `org = "iot"`를 사용한다.

**Bucket(버킷):** 데이터를 담는 컨테이너다. Organization 아래에 존재하며 Retention Policy를 포함한다. 이 프로젝트는 `bucket = "sensor_data"`를 사용한다.

**Token(토큰):** API 접근 권한을 부여하는 인증 키다. Read/Write 권한을 분리할 수 있다. 이 프로젝트는 학습용으로 `"my-super-secret-token"`을 사용한다.

Docker로 실행하면 `http://localhost:8086`에서 웹 UI에 접근할 수 있다. Data Explorer에서 Flux 쿼리를 직접 작성해 데이터를 확인하거나, Buckets 메뉴에서 저장된 데이터를 탐색할 수 있다.

Docker 초기 설정은 환경변수로 자동화된다.

```yaml
# docker-compose.yml
environment:
  - DOCKER_INFLUXDB_INIT_MODE=setup
  - DOCKER_INFLUXDB_INIT_USERNAME=admin
  - DOCKER_INFLUXDB_INIT_PASSWORD=password
  - DOCKER_INFLUXDB_INIT_ORG=iot
  - DOCKER_INFLUXDB_INIT_BUCKET=sensor_data
  - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=my-super-secret-token
```

`DOCKER_INFLUXDB_INIT_MODE=setup`을 설정하면 컨테이너 최초 실행 시 한 번만 초기화 작업을 수행한다. 두 번째 실행부터는 건너뛴다.

---

## InfluxDB 데이터 모델

InfluxDB의 데이터 구조는 `Bucket > Measurement > (Tag Set + Field Set + Timestamp)` 계층으로 이루어진다.

RDBMS와 용어를 비교하면 이해하기 쉽다.

| InfluxDB 용어  | RDBMS 비유              | 설명                              |
|----------------|-------------------------|-----------------------------------|
| Bucket         | Database                | 데이터 컨테이너, Retention 포함    |
| Measurement    | Table                   | 측정 대상의 이름                   |
| Tag            | 인덱싱된 VARCHAR 컬럼    | 메타데이터, 문자열만 허용, 인덱싱됨 |
| Field          | 인덱싱되지 않은 컬럼     | 실제 측정값, 다양한 타입 허용      |
| Timestamp      | 기본 키의 일부           | 나노초 단위, 모든 포인트에 필수    |
| Point          | Row                     | measurement + tags + fields + ts  |

각 데이터 포인트(Point)의 구조는 다음과 같다.

```
+-------------------------------------------------------------+
|                           Point                             |
|                                                             |
|  Measurement: "sensor_data"                                 |
|  Tags:        type="temperature"                            |
|  Fields:      ir_temp=25.3, ambient_temp=24.1               |
|  Timestamp:   1706000000000000000 (nanoseconds)             |
+-------------------------------------------------------------+
```

**Series**는 `measurement + tag set`의 고유 조합이다. 이 프로젝트에서는 두 개의 Series가 존재한다.

```
Measurement: sensor_data
|-- Series 1: type=temperature
|   Fields: ir_temp (float), ambient_temp (float)
|
+-- Series 2: type=humidity
    Fields: humidity (float), ambient_temp (float)
```

같은 Series 안의 포인트들은 시간 순서대로 물리적으로 연속 저장되므로 시간 범위 쿼리가 빠르다.

---

## Measurement

Measurement는 RDBMS의 테이블에 해당하는 개념이다. 같은 종류의 데이터를 담는 이름 공간으로, 스키마가 고정되지 않아 유연하게 필드를 추가할 수 있다는 점이 테이블과 다르다.

Measurement를 설계하는 방식은 크게 두 가지다.

**방식 1: 데이터 종류별로 Measurement 분리**

```python
Point("temperature_data").field("ir_temp", 25.3)
Point("humidity_data").field("humidity", 65.2)
```

각 센서 유형마다 별도의 Measurement를 만든다. 쿼리가 단순해지지만 Measurement가 많아진다.

**방식 2: 하나의 Measurement에 Tag로 구분 (이 프로젝트)**

```python
Point("sensor_data").tag("type", "temperature").field("ir_temp", 25.3)
Point("sensor_data").tag("type", "humidity").field("humidity", 65.2)
```

하나의 Measurement 아래 Tag로 종류를 구분한다. 관리가 단순해지지만 쿼리 시 Tag 필터가 필요하다. 이 프로젝트는 센서 종류가 두 가지로 제한되어 있어 이 방식이 적합하다.

Flux 쿼리에서 Measurement를 필터링할 때는 `r["_measurement"]`를 사용한다.

```text
from(bucket: "sensor_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "sensor_data")
```

---

## Tag vs Field

InfluxDB 데이터 모델에서 가장 중요한 구분이다. 잘못 설계하면 쿼리가 느려지거나 고 카디널리티 문제로 메모리가 폭증한다.

**Tag의 특징:**
- 문자열(string)만 허용
- 인덱싱됨 - WHERE 조건에서 빠르게 필터링 가능
- 카디널리티가 낮아야 함 - 고유 값의 수가 수십~수백 이하여야 함
- 변경이 거의 없는 메타데이터에 적합

**Field의 특징:**
- float, integer, string, boolean 모두 허용
- 인덱싱 안 됨 - 조건 검색보다는 집계(평균, 합계)에 사용
- 실제 측정된 숫자 값을 저장하는 곳
- 값이 무한히 변해도 됨

선택 기준을 정리하면 이렇다.

| 기준                          | Tag  | Field |
|-------------------------------|------|-------|
| WHERE 절에서 자주 필터링?      | 예   | 아니오 |
| 값이 숫자나 소수?              | 아니오 | 예  |
| 값의 종류가 수십~수백 이하?    | 예   | 아니오 |
| 거의 변하지 않는 메타데이터?   | 예   | 아니오 |

**고 카디널리티(High Cardinality) 주의:** Tag의 고유 값 수가 너무 많으면 Series 수가 폭발적으로 증가하여 메모리 사용량이 급증한다.

```
안전한 Tag (저 카디널리티):
  type: "temperature" | "humidity"  -->  고유 값 2개  -->  Series 2개

위험한 Tag (고 카디널리티):
  user_id: "u001", "u002", ..., "u100000"  -->  Series 10만 개
  timestamp를 tag에 넣는 경우  -->  고유 값 무한  -->  심각한 문제
```

이 프로젝트 규모(센서 1~2개)에서는 해당 없지만, 장치 수가 수백 개로 늘어날 때 `device_id`를 Tag에 넣으면 문제가 생길 수 있다.

Flux 쿼리에서 Tag와 Field는 다른 방식으로 필터링한다.

```text
|> filter(fn: (r) => r["type"] == "temperature")   // Tag 필터: 빠름 (인덱스)
|> filter(fn: (r) => r["_field"] == "ir_temp")     // Field 필터: 어떤 필드를 가져올지
|> mean()                                           // Field 값 집계
```

---

## Timestamp

시계열 데이터의 핵심 축이다. InfluxDB는 기본적으로 **나노초(nanosecond) 정밀도의 UNIX 에포크 시간**을 사용한다.

```
나노초:    1706000000000000000  (19자리)
마이크로초: 1706000000000000   (16자리)
밀리초:    1706000000000        (13자리)
초:        1706000000           (10자리)

  -->  1706000000초 = 2024-01-23T12:53:20Z
```

초당 1회 수집하는 센서 데이터는 나노초 정밀도가 필요 없다. `WritePrecision.SECONDS`로 정밀도를 낮출 수 있다.

```python
from influxdb_client import WritePrecision

write_api.write(bucket=BUCKET, record=point, precision=WritePrecision.SECONDS)
```

Python에서 타임스탬프를 생성할 때는 반드시 UTC를 사용해야 한다.

```python
from datetime import datetime, timezone

# 권장: timezone-aware UTC datetime 객체
timestamp = datetime.now(timezone.utc)
point.time(timestamp)

# 타임존 정보 없는 datetime (잘못된 방법)
timestamp = datetime.now()  # KST라면 9시간 어긋남!
```

타임존 정보가 없는 datetime 객체를 사용하면 InfluxDB가 UTC로 해석하지만 실제 로컬 시간으로 저장되어 시간이 어긋난다. Grafana에서 차트의 시간이 맞지 않게 표시된다.

이 프로젝트는 MQTT 페이로드에 타임스탬프를 포함하여 정확한 측정 시각을 보존한다.

```python
# collector/main.py (MQTT 발행 측)
payload = {
    "ir_temp": ir_temp,
    "ambient_temp": ambient_temp,
    "timestamp": datetime.now(timezone.utc).isoformat()
    # --> "2024-01-23T10:00:00+00:00"
}

# writer/main.py (InfluxDB 기록 측)
timestamp = payload.get("timestamp")
point = Point("sensor_data") \
    .tag("type", "temperature") \
    .field("ir_temp", payload["ir_temp"]) \
    .time(timestamp)  # MQTT 메시지의 타임스탬프 사용
```

---

## Line Protocol

InfluxDB HTTP API로 데이터를 쓸 때 사용하는 텍스트 포맷이다. Python의 `Point` 객체는 내부적으로 Line Protocol 문자열로 변환되어 HTTP POST로 전송된다.

```
measurement,tag1=val1,tag2=val2 field1=val1,field2=val2 timestamp
```

구분자:
- **쉼표(,)**: measurement와 첫 tag, tag들 사이를 구분
- **공백( )**: tag set과 field set을 구분, field set과 timestamp를 구분
- **등호(=)**: 키와 값을 구분

실제 예시:

```
# 온도 데이터
sensor_data,type=temperature ir_temp=25.3,ambient_temp=24.1 1706000000000000000

# 습도 데이터
sensor_data,type=humidity humidity=65.2,ambient_temp=24.1 1706000001000000000
```

Field 값의 타입은 표기 방식으로 구분한다.

```
field_float = 25.3        <- float (소수점 있으면 자동으로 float)
field_int   = 100i        <- integer (끝에 'i' 붙임)
field_str   = "hello"     <- string (따옴표로 감쌈)
field_bool  = true        <- boolean (true/false)
```

Python 라이브러리가 자동으로 변환해주므로 직접 표기할 일은 드물지만, HTTP API를 직접 호출할 때 알아야 한다.

`Point` 객체와 Line Protocol의 대응 관계:

```python
point = Point("sensor_data") \
    .tag("type", "temperature") \
    .field("ir_temp", 25.3) \
    .field("ambient_temp", 24.1) \
    .time(1706000000000000000)

# 위 코드가 생성하는 Line Protocol:
# sensor_data,type=temperature ir_temp=25.3,ambient_temp=24.1 1706000000000000000
```

라이브러리 없이도 curl로 데이터를 직접 넣을 수 있다. 파이프라인 테스트나 디버깅 시 유용하다.

```bash
curl -X POST "http://localhost:8086/api/v2/write?org=iot&bucket=sensor_data&precision=ns" \
  -H "Authorization: Token my-super-secret-token" \
  -H "Content-Type: text/plain; charset=utf-8" \
  --data-binary "sensor_data,type=temperature ir_temp=25.3,ambient_temp=24.1 1706000000000000000"
```

---

## influxdb-client Python 라이브러리

Python에서 InfluxDB에 데이터를 쓰는 공식 클라이언트 라이브러리다. `InfluxDBClient`, `Point`, `WriteApi`가 핵심이다.

```python
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
from datetime import datetime, timezone

# 1. 클라이언트 생성
client = InfluxDBClient(
    url="http://localhost:8086",
    token="my-super-secret-token",
    org="iot"
)

# 2. Write API 생성
write_api = client.write_api(write_options=SYNCHRONOUS)

# 3. 데이터 포인트 생성 (메서드 체이닝)
point = Point("sensor_data") \
    .tag("type", "temperature") \
    .field("ir_temp", 25.3) \
    .field("ambient_temp", 24.1) \
    .time(datetime.now(timezone.utc))

# 4. 저장
write_api.write(bucket="sensor_data", record=point)

# 5. 사용 후 닫기
client.close()
```

`Point` 클래스는 메서드 체이닝 패턴을 사용한다. 각 메서드가 `self`를 반환하므로 연속 호출이 가능하다. `.time()`에는 datetime 객체, ISO 8601 문자열, MQTT 페이로드의 타임스탬프 문자열 모두 넘길 수 있다.

**SYNCHRONOUS vs BATCHING 모드**

SYNCHRONOUS는 호출 즉시 HTTP 요청으로 전송한다. 완료될 때까지 블로킹된다.

BATCHING은 내부 버퍼에 쌓다가 일정 조건(개수 또는 시간 간격)이 되면 한꺼번에 전송한다.

| 구분            | SYNCHRONOUS     | BATCHING               |
|----------------|-----------------|------------------------|
| 지연            | 즉시 전송        | 최대 flush_interval 지연 |
| 성능            | 포인트당 1번 요청 | 여러 포인트를 묶어 1번   |
| 데이터 손실 위험 | 낮음             | 버퍼 손실 가능           |
| 적합한 상황      | 빈도 낮음, 단순   | 초당 수백 포인트 이상     |

이 프로젝트는 센서 데이터가 초당 1~2회로 빈도가 낮고, MQTT 메시지를 받으면 즉시 DB에 기록하는 것이 논리적으로 명확하기 때문에 SYNCHRONOUS 모드를 사용한다.

```python
# writer/main.py의 실제 코드
INFLUX_URL = "http://localhost:8086"
INFLUX_ORG = "iot"
INFLUX_BUCKET = "sensor_data"
INFLUX_TOKEN = "my-super-secret-token"

influx_client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
write_api = influx_client.write_api(write_options=SYNCHRONOUS)

def on_message(client, userdata, msg):
    payload = json.loads(msg.payload)
    timestamp = payload.get("timestamp")

    if msg.topic == "sensor/temperature":
        point = Point("sensor_data") \
            .tag("type", "temperature") \
            .field("ir_temp", payload["ir_temp"]) \
            .field("ambient_temp", payload["ambient_temp"]) \
            .time(timestamp)
        write_api.write(bucket=INFLUX_BUCKET, record=point)
```

---

## Bucket과 Organization

Organization과 Bucket은 모든 연결 설정에서 반복적으로 등장하는 두 개념이다.

**Organization(조직)**은 멀티테넌트 환경을 지원하기 위한 최상위 관리 단위다. 하나의 InfluxDB 인스턴스에 여러 조직이 독립적으로 존재할 수 있다.

```
InfluxDB 인스턴스
|-- Organization: iot          <- 이 프로젝트
|   |-- Bucket: sensor_data
|   +-- Bucket: sensor_archive
|
+-- Organization: web_team     <- 다른 팀/프로젝트
    +-- Bucket: nginx_logs
```

**Bucket(버킷)**은 데이터를 담는 컨테이너다. RDBMS의 데이터베이스와 유사하지만 **Retention Policy가 내장**된다는 점이 다르다.

Retention Policy는 데이터를 얼마나 오래 보관할지 결정하는 정책이다.

```
설정 예시:
- "30d"  -->  30일 후 자동 삭제
- "168h" -->  7일 후 자동 삭제
- "0"    -->  무기한 보관

실무 패턴:
sensor_data (raw)         -->  Retention: 7d   (실시간 조회용)
sensor_archive (1분 평균) -->  Retention: 365d  (장기 트렌드용)
```

이 프로젝트는 학습용으로 Retention을 무기한(`0`)으로 설정한다.

중요한 점은 세 곳의 설정값이 반드시 일치해야 한다는 것이다. 하나라도 다르면 연결 오류가 발생한다.

| 설정 위치                                    | org 설정                       | bucket 설정                              |
|----------------------------------------------|-------------------------------|------------------------------------------|
| docker-compose.yml                           | DOCKER_INFLUXDB_INIT_ORG=iot  | DOCKER_INFLUXDB_INIT_BUCKET=sensor_data  |
| writer/main.py                               | INFLUX_ORG = "iot"            | INFLUX_BUCKET = "sensor_data"            |
| grafana/provisioning/datasources/influxdb.yml | organization: iot             | defaultBucket: sensor_data               |

---

## Grafana 개요

Grafana는 오픈소스 시각화 플랫폼이다. 여기서 중요한 점은 **Grafana는 데이터를 저장하지 않는다**는 것이다. 순수한 시각화 도구다.

데이터는 InfluxDB, Prometheus, MySQL 같은 외부 시스템에 있고, Grafana는 그것을 쿼리하여 화면에 그린다.

```
[InfluxDB]  <--  데이터 저장
     ^
     |  Flux 쿼리 (5초마다)
     v
[Grafana]   <--  시각화만 담당
```

세 가지 핵심 개념을 이해해야 한다.

**Datasource(데이터 소스):** Grafana가 데이터를 가져오는 외부 시스템을 등록한 것이다. InfluxDB, Prometheus, MySQL, Elasticsearch 등 수백 개의 플러그인을 지원한다.

**Dashboard(대시보드):** 여러 패널을 배치한 화면이다. URL로 공유할 수 있고 JSON으로 export/import가 가능하다.

**Panel(패널):** 대시보드 내의 개별 차트/위젯이다. 각 패널은 독립적인 쿼리와 시각화 설정을 가진다.

Grafana는 `access: proxy` 모드로 동작한다. 브라우저는 Grafana에만 접근하고, Grafana가 InfluxDB에 직접 쿼리한다. 이를 통해 InfluxDB 토큰이 브라우저에 노출되지 않는다.

```
사용자 브라우저
    |
    | HTTP (http://localhost:3000)
    v
Grafana 서버
    |
    | Flux 쿼리 (http://influxdb:8086)
    v
InfluxDB 서버
```

---

## Grafana 데이터소스 연결

Grafana가 InfluxDB에서 데이터를 읽기 위한 연결 설정이다. 이 프로젝트는 YAML 파일로 데이터소스를 코드로 관리한다(프로비저닝).

```yaml
# grafana/provisioning/datasources/influxdb.yml
apiVersion: 1

datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy               # Grafana가 InfluxDB에 중계
    url: http://influxdb:8086   # Docker 내부 서비스명 사용
    jsonData:
      version: Flux             # 쿼리 언어
      organization: iot
      defaultBucket: sensor_data
      tlsSkipVerify: true
    secureJsonData:
      token: my-super-secret-token   # 암호화 저장
    isDefault: true
    editable: true
```

`url: http://influxdb:8086`에서 `localhost`가 아닌 `influxdb`를 사용하는 이유가 있다. Docker Compose 환경에서 Grafana 컨테이너 입장에서 `localhost`는 자기 자신이다. Docker는 같은 Compose 네트워크 내의 서비스를 서비스명으로 접근할 수 있게 해준다.

```yaml
# docker-compose.yml에서 서비스명이 influxdb로 정의됨
services:
  influxdb:
    image: influxdb:2.7
  grafana:
    # grafana 컨테이너에서 "influxdb"로 접근 가능
```

`secureJsonData.token`에 민감 정보를 넣어야 Grafana 내부 DB에 암호화 저장된다. `jsonData`에 넣으면 평문으로 저장된다.

이 설정 파일이 있으면 `docker-compose up` 시 데이터소스가 자동으로 등록된다.

---

## Grafana 패널 (Time Series)

Time Series 패널은 시간을 X축, 측정값을 Y축으로 하는 선 그래프 패널이다. Grafana에서 실시간 모니터링에 가장 많이 사용되는 패널 유형이다.

```
+----------------------------------------------+
|  IR Temperature                              |
|                                              |
|  C                                           |
|  30|                    .                    |
|  28|              .  .   . .                 |
|  26|     .  . ..         .                   |
|  24|  .                                      |
|    +----------------------------------- time |
|     10:00  10:15  10:30  10:45  11:00        |
+----------------------------------------------+
```

패널의 JSON 설정 구조:

```json
{
  "id": 1,
  "title": "IR Temperature",
  "type": "timeseries",
  "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
  "targets": [
    {
      "datasource": { "uid": "InfluxDB" },
      "query": "from(bucket: ...) ...",
      "refId": "A"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "celsius",
      "custom": {
        "drawStyle": "line",
        "fillOpacity": 10,
        "lineWidth": 1,
        "lineInterpolation": "linear"
      }
    }
  }
}
```

**gridPos - 패널 위치와 크기:** Grafana는 24컬럼 그리드 시스템을 사용한다.

```
전체 너비: 24 단위
+----------------------+----------------------+
|   w:12, x:0, y:0     |   w:12, x:12, y:0    |
+--------+-------------+--------+--------------+
|  w:8   |     w:8              |    w:8        |
|  x:0   |     x:8              |    x:16       |
|  y:8   |     y:8              |    y:8        |
+--------+----------------------+---------------+
```

이 프로젝트의 6개 패널 배치:

```
y=0  +-------------------------+-------------------------+
     | IR Temperature          | Ambient Temperature     |
     | w:12, x:0, y:0          | w:12, x:12, y:0         |
y=8  +-------------------------+--------+--------+-------+
     | Humidity                |Curr IR |Curr Am |Curr Hu|
     | w:12, x:0, y:8          |w:4,x:12|w:4,x:16|w:4,x:20|
     +-------------------------+--------+--------+-------+
```

**fieldConfig - 시각화 옵션:**

`unit`은 Grafana 단위 코드다. 값 뒤에 단위를 자동으로 표시한다.

```
"celsius"   -->  25.3 C
"humidity"  -->  65.2%
"percent"   -->  78.5%
```

`drawStyle`은 그래프 표시 방식이다.

```
"line"   -->  선으로 연결      ---*---*---*
"bar"    -->  막대 그래프
"points" -->  점만 표시         *   *   *
```

**targets - Flux 쿼리:**

각 패널은 하나 이상의 쿼리를 가진다. IR Temperature 패널의 쿼리:

```text
from(bucket: "sensor_data")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "sensor_data")
  |> filter(fn: (r) => r["type"] == "temperature")
  |> filter(fn: (r) => r["_field"] == "ir_temp")
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
  |> yield(name: "mean")
```

`v.timeRangeStart`, `v.timeRangeStop`, `v.windowPeriod`는 Grafana가 타임피커 상태에 따라 자동으로 주입하는 변수다. 타임피커를 "Last 6h"로 바꾸면 쿼리를 수정하지 않아도 자동으로 해당 범위를 조회한다.

이 프로젝트의 하단 3개 패널(현재값 표시)은 **Stat 패널**을 사용한다. 가장 최근 값 하나만 표시하므로 쿼리도 다르다.

```text
// Stat 패널용 쿼리 - aggregateWindow 대신 last() 사용
from(bucket: "sensor_data")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "sensor_data")
  |> filter(fn: (r) => r["type"] == "temperature")
  |> filter(fn: (r) => r["_field"] == "ir_temp")
  |> last()
```

---

## Grafana 대시보드 구성

대시보드는 패널들을 배치하고 자동 새로고침, 시간 범위 등을 설정한 화면이다. JSON 파일로 코드 관리(프로비저닝)가 가능하다.

**Dashboard JSON 최상위 구조:**

```json
{
  "title": "Sensor Data Dashboard",
  "uid": "sensor_data",
  "refresh": "5s",
  "time": {
    "from": "now-1h",
    "to": "now"
  },
  "panels": [ ... ]
}
```

**자동 갱신(`refresh`):** `"5s"`로 설정하면 Grafana가 5초마다 모든 패널의 쿼리를 재실행하여 최신 데이터를 표시한다. 값이 너무 작으면 InfluxDB에 부하가 증가하므로 데이터 수집 주기에 맞춰 설정한다.

**시간 범위(`time`):** 대시보드 최초 로드 시 기본으로 표시하는 시간 범위다. Flux 쿼리의 `v.timeRangeStart`와 `v.timeRangeStop`이 이 값과 연동된다.

**프로비저닝(코드로 대시보드 관리):**

프로비저닝은 YAML/JSON 파일로 Grafana 설정을 코드로 관리하는 방법이다. 재현성, 버전 관리, 팀 공유, CI/CD 자동화 모두 가능해진다.

```
grafana/
|-- provisioning/
|   |-- datasources/
|   |   +-- influxdb.yml        <- 데이터 소스 설정
|   +-- dashboards/
|       +-- dashboard.yml       <- 대시보드 로더 설정
+-- dashboards/
    +-- sensor.json             <- 실제 대시보드 JSON
```

대시보드 로더 설정:

```yaml
# grafana/provisioning/dashboards/dashboard.yml
apiVersion: 1

providers:
  - name: 'Sensor Dashboards'
    type: file
    updateIntervalSeconds: 10       # 파일 변경 감지 주기
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

`updateIntervalSeconds: 10`으로 `sensor.json`을 수정하면 10초 내에 Grafana에 자동 반영된다.

Docker Compose에서는 볼륨 마운트로 호스트 파일을 컨테이너에 연결한다.

```yaml
# docker-compose.yml
grafana:
  volumes:
    - grafana-data:/var/lib/grafana
    - ./grafana/provisioning:/etc/grafana/provisioning
    - ./grafana/dashboards:/var/lib/grafana/dashboards
```

호스트의 `./grafana/` 디렉토리가 컨테이너 안으로 마운트된다. 호스트에서 파일을 수정하면 컨테이너 안에서도 바로 변경된다.

---

## 파이프라인 전체 흐름 정리

여기까지 배운 내용을 파이프라인 관점에서 다시 한번 정리한다.

```
[Arduino + DHT22]
     |
     | UART (시리얼 통신, 초당 1회)
     v
[Python Collector]
     |
     | MQTT Publish (sensor/temperature, sensor/humidity)
     v
[Mosquitto MQTT Broker]
     |
     | MQTT Subscribe
     v
[Python Writer]
     |
     | HTTP POST (Line Protocol)
     | Point("sensor_data").tag("type", ...).field(...)
     v
[InfluxDB:8086]
     |
     | Flux Query (5초마다)
     | from(bucket) |> range() |> filter() |> aggregateWindow()
     v
[Grafana:3000]
     |
     | HTTP
     v
[브라우저 대시보드]
```

각 단계를 연결하는 핵심 설정:

```
InfluxDB 연결:
  URL:    http://localhost:8086 (writer) / http://influxdb:8086 (grafana)
  Token:  my-super-secret-token
  Org:    iot
  Bucket: sensor_data

데이터 구조:
  Measurement: sensor_data
  Tags:        type = "temperature" | "humidity"
  Fields:      ir_temp, ambient_temp, humidity (float)
  Timestamp:   UTC, 나노초
```

이 파이프라인이 완성되면 Arduino 센서의 온도/습도 데이터가 실시간으로 Grafana 대시보드에 표시된다. 센서 데이터 수집부터 저장, 시각화까지의 전체 흐름을 이해했다면 여기서 확장하는 것도 어렵지 않다. 알림 설정(Grafana Alerting), 다운샘플링(InfluxDB Tasks), 다중 센서 지원 등이 자연스러운 다음 단계다.
