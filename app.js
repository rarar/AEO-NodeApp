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
  path: '/dev/cu.usbserial-A50285BI',
  baudRate: 9600,
});
const parser = port.pipe(new ReadlineParser({
  delimiter: '\n'
}))

parser.on('data', data => {
  let dataArray = data.split(":");
  console.log("original input = " + dataArray[5]);
  console.log("in reverse? = " + dataArray[4]);
  console.log("mSpeed = " + dataArray[3]);
  io.emit('tipping point', dataArray[0]);
  io.emit('co2', dataArray[1]);
  io.emit('tvoc', dataArray[2]);
});


io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('weighted avg', (avg) => {
    // console.log('weighted avg: ' + avg);
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
