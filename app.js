const express = require('express')
const app = express()
const path = require('path')
const noble = require('@abandonware/noble');
const RSSI_THRESHOLD    = -80;
const EXIT_GRACE_PERIOD = 3000; // milliseconds

let inRange = [];

noble.on('discover', function(peripheral) {
  // if (peripheral.rssi < RSSI_THRESHOLD) {
  //   // ignore
  //   return;
  // }

  let uuid = peripheral.uuid;
  //console.log("UUID = " + uuid);
  //let entered = !inRange[id];
  let entered = !(inRange.find(function(obj) { return obj.uuid === uuid; }));

  if (entered) {
    inRange.push(peripheral);
    console.log('"' + peripheral.advertisement + '" entered (RSSI ' + peripheral.rssi + ') ' + new Date());
  }

  inRange.find(function(obj) { return obj.uuid === uuid; }).lastSeen = Date.now();

});

setInterval(function() {

  inRange.forEach(function(peripheral, index) {
    if (peripheral.lastSeen < (Date.now() - EXIT_GRACE_PERIOD)) {
      console.log('"' + peripheral.advertisement.localName + '" exited (RSSI ' + peripheral.rssi + ') ' + new Date());
      inRange.splice(index, 1);
    }
  });
  console.log("Total Number of Nearby Devices is " + inRange.length);
}, EXIT_GRACE_PERIOD / 2);

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning([], true);
  } else {
    noble.stopScanning();
  }
});

app.use(express.static(__dirname + '/public'))
app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')))
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')))

app.listen(3000, () => console.log('Visit http://127.0.0.1:3000'))
