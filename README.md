# AEO Node App

## WIFI and Bluetooth Sensing

### Setting Up the LilyGo

* Power on the device and verify that it is getting readouts on the LCD display. 
* Log into the [Things Network console](https://nam1.cloud.thethings.network/console), go to `Applications`, click on `paxcounter-raphael`, then click on `Live Data` and make sure you are receiving data. You should say a payload of `ble: X, wifi: X`.

### Setting up Node Red

* Install Node Red: `sudo npm install -g --unsafe-perm node-red`
* Run node-red: `node-red`
* Go to your browser: [http://localhost:1880/](http://localhost:1880/) - you should see the node red editor.
* Import the flow `nodered-pax.json` from the root of the project folder.
* double click on the `mqtt-all-topics` node , click on the pencil icon next to the `Server: paxcounter-raphael` input, and click on the `Security` tab. 
* Input the username and password provided to you by the person who set this up.
* Click `Deploy` in node red (if it hasn't happened automatically). You should see the `mqtt-all-topics` node say `connected`. If you've been troubleshooting, you can optionally click the arrow next to `Deploy` and select `Restart Flows`.
* Under the `Deploy` button you should see a Beetle icon, next to the Book. Click on that, and wait to make sure you see messages being logged. If you explore these messages, you should see `wifi` and `ble` readings under `msg.payload.uplink_message.decoded_payload` in the JSON object tree.

### Running the App

* In your terminal or code editor console, run `npm start`
* Visit [http://127.0.0.1:3000](http://127.0.0.1:3000) and open up your browser console / inspector.
* You should see a `PAX Socket Connection Success` message if a socket is opened successfully.
* Wait up to a minute, you should see numbers for bluetooth and wifi devices being read out to the console.

### Editing the Code

All of the javascript code lives in `client.js` and html / css in `index.html`.

In `client.js` all the WIFI and Bluetooth sensing code is between the comments `/* PAX */` and `END PAX`.

The `PAX_SETTINGS` has the values for the websocket address you are listening to (which can be changed in node-red, if necessary)

The `initPaxSocket` function call kicks everything off, from there, any time the socket receives a message, it looks for wifi and bluetooth readings and outputs them to the DOM element specified in the `PAX_SETTINGS.paxReadoutEl` class name.

If you see a `0` or `-`, there's probably something wrong with the sensor or node red payload. Sometimes the device loses connection with the Things Network / MQTT, but reestablishes connection on its own. 

If that doesn't happen, you may need to unplug and replug the device, or look at The Things Network and see if you can spot any issues. 