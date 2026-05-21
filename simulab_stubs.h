#ifndef SIMULAB_STUBS_H
#define SIMULAB_STUBS_H

#include <stdint.h>
#include <avr/io.h>
#include <avr/interrupt.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#ifndef ARDUINO
typedef uint8_t  byte;
typedef uint8_t  boolean;
typedef uint16_t word;
#define HIGH 1
#define LOW  0
#define INPUT 0
#define OUTPUT 1
#define INPUT_PULLUP 2
#define true  1
#define false 0
#define PI 3.14159265358979323846
#define A0 14
#define A1 15
#define A2 16
#define A3 17
#define A4 18
#define A5 19
#define LED_BUILTIN 13
#endif
#define SSD1306_SWITCHCAPVCC 2
#define WHITE 1
#define BLACK 0
#define SSD1306_WHITE 1
#define SSD1306_BLACK 0
#define SSD1306_INVERSE 2

#ifndef ARDUINO
void delay(unsigned long ms) {
  for(unsigned long i=0;i<ms;i++)
    for(volatile uint16_t j=0;j<2000;j++);
}
void delayMicroseconds(unsigned int us) {
  for(unsigned int i=0;i<us;i++)
    for(volatile uint8_t j=0;j<2;j++);
}

static volatile unsigned long _ms = 0;
ISR(TIMER0_OVF_vect) { _ms++; }
unsigned long millis() { return _ms; }
unsigned long micros() { return _ms * 1000UL; }

void pinMode(uint8_t pin, uint8_t mode) {
  if(pin<8){if(mode==OUTPUT)DDRD|=(1<<pin);else DDRD&=~(1<<pin);}
  else if(pin<14){pin-=8;if(mode==OUTPUT)DDRB|=(1<<pin);else DDRB&=~(1<<pin);}
  else{pin-=14;if(mode==OUTPUT)DDRC|=(1<<pin);else DDRC&=~(1<<pin);}
}
void digitalWrite(uint8_t pin,uint8_t val){
  if(pin<8){if(val)PORTD|=(1<<pin);else PORTD&=~(1<<pin);}
  else if(pin<14){pin-=8;if(val)PORTB|=(1<<pin);else PORTB&=~(1<<pin);}
  else{pin-=14;if(val)PORTC|=(1<<pin);else PORTC&=~(1<<pin);}
}
uint8_t digitalRead(uint8_t pin){
  if(pin<8)return (PIND>>pin)&1;
  else if(pin<14)return (PINB>>(pin-8))&1;
  return (PINC>>(pin-14))&1;
}
uint16_t analogRead(uint8_t pin){
  ADMUX=(1<<REFS0)|(pin&0x0F);
  ADCSRA=(1<<ADEN)|(1<<ADSC)|(1<<ADPS2)|(1<<ADPS1)|(1<<ADPS0);
  while(ADCSRA&(1<<ADSC)); return ADC;
}
void analogWrite(uint8_t pin,uint8_t val){}
long random(long mx){return rand()%mx;}
long map(long x,long a,long b,long c,long d){return (x-a)*(d-c)/(b-a)+c;}
long constrain(long x,long lo,long hi){return x<lo?lo:(x>hi?hi:x);}
#endif

static void uart_init(uint32_t baud){
  uint16_t ubrr=16000000/16/baud-1;
  UBRR0H=ubrr>>8; UBRR0L=ubrr;
  UCSR0B=(1<<TXEN0)|(1<<RXEN0);
  UCSR0C=(1<<UCSZ01)|(1<<UCSZ00);
}
static void uart_putc(char c){
  if (!(UCSR0B & (1 << TXEN0))) {
    UCSR0B |= (1 << TXEN0);
  }
  while(!(UCSR0A&(1<<UDRE0))); UDR0=c;
}
static void uart_puts(const char* s){ while(*s) uart_putc(*s++); }
static void uart_nl(){ uart_putc(10); }
static void uart_putint(long v){ char b[16]; sprintf(b,"%ld",v); uart_puts(b); }
static void uart_putfloat(float v){
  if(v<0){ uart_putc('-'); v=-v; }
  long ip=(long)v;
  long fp=(long)((v-ip)*100+0.5);
  char b[32]; sprintf(b,"%ld.%02ld",ip,fp); uart_puts(b);
}

/* SIM channel — sends visual commands to workspace.html
   Format: <<SIM:COMMAND>>\n  */
static void sim_cmd(const char* cmd){
  uart_puts("<<SIM:"); uart_puts(cmd);
  uart_putc(62); uart_putc(62); uart_putc(10);
}

#ifndef ARDUINO
struct SerialClass {
  void begin(uint32_t baud){ uart_init(baud); }
  void print(const char* s){ uart_puts(s); }
  void print(long v){ uart_putint(v); }
  void print(int v){ uart_putint((long)v); }
  void print(float v, int d=2){ uart_putfloat(v); }
  void print(double v, int d=2){ uart_putfloat((float)v); }
  void println(const char* s){ uart_puts(s); uart_nl(); }
  void println(long v){ uart_putint(v); uart_nl(); }
  void println(int v){ uart_putint((long)v); uart_nl(); }
  void println(float v, int d=2){ uart_putfloat(v); uart_nl(); }
  void println(double v, int d=2){ uart_putfloat((float)v); uart_nl(); }
  void println(){ uart_nl(); }
};
SerialClass Serial;
#endif

struct TwoWire {
  void begin(){}
  void beginTransmission(uint8_t a){}
  void write(uint8_t b){}
  void write(const uint8_t* d, uint8_t n){}
  uint8_t endTransmission(bool s=true){ return 0; }
  uint8_t requestFrom(uint8_t a,uint8_t q,bool s=true){ return 0; }
  uint8_t read(){ return 0; }
  uint8_t available(){ return 0; }
};
TwoWire Wire;

struct Adafruit_SSD1306 {
  uint8_t _w,_h,_addr; int16_t _cx,_cy; uint8_t _sz;
  Adafruit_SSD1306(uint8_t w=128,uint8_t h=64,TwoWire* t=0,int8_t r=-1)
    :_w(w),_h(h),_addr(0x3C),_cx(0),_cy(0),_sz(1){}
  bool begin(uint8_t vcc=2,uint8_t addr=0x3C){ _addr=addr; sim_cmd("OLED_INIT"); return true; }
  void clearDisplay(){ _cx=0;_cy=0; sim_cmd("OLED_CLR"); }
  void display(){ sim_cmd("OLED_SHOW"); }
  void setTextSize(uint8_t s){ _sz=s; }
  void setTextColor(uint8_t c,uint8_t bg=0){}
  void setCursor(int16_t x,int16_t y){ _cx=x; _cy=y; }
  void setRotation(uint8_t r){}
  void invertDisplay(bool i){}
  void print(const char* s){
    char buf[96]; snprintf(buf,96,"OLED_TXT:%d:%d:%d:%s",(int)_cx,(int)_cy,(int)_sz,s);
    sim_cmd(buf); _cx+=strlen(s)*6*_sz;
  }
  void print(long v){ char b[16]; sprintf(b,"%ld",v); print(b); }
  void print(int v){ print((long)v); }
  void print(float v,int d=2){
    if(v<0){ print("-"); v=-v; }
    long ip=(long)v;
    long fp=(long)((v-ip)*100+0.5);
    char b[32]; sprintf(b,"%ld.%02ld",ip,fp); print(b);
  }
  void print(double v,int d=2){ print((float)v,d); }
  void println(const char* s){ print(s); _cy+=8*_sz; _cx=0; }
  void println(long v){ char b[16]; sprintf(b,"%ld",v); println(b); }
  void println(int v){ println((long)v); }
  void println(float v,int d=2){
    if(v<0){ print("-"); v=-v; }
    long ip=(long)v;
    long fp=(long)((v-ip)*100+0.5);
    char b[32]; sprintf(b,"%ld.%02ld",ip,fp); println(b);
  }
  void println(double v,int d=2){ println((float)v,d); }
  void println(){ _cy+=8*_sz; _cx=0; }
  void drawPixel(int16_t x,int16_t y,uint16_t c){}
  void drawLine(int16_t x0,int16_t y0,int16_t x1,int16_t y1,uint16_t c){}
  void drawRect(int16_t x,int16_t y,int16_t w,int16_t h,uint16_t c){}
  void fillRect(int16_t x,int16_t y,int16_t w,int16_t h,uint16_t c){}
  void drawCircle(int16_t x,int16_t y,int16_t r,uint16_t c){}
  void fillCircle(int16_t x,int16_t y,int16_t r,uint16_t c){}
  void fillScreen(uint16_t c){}
  int16_t width(){ return _w; }
  int16_t height(){ return _h; }
};

struct LiquidCrystal_I2C {
  uint8_t _addr,_cols,_rows,_cx,_cy;
  LiquidCrystal_I2C(uint8_t a,uint8_t c,uint8_t r)
    :_addr(a),_cols(c),_rows(r),_cx(0),_cy(0){}
  void begin(){ sim_cmd("LCD_INIT"); }
  void init(){ begin(); }
  void backlight(){ sim_cmd("LCD_BL"); }
  void noBacklight(){}
  void clear(){ _cx=0;_cy=0; sim_cmd("LCD_CLR"); }
  void home(){ _cx=0;_cy=0; }
  void setCursor(uint8_t col,uint8_t row){ _cx=col; _cy=row; }
  // ── print overloads ──────────────────────────────────
  void print(const char* s){
    // cap to remaining cols so we don't overflow the 16-char buffer
    char buf[80];
    snprintf(buf,sizeof(buf),"LCD_TXT:%d:%d:%s",(int)_cy,(int)_cx,s);
    sim_cmd(buf);
    _cx += (uint8_t)strlen(s);
    if(_cx>_cols) _cx=_cols;
  }
  void print(long v, int base=10){
    char b[24];
    if(base==16) snprintf(b,sizeof(b),"%lX",v);
    else if(base==8) snprintf(b,sizeof(b),"%lo",v);
    else snprintf(b,sizeof(b),"%ld",v);
    print(b);
  }
  void print(unsigned long v, int base=10){
    char b[24];
    if(base==16) snprintf(b,sizeof(b),"%lX",v);
    else if(base==8) snprintf(b,sizeof(b),"%lo",v);
    else snprintf(b,sizeof(b),"%lu",v);
    print(b);
  }
  void print(int v, int base=10){ print((long)v, base); }
  void print(unsigned int v, int base=10){ print((unsigned long)v, base); }
  void print(float v, int d=2){
    // d is decimal places (0-6 supported)
    if(d<0) d=0; if(d>6) d=6;
    char fmt[8]; snprintf(fmt,sizeof(fmt),"%%.%df",d);
    char b[24]; snprintf(b,sizeof(b),fmt,(double)v);
    print(b);
  }
  void print(double v, int d=2){ print((float)v, d); }
  // ── println overloads ─────────────────────────────────
  void println(const char* s){ print(s); _cy=(_cy+1)%_rows; _cx=0; }
  void println(long v, int base=10){ print(v,base); _cy=(_cy+1)%_rows; _cx=0; }
  void println(int v, int base=10){ print(v,base); _cy=(_cy+1)%_rows; _cx=0; }
  void println(float v, int d=2){ print(v,d); _cy=(_cy+1)%_rows; _cx=0; }
  void println(double v, int d=2){ print(v,d); _cy=(_cy+1)%_rows; _cx=0; }
  void println(){ _cy=(_cy+1)%_rows; _cx=0; }
  void createChar(uint8_t c,uint8_t* p){}
  // write a single char
  size_t write(uint8_t c){ char s[2]={char(c),0}; print(s); return 1; }
};

struct Servo {
  uint8_t _pin;
  Servo():_pin(0){}
  void attach(uint8_t pin,int mn=544,int mx=2400){ _pin=pin; }
  void write(int angle){
    char buf[24]; snprintf(buf,24,"SERVO_ANG:%d",angle);
    sim_cmd(buf);
  }
  void writeMicroseconds(int us){}
  int  read(){ return 90; }
  bool attached(){ return _pin>0; }
  void detach(){ _pin=0; }
};

void setup();
void loop();
#ifndef ARDUINO
int main(){
  sei();
  TCCR0A=0; TCCR0B=(1<<CS01)|(1<<CS00); TIMSK0=(1<<TOIE0);
  setup();
  while(1) loop();
}
#endif

#endif

#ifndef ARDUINO
// ── Interrupt stubs ────────────────────────────────────────────
#define FALLING 2
#define RISING  3
#define CHANGE  1
#define LOW_LEVEL 0

// digitalPinToInterrupt: D2=INT0(0), D3=INT1(1)
#define digitalPinToInterrupt(p) ((p)==2?0:((p)==3?1:-1))

typedef void (*voidFuncPtr)(void);
static voidFuncPtr _isr0 = 0;
static voidFuncPtr _isr1 = 0;

ISR(INT0_vect) { if(_isr0) _isr0(); }
ISR(INT1_vect) { if(_isr1) _isr1(); }

void attachInterrupt(uint8_t intNum, voidFuncPtr fn, uint8_t mode) {
  if(intNum == 0) {
    _isr0 = fn;
    EICRA = (EICRA & ~0x03) | (mode & 0x03);
    EIMSK |= (1 << INT0);
  } else if(intNum == 1) {
    _isr1 = fn;
    EICRA = (EICRA & ~0x0C) | ((mode & 0x03) << 2);
    EIMSK |= (1 << INT1);
  }
}
void detachInterrupt(uint8_t intNum) {
  if(intNum==0){ EIMSK &= ~(1<<INT0); _isr0=0; }
  else if(intNum==1){ EIMSK &= ~(1<<INT1); _isr1=0; }
}

// ── Pin Change Interrupts (PCINT) ──────────────────────────────
// Allows any digital pin to trigger interrupt via PCMSK
// D8-D13 = PCINT0 (PORTB), D0-D7 = PCINT2 (PORTD), A0-A5 = PCINT1 (PORTC)

static voidFuncPtr _pcint0_isr = 0;
static voidFuncPtr _pcint1_isr = 0;
static voidFuncPtr _pcint2_isr = 0;

ISR(PCINT0_vect) { if(_pcint0_isr) _pcint0_isr(); }
ISR(PCINT1_vect) { if(_pcint1_isr) _pcint1_isr(); }
ISR(PCINT2_vect) { if(_pcint2_isr) _pcint2_isr(); }

void enablePCINT(uint8_t pin, voidFuncPtr fn) {
  if(pin >= 8 && pin <= 13) {
    _pcint0_isr = fn;
    PCMSK0 |= (1 << (pin - 8));
    PCICR  |= (1 << PCIE0);
  } else if(pin <= 7) {
    _pcint2_isr = fn;
    PCMSK2 |= (1 << pin);
    PCICR  |= (1 << PCIE2);
  } else if(pin >= 14 && pin <= 19) {
    _pcint1_isr = fn;
    PCMSK1 |= (1 << (pin - 14));
    PCICR  |= (1 << PCIE1);
  }
}
#endif

// ═══════════════════════════════════════════════════════════════
// SimuLab Extended Library Stubs
// All popular Arduino libraries stubbed for simulation
// ═══════════════════════════════════════════════════════════════

// ── Sensor shared memory (placed at fixed SRAM addresses far from stack/heap)
// JS writes these addresses every frame via cpu.data[]
// 0x0150 = temp_raw  (temp_celsius + 40, so 0°C=40, 25°C=65, range 0-160)
// 0x0151 = hum_raw   (humidity %, 0-100)
// 0x0152 = dist_raw  (ultrasonic cm, 0-255)
// 0x0153 = rfid_flag (1 = card present)
// 0x0154 = accel_x   (0=-2g, 128=0g, 255=+2g)
// 0x0155 = accel_y
// 0x0156 = accel_z
#define SIM_TEMP_ADDR  (*(volatile uint8_t*)0x0150)
#define SIM_HUM_ADDR   (*(volatile uint8_t*)0x0151)
#define SIM_DIST_ADDR  (*(volatile uint8_t*)0x0152)
#define SIM_RFID_ADDR  (*(volatile uint8_t*)0x0153)
#define SIM_ACCEL_X    (*(volatile uint8_t*)0x0154)
#define SIM_ACCEL_Y    (*(volatile uint8_t*)0x0155)
#define SIM_ACCEL_Z    (*(volatile uint8_t*)0x0156)

// ── DHT Temperature & Humidity ────────────────────────────────
#define DHT11  11
#define DHT22  22
#define DHT21  21

struct DHT {
  uint8_t _pin, _type;
  DHT(uint8_t pin, uint8_t type) : _pin(pin), _type(type) {}
  void begin() { sim_cmd("DHT_INIT"); }
  float readTemperature(bool fahrenheit=false) {
    // Read from fixed SRAM address that JS pre-writes every animation frame
    float val = (float)GPIOR1 - 40.0f;
    return fahrenheit ? (val * 1.8f + 32.0f) : val;
  }
  float readHumidity() {
    return (float)GPIOR2;
  }
  bool isnan(float v) { return false; }
};

// ── OneWire (for DS18B20) ─────────────────────────────────────
struct OneWire {
  uint8_t _pin;
  OneWire(uint8_t pin) : _pin(pin) {}
  void reset() {}
  void skip() {}
  void select(uint8_t* addr) {}
  void write(uint8_t v, uint8_t power=0) {}
  uint8_t read() { return 0; }
  bool search(uint8_t* addr) { return false; }
  void reset_search() {}
};

// ── DallasTemperature (DS18B20) ───────────────────────────────
struct DallasTemperature {
  OneWire* _wire;
  DallasTemperature(OneWire* wire) : _wire(wire) {}
  void begin() { sim_cmd("DS18B20_INIT"); }
  void requestTemperatures() { sim_cmd("DS18B20_REQ"); }
  float getTempCByIndex(uint8_t idx) {
    char buf[32]; snprintf(buf, sizeof(buf), "DS18B20_READ:%d", (int)idx);
    sim_cmd(buf);
    return (float)GPIOR1 - 40.0f;
  }
  float getTempFByIndex(uint8_t idx) { return getTempCByIndex(idx)*1.8f+32.0f; }
  int getDeviceCount() { return 1; }
};

// ── MFRC522 RFID ──────────────────────────────────────────────
#define MFRC522_REQIDL  0x26
#define MFRC522_ANTICOLL 0x93

struct MFRC522 {
  struct UID { uint8_t size; uint8_t uidByte[10]; };
  struct PICC { static bool isNewCardPresent() { return false; } };
  UID uid;
  uint8_t _ss, _rst;
  MFRC522(uint8_t ss, uint8_t rst) : _ss(ss), _rst(rst) {}
  void PCD_Init() { sim_cmd("RFID_INIT"); }
  bool PICC_IsNewCardPresent() {
    return (*(volatile uint8_t*)0xF1) != 0;
  }
  bool PICC_ReadCardSerial() {
    if ((*(volatile uint8_t*)0xF1) == 0) return false;
    uid.size = 4;
    uid.uidByte[0] = 0x4A; uid.uidByte[1] = 0x2B;
    uid.uidByte[2] = 0x9C; uid.uidByte[3] = 0xD1;
    return true;
  }
  void PICC_HaltA() {}
  void PCD_StopCrypto1() {}
  static char* toHexChar(uint8_t* buf, uint8_t len) { return (char*)""; }
};

// ── MPU6050 Accelerometer/Gyroscope ──────────────────────────
struct MPU6050 {
  MPU6050() {}
  void initialize() { sim_cmd("MPU6050_INIT"); }
  bool testConnection() { return true; }
  void getMotion6(int16_t* ax,int16_t* ay,int16_t* az,
                  int16_t* gx,int16_t* gy,int16_t* gz) {
    *ax = getAccelerationX();
    *ay = getAccelerationY();
    *az = getAccelerationZ();
    *gx = 120;  *gy = -80;  *gz = 45;
  }
  int16_t getAccelerationX() {
    float g = ((float)(*(volatile uint8_t*)0xF2) / 255.0f) * 4.0f - 2.0f;
    return (int16_t)(g * 16384.0f);
  }
  int16_t getAccelerationY() {
    float g = ((float)(*(volatile uint8_t*)0xF3) / 255.0f) * 4.0f - 2.0f;
    return (int16_t)(g * 16384.0f);
  }
  int16_t getAccelerationZ() {
    float g = ((float)(*(volatile uint8_t*)0xF4) / 255.0f) * 4.0f - 2.0f;
    return (int16_t)(g * 16384.0f);
  }
  int16_t getRotationX() { return 120; }
  int16_t getRotationY() { return -80; }
  int16_t getRotationZ() { return 45; }
  float getTemperature() {
    return (float)GPIOR1 - 40.0f;
  }
};

// ── Adafruit BMP085/BMP180 Pressure ───────────────────────────
struct Adafruit_BMP085 {
  bool begin() { sim_cmd("BMP180_INIT"); return true; }
  float readTemperature() {
    return (float)GPIOR1 - 40.0f;
  }
  int32_t readPressure() { return 101325L; }
  float readAltitude(float seaLevelPa=101325.0f) { return 42.0f; }
  int32_t readSealevelPressure(float alt=0) { return 101325L; }
};
typedef Adafruit_BMP085 Adafruit_BMP180;

// ── BMP280 ────────────────────────────────────────────────────
struct Adafruit_BMP280 {
  bool begin(uint8_t addr=0x76) { sim_cmd("BMP280_INIT"); return true; }
  float readTemperature() {
    return (float)GPIOR1 - 40.0f;
  }
  float readPressure() { return 101325.0f; }
  float readAltitude(float seaLevelHPa=1013.25f) { return 42.0f; }
};

// ── BME280 (Temp + Humidity + Pressure) ───────────────────────
struct Adafruit_BME280 {
  bool begin(uint8_t addr=0x76) { sim_cmd("BME280_INIT"); return true; }
  float readTemperature() {
    return (float)GPIOR1 - 40.0f;
  }
  float readHumidity()    {
    return (float)GPIOR2;
  }
  float readPressure()    { return 101325.0f; }
  float readAltitude(float seaLevelHPa=1013.25f) { return 42.0f; }
};

// ── FastLED (WS2812B / NeoPixel) ─────────────────────────────
#define NEOPIXEL  6
#define WS2812B   6
#define WS2812    6
#define WS2811    6
#define RGB       0
#define GRB       1
#define BRIGHTNESS_MAX 255

struct CRGB {
  uint8_t r, g, b;
  CRGB() : r(0),g(0),b(0) {}
  CRGB(uint8_t r,uint8_t g,uint8_t b):r(r),g(g),b(b){}
  CRGB(uint32_t colorcode): r((colorcode>>16)&0xFF), g((colorcode>>8)&0xFF), b(colorcode&0xFF){}
  static CRGB Black()  { return CRGB(0,0,0); }
  static CRGB Red()    { return CRGB(255,0,0); }
  static CRGB Green()  { return CRGB(0,255,0); }
  static CRGB Blue()   { return CRGB(0,0,255); }
  static CRGB White()  { return CRGB(255,255,255); }
  CRGB& operator=(uint32_t c){ r=(c>>16)&0xFF;g=(c>>8)&0xFF;b=c&0xFF;return *this; }
};

// Common color constants
const CRGB CRGB_Black (0,0,0);
const CRGB CRGB_Red   (255,0,0);
const CRGB CRGB_Green (0,255,0);
const CRGB CRGB_Blue  (0,0,255);
const CRGB CRGB_White (255,255,255);
const CRGB CRGB_Yellow(255,255,0);
const CRGB CRGB_Purple(128,0,128);
const CRGB CRGB_Cyan  (0,255,255);

struct CFastLED {
  template<int CHIPSET, uint8_t PIN, int ORDER>
  static void addLeds(CRGB* leds, int num) {
    char buf[32]; snprintf(buf,sizeof(buf),"FASTLED_INIT:%d:%d",PIN,num);
    sim_cmd(buf);
  }
  static void setBrightness(uint8_t b) {
    char buf[24]; snprintf(buf,sizeof(buf),"FASTLED_BRIGHT:%d",b);
    sim_cmd(buf);
  }
  static void show() { sim_cmd("FASTLED_SHOW"); }
  static void clear() { sim_cmd("FASTLED_CLR"); }
  static void delay(uint16_t ms) { ::delay(ms); }
};
CFastLED FastLED;

uint8_t beatsin8(uint8_t bpm,uint8_t low=0,uint8_t high=255){ return (high+low)/2; }
uint8_t sin8(uint8_t theta){ return 128; }
uint8_t scale8(uint8_t i,uint8_t scale){ return (uint16_t)i*scale/256; }
uint16_t beatsin16(uint8_t bpm,uint16_t low=0,uint16_t high=65535){ return (high+low)/2; }
CRGB ColorFromPalette(const void* pal,uint8_t i,uint8_t bright=255){ return CRGB(bright,bright/2,0); }

// ── Adafruit NeoPixel ─────────────────────────────────────────
struct Adafruit_NeoPixel {
  uint16_t _n; uint8_t _pin;
  Adafruit_NeoPixel(uint16_t n,uint8_t pin,uint8_t type=0):_n(n),_pin(pin){}
  void begin() {
    char buf[32]; snprintf(buf,sizeof(buf),"NEOPIXEL_INIT:%d:%d",_pin,_n);
    sim_cmd(buf);
  }
  void show() { sim_cmd("FASTLED_SHOW"); }
  void clear() { sim_cmd("FASTLED_CLR"); }
  void setBrightness(uint8_t b){
    char buf[24]; snprintf(buf,sizeof(buf),"FASTLED_BRIGHT:%d",b);
    sim_cmd(buf);
  }
  void setPixelColor(uint16_t n,uint8_t r,uint8_t g,uint8_t b){
    char buf[40]; snprintf(buf,sizeof(buf),"NEOPIXEL_SET:%d:%d:%d:%d",n,r,g,b);
    sim_cmd(buf);
  }
  void setPixelColor(uint16_t n,uint32_t c){
    setPixelColor(n,(c>>16)&0xFF,(c>>8)&0xFF,c&0xFF);
  }
  uint32_t Color(uint8_t r,uint8_t g,uint8_t b){ return ((uint32_t)r<<16)|((uint32_t)g<<8)|b; }
  uint16_t numPixels(){ return _n; }
};

// ── IRremote ──────────────────────────────────────────────────
#define IR_NEC     1
#define IR_SONY    2
#define IR_RC5     3
#define IR_RC6     4
#define DECODE_NEC 1

struct decode_results {
  uint32_t value;
  uint8_t  bits;
  int      decode_type;
  bool     overflow;
};

struct IRrecv {
  uint8_t _pin;
  IRrecv(uint8_t pin) : _pin(pin) {}
  void enableIRIn() {
    char buf[24]; snprintf(buf,sizeof(buf),"IR_INIT:%d",_pin);
    sim_cmd(buf);
  }
  bool decode(decode_results* results) {
    results->value = 0;
    results->bits = 32;
    results->decode_type = IR_NEC;
    return false;
  }
  void resume() {}
};

struct IRsend {
  void sendNEC(uint32_t data,uint8_t nbits=32){
    char buf[32]; snprintf(buf,sizeof(buf),"IR_SEND:%lu",(unsigned long)data);
    sim_cmd(buf);
  }
  void sendSony(uint32_t data,uint8_t nbits=12){ sendNEC(data); }
  void sendRC5(uint32_t data,uint8_t nbits=12){ sendNEC(data); }
};

// ── Keypad ────────────────────────────────────────────────────
#define ROWS 4
#define COLS 4
#define NO_KEY '\0'

struct Keypad {
  char* _keys; uint8_t* _rowPins; uint8_t* _colPins; uint8_t _rows,_cols;
  Keypad(char* keys,uint8_t* rp,uint8_t* cp,uint8_t r,uint8_t c)
    :_keys(keys),_rowPins(rp),_colPins(cp),_rows(r),_cols(c){}
  char getKey() { return NO_KEY; }
  char waitForKey() { return NO_KEY; }
  bool isPressed(char key) { return false; }
};

// ── Ultrasonic (NewPing style) ────────────────────────────────
struct NewPing {
  uint8_t _trig, _echo;
  uint16_t _maxDist;
  NewPing(uint8_t trig,uint8_t echo,uint16_t maxDist=200)
    :_trig(trig),_echo(echo),_maxDist(maxDist){}
  int ping_cm() {
    return (*(volatile uint8_t*)0xF0);
  }
  unsigned long ping() { return (unsigned long)ping_cm()*58UL; }
  int ping_in() { return (int)(ping_cm()/2.54f); }
};

// ── EEPROM stub ───────────────────────────────────────────────
static uint8_t _eeprom_data[1024] = {0};
struct EEPROMClass {
  uint8_t read(int addr){ return addr<1024?_eeprom_data[addr]:0; }
  void write(int addr,uint8_t val){ if(addr<1024)_eeprom_data[addr]=val; }
  void update(int addr,uint8_t val){ write(addr,val); }
  template<typename T> T& get(int addr,T& t){
    uint8_t* p=(uint8_t*)&t;
    for(size_t i=0;i<sizeof(T);i++) p[i]=read(addr+i);
    return t;
  }
  template<typename T> const T& put(int addr,const T& t){
    const uint8_t* p=(const uint8_t*)&t;
    for(size_t i=0;i<sizeof(T);i++) write(addr+i,p[i]);
    return t;
  }
  int length(){ return 1024; }
};
EEPROMClass EEPROM;

// ── SoftwareSerial ────────────────────────────────────────────
struct SoftwareSerial {
  uint8_t _rx,_tx;
  SoftwareSerial(uint8_t rx,uint8_t tx):_rx(rx),_tx(tx){}
  void begin(uint32_t baud){ uart_init(baud); }
  void print(const char* s){ uart_puts(s); }
  void print(long v){ uart_putint(v); }
  void print(int v){ uart_putint((long)v); }
  void println(const char* s){ uart_puts(s); uart_nl(); }
  void println(long v){ uart_putint(v); uart_nl(); }
  void println(){ uart_nl(); }
  uint8_t available(){ return 0; }
  int read(){ return -1; }
};

// ── String class (basic) ──────────────────────────────────────
// Note: String is typedef'd to std::string equivalent
// Most sketches use String — provide basic compatibility
struct SimString {
  char _buf[128];
  SimString(){ _buf[0]=0; }
  SimString(const char* s){ strncpy(_buf,s,127);_buf[127]=0; }
  SimString(long v){ sprintf(_buf,"%ld",v); }
  SimString(int v){ sprintf(_buf,"%d",v); }
  SimString(float v,int d=2){ sprintf(_buf,"%.2f",v); }
  const char* c_str() const { return _buf; }
  int length() const { return strlen(_buf); }
  bool equals(const char* s) const { return strcmp(_buf,s)==0; }
  bool equalsIgnoreCase(const char* s) const { return strcasecmp(_buf,s)==0; }
  void toCharArray(char* buf,int len) const { strncpy(buf,_buf,len); }
  int toInt() const { return atoi(_buf); }
  float toFloat() const { return atof(_buf); }
  SimString operator+(const SimString& o) const {
    SimString r; snprintf(r._buf,127,"%s%s",_buf,o._buf); return r;
  }
  SimString& operator+=(const char* s){ strncat(_buf,s,127-strlen(_buf)); return *this; }
  bool operator==(const char* s) const { return equals(s); }
  char charAt(int i) const { return i<128?_buf[i]:0; }
  SimString substring(int start,int end=-1) const {
    SimString r; int len=(end<0?strlen(_buf):end)-start;
    strncpy(r._buf,_buf+start,len); r._buf[len]=0; return r;
  }
  int indexOf(char c) const {
    const char* p=strchr(_buf,c); return p?p-_buf:-1;
  }
};
// Override String typedef
#undef String
#define String SimString
