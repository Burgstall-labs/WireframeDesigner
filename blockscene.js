// Block Scene Motion Builder
// Main JavaScript - 3D block scene editor with animated camera/object motion
// for generating conditioning videos for LTX 2.3 IC-LoRA

const state = {
  blocks: [],
  selectedBlockId: null,
  nextBlockId: 1,
  isPlaying: false,
  currentProgress: 0,
  viewMode: 'edit',
  isExporting: false
};

let scene, renderer, editCamera, animCamera, activeCamera;
let orbitControls, raycaster, mouse;
let groundMesh, gridHelper;
let mouseDownPos = { x: 0, y: 0 };

// ─── Easing Functions ───────────────────────────────────────────────

function applyEasing(t, type) {
  switch (type) {
    case 'ease-in': return t * t;
    case 'ease-out': return t * (2 - t);
    case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default: return t;
  }
}

// ─── Camera Presets ─────────────────────────────────────────────────

const BASE_CAM_POS = new THREE.Vector3(6, 4, 6);
const BASE_CAM_TARGET = new THREE.Vector3(0, 0.5, 0);

const CAMERA_PRESETS = {
  'static': {
    label: 'Static',
    compute: function (intensity) {
      return {
        startPos: BASE_CAM_POS.clone(),
        endPos: BASE_CAM_POS.clone(),
        startTarget: BASE_CAM_TARGET.clone(),
        endTarget: BASE_CAM_TARGET.clone(),
        startFov: 50,
        endFov: 50
      };
    }
  },
  'orbit-left': {
    label: 'Orbit Left',
    compute: function (intensity) {
      var offset = BASE_CAM_POS.clone().sub(BASE_CAM_TARGET);
      var angle = intensity * Math.PI / 3;
      var cosA = Math.cos(angle);
      var sinA = Math.sin(angle);
      var endOffset = new THREE.Vector3(
        offset.x * cosA + offset.z * sinA,
        offset.y,
        -offset.x * sinA + offset.z * cosA
      );
      return {
        startPos: BASE_CAM_POS.clone(),
        endPos: endOffset.add(BASE_CAM_TARGET),
        startTarget: BASE_CAM_TARGET.clone(),
        endTarget: BASE_CAM_TARGET.clone(),
        startFov: 50,
        endFov: 50
      };
    }
  },
  'orbit-right': {
    label: 'Orbit Right',
    compute: function (intensity) {
      var offset = BASE_CAM_POS.clone().sub(BASE_CAM_TARGET);
      var angle = -intensity * Math.PI / 3;
      var cosA = Math.cos(angle);
      var sinA = Math.sin(angle);
      var endOffset = new THREE.Vector3(
        offset.x * cosA + offset.z * sinA,
        offset.y,
        -offset.x * sinA + offset.z * cosA
      );
      return {
        startPos: BASE_CAM_POS.clone(),
        endPos: endOffset.add(BASE_CAM_TARGET),
        startTarget: BASE_CAM_TARGET.clone(),
        endTarget: BASE_CAM_TARGET.clone(),
        startFov: 50,
        endFov: 50
      };
    }
  },
  'pan-left': {
    label: 'Pan Left',
    compute: function (intensity) {
      var amount = intensity * 4;
      var lookDir = BASE_CAM_TARGET.clone().sub(BASE_CAM_POS).normalize();
      var right = new THREE.Vector3().crossVectors(lookDir, new THREE.Vector3(0, 1, 0)).normalize();
      var shift = right.multiplyScalar(-amount);
      return {
        startPos: BASE_CAM_POS.clone(),
        endPos: BASE_CAM_POS.clone().add(shift),
        startTarget: BASE_CAM_TARGET.clone(),
        endTarget: BASE_CAM_TARGET.clone().add(shift),
        startFov: 50,
        endFov: 50
      };
    }
  },
  'pan-right': {
    label: 'Pan Right',
    compute: function (intensity) {
      var amount = intensity * 4;
      var lookDir = BASE_CAM_TARGET.clone().sub(BASE_CAM_POS).normalize();
      var right = new THREE.Vector3().crossVectors(lookDir, new THREE.Vector3(0, 1, 0)).normalize();
      var shift = right.multiplyScalar(amount);
      return {
        startPos: BASE_CAM_POS.clone(),
        endPos: BASE_CAM_POS.clone().add(shift),
        startTarget: BASE_CAM_TARGET.clone(),
        endTarget: BASE_CAM_TARGET.clone().add(shift),
        startFov: 50,
        endFov: 50
      };
    }
  },
  'dolly-in': {
    label: 'Dolly In',
    compute: function (intensity) {
      var amount = intensity * 3;
      var lookDir = BASE_CAM_TARGET.clone().sub(BASE_CAM_POS).normalize();
      var shift = lookDir.multiplyScalar(amount);
      return {
        startPos: BASE_CAM_POS.clone(),
        endPos: BASE_CAM_POS.clone().add(shift),
        startTarget: BASE_CAM_TARGET.clone(),
        endTarget: BASE_CAM_TARGET.clone(),
        startFov: 50,
        endFov: 50
      };
    }
  },
  'dolly-out': {
    label: 'Dolly Out',
    compute: function (intensity) {
      var amount = intensity * 3;
      var lookDir = BASE_CAM_TARGET.clone().sub(BASE_CAM_POS).normalize();
      var shift = lookDir.multiplyScalar(-amount);
      return {
        startPos: BASE_CAM_POS.clone(),
        endPos: BASE_CAM_POS.clone().add(shift),
        startTarget: BASE_CAM_TARGET.clone(),
        endTarget: BASE_CAM_TARGET.clone(),
        startFov: 50,
        endFov: 50
      };
    }
  },
  'pedestal-up': {
    label: 'Rise Up',
    compute: function (intensity) {
      var amount = intensity * 3;
      return {
        startPos: BASE_CAM_POS.clone(),
        endPos: BASE_CAM_POS.clone().add(new THREE.Vector3(0, amount, 0)),
        startTarget: BASE_CAM_TARGET.clone(),
        endTarget: BASE_CAM_TARGET.clone(),
        startFov: 50,
        endFov: 50
      };
    }
  },
  'pedestal-down': {
    label: 'Lower Down',
    compute: function (intensity) {
      var amount = intensity * 3;
      return {
        startPos: BASE_CAM_POS.clone(),
        endPos: BASE_CAM_POS.clone().add(new THREE.Vector3(0, -amount, 0)),
        startTarget: BASE_CAM_TARGET.clone(),
        endTarget: BASE_CAM_TARGET.clone(),
        startFov: 50,
        endFov: 50
      };
    }
  },
  'zoom-in': {
    label: 'Zoom In (FOV)',
    compute: function (intensity) {
      return {
        startPos: BASE_CAM_POS.clone(),
        endPos: BASE_CAM_POS.clone(),
        startTarget: BASE_CAM_TARGET.clone(),
        endTarget: BASE_CAM_TARGET.clone(),
        startFov: 50,
        endFov: 50 - intensity * 20
      };
    }
  },
  'zoom-out': {
    label: 'Zoom Out (FOV)',
    compute: function (intensity) {
      return {
        startPos: BASE_CAM_POS.clone(),
        endPos: BASE_CAM_POS.clone(),
        startTarget: BASE_CAM_TARGET.clone(),
        endTarget: BASE_CAM_TARGET.clone(),
        startFov: 50,
        endFov: 50 + intensity * 20
      };
    }
  },
  'crane-up': {
    label: 'Crane Up',
    compute: function (intensity) {
      var rise = intensity * 4;
      return {
        startPos: BASE_CAM_POS.clone(),
        endPos: BASE_CAM_POS.clone().add(new THREE.Vector3(0, rise, 0)),
        startTarget: BASE_CAM_TARGET.clone(),
        endTarget: BASE_CAM_TARGET.clone().add(new THREE.Vector3(0, -rise * 0.25, 0)),
        startFov: 50,
        endFov: 50
      };
    }
  }
};

// ─── Camera State ───────────────────────────────────────────────────

function getCameraStateAtProgress(progress) {
  var presetSel = document.getElementById('camera-preset');
  var intensityInput = document.getElementById('camera-intensity');
  var easingSel = document.getElementById('camera-easing');

  var presetKey = presetSel ? presetSel.value : 'static';
  var intensity = intensityInput ? parseFloat(intensityInput.value) : 1.0;
  var easingType = easingSel ? easingSel.value : 'linear';

  var preset = CAMERA_PRESETS[presetKey] || CAMERA_PRESETS['static'];
  var cam = preset.compute(intensity);

  var t = applyEasing(progress, easingType);

  var position = new THREE.Vector3().lerpVectors(cam.startPos, cam.endPos, t);
  var target = new THREE.Vector3().lerpVectors(cam.startTarget, cam.endTarget, t);
  var fov = cam.startFov + (cam.endFov - cam.startFov) * t;

  return { position: position, target: target, fov: fov };
}

function applyCameraState(camState) {
  animCamera.position.copy(camState.position);
  animCamera.fov = camState.fov;
  animCamera.updateProjectionMatrix();
  animCamera.lookAt(camState.target);
}

// ─── Scene Setup ────────────────────────────────────────────────────

function initScene() {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.zIndex = '0';
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  // Cameras
  var aspect = window.innerWidth / window.innerHeight;
  editCamera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
  editCamera.position.set(8, 6, 8);
  editCamera.lookAt(0, 0.5, 0);

  animCamera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
  activeCamera = editCamera;

  // Lighting
  var ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.left = -15;
  dirLight.shadow.camera.right = 15;
  dirLight.shadow.camera.top = 15;
  dirLight.shadow.camera.bottom = -15;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  var hemiLight = new THREE.HemisphereLight(0xcccccc, 0x444444, 0.3);
  scene.add(hemiLight);

  // Ground plane
  var groundGeo = new THREE.BoxGeometry(30, 0.05, 30);
  var groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
  groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  groundMesh.position.y = -0.025;
  scene.add(groundMesh);

  gridHelper = new THREE.GridHelper(30, 30, 0x444444, 0x333333);
  gridHelper.position.y = 0.001;
  scene.add(gridHelper);

  // OrbitControls
  orbitControls = new THREE.OrbitControls(editCamera, renderer.domElement);
  orbitControls.target.set(0, 0.5, 0);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.1;

  // Raycaster
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  renderer.domElement.addEventListener('mousedown', function (e) {
    mouseDownPos.x = e.clientX;
    mouseDownPos.y = e.clientY;
  });

  renderer.domElement.addEventListener('mouseup', function (e) {
    if (state.viewMode !== 'edit') return;
    var dx = e.clientX - mouseDownPos.x;
    var dy = e.clientY - mouseDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > 3) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, editCamera);

    var blockMeshes = state.blocks.map(function (b) { return b.mesh; }).filter(Boolean);
    var intersects = raycaster.intersectObjects(blockMeshes);

    if (intersects.length > 0) {
      var hit = intersects[0].object;
      if (hit.userData.blockId !== undefined) {
        selectBlock(hit.userData.blockId);
      }
    } else {
      selectBlock(null);
    }
  });
}

// ─── Block Management ───────────────────────────────────────────────

function createBlockMesh(block) {
  var geometry;
  switch (block.shape) {
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(block.scale.x / 2, block.scale.x / 2, block.scale.y, 32);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(block.scale.x / 2, block.scale.y, 32);
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(block.scale.x / 2, 32, 16);
      break;
    default: // box
      geometry = new THREE.BoxGeometry(block.scale.x, block.scale.y, block.scale.z);
      break;
  }

  var material = new THREE.MeshStandardMaterial({
    color: block.color,
    roughness: 0.85,
    metalness: 0.05
  });

  var mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.blockId = block.id;
  mesh.position.set(block.position.x, block.position.y, block.position.z);
  mesh.rotation.set(
    THREE.MathUtils.degToRad(block.rotation.x),
    THREE.MathUtils.degToRad(block.rotation.y),
    THREE.MathUtils.degToRad(block.rotation.z)
  );

  return mesh;
}

var BLOCK_PRESETS = {
  'cube': function (n) {
    return {
      shape: 'box',
      scale: { x: 1, y: 1, z: 1 },
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      color: '#808080',
      name: 'Cube ' + n
    };
  },
  'floor': function (n) {
    return {
      shape: 'box',
      scale: { x: 6, y: 0.15, z: 6 },
      position: { x: 0, y: 0.075, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      color: '#555555',
      name: 'Floor ' + n
    };
  },
  'wall': function (n) {
    return {
      shape: 'box',
      scale: { x: 4, y: 2.5, z: 0.2 },
      position: { x: 0, y: 1.25, z: -2 },
      rotation: { x: 0, y: 0, z: 0 },
      color: '#707070',
      name: 'Wall ' + n
    };
  },
  'pillar': function (n) {
    return {
      shape: 'cylinder',
      scale: { x: 0.4, y: 3, z: 0.4 },
      position: { x: 2, y: 1.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      color: '#909090',
      name: 'Pillar ' + n
    };
  },
  'ramp': function (n) {
    return {
      shape: 'box',
      scale: { x: 2, y: 0.2, z: 3 },
      position: { x: -2, y: 0.5, z: 0 },
      rotation: { x: 15, y: 0, z: 0 },
      color: '#666666',
      name: 'Ramp ' + n
    };
  }
};

function addBlock(preset) {
  var id = state.nextBlockId++;
  var presetData = BLOCK_PRESETS[preset](id);

  var block = {
    id: id,
    name: presetData.name,
    shape: presetData.shape,
    color: presetData.color,
    position: { x: presetData.position.x, y: presetData.position.y, z: presetData.position.z },
    rotation: { x: presetData.rotation.x, y: presetData.rotation.y, z: presetData.rotation.z },
    scale: { x: presetData.scale.x, y: presetData.scale.y, z: presetData.scale.z },
    hasMotion: false,
    endPosition: { x: presetData.position.x, y: presetData.position.y, z: presetData.position.z },
    endRotation: { x: presetData.rotation.x, y: presetData.rotation.y, z: presetData.rotation.z },
    mesh: null
  };

  block.mesh = createBlockMesh(block);
  scene.add(block.mesh);
  state.blocks.push(block);
  updateBlockList();
  return block;
}

function removeBlock(id) {
  var idx = state.blocks.findIndex(function (b) { return b.id === id; });
  if (idx === -1) return;

  var block = state.blocks[idx];
  if (block.mesh) {
    scene.remove(block.mesh);
    block.mesh.geometry.dispose();
    block.mesh.material.dispose();
  }
  state.blocks.splice(idx, 1);

  if (state.selectedBlockId === id) {
    selectBlock(null);
  }
  updateBlockList();
}

function duplicateBlock(id) {
  var src = state.blocks.find(function (b) { return b.id === id; });
  if (!src) return;

  var newId = state.nextBlockId++;
  var block = {
    id: newId,
    name: src.name + ' Copy',
    shape: src.shape,
    color: src.color,
    position: { x: src.position.x + 1, y: src.position.y, z: src.position.z },
    rotation: { x: src.rotation.x, y: src.rotation.y, z: src.rotation.z },
    scale: { x: src.scale.x, y: src.scale.y, z: src.scale.z },
    hasMotion: src.hasMotion,
    endPosition: { x: src.endPosition.x + 1, y: src.endPosition.y, z: src.endPosition.z },
    endRotation: { x: src.endRotation.x, y: src.endRotation.y, z: src.endRotation.z },
    mesh: null
  };

  block.mesh = createBlockMesh(block);
  scene.add(block.mesh);
  state.blocks.push(block);
  updateBlockList();
  selectBlock(newId);
}

function selectBlock(id) {
  state.selectedBlockId = id;

  state.blocks.forEach(function (b) {
    if (b.mesh) {
      b.mesh.material.emissive.setHex(0x000000);
    }
  });

  if (id !== null) {
    var block = state.blocks.find(function (b) { return b.id === id; });
    if (block && block.mesh) {
      block.mesh.material.emissive.setHex(0x1a1a2e);
    }
  }

  updateBlockList();
  updatePropertiesPanel();
}

function getSelectedBlock() {
  if (state.selectedBlockId === null) return null;
  return state.blocks.find(function (b) { return b.id === state.selectedBlockId; }) || null;
}

function updateBlockFromProperties() {
  var block = getSelectedBlock();
  if (!block) return;

  var nameInput = document.getElementById('prop-name');
  var shapeSelect = document.getElementById('prop-shape');
  var colorInput = document.getElementById('prop-color');

  block.name = nameInput ? nameInput.value : block.name;
  var newShape = shapeSelect ? shapeSelect.value : block.shape;
  block.color = colorInput ? colorInput.value : block.color;

  block.position.x = parseFloat(document.getElementById('prop-pos-x').value) || 0;
  block.position.y = parseFloat(document.getElementById('prop-pos-y').value) || 0;
  block.position.z = parseFloat(document.getElementById('prop-pos-z').value) || 0;

  block.rotation.x = parseFloat(document.getElementById('prop-rot-x').value) || 0;
  block.rotation.y = parseFloat(document.getElementById('prop-rot-y').value) || 0;
  block.rotation.z = parseFloat(document.getElementById('prop-rot-z').value) || 0;

  var newScaleX = parseFloat(document.getElementById('prop-size-w').value) || 0.05;
  var newScaleY = parseFloat(document.getElementById('prop-size-h').value) || 0.05;
  var newScaleZ = parseFloat(document.getElementById('prop-size-d').value) || 0.05;

  var scaleChanged = (newScaleX !== block.scale.x || newScaleY !== block.scale.y || newScaleZ !== block.scale.z);
  var shapeChanged = (newShape !== block.shape);

  block.scale.x = newScaleX;
  block.scale.y = newScaleY;
  block.scale.z = newScaleZ;
  block.shape = newShape;

  var animCheck = document.getElementById('prop-animate');
  block.hasMotion = animCheck ? animCheck.checked : false;

  if (block.hasMotion) {
    block.endPosition.x = parseFloat(document.getElementById('prop-end-pos-x').value) || 0;
    block.endPosition.y = parseFloat(document.getElementById('prop-end-pos-y').value) || 0;
    block.endPosition.z = parseFloat(document.getElementById('prop-end-pos-z').value) || 0;
    block.endRotation.x = parseFloat(document.getElementById('prop-end-rot-x').value) || 0;
    block.endRotation.y = parseFloat(document.getElementById('prop-end-rot-y').value) || 0;
    block.endRotation.z = parseFloat(document.getElementById('prop-end-rot-z').value) || 0;
  }

  if (shapeChanged || scaleChanged) {
    var oldMesh = block.mesh;
    scene.remove(oldMesh);
    oldMesh.geometry.dispose();

    block.mesh = createBlockMesh(block);
    block.mesh.material = oldMesh.material;
    scene.add(block.mesh);
    oldMesh.material.color.set(block.color);
  } else {
    block.mesh.material.color.set(block.color);
  }

  block.mesh.position.set(block.position.x, block.position.y, block.position.z);
  block.mesh.rotation.set(
    THREE.MathUtils.degToRad(block.rotation.x),
    THREE.MathUtils.degToRad(block.rotation.y),
    THREE.MathUtils.degToRad(block.rotation.z)
  );

  if (state.selectedBlockId === block.id) {
    block.mesh.material.emissive.setHex(0x1a1a2e);
  }

  updateBlockList();
}

// ─── UI Update Functions ────────────────────────────────────────────

function updateBlockList() {
  var listEl = document.getElementById('block-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  state.blocks.forEach(function (block) {
    var item = document.createElement('div');
    item.className = 'block-item' + (block.id === state.selectedBlockId ? ' selected' : '');

    var swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = block.color;
    swatch.style.display = 'inline-block';
    swatch.style.width = '14px';
    swatch.style.height = '14px';
    swatch.style.borderRadius = '50%';
    swatch.style.marginRight = '8px';
    swatch.style.verticalAlign = 'middle';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'block-name';
    nameSpan.textContent = block.name;

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete block';
    deleteBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      removeBlock(block.id);
    });

    item.appendChild(swatch);
    item.appendChild(nameSpan);
    item.appendChild(deleteBtn);

    item.addEventListener('click', function () {
      selectBlock(block.id);
    });

    listEl.appendChild(item);
  });
}

function updatePropertiesPanel() {
  var panel = document.getElementById('properties-panel');
  var emptyMsg = document.getElementById('properties-empty');
  var propsForm = document.getElementById('properties-form');
  if (!panel) return;

  var block = getSelectedBlock();

  if (!block) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    if (propsForm) propsForm.style.display = 'none';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';
  if (propsForm) propsForm.style.display = 'block';

  setInputValue('prop-name', block.name);
  setInputValue('prop-shape', block.shape);
  setInputValue('prop-color', block.color);

  setInputValue('prop-pos-x', block.position.x);
  setInputValue('prop-pos-y', block.position.y);
  setInputValue('prop-pos-z', block.position.z);

  setInputValue('prop-rot-x', block.rotation.x);
  setInputValue('prop-rot-y', block.rotation.y);
  setInputValue('prop-rot-z', block.rotation.z);

  setInputValue('prop-size-w', block.scale.x);
  setInputValue('prop-size-h', block.scale.y);
  setInputValue('prop-size-d', block.scale.z);

  var animCheck = document.getElementById('prop-animate');
  if (animCheck) animCheck.checked = block.hasMotion;

  var motionSection = document.getElementById('motion-section');
  if (motionSection) {
    motionSection.style.display = block.hasMotion ? 'block' : 'none';
  }

  if (block.hasMotion) {
    setInputValue('prop-end-pos-x', block.endPosition.x);
    setInputValue('prop-end-pos-y', block.endPosition.y);
    setInputValue('prop-end-pos-z', block.endPosition.z);
    setInputValue('prop-end-rot-x', block.endRotation.x);
    setInputValue('prop-end-rot-y', block.endRotation.y);
    setInputValue('prop-end-rot-z', block.endRotation.z);
  }
}

function setInputValue(id, value) {
  var el = document.getElementById(id);
  if (el) {
    if (el.type === 'checkbox') {
      el.checked = !!value;
    } else {
      el.value = value;
    }
  }
}

function updateTimelineDisplay() {
  var frameCountEl = document.getElementById('frame-count');
  var frameCount = frameCountEl ? parseInt(frameCountEl.value) || 60 : 60;
  var currentFrame = Math.round(state.currentProgress * (frameCount - 1)) + 1;

  var timeLabel = document.getElementById('time-label');
  if (timeLabel) {
    timeLabel.textContent = currentFrame + ' / ' + frameCount;
  }

  var scrubber = document.getElementById('timeline-scrubber');
  if (scrubber) {
    scrubber.value = Math.round(state.currentProgress * 1000);
  }
}

// ─── Scene Update ───────────────────────────────────────────────────

function updateSceneAtProgress(progress) {
  var easingSel = document.getElementById('camera-easing');
  var easingType = easingSel ? easingSel.value : 'linear';
  var t = applyEasing(progress, easingType);

  state.blocks.forEach(function (block) {
    if (!block.mesh) return;

    if (block.hasMotion) {
      block.mesh.position.set(
        block.position.x + (block.endPosition.x - block.position.x) * t,
        block.position.y + (block.endPosition.y - block.position.y) * t,
        block.position.z + (block.endPosition.z - block.position.z) * t
      );
      block.mesh.rotation.set(
        THREE.MathUtils.degToRad(block.rotation.x + (block.endRotation.x - block.rotation.x) * t),
        THREE.MathUtils.degToRad(block.rotation.y + (block.endRotation.y - block.rotation.y) * t),
        THREE.MathUtils.degToRad(block.rotation.z + (block.endRotation.z - block.rotation.z) * t)
      );
    } else {
      block.mesh.position.set(block.position.x, block.position.y, block.position.z);
      block.mesh.rotation.set(
        THREE.MathUtils.degToRad(block.rotation.x),
        THREE.MathUtils.degToRad(block.rotation.y),
        THREE.MathUtils.degToRad(block.rotation.z)
      );
    }
  });

  var camState = getCameraStateAtProgress(progress);

  if (state.viewMode === 'camera') {
    applyCameraState(camState);
    activeCamera = animCamera;
  }
}

// ─── Animation Loop & Preview ───────────────────────────────────────

function animate() {
  requestAnimationFrame(animate);

  if (state.isPlaying && !state.isExporting) {
    var frameCountEl = document.getElementById('frame-count');
    var frameCount = frameCountEl ? parseInt(frameCountEl.value) || 60 : 60;
    state.currentProgress += 1 / frameCount;
    if (state.currentProgress >= 1) {
      state.currentProgress = 0;
    }
    updateSceneAtProgress(state.currentProgress);
    updateTimelineDisplay();
  }

  if (state.viewMode === 'edit') {
    orbitControls.update();
    renderer.render(scene, editCamera);
  } else {
    renderer.render(scene, animCamera);
  }
}

function togglePlay() {
  if (state.isPlaying) {
    state.isPlaying = false;
    var playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.textContent = 'Play';
  } else {
    state.isPlaying = true;
    var playBtn2 = document.getElementById('play-btn');
    if (playBtn2) playBtn2.textContent = 'Pause';
    if (state.viewMode === 'edit') {
      setViewMode('camera');
    }
  }
}

function stopPlayback() {
  state.isPlaying = false;
  state.currentProgress = 0;
  var playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.textContent = 'Play';
  updateSceneAtProgress(0);
  updateTimelineDisplay();
}

function setProgress(value) {
  state.currentProgress = Math.max(0, Math.min(1, value));
  updateSceneAtProgress(state.currentProgress);
  updateTimelineDisplay();
}

// ─── View Mode ──────────────────────────────────────────────────────

function setViewMode(mode) {
  state.viewMode = mode;

  if (mode === 'edit') {
    activeCamera = editCamera;
    orbitControls.enabled = true;
  } else {
    activeCamera = animCamera;
    orbitControls.enabled = false;
    var camState = getCameraStateAtProgress(state.currentProgress);
    applyCameraState(camState);
  }

  var editBtn = document.getElementById('view-edit-btn');
  var camBtn = document.getElementById('view-camera-btn');
  if (editBtn) editBtn.classList.toggle('active', mode === 'edit');
  if (camBtn) camBtn.classList.toggle('active', mode === 'camera');
}

// ─── Video Export (H.264 MP4) ──────────────────────────────────────

var exportBlobUrl = null; // store for download

async function startExport() {
  if (state.isExporting) return;
  state.isExporting = true;
  state.isPlaying = false;

  var playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.textContent = 'Play';

  // Ensure dimensions are even (H.264 requirement)
  var outputWidth = parseInt(document.getElementById('output-width').value) || 832;
  var outputHeight = parseInt(document.getElementById('output-height').value) || 480;
  outputWidth = outputWidth % 2 === 0 ? outputWidth : outputWidth + 1;
  outputHeight = outputHeight % 2 === 0 ? outputHeight : outputHeight + 1;
  var fps = parseInt(document.getElementById('output-fps').value) || 24;
  var frameCount = parseInt(document.getElementById('frame-count').value) || 81;

  var progressFill = document.getElementById('progress-fill');
  var progressInfo = document.getElementById('progress-info');
  if (progressFill) progressFill.style.width = '0%';
  if (progressInfo) progressInfo.textContent = 'Initializing MP4 encoder...';

  // Check if HME (h264-mp4-encoder) is available
  if (typeof HME === 'undefined') {
    if (progressInfo) progressInfo.textContent = 'Error: h264-mp4-encoder not loaded. Try using a local server.';
    state.isExporting = false;
    return;
  }

  try {
    var encoder = await HME.createH264MP4Encoder();
    encoder.width = outputWidth;
    encoder.height = outputHeight;
    encoder.frameRate = fps;
    encoder.quantizationParameter = 18; // quality: lower = better, 10-51 range
    encoder.initialize();

    // Resize renderer to output dimensions
    renderer.setSize(outputWidth, outputHeight);
    animCamera.aspect = outputWidth / outputHeight;
    animCamera.updateProjectionMatrix();

    if (progressInfo) progressInfo.textContent = 'Rendering frames...';

    // Use an offscreen canvas to read pixels (avoids preserveDrawingBuffer issues)
    var readCanvas = document.createElement('canvas');
    readCanvas.width = outputWidth;
    readCanvas.height = outputHeight;
    var readCtx = readCanvas.getContext('2d');

    // Render and encode each frame
    for (var frame = 0; frame < frameCount; frame++) {
      var progress = frameCount <= 1 ? 0 : frame / (frameCount - 1);
      updateSceneAtProgress(progress);
      renderer.render(scene, animCamera);

      // Copy WebGL canvas to 2D canvas, then get pixel data
      readCtx.drawImage(renderer.domElement, 0, 0);
      var imageData = readCtx.getImageData(0, 0, outputWidth, outputHeight);
      encoder.addFrameRgba(imageData.data);

      var pct = Math.round((frame + 1) / frameCount * 100);
      if (progressFill) progressFill.style.width = pct + '%';
      if (progressInfo) progressInfo.textContent = 'Encoding frame ' + (frame + 1) + '/' + frameCount;

      // Yield to browser to update UI
      if (frame % 5 === 0) {
        await new Promise(function (resolve) { setTimeout(resolve, 0); });
      }
    }

    if (progressInfo) progressInfo.textContent = 'Finalizing MP4...';
    encoder.finalize();

    var mp4Data = encoder.FS.readFile(encoder.outputFilename);
    encoder.delete();

    var blob = new Blob([mp4Data], { type: 'video/mp4' });
    finishExport(blob);

  } catch (err) {
    console.error('MP4 export error:', err);
    if (progressInfo) progressInfo.textContent = 'Export error: ' + err.message;
    state.isExporting = false;
  }

  // Restore renderer size
  renderer.setSize(window.innerWidth, window.innerHeight);
  editCamera.aspect = window.innerWidth / window.innerHeight;
  editCamera.updateProjectionMatrix();
  animCamera.aspect = window.innerWidth / window.innerHeight;
  animCamera.updateProjectionMatrix();
}

function finishExport(blob) {
  // Clean up previous export URL
  if (exportBlobUrl) URL.revokeObjectURL(exportBlobUrl);
  exportBlobUrl = URL.createObjectURL(blob);

  var exportPanel = document.getElementById('export-panel');
  if (exportPanel) exportPanel.classList.add('visible');

  var preview = document.getElementById('export-preview');
  if (preview) {
    preview.src = exportBlobUrl;
    preview.style.display = 'block';
  }

  state.isExporting = false;

  var progressInfo = document.getElementById('progress-info');
  if (progressInfo) progressInfo.textContent = 'Export complete! (' + (blob.size / 1024 / 1024).toFixed(1) + ' MB)';
}

function downloadExport() {
  if (!exportBlobUrl) return;

  var presetSel = document.getElementById('camera-preset');
  var preset = presetSel ? presetSel.value : 'static';
  var w = document.getElementById('output-width').value || '832';
  var h = document.getElementById('output-height').value || '480';

  var a = document.createElement('a');
  a.href = exportBlobUrl;
  a.download = 'block-scene-' + preset + '-' + w + 'x' + h + '.mp4';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function closeExportPanel() {
  var exportPanel = document.getElementById('export-panel');
  if (exportPanel) exportPanel.classList.remove('visible');

  var preview = document.getElementById('export-preview');
  if (preview) {
    preview.src = '';
  }
}

// ─── Window Resize ──────────────────────────────────────────────────

function onWindowResize() {
  if (state.isExporting) return;

  var w = window.innerWidth;
  var h = window.innerHeight;

  renderer.setSize(w, h);

  editCamera.aspect = w / h;
  editCamera.updateProjectionMatrix();

  animCamera.aspect = w / h;
  animCamera.updateProjectionMatrix();
}

// ─── Default Scene ──────────────────────────────────────────────────

function createDefaultScene() {
  addBlock('floor');

  var cube = addBlock('cube');

  var wall = addBlock('wall');
  wall.position.x = -2;
  wall.position.z = -2;
  wall.mesh.position.set(wall.position.x, wall.position.y, wall.position.z);
  wall.color = '#606060';
  wall.mesh.material.color.set(wall.color);

  var pillar = addBlock('pillar');
  pillar.position.x = 2;
  pillar.position.z = 1;
  pillar.mesh.position.set(pillar.position.x, pillar.position.y, pillar.position.z);
  pillar.color = '#909090';
  pillar.mesh.material.color.set(pillar.color);
}

// ─── Event Listeners Setup ──────────────────────────────────────────

function setupEventListeners() {
  // View toggle buttons
  var editBtn = document.getElementById('view-edit-btn');
  var camBtn = document.getElementById('view-camera-btn');
  if (editBtn) editBtn.addEventListener('click', function () { setViewMode('edit'); });
  if (camBtn) camBtn.addEventListener('click', function () { setViewMode('camera'); });

  // Camera controls
  var camPreset = document.getElementById('camera-preset');
  var camIntensity = document.getElementById('camera-intensity');
  var camEasing = document.getElementById('camera-easing');
  var intensityValue = document.getElementById('intensity-value');

  if (camPreset) camPreset.addEventListener('change', function () {
    if (state.viewMode === 'camera') {
      updateSceneAtProgress(state.currentProgress);
    }
  });

  if (camIntensity) camIntensity.addEventListener('input', function () {
    if (intensityValue) intensityValue.textContent = parseFloat(camIntensity.value).toFixed(1);
    if (state.viewMode === 'camera') {
      updateSceneAtProgress(state.currentProgress);
    }
  });

  if (camEasing) camEasing.addEventListener('change', function () {
    if (state.viewMode === 'camera') {
      updateSceneAtProgress(state.currentProgress);
    }
  });

  // Quick-add buttons
  var addBtns = {
    'add-cube': 'cube',
    'add-floor': 'floor',
    'add-wall': 'wall',
    'add-pillar': 'pillar',
    'add-ramp': 'ramp'
  };

  Object.keys(addBtns).forEach(function (btnId) {
    var btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', function () {
        var block = addBlock(addBtns[btnId]);
        selectBlock(block.id);
      });
    }
  });

  // Duplicate button
  var dupBtn = document.getElementById('duplicate-btn');
  if (dupBtn) dupBtn.addEventListener('click', function () {
    if (state.selectedBlockId !== null) {
      duplicateBlock(state.selectedBlockId);
    }
  });

  // Timeline controls
  var playBtn = document.getElementById('play-btn');
  var stopBtn = document.getElementById('stop-btn');
  var scrubber = document.getElementById('timeline-scrubber');

  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (stopBtn) stopBtn.addEventListener('click', stopPlayback);

  if (scrubber) scrubber.addEventListener('input', function () {
    var val = parseInt(scrubber.value) / 1000;
    setProgress(val);
  });

  // Export controls
  var exportBtn = document.getElementById('export-btn');
  var downloadBtn = document.getElementById('download-btn');
  var closeExportBtn = document.getElementById('close-export-btn');

  if (exportBtn) exportBtn.addEventListener('click', startExport);
  if (downloadBtn) downloadBtn.addEventListener('click', downloadExport);
  if (closeExportBtn) closeExportBtn.addEventListener('click', closeExportPanel);

  // Properties form listeners
  var propIds = [
    'prop-name', 'prop-shape', 'prop-color',
    'prop-pos-x', 'prop-pos-y', 'prop-pos-z',
    'prop-rot-x', 'prop-rot-y', 'prop-rot-z',
    'prop-size-w', 'prop-size-h', 'prop-size-d',
    'prop-end-pos-x', 'prop-end-pos-y', 'prop-end-pos-z',
    'prop-end-rot-x', 'prop-end-rot-y', 'prop-end-rot-z'
  ];

  propIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateBlockFromProperties);
    }
  });

  var animCheck = document.getElementById('prop-animate');
  if (animCheck) {
    animCheck.addEventListener('change', function () {
      var block = getSelectedBlock();
      if (block) {
        block.hasMotion = animCheck.checked;
        if (block.hasMotion) {
          block.endPosition = { x: block.position.x, y: block.position.y, z: block.position.z };
          block.endRotation = { x: block.rotation.x, y: block.rotation.y, z: block.rotation.z };
        }
      }
      updatePropertiesPanel();
    });
  }

  // Section collapse toggle
  document.querySelectorAll('.section-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var section = header.parentElement;
      section.classList.toggle('collapsed');
    });
  });

  // Show grid toggle
  var showGridCheck = document.getElementById('show-grid');
  if (showGridCheck) {
    showGridCheck.addEventListener('change', function () {
      if (gridHelper) gridHelper.visible = showGridCheck.checked;
    });
  }

  // Window resize
  window.addEventListener('resize', onWindowResize);
}

// ─── Reference Image Overlay ───────────────────────────────────────

var refImageData = {
  image: null,        // HTMLImageElement
  edgeCanvas: null,   // canvas with edge detection result
  visible: true,
  edgesVisible: false,
  opacity: 0.4,
  edgeThreshold: 30,
  naturalWidth: 0,
  naturalHeight: 0
};

function loadReferenceImage(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      refImageData.image = img;
      refImageData.naturalWidth = img.naturalWidth;
      refImageData.naturalHeight = img.naturalHeight;

      // Auto-set output resolution to match image AR
      var ar = img.naturalWidth / img.naturalHeight;
      var outW = parseInt(document.getElementById('output-width').value) || 832;
      var outH = Math.round(outW / ar);
      // Ensure even dimensions (needed for video encoding)
      outH = outH % 2 === 0 ? outH : outH + 1;
      document.getElementById('output-height').value = outH;

      // Show info
      var info = document.getElementById('ref-info');
      if (info) info.textContent = img.naturalWidth + 'x' + img.naturalHeight + ' — output set to ' + outW + 'x' + outH;

      // Show controls
      var controls = document.getElementById('ref-image-controls');
      if (controls) controls.style.display = 'block';

      // Compute edge detection
      computeEdgeDetection();

      // Update viewport overlay
      updateReferenceOverlay();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearReferenceImage() {
  refImageData.image = null;
  refImageData.edgeCanvas = null;

  var overlay = document.getElementById('ref-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.innerHTML = '';
  }

  var controls = document.getElementById('ref-image-controls');
  if (controls) controls.style.display = 'none';

  var fileInput = document.getElementById('ref-image-input');
  if (fileInput) fileInput.value = '';

  var info = document.getElementById('ref-info');
  if (info) info.textContent = '';
}

function updateReferenceOverlay() {
  var overlay = document.getElementById('ref-overlay');
  if (!overlay) return;

  if (!refImageData.image || !refImageData.visible) {
    overlay.style.display = 'none';
    return;
  }

  overlay.style.display = 'flex';
  overlay.innerHTML = '';

  if (refImageData.edgesVisible && refImageData.edgeCanvas) {
    // Show edge detection canvas
    var c = refImageData.edgeCanvas;
    c.style.opacity = refImageData.opacity;
    overlay.appendChild(c);
  } else {
    // Show original image
    var img = refImageData.image.cloneNode();
    img.style.opacity = refImageData.opacity;
    overlay.appendChild(img);
  }
}

function computeEdgeDetection() {
  if (!refImageData.image) return;

  var src = refImageData.image;
  var threshold = refImageData.edgeThreshold;

  // Draw source to temp canvas at reasonable size (max 1024px wide for performance)
  var maxW = 1024;
  var scale = src.naturalWidth > maxW ? maxW / src.naturalWidth : 1;
  var w = Math.round(src.naturalWidth * scale);
  var h = Math.round(src.naturalHeight * scale);

  var tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = w;
  tmpCanvas.height = h;
  var tmpCtx = tmpCanvas.getContext('2d');
  tmpCtx.drawImage(src, 0, 0, w, h);

  var imageData = tmpCtx.getImageData(0, 0, w, h);
  var pixels = imageData.data;

  // Convert to grayscale luminance array
  var gray = new Float32Array(w * h);
  for (var i = 0; i < w * h; i++) {
    var r = pixels[i * 4];
    var g = pixels[i * 4 + 1];
    var b = pixels[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Sobel edge detection
  var edgeMag = new Float32Array(w * h);
  var maxMag = 0;

  for (var y = 1; y < h - 1; y++) {
    for (var x = 1; x < w - 1; x++) {
      var idx = y * w + x;
      // Sobel X kernel
      var gx = -gray[(y-1)*w + (x-1)] + gray[(y-1)*w + (x+1)]
             - 2*gray[y*w + (x-1)]     + 2*gray[y*w + (x+1)]
             - gray[(y+1)*w + (x-1)]   + gray[(y+1)*w + (x+1)];
      // Sobel Y kernel
      var gy = -gray[(y-1)*w + (x-1)] - 2*gray[(y-1)*w + x] - gray[(y-1)*w + (x+1)]
             + gray[(y+1)*w + (x-1)]   + 2*gray[(y+1)*w + x] + gray[(y+1)*w + (x+1)];

      var mag = Math.sqrt(gx * gx + gy * gy);
      edgeMag[idx] = mag;
      if (mag > maxMag) maxMag = mag;
    }
  }

  // Render edges to output canvas (white edges on black)
  var outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  var outCtx = outCanvas.getContext('2d');
  var outData = outCtx.createImageData(w, h);
  var out = outData.data;

  var normalizedThreshold = threshold * maxMag / 100;

  for (var j = 0; j < w * h; j++) {
    var val = edgeMag[j] > normalizedThreshold ? 255 : 0;
    out[j * 4] = val;
    out[j * 4 + 1] = val;
    out[j * 4 + 2] = val;
    out[j * 4 + 3] = 255;
  }

  outCtx.putImageData(outData, 0, 0);
  refImageData.edgeCanvas = outCanvas;
}

function setupReferenceImageListeners() {
  var fileInput = document.getElementById('ref-image-input');
  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) {
        loadReferenceImage(fileInput.files[0]);
      }
    });
  }

  var opacitySlider = document.getElementById('ref-opacity');
  var opacityLabel = document.getElementById('ref-opacity-value');
  if (opacitySlider) {
    opacitySlider.addEventListener('input', function () {
      refImageData.opacity = parseInt(opacitySlider.value) / 100;
      if (opacityLabel) opacityLabel.textContent = refImageData.opacity.toFixed(2);
      updateReferenceOverlay();
    });
  }

  var visibleCheck = document.getElementById('ref-visible');
  if (visibleCheck) {
    visibleCheck.addEventListener('change', function () {
      refImageData.visible = visibleCheck.checked;
      updateReferenceOverlay();
    });
  }

  var edgesCheck = document.getElementById('ref-edges');
  var edgeControls = document.getElementById('ref-edge-controls');
  if (edgesCheck) {
    edgesCheck.addEventListener('change', function () {
      refImageData.edgesVisible = edgesCheck.checked;
      if (edgeControls) edgeControls.style.display = edgesCheck.checked ? 'block' : 'none';
      updateReferenceOverlay();
    });
  }

  var edgeThreshold = document.getElementById('ref-edge-threshold');
  var edgeThresholdLabel = document.getElementById('ref-edge-threshold-value');
  if (edgeThreshold) {
    edgeThreshold.addEventListener('input', function () {
      refImageData.edgeThreshold = parseInt(edgeThreshold.value);
      if (edgeThresholdLabel) edgeThresholdLabel.textContent = edgeThreshold.value;
      computeEdgeDetection();
      updateReferenceOverlay();
    });
  }

  var clearBtn = document.getElementById('ref-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearReferenceImage);
  }

  // Detect block count slider
  var detectCount = document.getElementById('detect-block-count');
  var detectCountLabel = document.getElementById('detect-count-value');
  if (detectCount) {
    detectCount.addEventListener('input', function () {
      if (detectCountLabel) detectCountLabel.textContent = detectCount.value;
    });
  }

  // Detect depth bands slider
  var detectBands = document.getElementById('detect-depth-bands');
  var detectBandsLabel = document.getElementById('detect-bands-value');
  if (detectBands) {
    detectBands.addEventListener('input', function () {
      if (detectBandsLabel) detectBandsLabel.textContent = detectBands.value;
    });
  }

  // Auto-detect button
  var detectBtn = document.getElementById('detect-blocks-btn');
  if (detectBtn) {
    detectBtn.addEventListener('click', autoDetectBlocks);
  }

  // JSON export/import
  var exportJsonBtn = document.getElementById('export-json-btn');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', exportSceneJSON);
  }
  var importJsonBtn = document.getElementById('import-json-btn');
  if (importJsonBtn) {
    importJsonBtn.addEventListener('click', importSceneJSON);
  }
}

// ─── AI Depth Estimation & Block Detection ─────────────────────────

var depthPipeline = null; // cached after first load

function setDetectProgress(text, pct) {
  var info = document.getElementById('detect-progress');
  var bar = document.getElementById('detect-progress-bar');
  var fill = document.getElementById('detect-progress-fill');
  if (info) info.textContent = text;
  if (pct !== undefined) {
    if (bar) bar.style.display = 'block';
    if (fill) fill.style.width = pct + '%';
  }
}

async function autoDetectBlocks() {
  if (!refImageData.image) {
    setDetectProgress('Load a reference image first.');
    return;
  }

  var detectBtn = document.getElementById('detect-blocks-btn');
  if (detectBtn) detectBtn.disabled = true;

  try {
    // Step 1: Load Transformers.js and model
    if (!depthPipeline) {
      setDetectProgress('Loading AI depth model (first time: ~50MB download)...', 10);
      var transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3');
      setDetectProgress('Initializing depth estimation model...', 30);
      depthPipeline = await transformers.pipeline(
        'depth-estimation',
        'onnx-community/depth-anything-v2-small',
        { dtype: 'q8' }
      );
      setDetectProgress('Model loaded.', 40);
    }

    // Step 2: Run depth estimation on the reference image
    setDetectProgress('Running depth estimation...', 50);

    // Create a blob URL from the loaded image for the pipeline
    var imgCanvas = document.createElement('canvas');
    imgCanvas.width = refImageData.image.naturalWidth;
    imgCanvas.height = refImageData.image.naturalHeight;
    var imgCtx = imgCanvas.getContext('2d');
    imgCtx.drawImage(refImageData.image, 0, 0);
    var blob = await new Promise(function (resolve) {
      imgCanvas.toBlob(resolve, 'image/png');
    });
    var imgUrl = URL.createObjectURL(blob);

    var result = await depthPipeline(imgUrl);
    URL.revokeObjectURL(imgUrl);

    setDetectProgress('Processing depth map...', 70);

    // Step 3: Extract depth data
    var depthTensor = result.depth;
    var depthData;
    var depthW, depthH;

    if (depthTensor.data) {
      depthData = depthTensor.data;
      depthH = depthTensor.height;
      depthW = depthTensor.width;
    } else if (depthTensor instanceof ImageData) {
      depthW = depthTensor.width;
      depthH = depthTensor.height;
      depthData = new Float32Array(depthW * depthH);
      for (var i = 0; i < depthW * depthH; i++) {
        depthData[i] = depthTensor.data[i * 4] / 255;
      }
    }

    // If result.predicted_depth is available (newer transformers.js)
    if (!depthData && result.predicted_depth) {
      var pd = result.predicted_depth;
      if (pd.dims) {
        depthH = pd.dims[pd.dims.length - 2];
        depthW = pd.dims[pd.dims.length - 1];
      }
      depthData = pd.data;
    }

    if (!depthData || !depthW || !depthH) {
      setDetectProgress('Could not extract depth data from model output.', 0);
      if (detectBtn) detectBtn.disabled = false;
      return;
    }

    // Normalize depth to 0-1 range
    var minD = Infinity, maxD = -Infinity;
    for (var k = 0; k < depthData.length; k++) {
      if (depthData[k] < minD) minD = depthData[k];
      if (depthData[k] > maxD) maxD = depthData[k];
    }
    var rangeD = maxD - minD || 1;
    var normalizedDepth = new Float32Array(depthData.length);
    for (var k = 0; k < depthData.length; k++) {
      normalizedDepth[k] = (depthData[k] - minD) / rangeD;
    }

    setDetectProgress('Generating blocks from depth map...', 85);

    // Step 4: Generate blocks
    var maxBlocks = parseInt(document.getElementById('detect-block-count').value) || 6;
    var numBands = parseInt(document.getElementById('detect-depth-bands').value) || 4;
    var addGround = document.getElementById('detect-add-ground').checked;
    var clearExisting = document.getElementById('detect-clear-existing').checked;

    var blocks = depthMapToBlocks(normalizedDepth, depthW, depthH, numBands, maxBlocks);

    // Step 5: Clear and add to scene
    if (clearExisting) {
      var idsToRemove = state.blocks.map(function (b) { return b.id; });
      idsToRemove.forEach(function (id) { removeBlock(id); });
    }

    if (addGround) {
      addBlock('floor');
    }

    blocks.forEach(function (b) {
      var id = state.nextBlockId++;
      var block = {
        id: id,
        name: b.name,
        shape: 'box',
        color: b.color,
        position: { x: b.x, y: b.y, z: b.z },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: b.w, y: b.h, z: b.d },
        hasMotion: false,
        endPosition: { x: b.x, y: b.y, z: b.z },
        endRotation: { x: 0, y: 0, z: 0 },
        mesh: null
      };
      block.mesh = createBlockMesh(block);
      scene.add(block.mesh);
      state.blocks.push(block);
    });

    updateBlockList();
    if (state.blocks.length > 0) {
      selectBlock(state.blocks[state.blocks.length > 1 ? 1 : 0].id);
    }

    setDetectProgress('Done! Generated ' + blocks.length + ' blocks.', 100);

  } catch (err) {
    console.error('Auto-detect error:', err);
    setDetectProgress('Error: ' + err.message, 0);
  }

  if (detectBtn) detectBtn.disabled = false;
}

// ─── Depth Map to Blocks Algorithm ─────────────────────────────────

function depthMapToBlocks(depthMap, w, h, numBands, maxBlocks) {
  // Downsample for faster processing
  var procW = Math.min(w, 128);
  var procH = Math.min(h, 128);
  var scaled = bilinearResize(depthMap, w, h, procW, procH);

  // Gaussian blur to reduce noise
  scaled = gaussianBlur3x3(scaled, procW, procH);

  // Quantize depth into bands
  var labels = new Int32Array(procW * procH);
  for (var i = 0; i < labels.length; i++) {
    labels[i] = Math.min(numBands - 1, Math.floor(scaled[i] * numBands));
  }

  // Find connected components per band using flood fill
  var componentId = new Int32Array(procW * procH).fill(-1);
  var components = []; // {band, pixelCount, sumX, sumY, sumDepth, minX, maxX, minY, maxY}
  var nextComp = 0;

  for (var y = 0; y < procH; y++) {
    for (var x = 0; x < procW; x++) {
      var idx = y * procW + x;
      if (componentId[idx] >= 0) continue;

      var band = labels[idx];
      var comp = {
        id: nextComp,
        band: band,
        pixelCount: 0,
        sumX: 0, sumY: 0, sumDepth: 0,
        minX: x, maxX: x, minY: y, maxY: y
      };

      // Flood fill
      var stack = [idx];
      while (stack.length > 0) {
        var ci = stack.pop();
        if (componentId[ci] >= 0) continue;
        var cx = ci % procW;
        var cy = Math.floor(ci / procW);
        if (labels[ci] !== band) continue;

        componentId[ci] = nextComp;
        comp.pixelCount++;
        comp.sumX += cx;
        comp.sumY += cy;
        comp.sumDepth += scaled[ci];
        if (cx < comp.minX) comp.minX = cx;
        if (cx > comp.maxX) comp.maxX = cx;
        if (cy < comp.minY) comp.minY = cy;
        if (cy > comp.maxY) comp.maxY = cy;

        // 4-connected neighbors
        if (cx > 0) stack.push(ci - 1);
        if (cx < procW - 1) stack.push(ci + 1);
        if (cy > 0) stack.push(ci - procW);
        if (cy < procH - 1) stack.push(ci + procW);
      }

      components.push(comp);
      nextComp++;
    }
  }

  // Filter: remove tiny components (< 2% of image area)
  var minArea = procW * procH * 0.02;
  components = components.filter(function (c) { return c.pixelCount >= minArea; });

  // Sort by size (largest first) and take top maxBlocks
  components.sort(function (a, b) { return b.pixelCount - a.pixelCount; });
  components = components.slice(0, maxBlocks);

  // Convert to 3D blocks
  // Scene mapping: image coords -> world coords
  // X: image left-right -> scene X (-sceneW/2 to sceneW/2)
  // Y: depth -> scene Z (near=front, far=back)
  // Z: image top-bottom -> scene Y (top=tall, bottom=ground)
  var sceneWidth = 10;
  var sceneDepth = 8;
  var sceneMaxHeight = 4;
  var aspect = procW / procH;

  var grays = ['#555555', '#666666', '#707070', '#7a7a7a', '#858585',
               '#909090', '#9a9a9a', '#a0a0a0', '#aaaaaa', '#b0b0b0',
               '#bbbbbb', '#c0c0c0', '#cccccc', '#d0d0d0', '#d8d8d8'];

  var blocks = [];
  components.forEach(function (comp, idx) {
    var centerX = comp.sumX / comp.pixelCount;
    var centerY = comp.sumY / comp.pixelCount;
    var avgDepth = comp.sumDepth / comp.pixelCount;
    var bboxW = comp.maxX - comp.minX + 1;
    var bboxH = comp.maxY - comp.minY + 1;

    // Map image position to scene coordinates
    // X: center of image = scene X=0
    var nx = (centerX / procW - 0.5) * 2; // -1 to 1
    var ny = (centerY / procH - 0.5) * 2; // -1 to 1

    // Depth: 0 = near (front of scene), 1 = far (back)
    // Invert so that high depth values (far) go to negative Z
    var sceneZ = -(avgDepth - 0.5) * sceneDepth;

    // X position, scaled by depth for perspective
    var perspScale = 0.7 + avgDepth * 0.6;
    var sceneX = nx * (sceneWidth / 2) * perspScale;

    // Block height: taller blocks for regions in the upper part of the image
    // Bottom of image = ground level, top = higher
    var heightFromBottom = 1 - (centerY / procH);
    var blockHeight = Math.max(0.3, heightFromBottom * sceneMaxHeight);

    // Block width and depth from bounding box size
    var blockW = Math.max(0.3, (bboxW / procW) * sceneWidth * perspScale);
    var blockD = Math.max(0.3, (bboxH / procH) * sceneDepth * 0.5);

    // Y position: block sits on ground, center at half height
    var sceneY = blockHeight / 2;

    // Color: darker for nearer objects, lighter for farther
    var colorIdx = Math.min(grays.length - 1, Math.floor(avgDepth * (grays.length - 1)));

    blocks.push({
      name: 'Block ' + (idx + 1),
      x: Math.round(sceneX * 10) / 10,
      y: Math.round(sceneY * 10) / 10,
      z: Math.round(sceneZ * 10) / 10,
      w: Math.round(blockW * 10) / 10,
      h: Math.round(blockHeight * 10) / 10,
      d: Math.round(blockD * 10) / 10,
      color: grays[colorIdx]
    });
  });

  return blocks;
}

function bilinearResize(src, srcW, srcH, dstW, dstH) {
  var dst = new Float32Array(dstW * dstH);
  var xRatio = srcW / dstW;
  var yRatio = srcH / dstH;
  for (var y = 0; y < dstH; y++) {
    for (var x = 0; x < dstW; x++) {
      var sx = x * xRatio;
      var sy = y * yRatio;
      var x0 = Math.floor(sx);
      var y0 = Math.floor(sy);
      var x1 = Math.min(x0 + 1, srcW - 1);
      var y1 = Math.min(y0 + 1, srcH - 1);
      var fx = sx - x0;
      var fy = sy - y0;
      var v = src[y0 * srcW + x0] * (1 - fx) * (1 - fy)
            + src[y0 * srcW + x1] * fx * (1 - fy)
            + src[y1 * srcW + x0] * (1 - fx) * fy
            + src[y1 * srcW + x1] * fx * fy;
      dst[y * dstW + x] = v;
    }
  }
  return dst;
}

function gaussianBlur3x3(src, w, h) {
  var dst = new Float32Array(w * h);
  var kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  var kSum = 16;
  for (var y = 1; y < h - 1; y++) {
    for (var x = 1; x < w - 1; x++) {
      var sum = 0;
      for (var ky = -1; ky <= 1; ky++) {
        for (var kx = -1; kx <= 1; kx++) {
          sum += src[(y + ky) * w + (x + kx)] * kernel[(ky + 1) * 3 + (kx + 1)];
        }
      }
      dst[y * w + x] = sum / kSum;
    }
  }
  // Copy borders
  for (var x = 0; x < w; x++) { dst[x] = src[x]; dst[(h - 1) * w + x] = src[(h - 1) * w + x]; }
  for (var y = 0; y < h; y++) { dst[y * w] = src[y * w]; dst[y * w + w - 1] = src[y * w + w - 1]; }
  return dst;
}

// ─── Scene JSON Import/Export ──────────────────────────────────────

function exportSceneJSON() {
  var sceneData = {
    blocks: state.blocks.map(function (b) {
      return {
        name: b.name,
        shape: b.shape,
        color: b.color,
        position: b.position,
        rotation: b.rotation,
        scale: b.scale,
        hasMotion: b.hasMotion,
        endPosition: b.endPosition,
        endRotation: b.endRotation
      };
    }),
    camera: {
      preset: (document.getElementById('camera-preset') || {}).value || 'static',
      intensity: parseFloat((document.getElementById('camera-intensity') || {}).value) || 1.0,
      easing: (document.getElementById('camera-easing') || {}).value || 'linear'
    },
    output: {
      width: parseInt((document.getElementById('output-width') || {}).value) || 832,
      height: parseInt((document.getElementById('output-height') || {}).value) || 480,
      frames: parseInt((document.getElementById('frame-count') || {}).value) || 81,
      fps: parseInt((document.getElementById('output-fps') || {}).value) || 24
    }
  };

  var jsonStr = JSON.stringify(sceneData, null, 2);
  var textarea = document.getElementById('json-textarea');
  if (textarea) {
    textarea.style.display = 'block';
    textarea.value = jsonStr;
    textarea.select();
    try { navigator.clipboard.writeText(jsonStr); } catch (e) {}
  }
}

function importSceneJSON() {
  var textarea = document.getElementById('json-textarea');
  if (textarea) {
    if (textarea.style.display === 'none') {
      textarea.style.display = 'block';
      textarea.value = '';
      textarea.placeholder = 'Paste scene JSON here, then click Load JSON again';
      textarea.focus();
      return;
    }

    var jsonStr = textarea.value.trim();
    if (!jsonStr) return;

    try {
      var sceneData = JSON.parse(jsonStr);
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
      return;
    }

    // Clear existing blocks
    var idsToRemove = state.blocks.map(function (b) { return b.id; });
    idsToRemove.forEach(function (id) { removeBlock(id); });

    // Load blocks
    if (sceneData.blocks && Array.isArray(sceneData.blocks)) {
      sceneData.blocks.forEach(function (b) {
        var id = state.nextBlockId++;
        var block = {
          id: id,
          name: b.name || ('Block ' + id),
          shape: b.shape || 'box',
          color: b.color || '#808080',
          position: b.position || { x: 0, y: 0.5, z: 0 },
          rotation: b.rotation || { x: 0, y: 0, z: 0 },
          scale: b.scale || { x: 1, y: 1, z: 1 },
          hasMotion: b.hasMotion || false,
          endPosition: b.endPosition || { x: b.position.x, y: b.position.y, z: b.position.z },
          endRotation: b.endRotation || { x: 0, y: 0, z: 0 },
          mesh: null
        };
        block.mesh = createBlockMesh(block);
        scene.add(block.mesh);
        state.blocks.push(block);
      });
    }

    // Load camera settings
    if (sceneData.camera) {
      var presetSel = document.getElementById('camera-preset');
      if (presetSel && sceneData.camera.preset) presetSel.value = sceneData.camera.preset;
      var intInput = document.getElementById('camera-intensity');
      if (intInput && sceneData.camera.intensity) intInput.value = sceneData.camera.intensity;
      var easingSel = document.getElementById('camera-easing');
      if (easingSel && sceneData.camera.easing) easingSel.value = sceneData.camera.easing;
      var intLabel = document.getElementById('intensity-value');
      if (intLabel) intLabel.textContent = parseFloat(intInput.value).toFixed(1);
    }

    // Load output settings
    if (sceneData.output) {
      if (sceneData.output.width) document.getElementById('output-width').value = sceneData.output.width;
      if (sceneData.output.height) document.getElementById('output-height').value = sceneData.output.height;
      if (sceneData.output.frames) document.getElementById('frame-count').value = sceneData.output.frames;
      if (sceneData.output.fps) document.getElementById('output-fps').value = sceneData.output.fps;
    }

    updateBlockList();
    if (state.blocks.length > 0) selectBlock(state.blocks[0].id);
    textarea.style.display = 'none';
  }
}

// ─── Initialization ─────────────────────────────────────────────────

function init() {
  initScene();
  createDefaultScene();
  setupEventListeners();
  setupReferenceImageListeners();
  updateBlockList();

  if (state.blocks.length > 1) {
    selectBlock(state.blocks[1].id);
  }

  animate();
}

window.onload = init;
