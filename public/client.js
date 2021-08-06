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

let renderer, scene, camera;

init();

function init() {

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

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 5, 0);
  controls.update();
  controls.addEventListener('change', render);
  // controls.minDistance = 100;
  // controls.maxDistance = 10000;
  // controls.enablePan = true;

  // ambient
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  // // light
  // const light = new THREE.PointLight(0xffffff, 1.5);
  // camera.add(light);

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

        scene.add(child);

      }

    });

    render();

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

  renderer.render(scene, camera);

}
