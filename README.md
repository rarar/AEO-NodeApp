# An Ecological Oracle - Installation Guide
Below are the instructions for the time-based experiment, _An Ecological Oracle_. The piece can be reset daily once the gallery opens.
## Hardware
### Water Setup
First, ensure there is 600 ml of water in the beaker that does not have a nested tipping point beaker within it. Place that beaker on the left side of the motor (facing the black cap).

Next, ensure that the smaller beaker is filled to the brim. Squeeze ample red dye in this beaker.

### Wiring
Everything should be shipped plugged in. In the case that it is not, follow the photos below. When in doubt, similar colored wires will go together with similar colored wires.

The tipping point sensor wire will be fed into pin 7 in the Arduino.

The two wires the control the read from the AQI sensor will be fed into A5 and A4. Those wires are yellow and green respectively.

The motor should be secured in the motor shield. In the case it is not, it should be screwed into + and - in one of the terminals.

### ESP 32
This microcontroller will count bluetooth and wifi data. It should be plug-and-play with a USB port.

## Software
