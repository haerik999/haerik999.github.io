---
title: "하드웨어와 시리얼 통신 - IoT 센서 데이터 파이프라인 (1)"
date: 2026-02-23
category: IoT
excerpt: "MCU, Arduino, DHT22 센서에서 Python까지 - 물리적 센서 데이터가 코드로 전달되는 과정을 이해한다."
---

# 하드웨어와 시리얼 통신

이 글은 IoT 센서 데이터 파이프라인 시리즈의 첫 번째 파트다. DHT22 온습도 센서에서 측정한 값이 Arduino를 거쳐 USB 케이블을 통해 Python 코드에 도달하기까지의 전 과정을 다룬다.

```
[DHT22 센서] --> [Arduino MCU] --> [USB 시리얼] --> [Python Collector]
```

데이터가 물리적 센서에서 출발해 소프트웨어에 도달하는 이 여정은 하드웨어, 전기 회로, 통신 프로토콜, 그리고 Python 라이브러리가 모두 맞물려 동작하는 과정이다. 각 구성 요소가 왜 존재하는지, 어떻게 맞물리는지를 이해하면 센서 파이프라인 전체가 명확하게 보인다.

다음 파트: [[iot-network-mqtt|네트워크와 MQTT]], [[iot-influxdb-grafana|InfluxDB와 Grafana]], [[iot-config-design|설정 관리와 소프트웨어 설계]]

---

## MCU - 모든 것의 중심

MCU(Microcontroller Unit)는 CPU, 메모리, I/O 주변장치가 하나의 실리콘 다이에 통합된 소형 컴퓨터다. Arduino Uno에 탑재된 ATmega328P가 대표적인 MCU다.

| 구성 요소 | 역할 | Arduino Uno(ATmega328P) |
|----------|------|------------------------|
| CPU | 명령어 실행 | 16MHz |
| Flash 메모리 | 프로그램 저장 | 32KB |
| SRAM | 런타임 데이터 | 2KB |
| 주변장치 | GPIO, UART, ADC, Timer | 내장 |

일반 PC의 CPU(예: Intel i7)는 메모리와 I/O 칩이 모두 별도로 존재한다. MCU는 이 모든 것을 하나의 칩에 집어넣어 외부 부품 없이 독립적으로 동작한다. 그 덕분에 크기가 손톱만큼 작고 전력 소비도 수 mW 수준이다.

MCU의 핵심 제약은 SRAM이다. 2KB라는 크기는 Python 코드 한 줄이 사용하는 메모리보다 작다. 이 제약이 나중에 프로토콜 설계 결정에 직접적인 영향을 준다.

---

## Arduino - MCU를 쉽게 쓰기 위한 보드

Arduino는 MCU 칩을 개발자가 쉽게 사용할 수 있도록 만든 개발 보드다. MCU 칩만 있으면 전원 회로, 클럭 회로, 프로그래밍 인터페이스를 직접 구성해야 한다. Arduino가 이 과정을 모두 해결해준다.

| 구성 요소 | 설명 |
|----------|------|
| MCU | ATmega328P (Uno 기준) |
| USB-to-Serial 칩 | CH340 또는 ATmega16U2 - PC와 통신 담당 |
| 전원 레귤레이터 | USB 5V 또는 DC 어댑터를 안정적인 전압으로 변환 |
| 디지털/아날로그 핀 | 센서, LED, 모터 연결 |
| 크리스탈 오실레이터 | 16MHz 클럭 신호 생성 |

**스케치 업로드 과정:**

1. PC에서 Arduino IDE로 C++ 코드(스케치) 작성
2. USB로 연결 - CH340이 USB를 UART로 변환
3. MCU 내부 부트로더가 코드를 Flash에 저장
4. 리셋 후 스케치 실행

이 프로젝트에서 Arduino는 DHT22 센서에서 온습도를 읽고, 결과를 USB 시리얼로 PC에 전송하는 역할을 담당한다.

---

## GPIO - 코드로 역할을 정하는 핀

GPIO(General Purpose Input/Output)는 MCU에 달린 핀으로, 소프트웨어가 핀의 역할을 결정한다. 고정된 기능이 아니라 코드에서 입력 또는 출력으로 지정할 수 있다는 것이 핵심이다.

**두 가지 모드:**

| 모드 | 방향 | 사용 예 |
|------|------|--------|
| INPUT | 외부 -> MCU | 버튼, 센서 신호 읽기 |
| OUTPUT | MCU -> 외부 | LED 켜기, 신호 보내기 |

**핀 상태:**
- `HIGH`: 5V (또는 3.3V) 출력/감지
- `LOW`: 0V 출력/감지

```cpp
pinMode(2, INPUT);      // 2번 핀을 입력으로
pinMode(13, OUTPUT);    // 13번 핀을 출력으로

digitalRead(2);         // 핀 상태 읽기
digitalWrite(13, HIGH); // 핀에 HIGH 출력
```

DHT22의 데이터 핀은 GPIO를 사용한다. DHT 라이브러리가 내부적으로 이 핀을 INPUT/OUTPUT으로 전환하며 센서와 통신한다.

```
DHT22 DATA --- 풀업 저항(10kΩ) --- 5V
           +-- Arduino PIN 2 (GPIO)
```

---

## 디지털 핀 vs 아날로그 핀

DHT22를 처음 보면 "온도와 습도를 측정하는 아날로그 센서"처럼 보인다. 하지만 실제로는 **디지털 출력 센서**다. 이 구분이 회로 설계와 코드 작성 방식에 직접적인 영향을 준다.

**디지털 핀:**
- 읽을 수 있는 값: `HIGH`(1) 또는 `LOW`(0)
- 전압 기준: 약 2V 이상이면 HIGH, 그 이하면 LOW
- 용도: 버튼, DHT22, 시리얼 통신(TX/RX), LED

**아날로그 핀 (아날로그 입력):**
- 읽을 수 있는 값: 0~1023 (10비트 ADC, 0V~5V 매핑)
- 내부적으로 ADC가 전압을 숫자로 변환
- 용도: 가변저항, LM35 같은 아날로그 온도 센서

```cpp
// 디지털 읽기
int val = digitalRead(2);   // 0 또는 1

// 아날로그 읽기 (ADC 내장)
int val = analogRead(A0);   // 0~1023
float voltage = val * (5.0 / 1023.0);  // 전압으로 변환
```

**왜 DHT22는 디지털인가:**

DHT22는 온도와 습도를 내부에서 ADC로 변환하고, 결과를 디지털 신호(HIGH/LOW 펄스 타이밍)로 출력한다. Arduino는 `dht.readTemperature()`로 이미 변환된 float 값을 받는다. 아날로그 핀 대신 디지털 핀을 쓰는 이유가 여기 있다.

---

## ADC - 아날로그를 디지털로

ADC(Analog-to-Digital Converter)는 아날로그 전압(연속값)을 디지털 숫자(이진수)로 변환하는 회로다.

```
아날로그 전압 (0V ~ 5V)
        |
   ADC 회로
        |
디지털 숫자 (0 ~ 1023, 10비트 기준)
```

현실의 물리량(온도, 빛, 소리)은 연속적인 아날로그 값이다. MCU의 CPU는 0과 1만 처리한다. ADC가 이 둘 사이를 연결한다.

**분해능(Resolution):**
- 10비트 ADC: 2^10 = 1024 단계
- 5V / 1024 = 약 4.9mV 단위
- 비트 수가 높을수록 더 세밀한 측정 가능

Arduino Uno는 10비트 ADC 6채널(A0~A5)을 내장하고 있다.

**DHT22의 내장 ADC:**

DHT22 내부에는 온도와 습도 감지 소자(정전용량형 습도 센서, NTC 온도 센서)와 ADC가 있다. 외부로는 디지털 신호로 결과를 출력한다. 이 덕분에 Arduino 코드에서 ADC 변환 계산 없이 `dht.readTemperature()`로 바로 온도값을 받을 수 있다. LM35 같은 순수 아날로그 센서를 사용했다면 `analogRead()`와 변환 수식이 필요했을 것이다.

---

## DHT22 센서

DHT22는 이 프로젝트의 데이터 원천이다. 온도와 습도를 디지털 신호로 출력하는 센서로, 핀 하나로 모든 데이터를 전송한다.

**스펙 요약:**

| 항목 | 값 |
|------|-----|
| 온도 범위 | -40°C ~ +80°C |
| 온도 정확도 | +/-0.5°C |
| 습도 범위 | 0~100% RH |
| 습도 정확도 | +/-2~5% RH |
| 샘플링 주기 | 최소 2초 |
| 통신 방식 | 단선 디지털 (DHT 자체 프로토콜) |
| 전원 전압 | 3.3V ~ 5.5V |

**핀 구성 (정면 기준, 4핀):**

```
+-----+
| DHT |
|  22 |
+--+--+
   |
1번: VCC (전원 3.3V~5V)
2번: DATA (신호 핀, 풀업 저항 필수)
3번: NC (미사용)
4번: GND
```

**통신 원리:**

DHT22는 DATA 핀의 HIGH/LOW 신호 지속 시간으로 데이터를 인코딩한다. 40비트(습도 16비트 + 온도 16비트 + 체크섬 8비트)를 한 번에 전송한다. Arduino의 DHT 라이브러리가 이 타이밍을 해석한다.

**샘플링 2초 제한:**

내부 측정 회로가 안정화되는 시간이 필요하다. 2초 이내에 다시 요청하면 이전 값이나 오류를 반환한다. Arduino 코드에서 `delay(2000)`이 필요한 이유다.

```cpp
#include <DHT.h>

#define DHT_PIN 2
DHT dht(DHT_PIN, DHT22);

void setup() {
    Serial.begin(115200);
    dht.begin();
}

void loop() {
    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();
    Serial.println("#T," + String(temp) + "," + String(temp));
    Serial.println("#H," + String(humidity) + "," + String(temp));
    delay(2000);  // 최소 2초 대기
}
```

---

## 풀업 저항 - 플로팅 방지

풀업 저항은 DHT22 회로에서 빠뜨릴 수 없는 부품이다. DHT22 데이터시트에 명시적으로 요구되며, 없으면 `dht.readTemperature()`가 `nan`을 반환한다.

**플로팅(Floating) 문제:**

핀이 아무것도 연결되지 않으면 전압이 정해지지 않아 0과 1 사이를 무작위로 오간다. MCU는 이를 HIGH인지 LOW인지 판단할 수 없다. 이 불안정한 상태를 "플로팅"이라고 한다.

**풀업 저항의 동작:**

```
VCC (5V)
    |
   [R] 10kOhm  <-- 풀업 저항
    |
    +---------- DATA 핀 (MCU)
    |
DHT22 DATA
```

- 센서가 신호를 보내지 않을 때: 저항을 통해 VCC에서 전류가 흘러 핀이 HIGH 유지
- 센서가 LOW를 보낼 때: 센서가 핀을 GND로 끌어내려 LOW 상태가 됨
- 저항이 없으면: 센서가 신호 없을 때 핀이 플로팅

**저항값 선택:**
- DHT22: 4.7kΩ 또는 10kΩ 권장
- 너무 낮으면: 전류가 많이 흘러 발열/손상
- 너무 높으면: 신호가 약해져 노이즈에 취약

**전체 배선:**

```
Arduino 5V  --- [10kOhm] --- Arduino PIN 2 --- DHT22 DATA
Arduino GND --------------------------------------- DHT22 GND
Arduino 5V  --------------------------------------- DHT22 VCC
```

---

## 시리얼 통신 - 1비트씩 순차 전송

시리얼(직렬) 통신은 데이터를 1비트씩 하나의 선으로 순차적으로 전송하는 방식이다. Arduino가 PC로 데이터를 보내는 방식이 바로 시리얼 통신이다.

**직렬 vs 병렬:**

예전에는 8비트를 한 번에 보내는 병렬 통신(LPT 프린터 포트 등)을 사용했다. 하지만 케이블이 굵어지고 선 간 간섭(크로스토크)이 속도를 제한한다. 현대는 1~4개 선으로 더 빠른 직렬 통신이 주류다.

**주요 시리얼 통신 종류:**

| 이름 | 선 수 | 클럭 | 사용 예 |
|------|------|------|--------|
| UART | TX+RX+GND | 없음(비동기) | Arduino &lt;-> PC |
| SPI | MOSI+MISO+CLK+CS | 있음(동기) | 고속 센서 |
| I2C | SDA+SCL | 있음(동기) | 다수 기기 연결 |

이 프로젝트에서 사용하는 UART가 가장 단순한 형태의 시리얼 통신이다. "시리얼 포트"라는 이름은 과거 RS-232 규격의 물리적 직렬 포트(D-Sub 9핀 커넥터)에서 유래했고, USB 시리얼이 같은 개념을 USB로 에뮬레이션한다.

---

## UART - 비동기 직렬 통신

UART(Universal Asynchronous Receiver/Transmitter)는 클럭 선 없이 미리 약속한 속도로 통신하는 비동기 직렬 통신 하드웨어 블록이다. Arduino의 `Serial`이 곧 UART다.

**비동기(Asynchronous)의 의미:**

SPI와 I2C는 CLK(클럭) 선이 있어서 수신 측이 "지금 비트를 읽어라"는 타이밍을 CLK로 안다. UART는 클럭 선이 없다. 대신 양쪽이 동일한 Baud Rate를 약속하고, 각자 타이머로 비트 타이밍을 맞춘다.

**UART 프레임 구조:**

```
[Start 비트] [데이터 8비트] [패리티 없음] [Stop 비트]
  <-- 1bit -->  <--- 8bit --->              <-- 1bit -->
```

이것이 8N1 설정이다.

**UART 하드웨어 동작:**

MCU 칩 내부에 UART 컨트롤러가 내장되어 있다. ATmega328P(Arduino Uno)는 UART 1개를 가진다.

1. 전송: CPU가 레지스터에 바이트를 쓰면 자동으로 비트 스트림으로 변환해 TX 핀으로 내보냄
2. 수신: RX 핀으로 들어오는 비트 스트림을 바이트로 조립해 버퍼에 저장

```python
# pyserial이 UART 파라미터를 그대로 지정
ser = serial.Serial('COM5', 115200, timeout=1)
# bytesize=8, parity='N', stopbits=1 이 기본값 (8N1)
```

---

## TX/RX와 교차 연결

TX는 데이터를 내보내는 송신 핀, RX는 데이터를 받아들이는 수신 핀이다. 이 두 핀의 연결 방식이 시리얼 배선에서 가장 많이 실수하는 부분이다.

**TX (Transmit):**
- 데이터를 출력하는 핀
- MCU 내부 UART가 직렬 비트 스트림을 이 핀으로 내보냄
- 항상 HIGH 상태가 기본 (idle state = HIGH)

**RX (Receive):**
- 데이터를 입력받는 핀
- 들어오는 비트 스트림을 UART 컨트롤러가 읽어 버퍼에 저장

Arduino Uno는 디지털 핀 0번이 RX, 1번이 TX다. USB 사용 중에 핀 0, 1에 다른 기기를 연결하면 충돌이 발생한다.

**교차 연결 원리:**

TX는 "내가 보낸다"는 핀이고, RX는 "내가 받는다"는 핀이다. A가 보낸 것을 B가 받으려면 교차 연결이 필요하다.

```
잘못된 연결 (TX<->TX):
A의 TX ---- B의 TX   <-- 둘 다 출력, 충돌

올바른 연결 (교차):
A의 TX ---- B의 RX   <-- A가 보내면 B가 받음
A의 RX ---- B의 TX   <-- B가 보내면 A가 받음
A의 GND --- B의 GND  <-- 반드시 연결
```

GND 연결이 필수인 이유: 전압은 항상 기준점(GND)에 대한 상대값이다. GND가 연결되어 있지 않으면 HIGH/LOW 판단 기준이 달라 통신이 불가능하다.

이 프로젝트에서는 Arduino와 PC를 USB 케이블 하나로 연결하므로, 교차 연결은 케이블 내부와 CH340 칩이 자동으로 처리한다.

```
Arduino TX(1번 핀) --> [USB 케이블] --> CH340 RX --> PC(pyserial read)
Arduino RX(0번 핀) <-- [USB 케이블] <-- CH340 TX <-- PC(pyserial write)
```

이 프로젝트에서는 Arduino -> PC 방향만 사용하므로 실질적으로 단방향 통신이다.

---

## Baud Rate - 속도를 맞춰야 한다

Baud Rate는 초당 신호 변화 횟수(bps)다. Arduino의 `Serial.begin(115200)`과 pyserial의 `serial.Serial('COM5', 115200)`에서 쓰는 숫자가 Baud Rate다. 양쪽이 다르면 데이터가 깨진 문자로 수신된다.

**동작 원리:**

UART는 클럭 선이 없다. 대신 양쪽이 미리 "1초에 몇 번 신호가 바뀌는지"를 약속한다.

- 송신 측: Baud Rate에 맞춰 일정 간격으로 비트를 내보냄
- 수신 측: 같은 Baud Rate로 타이머를 설정하고, 그 간격마다 핀 상태를 샘플링

**불일치 시 결과:**

```
송신: 115200 bps -> 비트 간격 = 1/115200 = 약 8.68us
수신:   9600 bps -> 비트 간격 = 1/9600   = 약 104us
결과: 수신 측이 잘못된 타이밍에 샘플링 -> 깨진 데이터
```

실제로 Baud Rate 불일치 시 `ser.readline()`이 `b'\xff\xfe...'` 같은 깨진 바이트를 반환한다.

**일반적인 Baud Rate 값:**

```
9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600
```

이 프로젝트에서 115200을 선택한 이유: DHT22 데이터는 2초마다 전송되므로 낮은 Baud Rate도 충분하지만, 115200이 응답성이 좋고 현대 Arduino/PC 조합에서 안정적이다.

```cpp
// Arduino
Serial.begin(115200);
```

```python
# Python
SERIAL_BAUDRATE = 115200
ser = serial.Serial(SERIAL_PORT, SERIAL_BAUDRATE, timeout=1)
```

---

## 8N1 - UART 프레임 형식

8N1은 UART 통신의 프레임 구성을 3가지 파라미터로 표현한 것이다. pyserial의 기본값이기도 하다.

| 기호 | 의미 | 값 |
|------|------|----|
| **8** | 데이터 비트 수 | 8비트 = 1바이트 |
| **N** | 패리티(Parity) | None (없음) |
| **1** | 스톱 비트 수 | 1비트 |

**프레임 구조:**

```
         +---+---+---+---+---+---+---+---+---+----+
Idle LOW | S | D0| D1| D2| D3| D4| D5| D6| D7| SP |  Idle HIGH
         +---+---+---+---+---+---+---+---+---+----+
          ^                                    ^
        Start 비트                          Stop 비트
```

**패리티 (N):**

에러 검출용 비트다. `N`은 사용 안 함을 의미한다. `E`(Even), `O`(Odd)도 있지만 현대 통신에서는 거의 쓰지 않는다. 에러 감지가 필요하면 프로토콜 레벨(예: 체크섬)에서 처리한다.

```python
# 명시적으로 8N1을 지정하면:
ser = serial.Serial(
    port='COM5',
    baudrate=115200,
    bytesize=serial.EIGHTBITS,    # 8
    parity=serial.PARITY_NONE,    # N
    stopbits=serial.STOPBITS_ONE  # 1
)

# 기본값이 8N1이므로 생략 가능:
ser = serial.Serial('COM5', 115200, timeout=1)
```

---

## Start/Stop 비트 - 프레임 경계 신호

UART는 클럭이 없어서 수신 측이 "지금부터 데이터다"라는 신호를 어떻게 아는지가 핵심 문제다. Start 비트가 그 역할을 한다.

**Idle 상태:**

UART 선은 데이터가 없을 때 항상 HIGH 상태를 유지한다. 이를 "idle HIGH"라고 한다.

**Start 비트:**
- 값: 항상 `LOW` (0)
- 의미: "지금부터 1바이트 데이터가 온다"
- 동작: 수신 측이 idle HIGH 중 LOW를 감지하면 타이머를 시작

**Stop 비트:**
- 값: 항상 `HIGH` (1)
- 의미: "프레임 끝, 다시 idle 상태"
- 역할: 다음 Start 비트를 감지할 수 있도록 최소 1비트 HIGH 보장

**전체 프레임 타이밍:**

```
Idle   Start  D0    D1    D2    D3    D4    D5    D6    D7   Stop  Idle
HIGH   LOW    ?     ?     ?     ?     ?     ?     ?     ?    HIGH  HIGH
----+         +--------------------------------------------+       -----
    |         |                                            |
    +---------+                                            +---------
```

**수신 측 동작 순서:**

1. Idle HIGH 감지 중
2. LOW 신호 감지 -> Start 비트 인식, 타이머 시작
3. 0.5 비트 간격 후 첫 번째 데이터 비트 샘플링
4. 1비트 간격마다 D0~D7 차례로 샘플링
5. Stop 비트 위치에서 HIGH 확인 후 버퍼에 저장

Arduino가 `#T,25.3,24.1\n` 문자열을 시리얼로 출력할 때, 각 문자(1바이트)마다 이 Start -> 데이터 -> Stop 프레임이 반복된다. `#` 한 글자는 ASCII 0x23 = `0b00100011`이고, 이것이 Start 비트, 8개의 데이터 비트, Stop 비트로 전송된다.

---

## USB-to-Serial (CH340) - UART와 USB 사이

PC의 USB 포트는 UART 신호를 직접 이해하지 못한다. USB는 UART보다 훨씬 복잡한 프로토콜이다. CH340은 이 둘 사이를 자동으로 변환하는 브릿지 칩이다.

**변환 방향:**

```
Arduino 측           CH340 칩              PC 측
UART TX ----------> RX -> [변환] -> TX --> USB 포트
UART RX <---------- TX <- [변환] <- RX <-- USB 포트
```

**CH340이 하는 일:**

1. Arduino의 UART 비트 스트림 수신
2. USB CDC(Communications Device Class) 프로토콜로 패킹
3. USB를 통해 PC로 전달
4. PC가 이를 가상 COM 포트로 인식

**드라이버가 필요한 이유:**

CH340은 표준 USB 기기가 아니라 특수 칩이다. OS가 이 칩을 "COM 포트"로 인식하려면 제조사 드라이버가 필요하다. Windows 10 이상은 자동 설치되는 경우가 많지만, 인식이 안 되면 CH340 드라이버를 수동 설치해야 한다.

**칩 종류 비교:**

| 칩 | 제조사 | 특징 |
|----|--------|------|
| CH340/CH341 | WCH(중국) | 저렴, Arduino 클론에 주로 사용 |
| FTDI FT232 | FTDI(영국) | 고가, 안정적 |
| CP2102 | Silicon Labs | 중간 가격대 |
| ATmega16U2 | Atmel | Arduino 정품 보드 사용 |

드라이버 확인: 장치 관리자 -> 포트(COM & LPT) 항목에 "USB-SERIAL CH340 (COMx)" 표시 확인.

---

## COM 포트 - OS의 시리얼 포트 추상화

pyserial에서 `serial.Serial('COM5', 115200)`처럼 포트 이름을 직접 지정해야 한다. COM 포트가 무엇인지, 번호가 왜 바뀌는지, 어디서 확인하는지 알아야 한다.

**역사적 배경:**

과거 PC는 RS-232 규격의 물리적 직렬 포트(9핀 커넥터)를 가졌고 Windows는 이를 `COM1`, `COM2`로 표현했다. USB 시대가 되면서 물리적 직렬 포트는 사라졌지만, 소프트웨어 호환성을 위해 USB 시리얼 기기를 여전히 `COMx`라는 이름으로 표시한다.

**번호 결정 방식:**
- CH340 드라이버가 설치되면 OS가 사용 가능한 번호를 자동 할당
- 같은 Arduino를 다른 USB 포트에 꽂으면 번호가 바뀔 수 있음
- 장치 관리자에서 특정 번호로 고정 가능

**Windows에서 확인:**

```
장치 관리자 --> 포트(COM & LPT) --> USB-SERIAL CH340 (COM5)
```

또는 PowerShell:
```powershell
Get-WMIObject Win32_SerialPort | Select Name, DeviceID
```

**pyserial로 포트 목록 조회:**

```python
import serial.tools.list_ports
ports = serial.tools.list_ports.comports()
for port in ports:
    print(port.device, port.description)
# COM5 USB-SERIAL CH340 (COM5)
```

**Linux/macOS:**

COM 포트 대신 `/dev/ttyUSB0`, `/dev/ttyACM0` 같은 이름을 사용한다. Linux에서는 `dialout` 그룹에 사용자를 추가해야 권한 문제가 없다.

```bash
sudo usermod -a -G dialout $USER
```

---

## pyserial - Python에서 시리얼 읽기

pyserial은 Python에서 시리얼 포트를 읽고 쓰는 라이브러리다. Collector의 핵심 라이브러리로, `import serial`로 시작하는 코드 전체가 pyserial이다.

**설치:**

```bash
pip install pyserial
```

**기본 사용법:**

```python
import serial

# 포트 열기
ser = serial.Serial(
    port='COM5',
    baudrate=115200,
    timeout=1        # 읽기 대기 시간 (초), None이면 무한 대기
)

# 줄 읽기 (\n까지 읽음)
line_bytes = ser.readline()           # bytes 타입
line_str = line_bytes.decode('utf-8') # str 타입으로 변환

# 포트 닫기
ser.close()
```

**주요 메서드:**

| 메서드 | 설명 |
|--------|------|
| `readline()` | `\n`을 만날 때까지 읽음. timeout 내에 없으면 빈 bytes 반환 |
| `read(n)` | 정확히 n바이트 읽음 |
| `write(data)` | bytes를 포트로 전송 |
| `in_waiting` | 수신 버퍼에 대기 중인 바이트 수 |
| `close()` | 포트 닫기 |

**timeout의 역할:**
- `timeout=1`: 1초 내에 `\n`이 없으면 지금까지 받은 것(또는 빈 bytes) 반환
- `timeout=None`: 무한 대기 (블로킹)
- `timeout=0`: 즉시 반환 (논블로킹)

**예외 처리:**

```python
try:
    ser = serial.Serial('COM5', 115200, timeout=1)
except serial.SerialException as e:
    print(f"포트를 열 수 없음: {e}")
```

이 프로젝트의 핵심 읽기 루프:

```python
ser = serial.Serial(SERIAL_PORT, SERIAL_BAUDRATE, timeout=1)

while True:
    line = ser.readline().decode('utf-8', errors='ignore').strip()
    process_line(line)
```

---

## 프레이밍 - 메시지 경계 구분

시리얼은 바이트를 끊임없이 흘려보내는 스트림이다. "이 바이트들이 하나의 센서 측정값이다"라고 알 수 있는 경계가 없으면 파싱이 불가능하다. 프레이밍이 그 경계를 만드는 전략이다.

**문제: 스트림은 경계가 없다**

```
연속 스트림 (경계 없음):
#T,25.3,24.1\n#H,60.2,24.1\n#T,25.4,24.2\n...
```

여러 메시지가 이어서 도착하면 어디서 끊어야 하는지 알 수 없다.

**프레이밍 방법들:**

| 방법 | 예시 | 장점 | 단점 |
|------|------|------|------|
| 구분자(delimiter) | `\n`으로 끝 | 단순 | 데이터에 구분자가 있으면 충돌 |
| 길이 접두사 | `0012#T,25.3,24.1` | 정확 | 구현 복잡 |
| 시작+끝 마커 | `#...` + `\n` | 직관적 | 마커 중복 처리 필요 |
| 고정 길이 | 항상 16바이트 | 단순 | 유연성 없음 |

**이 프로젝트의 프레이밍 전략:**
- 시작 마커: `#` (메시지 유형도 함께 포함 `#T,`, `#H,`)
- 끝 마커: `\n` (개행 문자)

이 두 가지 덕분에:
1. `readline()`이 `\n`까지 읽어서 하나의 완전한 메시지를 반환
2. 부분 수신된 데이터가 있어도 `\n` 전까지는 반환하지 않음
3. `#`으로 시작하지 않는 줄(디버그 출력 등)을 구분 가능

```python
def process_line(line):
    if not line:            # 빈 줄(timeout 시) 무시
        return

    if line.startswith('#T,'):    # T 타입 메시지
        ...
    elif line.startswith('#H,'):  # H 타입 메시지
        ...
    else:
        print(line)                # 그 외 (디버그 출력 등)
```

`startswith('#T,')` 검사가 시작 마커를 확인하는 것이고, `readline()`의 `\n` 감지가 끝 마커 역할을 한다.

---

## 프로토콜 형식 - 왜 CSV인가

Arduino가 무슨 데이터를 어떤 형태로 보내는지 알아야 Python에서 올바르게 파싱할 수 있다.

**메시지 형식:**

```
#T,<ir_temp>,<ambient_temp>\n    <- 온도 메시지
#H,<humidity>,<ambient_temp>\n   <- 습도 메시지
```

**필드 설명:**

| 필드 | 위치 | 예시 | 설명 |
|------|------|------|------|
| `#T` / `#H` | 앞 | `#T` | 메시지 타입 (Temperature / Humidity) |
| `,` | 구분자 | | CSV 구분자 |
| 값 1 | 인덱스 0 | `25.3` | IR 온도 또는 습도 |
| 값 2 | 인덱스 1 | `24.1` | 주변 온도 |
| `\n` | 끝 | | 프레임 종료 |

**실제 출력 예시:**

```
#T,25.30,24.10
#H,60.20,24.10
#T,25.31,24.11
```

**왜 JSON이 아닌 CSV인가:**

MCU의 SRAM 제약이 프로토콜 선택을 결정한다.

```
JSON:  {"type":"T","ir_temp":25.3,"ambient_temp":24.1}  <- 50+ 바이트
CSV:   #T,25.3,24.1\n                                    <- 14 바이트
```

Arduino Uno의 SRAM은 2KB다. `sprintf()` 또는 String 연산으로 JSON을 만들면 메모리 단편화가 발생하고 스택 오버플로우 위험이 있다. 텍스트 CSV는 단순한 `Serial.print()` 조합으로 생성 가능하고 메모리 사용이 최소다.

텍스트 프로토콜을 선택한 또 다른 이유: Arduino IDE의 시리얼 모니터로 직접 육안 확인이 가능하다. 바이너리 프로토콜은 효율적이지만 디버깅이 어렵다.

**Arduino에서 생성:**

```cpp
Serial.print("#T,");
Serial.print(irTemp, 2);        // 소수점 2자리
Serial.print(",");
Serial.println(ambientTemp, 2); // println이 \n 추가
```

---

## 파싱 - 문자열에서 숫자 추출

시리얼로 받은 데이터는 항상 문자열(str)이다. MQTT로 publish하거나 InfluxDB에 저장하려면 숫자(float)가 필요하다. 파싱이 그 변환을 담당한다.

**파싱 단계:**

```python
raw_bytes = b'#T,25.3,24.1\r\n'      # pyserial이 반환
raw_str   = raw_bytes.decode('utf-8') # bytes -> str
stripped  = raw_str.strip()           # '#T,25.3,24.1'  (공백/개행 제거)
body      = stripped[3:]              # '25.3,24.1'     (헤더 제거)
parts     = body.split(',')           # ['25.3', '24.1'] (분리)
value1    = float(parts[0])           # 25.3             (숫자 변환)
value2    = float(parts[1])           # 24.1
```

**split():**

```python
"25.3,24.1".split(',')   # ['25.3', '24.1']
"a,b,,c".split(',')      # ['a', 'b', '', 'c']  <- 빈 항목 포함
```

**float() 변환 주의점:**

```python
float("25.3")    # 25.3
float("25")      # 25.0
float("")        # ValueError! -> 예외 처리 필요
float("nan")     # nan (Not a Number) -> DHT 읽기 실패 시 반환
```

**방어적 파싱:**

```python
import math

def process_temperature(parts, timestamp):
    if len(parts) != 2:             # 필드 수 검증
        return
    try:
        ir = float(parts[0])
        amb = float(parts[1])
    except ValueError:              # 숫자 변환 실패
        return
    if math.isnan(ir) or math.isnan(amb):  # DHT 읽기 실패
        return
    # 정상 데이터 처리
```

**실제 파싱 코드:**

```python
# collector/main.py
if line.startswith('#T,'):
    parts = line[3:].split(',')   # '#T,' 3글자 제거 후 분리
    if len(parts) == 2:           # 길이 검증
        process_temperature(parts, timestamp)
```

`line[3:]`은 `#T,` 3글자를 제거하고, `split(',')`로 쉼표 구분 분리한다.

---

## decode/encode - bytes와 str 변환

pyserial은 항상 `bytes` 타입을 반환한다. Python 문자열 조작(`startswith`, `split`, `strip`)은 `str` 타입에서만 작동한다. `decode()`를 빠뜨리면 `TypeError`가 발생한다. 시리얼 코드에서 가장 흔한 실수다.

**Python의 두 가지 텍스트 타입:**

| 타입 | 예시 | 설명 |
|------|------|------|
| `bytes` | `b'#T,25.3\n'` | 원시 바이트. 숫자 0-255의 시퀀스 |
| `str` | `'#T,25.3\n'` | 유니코드 문자열 |

```python
type(b'hello')   # <class 'bytes'>
type('hello')    # <class 'str'>

b'hello' == 'hello'          # False! 타입이 다름
b'hello'.startswith('#')     # TypeError!
```

**decode (bytes -> str):**

```python
b'#T,25.3\n'.decode('utf-8')                          # '#T,25.3\n'
b'#T,25.3\n'.decode('utf-8', errors='ignore')         # 깨진 바이트 무시
b'#T,25.3\n'.decode('utf-8', errors='replace')        # 깨진 바이트를 '?'로 대체
```

**encode (str -> bytes):**

```python
'#T,25.3\n'.encode('utf-8')  # b'#T,25.3\n'
```

**UTF-8:**

ASCII 문자(0-127)는 1바이트, 한글 등 비ASCII는 3바이트. 이 프로젝트 데이터는 전부 ASCII(`#`, `,`, `.`, 숫자)이므로 UTF-8이나 ASCII나 동일하게 동작한다.

**왜 `errors='ignore'`를 쓰는가:**

시리얼 포트를 처음 연결하거나 재연결 시, 버퍼에 잘린 바이트나 노이즈가 있을 수 있다. `ignore`는 유효하지 않은 바이트를 무시하고 나머지를 파싱한다. 데이터 손실이 있지만 프로세스가 죽지 않는다.

**`strip()`의 역할:**

`readline()`이 `b'#T,25.3\r\n'`을 반환할 수 있다. `\r`(캐리지 리턴)은 Windows 줄바꿈의 일부다. `strip()`이 앞뒤 공백과 `\r`, `\n`을 제거한다.

```python
'#T,25.3\r\n'.strip()  # '#T,25.3'
```

**한 줄 처리:**

```python
# collector/main.py - 한 줄로 처리
line = ser.readline().decode('utf-8', errors='ignore').strip()

# 분해하면:
raw     = ser.readline()                  # b'#T,25.3,24.1\r\n'
decoded = raw.decode('utf-8',             # '#T,25.3,24.1\r\n'
              errors='ignore')
line    = decoded.strip()                 # '#T,25.3,24.1'
```

이후 `line.startswith('#T,')` 같은 str 메서드를 정상적으로 사용할 수 있다.

---

## 전체 흐름 정리

DHT22 센서의 온도 값 25.3이 Python 코드에 `float(25.3)`으로 도달하기까지의 과정:

```
1. DHT22 내부 ADC가 온도 센서 저항값을 25.3°C로 변환
   |
2. DHT22가 DATA 핀으로 HIGH/LOW 펄스 타이밍 신호 출력
   |
3. Arduino DHT 라이브러리가 핀 타이밍을 해석해 float 25.3 획득
   |
4. Arduino UART 블록이 "#T,25.3,24.1\n"을 1바이트씩 TX 핀으로 출력
   (각 바이트는 Start 비트 + 8개 데이터 비트 + Stop 비트 = 10비트 프레임)
   |
5. CH340 칩이 UART 비트 스트림을 USB CDC 패킷으로 변환
   |
6. USB 케이블을 통해 PC로 전달
   |
7. Windows가 CH340을 COM5 가상 시리얼 포트로 노출
   |
8. pyserial의 readline()이 \n까지 읽어 b'#T,25.3,24.1\r\n' 반환
   |
9. .decode('utf-8', errors='ignore') 로 str 변환
   |
10. .strip() 으로 \r\n 제거 -> '#T,25.3,24.1'
    |
11. [3:].split(',') 으로 ['25.3', '24.1'] 분리
    |
12. float('25.3') -> 25.3 (Python float)
```

하드웨어에서 소프트웨어로 넘어오는 이 경계가 IoT 파이프라인의 첫 번째 관문이다. 다음 단계는 이 데이터를 네트워크를 통해 브로커로 전달하는 것이다.

관련 글: [[iot-network-mqtt|네트워크와 MQTT]], [[iot-influxdb-grafana|InfluxDB와 Grafana]], [[iot-config-design|설정 관리와 소프트웨어 설계]]
