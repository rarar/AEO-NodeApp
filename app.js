const express = require('express')
const app = express()
const path = require('path')
const http = require('http')
const server = http.createServer(app)
const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')
const { Server } = require('socket.io')
const io = new Server(server)

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

if (PAX_SETTINGS.USE_PAX_SENSOR) {
    parsePaxFn = (paxData)=> {
        const paxString = paxData.toString();
        if (paxString.length > 0 && paxString.length <4){ //just making sure we don't get any weird values here. Anything more than 999 is probably not a proper value(?)
            paxInt = parseInt(paxString);
            if (paxInt){ //if we have a valid integer
                pax = paxInt;
                if (PAX_SETTINGS.DO_LOG){
                    console.log(pax);
                }
                //TODO: do something with the pax data, e.g.
                io.emit('pax', pax)
            }
        } else { //might not be the values we're looking for?
            console.log('unexpected length', paxString)
        }
    }

    if (PAX_SETTINGS.USE_PARSER) {
        paxParser = port.pipe(
            new ReadlineParser({
                delimiter: '\n',
            })
        )
    }

    paxPort = new SerialPort({
        path: PAX_SETTINGS.PORT_PATH,
        baudRate: PAX_SETTINGS.PORT_BAUD,
    })
    paxPort.on('open', function () {
        console.log('port open')
        // open logic
        if (PAX_SETTINGS.USE_PARSER) {
            paxParser.on('data', (data) => {
                parsePaxFn(data)
            })
        } else {
            paxPort.on('data', function (data) {
                parsePaxFn(data.toString())
            });
        }
    })
}

/* END PAX */

if (!PAX_SETTINGS.DEBUG_PAX_ONLY) {
    // Create a port
    const port = new SerialPort({
        path: '/dev/cu.usbserial-A50285BI',
        baudRate: 115200,
    })
    const parser = port.pipe(
        new ReadlineParser({
            delimiter: '\n',
        })
    )
    function scale(number, inMin, inMax, outMin, outMax) {
        return ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
    }

    let m = 0
    let tp = 350
    let currentRate = 0
    let motorSpeed = 0
    let timeRemaining

    parser.on('data', (data) => {
        let dataArray = data.split(':')
        if (dataArray[5] == undefined || dataArray[1] == 0) return
        motorSpeed = dataArray[3]
        if (dataArray[4] == 1) {
            currentRate = -dataArray[3]
            currentRate = scale(currentRate, -75.0, -255.0, -0.111, -1.05)
        } else {
            currentRate = dataArray[3]
            currentRate = scale(currentRate, 75.0, 255.0, 0.111, 1.05)
        }
        io.emit('tipping point', dataArray[0])
        io.emit('co2', dataArray[1])
        io.emit('tvoc', dataArray[2])
    })

    function calculateLevel() {
        if (motorSpeed == 0) return
        m = m + currentRate
        console.log(
            'motor speed = ' +
                motorSpeed +
                ', current rate = ' +
                currentRate +
                ' and m level = ' +
                m
        )
        timeRemaining = (tp - m) / currentRate
        console.log('time remaining = ' + timeRemaining + ' seconds')
        io.emit('time remaining', timeRemaining)
    }

    io.on('connection', (socket) => {
        console.log('a user connected')
        setInterval(calculateLevel, 1000)
        socket.on('weighted avg', (avg) => {
            console.log('weighted avg: ' + avg)
            const avgVal = avg + '\n'; //stored as variable because prettier keeps wanting to add invalid semis: https://stackoverflow.com/questions/72399129/prettier-adding-semicolon-when-semi-false
            port.write(avgVal, (err) => {
                if (err) {
                    return console.log('Error on write: ', err.message)
                }
                // console.log("wrote " + avg);
            })
        })
    })
}

app.use(express.static(__dirname + '/public'))
app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')))
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')))

server.listen(3000, () => console.log('Visit http://127.0.0.1:3000'))
