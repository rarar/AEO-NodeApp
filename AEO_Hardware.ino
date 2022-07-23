const byte numChars = 32;
char receivedChars[numChars];   // an array to store the received data

boolean newData = false;

float dataNumber = 0;             // new for this version

#include "Adafruit_CCS811.h"

Adafruit_CCS811 ccs;
const int WATER_SENSOR_PIN = 7;
const int MOTOR_INIT_PIN = 12;
const int MOTOR_PIN = 3;
const int MOTOR_BRAKE = 9;
float mSpeed = 0;
float input = 0;
boolean inReverse = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("<Arduino is ready>");
  pinMode(WATER_SENSOR_PIN, INPUT_PULLUP);
  pinMode(MOTOR_INIT_PIN, OUTPUT);
  if (!ccs.begin()) {
    Serial.println("Failed to start sensor! Please check your wiring.");
    while (1);
  }
  //forward @ full speed
  digitalWrite(MOTOR_INIT_PIN, HIGH); //Establishes forward direction of Channel A
  digitalWrite(MOTOR_BRAKE, LOW);   //Disengage the Brake for Channel A
}

void loop() {
  recvWithEndMarker();
  showNewNumber();
}

void recvWithEndMarker() {
  static byte ndx = 0;
  char endMarker = '\n';
  char rc;

  if (Serial.available() > 0) {
    rc = Serial.read();

    if (rc != endMarker) {
      receivedChars[ndx] = rc;
      ndx++;
      if (ndx >= numChars) {
        ndx = numChars - 1;
      }
    }
    else {
      receivedChars[ndx] = '\0'; // terminate the string
      ndx = 0;
      newData = true;
    }
  }
}

void showNewNumber() {
  if (newData == true) {
    if (ccs.available()) {
      if (!ccs.readData()) {
        dataNumber = 0;             // new for this version
        dataNumber = atof(receivedChars);   // new for this version
        if (dataNumber < 0) {
          inReverse = 1;
          digitalWrite(MOTOR_INIT_PIN, LOW); //Establishes backward direction of Channel A
          if (dataNumber < -12) dataNumber = -12;
          mSpeed = map(dataNumber, 0, -12, 75, 255);
        } else if (dataNumber == 0) {
          digitalWrite(MOTOR_BRAKE, HIGH);
          mSpeed = 0;
        } else {
          inReverse = 0;
          digitalWrite(MOTOR_INIT_PIN, HIGH); //Establishes forward direction of Channel A
          if (dataNumber > 12) dataNumber = 12;
          mSpeed = map(dataNumber, 0, 12, 75, 255);
        }
        analogWrite(MOTOR_PIN, mSpeed);
        Serial.print(digitalRead(WATER_SENSOR_PIN));
        Serial.print(":");
        Serial.print(ccs.geteCO2());
        Serial.print(":");
        Serial.print(ccs.getTVOC());
        Serial.print(":");
        Serial.print(mSpeed);
        Serial.print(":");
        Serial.print(inReverse);
        Serial.print(":");
        Serial.println(dataNumber);
        newData = false;
      }
    }
  }
}
