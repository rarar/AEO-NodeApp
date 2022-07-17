const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const server = http.createServer(app);
const {
  SerialPort
} = require('serialport');
const {
  ReadlineParser
} = require('@serialport/parser-readline');
const {
  Server
} = require("socket.io");
const io = new Server(server);

<<<<<<< Updated upstream
// Create a port
const port = new SerialPort({
  path: '/dev/cu.usbserial-A50285BI',
  baudRate: 9600,
});
const parser = port.pipe(new ReadlineParser({
  delimiter: '\n'
}));
function scale (number, inMin, inMax, outMin, outMax) {
    return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

let m = 0;
let tp = 350;
let currentRate = 0;
let motorSpeed = 0;
let timeRemaining;
=======
/* PAX */
const PAX_SETTINGS = {
    USE_PAX_SENSOR: true, //when false, skip running any code related to the pax sensor
    USE_PARSER: false, // when false, pipe the data to a readline parser with delimiter
    PORT_PATH: '/dev/tty.usbmodem54280058331', //name of the port the usb is plugged in to
    PORT_BAUD: 115200, //probably going to be 115200 - possibly 9600.
    DEBUG_PAX_ONLY: false, //when true, don't run any other sensor code
    DO_LOG: false, //when true, log PAX data to a console
}

let paxPort, //the port we will open with serialports
 pax, //the actual count of devices we find
 paxParser, //the parser we will (optionally) use to parse the incoming serial data
 parsePaxFn //the function we will pass the serial data to to integrate into the visualization
>>>>>>> Stashed changes

parser.on('data', data => {
  let dataArray = data.split(":");
  if (dataArray[5]==undefined || dataArray[1]==0) return;
  motorSpeed = dataArray[3];
  if (dataArray[4]==1) {
    currentRate = -dataArray[3];
    currentRate = scale(currentRate, -75.0, -255.0, -0.111, -1.05);
  } else {
    currentRate = dataArray[3];
    currentRate = scale(currentRate, 75.0, 255.0, 0.111, 1.05);
  }
  io.emit('tipping point', dataArray[0]);
  io.emit('co2', dataArray[1]);
  io.emit('tvoc', dataArray[2]);
});

function calculateLevel() {
  if (motorSpeed==0) return;
  m = m + currentRate;
  console.log("motor speed = " + motorSpeed + ", current rate = " + currentRate + " and m level = " + m);
  timeRemaining = (tp - m ) / currentRate;
  console.log("time remaining = " + timeRemaining + " seconds");
  io.emit('time remaining', timeRemaining);
}

io.on('connection', (socket) => {
  console.log('a user connected');
  // setInterval(calculateLevel, 1000);
  socket.on('avg', (avg) => {
    console.log('weighted avg: ' + avg);
    calculateLevel();
    port.write(avg+'\n', (err) => {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
      // console.log("wrote " + avg);
    });
  });
});

app.use(express.static(__dirname + '/public'))
app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')))
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')))

server.listen(3000, () => console.log('Visit http://127.0.0.1:3000'))
