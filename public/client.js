import * as THREE from 'three'
import {
  OrbitControls
} from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import {
  GUI
} from 'three/examples/jsm/libs/dat.gui.module'
import {
  GLTFLoader
} from 'three/examples/jsm/loaders/GLTFLoader';
import {
  EffectComposer
} from 'three/examples/jsm/postprocessing/EffectComposer';
import {
  RenderPass
} from 'three/examples/jsm/postprocessing/RenderPass';
import {
  GlitchPass
} from 'three/examples/jsm/postprocessing/GlitchPass';
import {
  ShaderPass
} from 'three/examples/jsm/postprocessing/ShaderPass';
import {
  PixelShader
} from 'three/examples/jsm/shaders/PixelShader';
import {
  UnrealBloomPass
} from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import {
  SepiaShader
} from 'three/examples/jsm/shaders/SepiaShader';
import {
  GammaCorrectionShader
} from 'three/examples/jsm/shaders/GammaCorrectionShader';
import {
  FilmPass
} from 'three/examples/jsm/postprocessing/FilmPass';

let renderer, scene, camera, model, composer1, composer2, fullComposer;
let pixelPass, effectSepia, bloomPass;
let tippingPointOn = false;
let tippingPointClockOn = false;
let socket;

const URBANIZATION_THRESHOLD = 2;
const VOLUME_THRESHOLD = 4;
const CO2_THRESHOLD = 400;
const TVOC_THRESHOLD = 0.5;

// WEIGHTS
const URBANIZATION_WEIGHT = 4;
const VOLUME_WEIGHT = 3;
const CO2_WEIGHT = 5;
const TVOC_WEIGHT = 5;

let urbanizationLevel = 2;
let volumeLevel = 0;
let co2Level = 500;
let tvocLevel = 300;
let weightedAvg = 0;
let secondsElapsed = 0;

// stopwatch stuff
let [milliseconds, seconds, minutes, hours] = [0, 0, 0, 0];
let int = null;


const bloomParams = {
  exposure: 0.2,
  bloomStrength: 2,
  bloomThreshold: 0,
  bloomRadius: 0.5
};

init();

// Function to send data back to arduino
function sendValsToArduino() {
  socket.emit('weighted avg', weightedAvg.toFixed(1));
}

function setUpThresholdView() {
  document.querySelector(".left .urbanization h2").innerHTML = "< " + URBANIZATION_THRESHOLD + " people";
  document.querySelector(".left .noise h2").innerHTML = "< " + VOLUME_THRESHOLD + " dB";
  document.querySelector(".left .eco2 h2").innerHTML = "< " + CO2_THRESHOLD + " ppm";
  document.querySelector(".left .tvoc h2").innerHTML = "< " + TVOC_THRESHOLD + " ppm";
  document.querySelector(".top .elapsed h2").innerHTML = "00:00:00";
}

// Function to compute weights
function computeWeights() {
  let uRatio = (urbanizationLevel - URBANIZATION_THRESHOLD) / URBANIZATION_THRESHOLD;
  let vRatio = (volumeLevel - VOLUME_THRESHOLD) / VOLUME_THRESHOLD;
  let cRatio = (co2Level - CO2_THRESHOLD) / CO2_THRESHOLD;
  let tRatio = (tvocLevel - TVOC_THRESHOLD) / TVOC_THRESHOLD;
  weightedAvg = ((URBANIZATION_WEIGHT * uRatio) + (VOLUME_WEIGHT * vRatio) + (CO2_WEIGHT * cRatio) + (TVOC_WEIGHT * tRatio)) / (URBANIZATION_WEIGHT + VOLUME_WEIGHT + CO2_WEIGHT + TVOC_WEIGHT);
  console.log("uRatio: " + uRatio + " | vRatio: " + vRatio + " | cRatio: " + cRatio + " | tRatio: " + tRatio);
  console.log("secondsElapsed = " + parseInt(secondsElapsed));
  if (parseInt(secondsElapsed) < 5 || tippingPointOn) {
    weightedAvg = 0; // account for delay of AQI sensor
  }
}

function displayTimer() {
  milliseconds += 10;
  if (milliseconds == 1000) {
    milliseconds = 0;
    seconds++;
    if (seconds == 60) {
      seconds = 0;
      minutes++;
      if (minutes == 60) {
        minutes = 0;
        hours++;
      }
    }
  }

  let h = hours < 10 ? "0" + hours : hours;
  let m = minutes < 10 ? "0" + minutes : minutes;
  let s = seconds < 10 ? "0" + seconds : seconds;
  let ms = milliseconds < 10 ? "00" + milliseconds : milliseconds < 100 ? "0" + milliseconds : milliseconds;

  document.querySelector(".top .elapsed h2").innerHTML = `${h}:${m}:${s}`;
  secondsElapsed = s;
}

function setUpClock() {
  int = setInterval(displayTimer, 10);
}

function init() {

  // Initialize Socket
  socket = io();
  setUpThresholdView();
  setUpClock();
  setInterval(sendValsToArduino, 1000);

  // Mic function
  navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    })
    .then(function(stream) {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      scriptProcessor.onaudioprocess = function() {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        const arraySum = array.reduce((a, value) => a + value, 0);
        const rms = Math.sqrt(arraySum / array.length);
        volumeLevel = Math.round(rms * 10) / 10;
        if (volumeLevel == 0) volumeLevel = 1;
        const volumeReading = document.querySelector(".right .noise h2");
        volumeReading.innerHTML = volumeLevel + " dB";
        if (volumeLevel > 3 * VOLUME_THRESHOLD) {
          console.log("turning volume red");
          volumeReading.classList.remove("yellow");
          volumeReading.classList.remove("orange");
          volumeReading.classList.add("red");
        } else if (volumeLevel > 2 * VOLUME_THRESHOLD) {
          volumeReading.classList.remove("red");
          volumeReading.classList.remove("yellow");
          volumeReading.classList.add("orange");
        } else if (volumeLevel > 1.5 * VOLUME_THRESHOLD) {
          volumeReading.classList.remove("red");
          volumeReading.classList.remove("orange");
          volumeReading.classList.add("yellow");
        } else {
          volumeReading.classList.remove("red");
          volumeReading.classList.remove("orange");
          volumeReading.classList.remove("yellow");
        }
      };
    })
    .catch(function(err) {
      /* handle the error */
      console.error(err);
    });

  // renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  renderer.outputEncoding = THREE.sRGBEncoding;

  // scene
  scene = new THREE.Scene();

  // camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.set(0, 100, 2000);
  scene.add(camera);

  // ambient
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
  hemiLight.position.set(0, 1000, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(-3000, 1000, -1000);
  scene.add(dirLight);

  // shader stuff
  let shaderSepia = SepiaShader;
  effectSepia = new ShaderPass(shaderSepia);
  let gammaCorrection = new ShaderPass(GammaCorrectionShader);

  effectSepia.uniforms["amount"].value = 0.9;

  let effectFilm = new FilmPass(0.35, 0.025, 648, false);
  let effectFilmBW = new FilmPass(0.35, 0.5, 2048, true);


  composer1 = new EffectComposer(renderer);
  composer1.addPass(new RenderPass(scene, camera));
  composer1.addPass(effectFilm);

  composer2 = new EffectComposer(renderer);
  composer2.addPass(new RenderPass(scene, camera));
  composer2.addPass(effectSepia);

  fullComposer = new EffectComposer(renderer);
  fullComposer.addPass(new RenderPass(scene, camera));
  fullComposer.addPass(effectFilm);

  pixelPass = new ShaderPass(PixelShader);
  pixelPass.uniforms["resolution"].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
  pixelPass.uniforms["resolution"].value.multiplyScalar(window.devicePixelRatio);
  pixelPass.uniforms["pixelSize"].value = 8;
  composer2.addPass(pixelPass);

  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.2, 0.35);
  bloomPass.threshold = bloomParams.bloomThreshold;
  bloomPass.strength = bloomParams.bloomStrength;
  bloomPass.radius = bloomParams.bloomRadius;
  composer1.addPass(bloomPass);
  composer2.addPass(bloomPass);
  fullComposer.addPass(bloomPass);

  // model
  new GLTFLoader().load('Earth_1_12756.glb', function(gltf) {

    gltf.scene.traverse(function(child) {

      if (child.isMesh) {

        // glTF currently supports only tangent-space normal maps.
        // this model has been modified to demonstrate the use of an object-space normal map.

        child.material.normalMapType = THREE.ObjectSpaceNormalMap;

        // attribute normals are not required with an object-space normal map. remove them.

        child.geometry.deleteAttribute('normal');

        child.material.side = THREE.DoubleSide;

        // recenter

        new THREE.Box3().setFromObject(child).getCenter(child.position).multiplyScalar(-1);
        model = child;
        model.rotation.z = .22;
        scene.add(model);
        render();
      }

    });
  });
  window.addEventListener('resize', onWindowResize);
}

// Resize function
function onWindowResize() {

  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  render();

}


// Main render loop
function render() {

  requestAnimationFrame(render);
  const halfWidth = window.innerWidth / 2;
  model.rotation.y += 0.005;
  if (!tippingPointOn) {
    if (weightedAvg > 0) {
      renderer.setScissorTest(true);
      renderer.setScissor(0, 0, halfWidth, window.innerHeight);
      composer1.render();
      renderer.setScissor(halfWidth, 0, halfWidth, window.innerHeight);
      composer2.render();
      renderer.setScissorTest(false);
      let pixelSize = weightedAvg * 2.5; // update this to include all sensor data
      let sepiaValue = weightedAvg * 2.5; // update this to include all sensor data
      pixelPass.uniforms["pixelSize"].value = pixelSize;
    } else {
      composer1.render();
    }
  } else {
    // If the tipping point happens, blow shit up
    bloomPass.strength = 10;
    bloomPass.exposure = 0.5
    bloomPass.radius = 10;
    composer1.render();
    clearInterval(int);
    if (!tippingPointClockOn) {
      document.querySelector(".top .elapsed h1").innerHTML = "Time of Tipping Point";
      document.querySelector(".top .elapsed h2").innerHTML = displayCountdown(0);
      document.querySelector(".bottom").classList.add("hidden");
      document.querySelector(".top").classList.add("center");
      tippingPointClockOn = true;
    }
    scene.background = new THREE.Color("rgb(255, 0, 0)");
  }

  computeWeights();

  socket.on('tipping point', function(msg) {
    if (msg == 0) tippingPointOn = true;
  });

  socket.on('co2', function(msg) {
    // if (msg==null) return;
    co2Level = msg;
    document.querySelector(".right .eco2 h2").innerHTML = "" + msg + " ppm";
    if (msg > 3 * CO2_THRESHOLD) {
      document.querySelector(".right .eco2 h2").classList.remove("yellow");
      document.querySelector(".right .eco2 h2").classList.remove("orange");
      document.querySelector(".right .eco2 h2").classList.add("red");
    } else if (msg > 2 * CO2_THRESHOLD) {
      document.querySelector(".right .eco2 h2").classList.remove("red");
      document.querySelector(".right .eco2 h2").classList.remove("yellow");
      document.querySelector(".right .eco2 h2").classList.add("orange");
    } else if (msg > 1.5 * CO2_THRESHOLD) {
      document.querySelector(".right .eco2 h2").classList.remove("red");
      document.querySelector(".right .eco2 h2").classList.remove("orange");
      document.querySelector(".right .eco2 h2").classList.add("yellow");
    } else {
      document.querySelector(".right .eco2 h2").classList.remove("red");
      document.querySelector(".right .eco2 h2").classList.remove("orange");
      document.querySelector(".right .eco2 h2").classList.remove("yellow");
    }
  });
  socket.on('tvoc', function(msg) {
    // if (msg==null) return;
    tvocLevel = msg;
    document.querySelector(".right .tvoc h2").innerHTML = "" + msg + " ppm";
    if (msg > 3 * TVOC_THRESHOLD) {
      document.querySelector(".right .tvoc h2").classList.remove("yellow");
      document.querySelector(".right .tvoc h2").classList.remove("orange");
      document.querySelector(".right .tvoc h2").classList.add("red");
    } else if (msg > 2 * TVOC_THRESHOLD) {
      document.querySelector(".right .tvoc h2").classList.remove("red");
      document.querySelector(".right .tvoc h2").classList.remove("yellow");
      document.querySelector(".right .tvoc h2").classList.add("orange");
    } else if (msg > 1.5 * TVOC_THRESHOLD) {
      document.querySelector(".right .tvoc h2").classList.remove("red");
      document.querySelector(".right .tvoc h2").classList.remove("orange");
      document.querySelector(".right .tvoc h2").classList.add("yellow");
    } else {
      document.querySelector(".right .tvoc h2").classList.remove("red");
      document.querySelector(".right .tvoc h2").classList.remove("orange");
      document.querySelector(".right .tvoc h2").classList.remove("yellow");
    }
  });

  function displayCountdown(duration) {
    let t = new Date();
    t.setSeconds(t.getSeconds() + duration);
    let splitString = t.toString().split(' ');
    return splitString[1] + " " + splitString[2] + " @ " + splitString[4];
  }

  socket.on('time remaining', function(msg) {
    // if (msg==null) return;
    if (parseInt(msg) < 0) {
      document.querySelector(".bottom .eta h2").innerHTML = "Regenerative State";
      document.querySelector(".bottom .eta h1").classList.add("hidden");
      document.querySelector(".bottom .eta h2").classList.add("clifton");
      document.querySelector(".bottom .eta").classList.add("regen");
      document.querySelector("section.bottom").classList.add("regen-container");
    } else {
      document.querySelector(".bottom .eta h2").innerHTML = displayCountdown(msg);
      document.querySelector(".bottom .eta h1").classList.remove("hidden");
      document.querySelector(".bottom .eta h2").classList.remove("clifton");
      document.querySelector(".bottom .eta").classList.remove("regen");
      document.querySelector("section.bottom").classList.remove("regen-container");
    }

  });

}
