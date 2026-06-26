import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#scene");
const message = document.querySelector("#message");
const fileInput = document.querySelector("#json-file");
const jobInput = document.querySelector("#job-id");
const fetchButton = document.querySelector("#fetch-job");
const playButton = document.querySelector("#play-toggle");
const frameSlider = document.querySelector("#frame-slider");
const frameLabel = document.querySelector("#frame-label");
const playbackSpeedSlider = document.querySelector("#playback-speed");
const playbackSpeedValue = document.querySelector("#playback-speed-value");
const modeButtons = document.querySelectorAll(".mode-button");
const coordinateSelect = document.querySelector("#coordinate-select");
const coordinateChart = document.querySelector("#coordinate-chart");
const coordinateValue = document.querySelector("#coordinate-value");

const jobStatus = document.querySelector("#job-status");
const frameCount = document.querySelector("#frame-count");
const jointCount = document.querySelector("#joint-count");
const fittingCount = document.querySelector("#fitting-count");
const kneeRight = document.querySelector("#knee-right");
const kneeLeft = document.querySelector("#knee-left");
const ankleDistance = document.querySelector("#ankle-distance");

const defaultSkeleton = {
  joint_names: [
    "pelvis",
    "right_hip",
    "right_knee",
    "right_ankle",
    "left_hip",
    "left_knee",
    "left_ankle",
    "spine",
    "neck",
    "head",
    "head_top",
    "left_shoulder",
    "left_elbow",
    "left_wrist",
    "right_shoulder",
    "right_elbow",
    "right_wrist",
  ],
  connections: [
    [0, 1],
    [1, 2],
    [2, 3],
    [0, 4],
    [4, 5],
    [5, 6],
    [0, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [8, 11],
    [11, 12],
    [12, 13],
    [8, 14],
    [14, 15],
    [15, 16],
  ],
};

const rigConnections = [
  ["pelvis", "spine"],
  ["spine", "neck"],
  ["neck", "head"],
  ["pelvis", "right_hip"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
  ["right_ankle", "right_foot"],
  ["pelvis", "left_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["left_ankle", "left_foot"],
  ["neck", "right_shoulder"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["neck", "left_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
];

let currentResult = buildSampleResult();
let currentFrame = 0;
let currentMode = "model3d";
let playing = true;
let lastStepAt = 0;

const defaultPlaybackSpeed = 0.5;
const defaultPelvisHeight = 0.92;
const visualFittingSmoothingRadius = 2;
const visualStrideScale = 0.35;
const model3dFloorClearance = 0.006;
const model3dGroundSmoothRadius = 2;
const defaultPlaybackFps = 30;
const maxPlaybackFps = 60;

let visualCalibration = buildVisualCalibration(currentResult);
let playbackSpeed = defaultPlaybackSpeed;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x111315, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x111315, 4, 10);

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
camera.position.set(2.2, 1.7, 3.1);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.85, 0);

const grid = new THREE.GridHelper(4, 16, 0x465057, 0x2a3034);
grid.position.y = -0.02;
scene.add(grid);

scene.add(new THREE.AmbientLight(0xffffff, 1.4));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(3, 5, 2);
scene.add(keyLight);

const model3dGroup = new THREE.Group();
const poseGroup = new THREE.Group();
const fittingGroup = new THREE.Group();
scene.add(model3dGroup);
scene.add(poseGroup);
scene.add(fittingGroup);

const jointMaterial = new THREE.MeshStandardMaterial({
  color: 0x42d3c8,
  roughness: 0.38,
  metalness: 0.12,
});
const rootMaterial = new THREE.MeshStandardMaterial({
  color: 0xf1b84b,
  roughness: 0.35,
  metalness: 0.1,
});
const fittingMaterial = new THREE.MeshStandardMaterial({
  color: 0x8edb72,
  roughness: 0.4,
  metalness: 0.08,
});
const boneMaterial = new THREE.LineBasicMaterial({ color: 0xf4f1ea });
const fittingBoneMaterial = new THREE.LineBasicMaterial({ color: 0xccefc4 });

const jointGeometry = new THREE.SphereGeometry(0.035, 18, 18);
const model3dMeshes = [];
const model3dSites = [];
const model3dBodies = [];
const model3dBodyLines = [];
let model3dGroundOffsets = [];
const poseJoints = [];
const poseBones = [];
const fittingJoints = new Map();
const fittingBones = [];

defaultSkeleton.joint_names.forEach((_, index) => {
  const mesh = new THREE.Mesh(jointGeometry, index === 0 ? rootMaterial : jointMaterial);
  poseGroup.add(mesh);
  poseJoints.push(mesh);
});

defaultSkeleton.connections.forEach(() => {
  const line = new THREE.Line(newLineGeometry(), boneMaterial);
  poseGroup.add(line);
  poseBones.push(line);
});

new Set(rigConnections.flat()).forEach((name) => {
  const mesh = new THREE.Mesh(
    jointGeometry,
    name === "pelvis" ? rootMaterial : fittingMaterial,
  );
  fittingGroup.add(mesh);
  fittingJoints.set(name, mesh);
});

rigConnections.forEach(() => {
  const line = new THREE.Line(newLineGeometry(), fittingBoneMaterial);
  fittingGroup.add(line);
  fittingBones.push(line);
});

fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  try {
    loadResult(JSON.parse(await file.text()), `Arquivo carregado: ${file.name}`);
  } catch (error) {
    setMessage(`Erro ao ler JSON: ${error.message}`);
  }
});

fetchButton.addEventListener("click", async () => {
  const jobId = jobInput.value.trim();
  if (!jobId) {
    setMessage("Informe um job_id para buscar na API.");
    return;
  }

  try {
    const response = await fetch(`http://localhost:8000/results/${jobId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    loadResult(await response.json(), `Resultado carregado da API: ${jobId}`);
  } catch (error) {
    setMessage(`Falha ao buscar resultado: ${error.message}`);
  }
});

playButton.addEventListener("click", () => {
  playing = !playing;
  lastStepAt = 0;
  playButton.textContent = playing ? "Pausar" : "Reproduzir";
});

frameSlider.addEventListener("input", () => {
  currentFrame = Number(frameSlider.value);
  playing = false;
  playButton.textContent = "Reproduzir";
  updateScene();
});

playbackSpeedSlider.addEventListener("input", () => {
  playbackSpeed = Number(playbackSpeedSlider.value) || defaultPlaybackSpeed;
  lastStepAt = 0;
  syncPlaybackSpeedControl();
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentMode = button.dataset.mode;
    syncModeButtons();
    updateScene();
    setMessage(getModeMessage());
  });
});

coordinateSelect.addEventListener("change", () => {
  drawCoordinateChart();
  updateCoordinateValue();
});

window.addEventListener("resize", resizeRenderer);

loadResult(currentResult, "Amostra interna carregada. Use JSON local ou job_id da API.");
renderer.setAnimationLoop(animate);

function loadResult(result, statusMessage) {
  const data = result.data;
  if (!data || !Array.isArray(data.pose3d) || data.pose3d.length === 0) {
    setMessage("JSON sem data.pose3d valido.");
    return;
  }

  currentResult = result;
  currentFrame = 0;
  playing = true;
  lastStepAt = 0;
  playButton.textContent = "Pausar";
  syncPlaybackSpeedControl();
  visualCalibration = buildVisualCalibration(result);
  buildModel3dScene();
  currentMode = data.model3d ? "model3d" : "fitting";
  syncModeButtons();

  const pose3d = data.pose3d;
  const frame = pose3d[0] || [];
  const coordinateNames = getCoordinateNames();

  jobStatus.textContent = result.job?.status || "sem status";
  frameCount.textContent = String(pose3d.length);
  jointCount.textContent = String(frame.length);
  fittingCount.textContent = coordinateNames.length
    ? `${coordinateNames.length} coord.`
    : "sem fitting";

  frameSlider.min = "0";
  frameSlider.max = String(Math.max(pose3d.length - 1, 0));
  frameSlider.value = "0";

  fillCoordinateSelect();
  updateScene();
  setMessage(statusMessage);
}

function updateScene() {
  model3dGroup.visible = currentMode === "model3d";
  poseGroup.visible = currentMode === "pose3d";
  fittingGroup.visible = currentMode === "fitting";

  if (currentMode === "model3d") {
    updateModel3dScene();
  } else if (currentMode === "fitting") {
    updateFittingRig();
  } else {
    updatePoseSkeleton();
  }

  frameSlider.value = String(currentFrame);
  frameLabel.textContent = `Frame ${currentFrame + 1} / ${getFrameTotal()}`;
  updateMetrics(currentFrame);
  updateCoordinateValue();
  drawCoordinateChart();
}

function buildModel3dScene() {
  disposeGroup(model3dGroup);
  model3dMeshes.length = 0;
  model3dSites.length = 0;
  model3dBodies.length = 0;
  model3dBodyLines.length = 0;
  model3dGroundOffsets = [];

  const model3d = currentResult.data.model3d;
  if (!model3d) return;

  const meshById = new Map((model3d.meshes || []).map((mesh) => [mesh.id, mesh]));

  (model3d.geoms || []).forEach((geom) => {
    const geometry = createMujocoGeometry(geom, meshById);
    if (!geometry) {
      model3dMeshes.push(null);
      return;
    }

    const mesh = new THREE.Mesh(geometry, createMujocoMaterial(geom));
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    model3dGroup.add(mesh);
    model3dMeshes.push(mesh);
  });

  const siteGeometry = new THREE.SphereGeometry(0.012, 10, 10);
  const siteMaterial = new THREE.MeshStandardMaterial({
    color: 0xf1b84b,
    roughness: 0.45,
    metalness: 0.05,
  });

  (model3d.sites || []).forEach(() => {
    const site = new THREE.Mesh(siteGeometry, siteMaterial);
    site.visible = false;
    model3dGroup.add(site);
    model3dSites.push(site);
  });

  const bodyGeometry = new THREE.SphereGeometry(0.028, 14, 14);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x74c0ff,
    roughness: 0.42,
    metalness: 0.08,
  });

  (model3d.bodies || []).forEach((body) => {
    const bodyPoint = new THREE.Mesh(
      bodyGeometry,
      body.id === 0 ? rootMaterial : bodyMaterial,
    );
    bodyPoint.visible = false;
    model3dGroup.add(bodyPoint);
    model3dBodies.push(bodyPoint);
  });

  (model3d.connections || []).forEach(() => {
    const line = new THREE.Line(newLineGeometry(), fittingBoneMaterial);
    line.visible = false;
    model3dGroup.add(line);
    model3dBodyLines.push(line);
  });

  model3dGroundOffsets = buildModel3dGroundOffsets(model3d, visualCalibration.model3d);
}

function updateModel3dScene() {
  const model3d = currentResult.data.model3d;
  if (!model3d || !model3d.frames?.length) {
    fittingGroup.visible = true;
    model3dGroup.visible = false;
    updateFittingRig();
    return;
  }

  const frameIndex = Math.min(currentFrame, model3d.frames.length - 1);
  const frame = model3d.frames[frameIndex] || model3d.frames[0];
  const positions = frame.geom_xpos || [];
  const rotations = frame.geom_xmat || [];
  const geoms = model3d.geoms || [];
  const calibration = visualCalibration.model3d;
  const floorOffset = getModel3dGroundOffset(frameIndex);

  if (positions.length === 0) {
    updateModel3dPointScene(frame, calibration, floorOffset);
    return;
  }

  model3dMeshes.forEach((mesh, index) => {
    if (!mesh || !positions[index]) {
      if (mesh) mesh.visible = false;
      return;
    }

    const geom = geoms[index];
    if (!isRenderableMujocoGeom(geom)) {
      mesh.visible = false;
      return;
    }

    const adjustedPosition = [
      positions[index][0],
      positions[index][1],
      positions[index][2],
    ];

    setMujocoMatrix(mesh, adjustedPosition, rotations[index], calibration, floorOffset);
    mesh.visible = true;
  });

  const sitePositions = frame.site_xpos || [];
  model3dSites.forEach((site, index) => {
    const position = sitePositions[index];
    if (!position || positions.length > 0) {
      site.visible = false;
      return;
    }

    site.position.copy(mujocoToThreePosition(position, calibration, floorOffset));
    site.visible = true;
  });
}

function updateModel3dPointScene(frame, calibration, floorOffset) {
  const bodyPositions = frame.body_xpos || [];
  const sitePositions = frame.site_xpos || [];
  const connections = currentResult.data.model3d?.connections || [];

  model3dBodies.forEach((bodyPoint, index) => {
    const position = bodyPositions[index];
    if (!position) {
      bodyPoint.visible = false;
      return;
    }

    bodyPoint.position.copy(mujocoToThreePosition(position, calibration, floorOffset));
    bodyPoint.visible = true;
  });

  model3dBodyLines.forEach((line, index) => {
    const [start, end] = connections[index] || [];
    const startPoint = model3dBodies[start];
    const endPoint = model3dBodies[end];

    if (!startPoint || !endPoint || !startPoint.visible || !endPoint.visible) {
      line.visible = false;
      return;
    }

    setLine(line, startPoint.position, endPoint.position);
    line.visible = true;
  });

  model3dSites.forEach((site, index) => {
    const position = sitePositions[index];
    if (!position) {
      site.visible = false;
      return;
    }

    site.position.copy(mujocoToThreePosition(position, calibration, floorOffset));
    site.visible = true;
    site.scale.setScalar(0.65);
  });
}

function createMujocoGeometry(geom, meshById) {
  const size = geom.size || [0.03, 0.03, 0.03];

  if (geom.type === "sphere") {
    return convertMujocoGeometry(
      new THREE.SphereGeometry(Math.max(size[0], 0.005), 18, 18),
    );
  }

  if (geom.type === "capsule") {
    const geometry = new THREE.CapsuleGeometry(
      Math.max(size[0], 0.005),
      Math.max(size[1] * 2, 0.01),
      8,
      16,
    );
    geometry.rotateX(Math.PI / 2);
    return convertMujocoGeometry(geometry);
  }

  if (geom.type === "cylinder") {
    const geometry = new THREE.CylinderGeometry(
      Math.max(size[0], 0.005),
      Math.max(size[0], 0.005),
      Math.max(size[1] * 2, 0.01),
      18,
    );
    geometry.rotateX(Math.PI / 2);
    return convertMujocoGeometry(geometry);
  }

  if (geom.type === "box") {
    return convertMujocoGeometry(
      new THREE.BoxGeometry(
        Math.max(size[0] * 2, 0.01),
        Math.max(size[1] * 2, 0.01),
        Math.max(size[2] * 2, 0.01),
      ),
    );
  }

  if (geom.type === "ellipsoid") {
    const geometry = new THREE.SphereGeometry(1, 18, 18);
    geometry.scale(
      Math.max(size[0], 0.005),
      Math.max(size[1], 0.005),
      Math.max(size[2], 0.005),
    );
    return convertMujocoGeometry(geometry);
  }

  if (geom.type === "mesh" && geom.mesh_id !== null) {
    return createMeshGeometry(meshById.get(geom.mesh_id));
  }

  return null;
}

function createMeshGeometry(meshPayload) {
  if (!meshPayload?.vertices?.length || !meshPayload?.faces?.length) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(meshPayload.vertices.flat()), 3),
  );
  geometry.setIndex(meshPayload.faces.flat());
  geometry.computeVertexNormals();
  return convertMujocoGeometry(geometry);
}

function createMujocoMaterial(geom) {
  const rgba = geom.rgba || [0.55, 0.8, 0.45, 1.0];
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(rgba[0], rgba[1], rgba[2]),
    roughness: 0.48,
    metalness: 0.08,
    opacity: rgba[3],
    transparent: rgba[3] < 1,
    side: THREE.DoubleSide,
  });
}

function setMujocoMatrix(mesh, position, xmat, calibration, floorOffset) {
  mesh.matrix.copy(buildMujocoMatrix(position, xmat, calibration, floorOffset));
}

function buildMujocoMatrix(position, xmat, calibration, floorOffset) {
  const matrix = new THREE.Matrix4();
  const convertedPosition = mujocoToThreePosition(position, calibration, floorOffset);

  if (Array.isArray(xmat) && xmat.length >= 9) {
    const rotation = mujocoRotationToThree(xmat);
    matrix.set(
      rotation[0],
      rotation[1],
      rotation[2],
      0,
      rotation[3],
      rotation[4],
      rotation[5],
      0,
      rotation[6],
      rotation[7],
      rotation[8],
      0,
      0,
      0,
      0,
      1,
    );
    matrix.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(calibration.alignment));
    matrix.setPosition(convertedPosition);
    return matrix;
  }

  matrix.makeTranslation(convertedPosition.x, convertedPosition.y, convertedPosition.z);
  return matrix;
}

function mujocoToThreePosition(position, calibration, floorOffset = 0) {
  const converted = new THREE.Vector3(
    position[0] - calibration.originX,
    position[2],
    -(position[1] - calibration.originZ),
  );
  converted.applyQuaternion(calibration.alignment);
  converted.y += floorOffset;
  return converted;
}

function mujocoRotationToThree(xmat) {
  const c = [
    [1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
  ];
  const r = [
    [xmat[0], xmat[1], xmat[2]],
    [xmat[3], xmat[4], xmat[5]],
    [xmat[6], xmat[7], xmat[8]],
  ];
  const converted = multiply3(c, r);
  return converted.flat();
}

function convertMujocoGeometry(geometry) {
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.computeVertexNormals();
  return geometry;
}

function multiply3(a, b) {
  return a.map((row, rowIndex) =>
    row.map((_, colIndex) =>
      a[rowIndex][0] * b[0][colIndex] +
      a[rowIndex][1] * b[1][colIndex] +
      a[rowIndex][2] * b[2][colIndex],
    ),
  );
}

function buildModel3dGroundOffsets(model3d, calibration) {
  const frames = model3d?.frames || [];
  const geoms = model3d?.geoms || [];
  const rawOffsets = frames.map((frame) => {
    const footOffset = estimateModel3dFrameGroundOffset(frame, geoms, calibration, true);
    if (Number.isFinite(footOffset)) return footOffset;

    return estimateModel3dFrameGroundOffset(frame, geoms, calibration, false);
  });

  return smoothModel3dGroundOffsets(fillModel3dGroundOffsets(rawOffsets));
}

function estimateModel3dFrameGroundOffset(frame, geoms, calibration, footOnly) {
  const positions = frame.geom_xpos || [];
  const rotations = frame.geom_xmat || [];
  let minY = Number.POSITIVE_INFINITY;

  model3dMeshes.forEach((mesh, index) => {
    const geom = geoms[index];
    if (!mesh?.geometry || !positions[index] || !isRenderableMujocoGeom(geom)) return;
    if (footOnly && !isFootGroundGeom(geom)) return;

    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();

    const matrix = buildMujocoMatrix(positions[index], rotations[index], calibration, 0);
    const box = new THREE.Box3().copy(mesh.geometry.boundingBox).applyMatrix4(matrix);
    minY = Math.min(minY, box.min.y);
  });

  if (!Number.isFinite(minY)) return Number.NaN;
  return clamp(getModel3dFloorY() - minY, -1.4, 1.4);
}

function fillModel3dGroundOffsets(rawOffsets) {
  const firstFinite = rawOffsets.find((value) => Number.isFinite(value)) ?? 0;
  let lastFinite = firstFinite;

  return rawOffsets.map((value) => {
    if (Number.isFinite(value)) {
      lastFinite = value;
      return value;
    }

    return lastFinite;
  });
}

function smoothModel3dGroundOffsets(offsets) {
  return offsets.map((_, index) => {
    let total = 0;
    let count = 0;
    const start = Math.max(0, index - model3dGroundSmoothRadius);
    const end = Math.min(offsets.length - 1, index + model3dGroundSmoothRadius);

    for (let i = start; i <= end; i += 1) {
      if (!Number.isFinite(offsets[i])) continue;
      total += offsets[i];
      count += 1;
    }

    return count ? clamp(total / count, -1.4, 1.4) : 0;
  });
}

function getModel3dGroundOffset(frameIndex) {
  return model3dGroundOffsets[frameIndex] ?? model3dGroundOffsets[model3dGroundOffsets.length - 1] ?? 0;
}

function getModel3dFloorY() {
  return grid.position.y + model3dFloorClearance;
}

function isRenderableMujocoGeom(geom) {
  const alpha = geom?.rgba?.[3] ?? 1;
  return Boolean(geom) && geom.type !== "plane" && alpha > 0.05;
}

function isFootGroundGeom(geom) {
  const label = `${geom?.name || ""} ${geom?.body_name || ""}`.toLowerCase();
  return (
    label.includes("foot") ||
    label.includes("bofoot") ||
    label.includes("toes") ||
    label.includes("talus") ||
    label.includes("calcn")
  );
}

function disposeGroup(group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  }
}

function syncModeButtons() {
  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === currentMode);
  });
}

function syncPlaybackSpeedControl() {
  playbackSpeedSlider.value = playbackSpeed.toFixed(2);
  playbackSpeedValue.textContent = `${playbackSpeed.toFixed(2)}x`;
}

function getModeMessage() {
  if (currentMode === "model3d") {
    return currentResult.data.model3d
      ? "Modo MuJoCo: geometrias reais exportadas pelo backend/DGX."
      : "Modo MuJoCo indisponivel neste JSON; use Fitting como fallback.";
  }

  if (currentMode === "fitting") {
    return "Modo Fitting: avatar estabilizado dirigido por coordinate_names + angles.";
  }

  return "Modo Pose3D: keypoints 3D do backend para debug/fallback.";
}

function updatePoseSkeleton() {
  const data = currentResult.data;
  const skeleton = data.skeleton || defaultSkeleton;
  const frame = data.pose3d[currentFrame] || data.pose3d[0];
  const visualFrame = frame.map((point) => transformPosePoint(point, frame));

  visualFrame.forEach((point, index) => {
    if (!poseJoints[index]) return;
    poseJoints[index].visible = true;
    poseJoints[index].position.copy(point);
  });

  for (let index = frame.length; index < poseJoints.length; index += 1) {
    poseJoints[index].visible = false;
  }

  skeleton.connections.forEach(([start, end], index) => {
    const line = poseBones[index];
    if (!line || !visualFrame[start] || !visualFrame[end]) return;
    setLine(line, visualFrame[start], visualFrame[end]);
    line.visible = true;
  });

  for (let index = skeleton.connections.length; index < poseBones.length; index += 1) {
    poseBones[index].visible = false;
  }
}

function updateFittingRig() {
  const points = buildFittingRigPoints(currentFrame);

  points.forEach((position, name) => {
    const joint = fittingJoints.get(name);
    if (joint) joint.position.copy(position);
  });

  rigConnections.forEach(([start, end], index) => {
    setLine(fittingBones[index], points.get(start), points.get(end));
  });
}

function buildFittingRigPoints(frameIndex) {
  const q = getVisualFittingFrame(frameIndex);
  const pelvis = transformFittingPelvis(q);

  const pelvisQuat = new THREE.Quaternion();

  const points = new Map();
  const rightHip = pelvis.clone().add(applyRotation(new THREE.Vector3(0.12, 0, 0), pelvisQuat));
  const leftHip = pelvis.clone().add(applyRotation(new THREE.Vector3(-0.12, 0, 0), pelvisQuat));
  const spine = pelvis.clone().add(applyRotation(new THREE.Vector3(0, 0.28, 0), pelvisQuat));
  const neck = pelvis.clone().add(applyRotation(new THREE.Vector3(0, 0.55, 0), pelvisQuat));
  const head = pelvis.clone().add(applyRotation(new THREE.Vector3(0, 0.72, 0), pelvisQuat));
  const rightShoulder = neck.clone().add(applyRotation(new THREE.Vector3(0.19, 0, 0), pelvisQuat));
  const leftShoulder = neck.clone().add(applyRotation(new THREE.Vector3(-0.19, 0, 0), pelvisQuat));

  points.set("pelvis", pelvis);
  points.set("spine", spine);
  points.set("neck", neck);
  points.set("head", head);
  points.set("right_hip", rightHip);
  points.set("left_hip", leftHip);
  points.set("right_shoulder", rightShoulder);
  points.set("left_shoulder", leftShoulder);

  addLeg(points, q, "right", rightHip, pelvisQuat);
  addLeg(points, q, "left", leftHip, pelvisQuat);
  addArm(points, q, "right", rightShoulder, pelvisQuat);
  addArm(points, q, "left", leftShoulder, pelvisQuat);
  groundRigPoints(points);

  return points;
}

function addLeg(points, q, side, hip, baseQuat) {
  const suffix = side === "right" ? "r" : "l";
  const sideSign = side === "right" ? 1 : -1;
  const hipFlex = clamp(fittingValue(q, `hip_flexion_${suffix}`, 0), -0.9, 1.05);
  const kneeFlex = clamp(Math.abs(fittingValue(q, `knee_angle_${suffix}`, 0)), 0, 1.45);
  const ankleFlex = clamp(fittingValue(q, `ankle_angle_${suffix}`, 0), -0.55, 0.55);

  const thigh = segmentVector(0.42, hipFlex, 0).applyQuaternion(baseQuat);
  const shank = segmentVector(0.43, hipFlex - kneeFlex, 0).applyQuaternion(baseQuat);
  const foot = new THREE.Vector3(sideSign * 0.02, -0.02, 0.18 + ankleFlex * 0.04)
    .applyQuaternion(baseQuat);

  const knee = hip.clone().add(thigh);
  const ankle = knee.clone().add(shank);
  const footPoint = ankle.clone().add(foot);

  points.set(`${side}_knee`, knee);
  points.set(`${side}_ankle`, ankle);
  points.set(`${side}_foot`, footPoint);
}

function addArm(points, q, side, shoulder, baseQuat) {
  const suffix = side === "right" ? "r" : "l";
  const sideSign = side === "right" ? 1 : -1;
  const armFlex = clamp(fittingValue(q, `arm_flex_${suffix}`, 0), -0.85, 0.85);
  const elbowFlex = clamp(Math.abs(fittingValue(q, `elbow_flex_${suffix}`, 0.35)), 0.15, 1.3);

  const upper = new THREE.Vector3(sideSign * 0.08, -0.26, 0.08 * Math.sin(armFlex))
    .applyQuaternion(baseQuat);
  const lower = new THREE.Vector3(sideSign * 0.06, -0.24, 0.08 * Math.sin(armFlex - elbowFlex))
    .applyQuaternion(baseQuat);

  const elbow = shoulder.clone().add(upper);
  const wrist = elbow.clone().add(lower);

  points.set(`${side}_elbow`, elbow);
  points.set(`${side}_wrist`, wrist);
}

function segmentVector(length, flexion, lateralOffset) {
  return new THREE.Vector3(lateralOffset, -length * Math.cos(flexion), length * Math.sin(flexion));
}

function applyRotation(vector, quaternion) {
  return vector.clone().applyQuaternion(quaternion);
}

function groundRigPoints(points) {
  let minY = Number.POSITIVE_INFINITY;

  points.forEach((point) => {
    minY = Math.min(minY, point.y);
  });

  if (!Number.isFinite(minY)) return;

  const offsetY = 0.04 - minY;
  points.forEach((point) => {
    point.y += offsetY;
  });
}

function updateMetrics(frameIndex) {
  const metrics = currentResult.data.metricas_clinicas || {};
  kneeRight.textContent = formatMetric(metrics.joelho_direito_graus?.[frameIndex], "deg");
  kneeLeft.textContent = formatMetric(metrics.joelho_esquerdo_graus?.[frameIndex], "deg");
  ankleDistance.textContent = formatMetric(
    metrics.distancia_tornozelos_mm?.[frameIndex],
    "mm",
  );
}

function fillCoordinateSelect() {
  const names = getCoordinateNames();
  coordinateSelect.replaceChildren();

  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    coordinateSelect.append(option);
  });

  const preferred = names.includes("knee_angle_r") ? "knee_angle_r" : names[0];
  if (preferred) coordinateSelect.value = preferred;
}

function drawCoordinateChart() {
  const context = coordinateChart.getContext("2d");
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = coordinateChart.clientWidth;
  const height = coordinateChart.clientHeight;
  coordinateChart.width = width * ratio;
  coordinateChart.height = height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const rawValues = getCoordinateSeries(coordinateSelect.value, "raw");
  const smoothValues = getCoordinateSeries(coordinateSelect.value, "smooth");
  if (rawValues.length === 0) return;

  const values = smoothValues.length ? smoothValues : rawValues;
  const min = Math.min(...rawValues, ...values);
  const max = Math.max(...rawValues, ...values);
  const span = Math.max(max - min, 0.0001);
  const padding = 12;

  context.strokeStyle = "#30353a";
  context.beginPath();
  context.moveTo(padding, height / 2);
  context.lineTo(width - padding, height / 2);
  context.stroke();

  drawSeriesLine(context, rawValues, min, span, width, height, padding, "#627079", 1);
  drawSeriesLine(context, values, min, span, width, height, padding, "#42d3c8", 2);

  const markerX =
    padding + (currentFrame / Math.max(values.length - 1, 1)) * (width - padding * 2);
  context.strokeStyle = "#f1b84b";
  context.beginPath();
  context.moveTo(markerX, padding);
  context.lineTo(markerX, height - padding);
  context.stroke();
}

function updateCoordinateValue() {
  const name = coordinateSelect.value;
  const rawValue = fittingValue(getFittingFrame(currentFrame), name, null);
  const smoothValue = fittingValue(getVisualFittingFrame(currentFrame), name, null);

  coordinateValue.textContent =
    typeof rawValue === "number"
      ? `${name}: ${formatCoordinateValue(name, rawValue)} / suav. ${formatCoordinateValue(
          name,
          smoothValue ?? rawValue,
        )}`
      : "sem fitting";
}

function drawSeriesLine(context, values, min, span, width, height, padding, color, lineWidth) {
  if (values.length === 0) return;

  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.beginPath();
  values.forEach((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / span) * (height - padding * 2);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

function buildVisualCalibration(result) {
  const data = result.data || {};
  const fitting = data.fitting || {};
  const coordinateNames = fitting.coordinate_names || [];
  const angles = fitting.angles || [];
  const fittingCalibration = buildFittingCalibration(coordinateNames, angles);
  const poseCalibration = buildPoseCalibration(data.pose3d || []);
  const model3dCalibration = buildModel3dCalibration(data.model3d);

  return {
    fitting: fittingCalibration,
    pose: poseCalibration,
    model3d: model3dCalibration,
  };
}

function buildModel3dCalibration(model3d) {
  const firstFrame = model3d?.frames?.[0];
  const positions = firstFrame?.geom_xpos || firstFrame?.body_xpos || firstFrame?.site_xpos || [];

  if (!positions.length) {
    return {
      originX: 0,
      originZ: 0,
      alignment: new THREE.Quaternion(),
    };
  }

  const bodies = model3d?.bodies || [];
  const bodyPositions = firstFrame?.body_xpos || [];
  const pelvisIndex = bodies.findIndex((body) => body.name === "pelvis");
  const pelvis = bodyPositions[pelvisIndex] || positions[0];
  const originX = pelvis?.[0] ?? 0;
  const originZ = pelvis?.[1] ?? 0;
  const alignment = new THREE.Quaternion();

  return {
    originX,
    originZ,
    alignment,
  };
}

function buildFittingCalibration(coordinateNames, angles) {
  const txIndex = coordinateNames.indexOf("pelvis_tx");
  const tyIndex = coordinateNames.indexOf("pelvis_ty");
  const tzIndex = coordinateNames.indexOf("pelvis_tz");

  if (txIndex < 0 || tzIndex < 0 || angles.length === 0) return null;

  const first = averageFittingWindow(angles, txIndex, tyIndex, tzIndex, 0, 10);
  const last = averageFittingWindow(
    angles,
    txIndex,
    tyIndex,
    tzIndex,
    Math.max(angles.length - 10, 0),
    angles.length,
  );
  const deltaX = last.x - first.x;
  const deltaZ = last.z - first.z;
  const hasClearDirection = Math.hypot(deltaX, deltaZ) > 0.05;

  return {
    originX: first.x,
    originY: Number.isFinite(first.y) ? first.y : 0,
    originZ: first.z,
    directionYaw: hasClearDirection ? Math.atan2(deltaX, deltaZ) : 0,
    smoothedAngles: smoothFittingAngles(angles),
  };
}

function buildPoseCalibration(pose3d) {
  const first = pose3d[0] || [];
  const pelvis = first[0] || [0, 0, 0];
  const rightHip = first[1];
  const leftHip = first[4];
  let yaw = 0;

  if (rightHip && leftHip) {
    const lateralX = rightHip[0] - leftHip[0];
    const lateralZ = rightHip[2] - leftHip[2];
    yaw = -Math.atan2(lateralZ, lateralX || 0.0001);
    const aligned = rotateXZ(lateralX, lateralZ, yaw);
    if (aligned.x < 0) yaw += Math.PI;
  }

  let minRelativeY = 0;
  let maxRelativeY = 0;
  pose3d.slice(0, 12).forEach((frame) => {
    const root = frame[0] || pelvis;
    frame.forEach((point) => {
      if (!point) return;
      const relativeY = point[1] - root[1];
      minRelativeY = Math.min(minRelativeY, relativeY);
      maxRelativeY = Math.max(maxRelativeY, relativeY);
    });
  });

  const verticalSpan = Math.max(maxRelativeY - minRelativeY, 0.001);
  const scale = clamp(1.55 / verticalSpan, 0.8, 4);

  return {
    yaw,
    scale,
    pelvisHeight: 0.04 - minRelativeY * scale,
  };
}

function averageFittingWindow(angles, txIndex, tyIndex, tzIndex, start, end) {
  const slice = angles.slice(start, end).filter(Boolean);
  const total = slice.reduce(
    (acc, frame) => ({
      x: acc.x + (frame[txIndex] || 0),
      y: acc.y + (tyIndex >= 0 ? frame[tyIndex] || 0 : 0),
      z: acc.z + (frame[tzIndex] || 0),
    }),
    { x: 0, y: 0, z: 0 },
  );
  const count = Math.max(slice.length, 1);

  return {
    x: total.x / count,
    y: total.y / count,
    z: total.z / count,
  };
}

function transformPosePoint(point, frame) {
  const calibration = visualCalibration.pose;
  const pelvis = frame[0] || [0, 0, 0];
  const rotated = rotateXZ(point[0] - pelvis[0], point[2] - pelvis[2], calibration.yaw);

  return new THREE.Vector3(
    rotated.x * calibration.scale,
    (point[1] - pelvis[1]) * calibration.scale + calibration.pelvisHeight,
    rotated.z * calibration.scale,
  );
}

function transformFittingPelvis(q) {
  const calibration = visualCalibration.fitting;
  const rawX = fittingValue(q, "pelvis_tx", 0);
  const rawY = fittingValue(q, "pelvis_ty", defaultPelvisHeight);
  const rawZ = fittingValue(q, "pelvis_tz", 0);

  if (!calibration) {
    return new THREE.Vector3(rawX, rawY, rawZ);
  }

  const rotated = rotateXZ(
    rawX - calibration.originX,
    rawZ - calibration.originZ,
    calibration.directionYaw,
  );

  return new THREE.Vector3(
    clamp(rotated.x * visualStrideScale, -0.28, 0.28),
    defaultPelvisHeight + clamp(rawY - calibration.originY, -0.08, 0.08),
    clamp(rotated.z * visualStrideScale, -0.42, 0.42),
  );
}

function smoothFittingAngles(angles) {
  return angles.map((frame, frameIndex) =>
    frame.map((_, valueIndex) => {
      let sum = 0;
      let count = 0;

      for (
        let index = frameIndex - visualFittingSmoothingRadius;
        index <= frameIndex + visualFittingSmoothingRadius;
        index += 1
      ) {
        const value = angles[index]?.[valueIndex];
        if (typeof value !== "number" || Number.isNaN(value)) continue;
        sum += value;
        count += 1;
      }

      return count > 0 ? sum / count : frame[valueIndex] || 0;
    }),
  );
}

function rotateXZ(x, z, yaw) {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);

  return {
    x: cos * x - sin * z,
    z: sin * x + cos * z,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function fittingValue(frame, name, fallback) {
  const index = getCoordinateNames().indexOf(name);
  if (index < 0 || !frame || typeof frame[index] !== "number") return fallback;
  return frame[index];
}

function getCoordinateNames() {
  return currentResult.data.fitting?.coordinate_names || [];
}

function getFittingFrame(frameIndex) {
  return currentResult.data.fitting?.angles?.[frameIndex] || [];
}

function getVisualFittingFrame(frameIndex) {
  return visualCalibration.fitting?.smoothedAngles?.[frameIndex] || getFittingFrame(frameIndex);
}

function getCoordinateSeries(name, source = "raw") {
  const index = getCoordinateNames().indexOf(name);
  if (index < 0) return [];
  const frames =
    source === "smooth"
      ? visualCalibration.fitting?.smoothedAngles || []
      : currentResult.data.fitting?.angles || [];

  return frames.map((frame) => toDisplayCoordinateValue(name, frame[index] || 0));
}

function getFrameTotal() {
  return currentResult.data.pose3d.length;
}

function getPlaybackFps() {
  const fps = currentResult.input_summary?.fps;
  if (typeof fps !== "number" || Number.isNaN(fps) || fps <= 0) {
    return defaultPlaybackFps * playbackSpeed;
  }

  return clamp(fps, 12, maxPlaybackFps) * playbackSpeed;
}

function formatMetric(value, unit) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)} ${unit}`;
}

function formatCoordinateValue(name, value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  const displayValue = toDisplayCoordinateValue(name, value);
  const unit = getCoordinateUnitLabel(name);
  return `${displayValue.toFixed(unit === "deg" ? 1 : 3)} ${unit}`;
}

function toDisplayCoordinateValue(name, value) {
  return getCoordinateUnits(name) === "radians" ? (value * 180) / Math.PI : value;
}

function getCoordinateUnitLabel(name) {
  const units = getCoordinateUnits(name);
  if (units === "radians") return "deg";
  if (units === "meters") return "m";
  return units || "un";
}

function getCoordinateUnits(name) {
  const coordinate = currentResult.data.fitting?.coordinates?.find((item) => item.name === name);
  if (coordinate?.units) return coordinate.units;
  if (name.startsWith("pelvis_t")) return "meters";
  return "radians";
}

function setLine(line, start, end) {
  const positions = line.geometry.attributes.position;
  positions.setXYZ(0, start.x, start.y, start.z);
  positions.setXYZ(1, end.x, end.y, end.z);
  positions.needsUpdate = true;
}

function newLineGeometry() {
  return new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
}

function animate(time) {
  resizeRenderer();

  if (playing) {
    const frameIntervalMs = 1000 / getPlaybackFps();
    if (lastStepAt === 0) lastStepAt = time;

    const elapsedMs = time - lastStepAt;
    if (elapsedMs >= frameIntervalMs) {
      const frameSteps = Math.max(1, Math.floor(elapsedMs / frameIntervalMs));
      currentFrame = (currentFrame + frameSteps) % getFrameTotal();
      lastStepAt += frameSteps * frameIntervalMs;
      updateScene();
    }
  } else {
    lastStepAt = 0;
  }

  if (playing && currentFrame >= getFrameTotal()) {
    currentFrame = 0;
    updateScene();
  }

  controls.update();
  renderer.render(scene, camera);
}

function resizeRenderer() {
  const { clientWidth, clientHeight } = canvas;
  if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / Math.max(clientHeight, 1);
    camera.updateProjectionMatrix();
    drawCoordinateChart();
  }
}

function setMessage(text) {
  message.textContent = text;
}

function buildSampleResult() {
  const pose3d = [];
  const metricas = {
    joelho_direito_graus: [],
    joelho_esquerdo_graus: [],
    distancia_tornozelos_mm: [],
  };
  const coordinateNames = [
    "pelvis_tx",
    "pelvis_tz",
    "pelvis_ty",
    "pelvis_tilt",
    "pelvis_list",
    "pelvis_rotation",
    "hip_flexion_r",
    "hip_adduction_r",
    "hip_rotation_r",
    "knee_angle_r",
    "ankle_angle_r",
    "subtalar_angle_r",
    "mtp_angle_r",
    "hip_flexion_l",
    "hip_adduction_l",
    "hip_rotation_l",
    "knee_angle_l",
    "ankle_angle_l",
    "subtalar_angle_l",
    "mtp_angle_l",
    "lumbar_extension",
    "lumbar_bending",
    "lumbar_rotation",
    "neck_extension",
    "neck_bending",
    "neck_rotation",
    "arm_flex_r",
    "arm_add_r",
    "arm_rot_r",
    "elbow_flex_r",
    "pro_sup_r",
    "wrist_flex_r",
    "wrist_dev_r",
    "arm_flex_l",
    "arm_add_l",
    "arm_rot_l",
    "elbow_flex_l",
    "pro_sup_l",
    "wrist_flex_l",
    "wrist_dev_l",
  ];
  const angles = [];

  for (let index = 0; index < 30; index += 1) {
    const phase = Math.sin(index / 4);
    const opposite = Math.sin(index / 4 + Math.PI);
    const frame = Array.from({ length: 17 }, () => [0, 0, 0]);
    const fittingFrame = Array.from({ length: 40 }, () => 0);

    frame[0] = [0, 0.9, 0];
    frame[1] = [0.12, 0.9, 0];
    frame[2] = [0.12, 0.5 + 0.04 * phase, 0.02];
    frame[3] = [0.12, 0.08, 0.12 + 0.08 * phase];
    frame[4] = [-0.12, 0.9, 0];
    frame[5] = [-0.12, 0.5 - 0.04 * phase, -0.02];
    frame[6] = [-0.12, 0.08, -0.12 - 0.08 * phase];
    frame[7] = [0, 1.08, 0];
    frame[8] = [0, 1.34, 0];
    frame[9] = [0, 1.5, 0];
    frame[10] = [0, 1.62, 0];
    frame[11] = [-0.18, 1.31, 0];
    frame[12] = [-0.34, 1.06, 0.02 * phase];
    frame[13] = [-0.42, 0.84, 0.03 * phase];
    frame[14] = [0.18, 1.31, 0];
    frame[15] = [0.34, 1.06, -0.02 * phase];
    frame[16] = [0.42, 0.84, -0.03 * phase];

    setFitting(fittingFrame, coordinateNames, "pelvis_ty", 0.92);
    setFitting(fittingFrame, coordinateNames, "hip_flexion_r", 0.35 + phase * 0.28);
    setFitting(fittingFrame, coordinateNames, "knee_angle_r", -0.28 - Math.max(phase, 0) * 0.48);
    setFitting(fittingFrame, coordinateNames, "ankle_angle_r", phase * 0.12);
    setFitting(fittingFrame, coordinateNames, "hip_flexion_l", 0.35 + opposite * 0.28);
    setFitting(fittingFrame, coordinateNames, "knee_angle_l", -0.28 - Math.max(opposite, 0) * 0.48);
    setFitting(fittingFrame, coordinateNames, "ankle_angle_l", opposite * 0.12);
    setFitting(fittingFrame, coordinateNames, "arm_flex_r", opposite * 0.28);
    setFitting(fittingFrame, coordinateNames, "arm_flex_l", phase * 0.28);
    setFitting(fittingFrame, coordinateNames, "elbow_flex_r", 0.38);
    setFitting(fittingFrame, coordinateNames, "elbow_flex_l", 0.38);

    pose3d.push(frame);
    angles.push(fittingFrame);
    metricas.joelho_direito_graus.push(18 + phase * 8);
    metricas.joelho_esquerdo_graus.push(18 - phase * 8);
    metricas.distancia_tornozelos_mm.push(300 + phase * 28);
  }

  return {
    result_version: "1.0",
    job: { job_id: "sample", status: "sample", stage: "preview" },
    quality_info: { warnings: [] },
    data: {
      pose3d,
      skeleton: defaultSkeleton,
      fitting: {
        coordinate_names: coordinateNames,
        angles,
        timestamps: Array.from({ length: 30 }, (_, index) => index / 30),
      },
      metricas_clinicas: metricas,
    },
  };
}

function setFitting(frame, names, name, value) {
  const index = names.indexOf(name);
  if (index >= 0) frame[index] = value;
}
