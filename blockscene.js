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

// ─── Video Export ───────────────────────────────────────────────────

function startExport() {
  if (state.isExporting) return;
  state.isExporting = true;
  state.isPlaying = false;

  var playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.textContent = 'Play';

  var outputWidth = parseInt(document.getElementById('output-width').value) || 768;
  var outputHeight = parseInt(document.getElementById('output-height').value) || 512;
  var fps = parseInt(document.getElementById('output-fps').value) || 24;
  var frameCount = parseInt(document.getElementById('frame-count').value) || 60;

  var savedWidth = renderer.domElement.width;
  var savedHeight = renderer.domElement.height;
  var savedStyleWidth = renderer.domElement.style.width;
  var savedStyleHeight = renderer.domElement.style.height;

  renderer.setSize(outputWidth, outputHeight);
  animCamera.aspect = outputWidth / outputHeight;
  animCamera.updateProjectionMatrix();

  var exportPanel = document.getElementById('export-panel');
  if (exportPanel) exportPanel.classList.add('visible');

  var progressFill = document.getElementById('progress-fill');
  var progressInfo = document.getElementById('progress-info');
  if (progressFill) progressFill.style.width = '0%';
  if (progressInfo) progressInfo.textContent = 'Starting export...';

  var stream = renderer.domElement.captureStream(0);
  var recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 8000000
  });

  var chunks = [];
  recorder.ondataavailable = function (e) {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.onstop = function () {
    var blob = new Blob(chunks, { type: 'video/webm' });
    finishExport(blob, savedWidth, savedHeight, savedStyleWidth, savedStyleHeight);
  };

  recorder.start();

  var frame = 0;
  function renderExportFrame() {
    if (frame >= frameCount) {
      recorder.stop();
      return;
    }

    var progress = frameCount <= 1 ? 0 : frame / (frameCount - 1);
    updateSceneAtProgress(progress);
    renderer.render(scene, animCamera);

    var track = stream.getVideoTracks()[0];
    if (track && track.requestFrame) track.requestFrame();

    var pct = Math.round((frame + 1) / frameCount * 100);
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressInfo) progressInfo.textContent = 'Exporting frame ' + (frame + 1) + '/' + frameCount;

    frame++;
    setTimeout(renderExportFrame, 1000 / fps);
  }

  setTimeout(renderExportFrame, 100);
}

function finishExport(blob, savedWidth, savedHeight, savedStyleWidth, savedStyleHeight) {
  var url = URL.createObjectURL(blob);

  var exportPanel = document.getElementById('export-panel');
  if (exportPanel) exportPanel.classList.add('visible');

  var preview = document.getElementById('export-preview');
  if (preview) {
    preview.src = url;
    preview.style.display = 'block';
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  editCamera.aspect = window.innerWidth / window.innerHeight;
  editCamera.updateProjectionMatrix();
  animCamera.aspect = window.innerWidth / window.innerHeight;
  animCamera.updateProjectionMatrix();

  state.isExporting = false;

  var progressInfo = document.getElementById('progress-info');
  if (progressInfo) progressInfo.textContent = 'Export complete!';
}

function downloadExport() {
  var preview = document.getElementById('export-preview');
  if (!preview || !preview.src) return;

  var presetSel = document.getElementById('camera-preset');
  var preset = presetSel ? presetSel.value : 'static';
  var w = document.getElementById('output-width').value || '832';
  var h = document.getElementById('output-height').value || '480';

  var a = document.createElement('a');
  a.href = preview.src;
  a.download = 'block-scene-' + preset + '-' + w + 'x' + h + '.webm';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function closeExportPanel() {
  var exportPanel = document.getElementById('export-panel');
  if (exportPanel) exportPanel.classList.remove('visible');

  var preview = document.getElementById('export-preview');
  if (preview) {
    if (preview.src) URL.revokeObjectURL(preview.src);
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

// ─── Initialization ─────────────────────────────────────────────────

function init() {
  initScene();
  createDefaultScene();
  setupEventListeners();
  updateBlockList();

  if (state.blocks.length > 1) {
    selectBlock(state.blocks[1].id);
  }

  animate();
}

window.onload = init;
