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

// Create a port
const port = new SerialPort({
  path: '/dev/cu.usbmodem144101',
  baudRate: 9600,
});
const parser = port.pipe(new ReadlineParser({
  delimiter: '\n'
}))

parser.on('data', data => {
  let dataArray = data.split(":");
//  console.log('got word from arduino:', dataArray[1]);
  io.emit('tipping point', dataArray[0]);
  io.emit('co2', dataArray[1]);
  io.emit('tvoc', dataArray[2]);
});
// const noble = require('@abandonware/noble');
// const RSSI_THRESHOLD    = -80;
// const EXIT_GRACE_PERIOD = 1000; // milliseconds

// let inRange = [];
//
// noble.on('discover', function(peripheral) {
//   if (peripheral.rssi < RSSI_THRESHOLD) {
//     // ignore
//     return;
//   }
//
//   let uuid = peripheral.uuid;
//
//   let entered = !(inRange.find(function(obj) { return obj.uuid === uuid; }));
//
//   if (entered) {
//     inRange.push(peripheral);
//     console.log('"' + peripheral.advertisement + '" entered (RSSI ' + peripheral.rssi + ') ' + new Date());
//   }
//
//   inRange.find(function(obj) { return obj.uuid === uuid; }).lastSeen = Date.now();
//
// });
//
// setInterval(function() {
//
//   inRange.forEach(function(peripheral, index) {
//     if (peripheral.lastSeen < (Date.now() - EXIT_GRACE_PERIOD)) {
//       console.log('"' + peripheral.advertisement.localName + '" exited (RSSI ' + peripheral.rssi + ') ' + new Date());
//       inRange.splice(index, 1);
//     }
//   });
//   console.log("Total Number of Nearby Devices is " + inRange.length);
// }, EXIT_GRACE_PERIOD / 2);
//
// noble.on('stateChange', function(state) {
//   if (state === 'poweredOn') {
//     noble.startScanning([], true);
//   } else {
//     noble.stopScanning();
//   }
// });

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('volume level', (vol) => {
    console.log('volume level: ' + vol);
  });
});

app.use(express.static(__dirname + '/public'))
app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')))
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')))

server.listen(3000, () => console.log('Visit http://127.0.0.1:3000'))
