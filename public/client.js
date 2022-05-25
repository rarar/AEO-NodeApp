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
let volumeLevel = 0;


const bloomParams = {
  exposure: 0.2,
  bloomStrength: 2,
  bloomThreshold: 0,
  bloomRadius: 0.5
};

init();

function init() {

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
      //const average = arraySum / array.length;
      const rms = Math.sqrt(arraySum / array.length);
      volumeLevel = Math.round(rms * 10) / 10;
      if (volumeLevel == 0) volumeLevel = 1;
      const volumeReading = document.querySelector(".right .noise h2");
      console.log("volume reading = " + volumeReading);
      volumeReading.innerHTML = volumeLevel + " dB";
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

  // // controls
  // const controls = new OrbitControls(camera, renderer.domElement);
  // controls.target.set(0, 5, 0);
  // controls.update();
  // controls.addEventListener('change', render);
  // // controls.minDistance = 100;
  // // controls.maxDistance = 10000;
  // // controls.enablePan = true;

  // ambient
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  // const dirLight = new THREE.DirectionalLight(0xffffff, .75);
  // dirLight.position.set(1, 1, 1);
  // scene.add(dirLight);

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
  //composer2.addPass(gammaCorrection);
  // composer2.addPass(effectFilm);
  // composer1.addPass(effectSepia);
  // composer2.addPass(effectFilm);
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

        //

        child.material.side = THREE.DoubleSide;

        //child.scale.multiplyScalar(1);

        // recenter

        new THREE.Box3().setFromObject(child).getCenter(child.position).multiplyScalar(-1);
        model = child;
        model.rotation.z = .22;
        scene.add(model);
        render();
      }

    });
    //animate();


  });


  window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  render();

}

function render() {

  //getAudioLevel()

  requestAnimationFrame(render);
  const halfWidth = window.innerWidth / 2;
  model.rotation.y += 0.005;
  if (!tippingPointOn) {
    renderer.setScissorTest(true);
    renderer.setScissor(0, 0, halfWidth, window.innerHeight);
    composer1.render();
    renderer.setScissor(halfWidth, 0, halfWidth, window.innerHeight);
    composer2.render();
    renderer.setScissorTest(false);
  } else {
    bloomPass.strength = 10;
    bloomPass.exposure = 0.5
    bloomPass.radius = 10;
    composer1.render();
    scene.background = new THREE.Color( "rgb(255, 0, 0)" );
  }

  //fullComposer.render();

  if (renderer.info.render.frame % 120 == 0) {
    if (!tippingPointOn) {
      let pixelSize = volumeLevel * 2.5;
      let sepiaValue = volumeLevel * 2.5;
      console.log("pixel size = " + pixelSize);
      console.log("sepia value = " + sepiaValue);
      pixelPass.uniforms["pixelSize"].value = pixelSize;
    }
    //effectSepia.uniforms["amount"].value = sepiaValue;
  }

  if (renderer.info.render.frame>=10000)  {
    tippingPointOn = true;
    console.log(renderer.info.render.frame);
  }
  //renderer.render(scene, camera);
}
