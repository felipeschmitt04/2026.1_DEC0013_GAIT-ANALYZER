"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Point3 = [number, number, number];
type PoseFrame = Point3[];

type SkeletonInfo = {
  connections?: [number, number][];
};

type FittingPayload = {
  coordinate_names?: string[];
  angles?: number[][];
};

type MujocoGeom = {
  type?: string;
  size?: number[];
  mesh_id?: unknown;
  rgba?: number[];
  name?: string;
  body_name?: string;
};

type MujocoMeshPayload = {
  id: unknown;
  vertices?: number[][];
  faces?: number[][];
};

type Model3DBody = {
  id?: number;
  name?: string;
};

type Model3DFrame = {
  geom_xpos?: Point3[];
  geom_xmat?: number[][];
  body_xpos?: Point3[];
  body_xmat?: number[][];
  site_xpos?: Point3[];
};

type Model3DPayload = {
  bodies?: Model3DBody[];
  geoms?: MujocoGeom[];
  meshes?: MujocoMeshPayload[];
  sites?: unknown[];
  connections?: [number, number][];
  frames?: Model3DFrame[];
};

type BiomechanicalData = {
  pose3d?: PoseFrame[];
  skeleton?: SkeletonInfo | null;
  fitting?: FittingPayload | null;
  model3d?: Model3DPayload | null;
};

interface ModeloCanvasProps {
  segmentoId: string | null;
  dadosBiomecanicos: BiomechanicalData | null;
  frameAtual: number;
}

type Calibration = {
  pose: {
    yaw: number;
    scale: number;
    pelvisHeight: number;
  };
  fitting: {
    originX: number;
    originY: number;
    originZ: number;
    directionYaw: number;
    smoothedAngles: number[][];
  } | null;
  model3d: {
    originX: number;
    originZ: number;
    alignment: THREE.Quaternion;
  };
};

const DEFAULT_SKELETON = {
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
  ] as [number, number][],
};

const RIG_CONNECTIONS: [string, string][] = [
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

const DEFAULT_PELVIS_HEIGHT = 0.92;
const VISUAL_FITTING_SMOOTHING_RADIUS = 2;
const VISUAL_STRIDE_SCALE = 0.35;
const MODEL3D_FLOOR_CLEARANCE = 0.006;
const MODEL3D_GROUND_SMOOTH_RADIUS = 2;

export default function ModeloCanvas({ segmentoId, dadosBiomecanicos, frameAtual }: ModeloCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frameAtual);

  useEffect(() => {
    frameRef.current = frameAtual;
  }, [frameAtual]);

  useEffect(() => {
    const rawData = dadosBiomecanicos;
    if (!containerRef.current || !rawData?.pose3d?.length) return;

    const data = rawData as BiomechanicalData & { pose3d: PoseFrame[] };
    const pose3d = data.pose3d;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x111827, 4, 10);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    camera.position.set(2.2, 1.7, 3.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x111827, 0);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.85, 0);

    const grid = new THREE.GridHelper(4, 16, 0x465057, 0x2a3034);
    grid.position.y = -0.02;
    scene.add(grid);

    scene.add(new THREE.AmbientLight(0xffffff, 1.35));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(3, 5, 2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8fd5ff, 0.65);
    fillLight.position.set(-3, 2.4, -2);
    scene.add(fillLight);

    const model3dGroup = new THREE.Group();
    const fittingGroup = new THREE.Group();
    const poseGroup = new THREE.Group();
    scene.add(model3dGroup, fittingGroup, poseGroup);

    const calibration = buildVisualCalibration(data);
    const renderMode = getRenderMode(data);

    const rootMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1b84b,
      roughness: 0.35,
      metalness: 0.1,
    });
    const jointMaterial = new THREE.MeshStandardMaterial({
      color: 0x42d3c8,
      roughness: 0.38,
      metalness: 0.12,
    });
    const focusMaterial = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xf97316,
      emissiveIntensity: 0.28,
      roughness: 0.32,
      metalness: 0.08,
    });
    const fittingMaterial = new THREE.MeshStandardMaterial({
      color: 0x8edb72,
      roughness: 0.4,
      metalness: 0.08,
    });
    const boneMaterial = new THREE.LineBasicMaterial({ color: 0xf4f1ea });
    const focusBoneMaterial = new THREE.LineBasicMaterial({ color: 0xf97316 });
    const fittingBoneMaterial = new THREE.LineBasicMaterial({ color: 0xccefc4 });

    const model3dMeshes: (THREE.Mesh | null)[] = [];
    const model3dSites: THREE.Mesh[] = [];
    const model3dBodies: THREE.Mesh[] = [];
    const model3dBodyLines: THREE.Line[] = [];
    let model3dGroundOffsets: number[] = [];

    const poseJoints: THREE.Mesh[] = [];
    const poseBones: THREE.Line[] = [];
    const fittingJoints = new Map<string, THREE.Mesh>();
    const fittingBones: THREE.Line[] = [];

    buildPoseScene();
    buildFittingScene();
    buildModel3dScene();
    applySegmentCamera(segmentoId, camera, controls);

    let animationId = 0;

    function animate() {
      animationId = requestAnimationFrame(animate);
      resizeRenderer();
      updateScene();
      controls.update();
      renderer.render(scene, camera);
    }

    animationId = requestAnimationFrame(animate);

    function getCurrentFrameIndex(length: number) {
      if (length <= 0) return 0;
      return Math.min(Math.max(frameRef.current, 0), length - 1);
    }

    function updateScene() {
      model3dGroup.visible = renderMode === "model3d";
      fittingGroup.visible = renderMode === "fitting";
      poseGroup.visible = renderMode === "pose3d";

      if (renderMode === "model3d") {
        updateModel3dScene();
      } else if (renderMode === "fitting") {
        updateFittingRig();
      } else {
        updatePoseSkeleton();
      }
    }

    function buildPoseScene() {
      const firstFrame = pose3d[0] || [];
      const skeleton = data.skeleton || DEFAULT_SKELETON;
      const connections = skeleton.connections || DEFAULT_SKELETON.connections;
      const sphereGeometry = new THREE.SphereGeometry(0.035, 18, 18);

      firstFrame.forEach((_: Point3, index: number) => {
        const material = getFocusedJointIndexes(segmentoId).has(index)
          ? focusMaterial
          : index === 0
            ? rootMaterial
            : jointMaterial;
        const mesh = new THREE.Mesh(sphereGeometry, material);
        poseGroup.add(mesh);
        poseJoints.push(mesh);
      });

      connections.forEach(([start, end]: [number, number]) => {
        const line = new THREE.Line(
          newLineGeometry(),
          isFocusedConnection(segmentoId, start, end) ? focusBoneMaterial : boneMaterial,
        );
        poseGroup.add(line);
        poseBones.push(line);
      });
    }

    function buildFittingScene() {
      const sphereGeometry = new THREE.SphereGeometry(0.035, 18, 18);
      new Set(RIG_CONNECTIONS.flat()).forEach((name) => {
        const mesh = new THREE.Mesh(
          sphereGeometry,
          isFocusedRigJoint(segmentoId, name)
            ? focusMaterial
            : name === "pelvis"
              ? rootMaterial
              : fittingMaterial,
        );
        fittingGroup.add(mesh);
        fittingJoints.set(name, mesh);
      });

      RIG_CONNECTIONS.forEach(([start, end]) => {
        const line = new THREE.Line(
          newLineGeometry(),
          isFocusedRigConnection(segmentoId, start, end) ? focusBoneMaterial : fittingBoneMaterial,
        );
        fittingGroup.add(line);
        fittingBones.push(line);
      });
    }

    function buildModel3dScene() {
      const model3d = data.model3d;
      if (!model3d?.frames?.length) return;

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
        const bodyPoint = new THREE.Mesh(bodyGeometry, body.id === 0 ? rootMaterial : bodyMaterial);
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

      model3dGroundOffsets = buildModel3dGroundOffsets(model3d, calibration.model3d);
    }

    function updateModel3dScene() {
      const model3d = data.model3d;
      if (!model3d?.frames?.length) return;

      const frameIndex = getCurrentFrameIndex(model3d.frames.length);
      const frame = model3d.frames[frameIndex] || model3d.frames[0];
      const positions = frame.geom_xpos || [];
      const rotations = frame.geom_xmat || [];
      const geoms = model3d.geoms || [];
      const floorOffset = model3dGroundOffsets[frameIndex] ?? model3dGroundOffsets.at(-1) ?? 0;

      if (positions.length === 0) {
        updateModel3dPointScene(frame, floorOffset);
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

        setMujocoMatrix(mesh, positions[index], rotations[index], calibration.model3d, floorOffset);
        mesh.visible = true;
      });

      model3dSites.forEach((site) => {
        site.visible = false;
      });
      model3dBodies.forEach((bodyPoint) => {
        bodyPoint.visible = false;
      });
      model3dBodyLines.forEach((line) => {
        line.visible = false;
      });
    }

    function updateModel3dPointScene(frame: Model3DFrame, floorOffset: number) {
      const bodyPositions = frame.body_xpos || [];
      const sitePositions = frame.site_xpos || [];
      const connections = data.model3d?.connections || [];

      model3dBodies.forEach((bodyPoint, index) => {
        const position = bodyPositions[index];
        if (!position) {
          bodyPoint.visible = false;
          return;
        }

        bodyPoint.position.copy(mujocoToThreePosition(position, calibration.model3d, floorOffset));
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

        site.position.copy(mujocoToThreePosition(position, calibration.model3d, floorOffset));
        site.visible = true;
        site.scale.setScalar(0.65);
      });
    }

    function updatePoseSkeleton() {
      const skeleton = data.skeleton || DEFAULT_SKELETON;
      const connections = skeleton.connections || DEFAULT_SKELETON.connections;
      const frameIndex = getCurrentFrameIndex(pose3d.length);
      const frame = pose3d[frameIndex] || pose3d[0];
      const visualFrame = frame.map((point: Point3) => transformPosePoint(point, frame, calibration.pose));

      visualFrame.forEach((point: THREE.Vector3, index: number) => {
        const joint = poseJoints[index];
        if (!joint) return;
        joint.visible = true;
        joint.position.copy(point);
      });

      poseJoints.slice(frame.length).forEach((joint) => {
        joint.visible = false;
      });

      connections.forEach(([start, end]: [number, number], index: number) => {
        const line = poseBones[index];
        if (!line || !visualFrame[start] || !visualFrame[end]) return;
        setLine(line, visualFrame[start], visualFrame[end]);
        line.visible = true;
      });
    }

    function updateFittingRig() {
      const frameIndex = getCurrentFrameIndex(getFittingFrames().length || pose3d.length);
      const points = buildFittingRigPoints(frameIndex);

      points.forEach((position, name) => {
        fittingJoints.get(name)?.position.copy(position);
      });

      RIG_CONNECTIONS.forEach(([start, end], index) => {
        const startPoint = points.get(start);
        const endPoint = points.get(end);
        const line = fittingBones[index];
        if (!line || !startPoint || !endPoint) return;
        setLine(line, startPoint, endPoint);
      });
    }

    function buildFittingRigPoints(frameIndex: number) {
      const q = getVisualFittingFrame(frameIndex);
      const pelvis = transformFittingPelvis(q, calibration.fitting, getCoordinateNames());
      const pelvisQuat = new THREE.Quaternion();
      const points = new Map<string, THREE.Vector3>();

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

    function addLeg(
      points: Map<string, THREE.Vector3>,
      q: number[],
      side: "right" | "left",
      hip: THREE.Vector3,
      baseQuat: THREE.Quaternion,
    ) {
      const suffix = side === "right" ? "r" : "l";
      const sideSign = side === "right" ? 1 : -1;
      const hipFlex = clamp(fittingValue(q, `hip_flexion_${suffix}`, 0), -0.9, 1.05);
      const kneeFlex = clamp(Math.abs(fittingValue(q, `knee_angle_${suffix}`, 0)), 0, 1.45);
      const ankleFlex = clamp(fittingValue(q, `ankle_angle_${suffix}`, 0), -0.55, 0.55);

      const thigh = segmentVector(0.42, hipFlex, 0).applyQuaternion(baseQuat);
      const shank = segmentVector(0.43, hipFlex - kneeFlex, 0).applyQuaternion(baseQuat);
      const foot = new THREE.Vector3(sideSign * 0.02, -0.02, 0.18 + ankleFlex * 0.04).applyQuaternion(baseQuat);

      const knee = hip.clone().add(thigh);
      const ankle = knee.clone().add(shank);
      const footPoint = ankle.clone().add(foot);

      points.set(`${side}_knee`, knee);
      points.set(`${side}_ankle`, ankle);
      points.set(`${side}_foot`, footPoint);
    }

    function addArm(
      points: Map<string, THREE.Vector3>,
      q: number[],
      side: "right" | "left",
      shoulder: THREE.Vector3,
      baseQuat: THREE.Quaternion,
    ) {
      const suffix = side === "right" ? "r" : "l";
      const sideSign = side === "right" ? 1 : -1;
      const armFlex = clamp(fittingValue(q, `arm_flex_${suffix}`, 0), -0.85, 0.85);
      const elbowFlex = clamp(Math.abs(fittingValue(q, `elbow_flex_${suffix}`, 0.35)), 0.15, 1.3);

      const upper = new THREE.Vector3(sideSign * 0.08, -0.26, 0.08 * Math.sin(armFlex)).applyQuaternion(baseQuat);
      const lower = new THREE.Vector3(sideSign * 0.06, -0.24, 0.08 * Math.sin(armFlex - elbowFlex)).applyQuaternion(baseQuat);

      points.set(`${side}_elbow`, shoulder.clone().add(upper));
      points.set(`${side}_wrist`, shoulder.clone().add(upper).add(lower));
    }

    function getCoordinateNames() {
      return data.fitting?.coordinate_names || [];
    }

    function getFittingFrames() {
      return data.fitting?.angles || [];
    }

    function getFittingFrame(frameIndex: number) {
      return getFittingFrames()[frameIndex] || [];
    }

    function getVisualFittingFrame(frameIndex: number) {
      return calibration.fitting?.smoothedAngles?.[frameIndex] || getFittingFrame(frameIndex);
    }

    function fittingValue(frame: number[], name: string, fallback: number) {
      const index = getCoordinateNames().indexOf(name);
      if (index < 0 || !frame || typeof frame[index] !== "number") return fallback;
      return frame[index];
    }

    function resizeRenderer() {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;

      const canvas = renderer.domElement;
      if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) || canvas.height !== Math.floor(height * renderer.getPixelRatio())) {
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
      }
    }

    function buildModel3dGroundOffsets(model3d: Model3DPayload, modelCalibration: Calibration["model3d"]) {
      const frames = model3d?.frames || [];
      const geoms = model3d?.geoms || [];
      const rawOffsets = frames.map((frame) => {
        const footOffset = estimateModel3dFrameGroundOffset(frame, geoms, modelCalibration, true);
        if (Number.isFinite(footOffset)) return footOffset;

        return estimateModel3dFrameGroundOffset(frame, geoms, modelCalibration, false);
      });

      return smoothModel3dGroundOffsets(fillModel3dGroundOffsets(rawOffsets));
    }

    function estimateModel3dFrameGroundOffset(
      frame: Model3DFrame,
      geoms: MujocoGeom[],
      modelCalibration: Calibration["model3d"],
      footOnly: boolean,
    ) {
      const positions = frame.geom_xpos || [];
      const rotations = frame.geom_xmat || [];
      let minY = Number.POSITIVE_INFINITY;

      model3dMeshes.forEach((mesh, index) => {
        const geom = geoms[index];
        if (!mesh?.geometry || !positions[index] || !isRenderableMujocoGeom(geom)) return;
        if (footOnly && !isFootGroundGeom(geom)) return;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();

        const matrix = buildMujocoMatrix(positions[index], rotations[index], modelCalibration, 0);
        const box = new THREE.Box3().copy(mesh.geometry.boundingBox as THREE.Box3).applyMatrix4(matrix);
        minY = Math.min(minY, box.min.y);
      });

      if (!Number.isFinite(minY)) return Number.NaN;
      return clamp(grid.position.y + MODEL3D_FLOOR_CLEARANCE - minY, -1.4, 1.4);
    }

    return () => {
      cancelAnimationFrame(animationId);
      controls.dispose();
      disposeGroup(model3dGroup);
      disposeGroup(fittingGroup);
      disposeGroup(poseGroup);
      rootMaterial.dispose();
      jointMaterial.dispose();
      focusMaterial.dispose();
      fittingMaterial.dispose();
      boneMaterial.dispose();
      focusBoneMaterial.dispose();
      fittingBoneMaterial.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [dadosBiomecanicos, segmentoId]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-5 top-5 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300 shadow-xl backdrop-blur">
        {getRenderMode(dadosBiomecanicos) === "model3d"
          ? "Modelo MuJoCo"
          : getRenderMode(dadosBiomecanicos) === "fitting"
            ? "Fitting"
            : "Pose3D"}
      </div>
    </div>
  );
}

function getRenderMode(data: BiomechanicalData | null): "model3d" | "fitting" | "pose3d" {
  if (data?.model3d?.frames?.length) return "model3d";
  if (data?.fitting?.angles?.length) return "fitting";
  return "pose3d";
}

function buildVisualCalibration(data: BiomechanicalData): Calibration {
  const fitting = data.fitting || {};
  const coordinateNames = fitting.coordinate_names || [];
  const angles = fitting.angles || [];

  return {
    fitting: buildFittingCalibration(coordinateNames, angles),
    pose: buildPoseCalibration(data.pose3d || []),
    model3d: buildModel3dCalibration(data.model3d),
  };
}

function buildModel3dCalibration(model3d?: Model3DPayload | null): Calibration["model3d"] {
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

  return {
    originX: pelvis?.[0] ?? 0,
    originZ: pelvis?.[1] ?? 0,
    alignment: new THREE.Quaternion(),
  };
}

function buildFittingCalibration(coordinateNames: string[], angles: number[][]): Calibration["fitting"] {
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

function buildPoseCalibration(pose3d: PoseFrame[]): Calibration["pose"] {
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

function averageFittingWindow(
  angles: number[][],
  txIndex: number,
  tyIndex: number,
  tzIndex: number,
  start: number,
  end: number,
) {
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

function smoothFittingAngles(angles: number[][]) {
  return angles.map((frame, frameIndex) =>
    frame.map((_, valueIndex) => {
      let sum = 0;
      let count = 0;

      for (
        let index = frameIndex - VISUAL_FITTING_SMOOTHING_RADIUS;
        index <= frameIndex + VISUAL_FITTING_SMOOTHING_RADIUS;
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

function createMujocoGeometry(geom: MujocoGeom | undefined, meshById: Map<unknown, MujocoMeshPayload>) {
  const size = geom?.size || [0.03, 0.03, 0.03];

  if (geom?.type === "sphere") {
    return convertMujocoGeometry(new THREE.SphereGeometry(Math.max(size[0], 0.005), 18, 18));
  }

  if (geom?.type === "capsule") {
    const geometry = new THREE.CapsuleGeometry(Math.max(size[0], 0.005), Math.max(size[1] * 2, 0.01), 8, 16);
    geometry.rotateX(Math.PI / 2);
    return convertMujocoGeometry(geometry);
  }

  if (geom?.type === "cylinder") {
    const geometry = new THREE.CylinderGeometry(
      Math.max(size[0], 0.005),
      Math.max(size[0], 0.005),
      Math.max(size[1] * 2, 0.01),
      18,
    );
    geometry.rotateX(Math.PI / 2);
    return convertMujocoGeometry(geometry);
  }

  if (geom?.type === "box") {
    return convertMujocoGeometry(
      new THREE.BoxGeometry(
        Math.max(size[0] * 2, 0.01),
        Math.max(size[1] * 2, 0.01),
        Math.max(size[2] * 2, 0.01),
      ),
    );
  }

  if (geom?.type === "ellipsoid") {
    const geometry = new THREE.SphereGeometry(1, 18, 18);
    geometry.scale(Math.max(size[0], 0.005), Math.max(size[1], 0.005), Math.max(size[2], 0.005));
    return convertMujocoGeometry(geometry);
  }

  if (geom?.type === "mesh" && geom.mesh_id !== null) {
    return createMeshGeometry(meshById.get(geom.mesh_id));
  }

  return null;
}

function createMeshGeometry(meshPayload: MujocoMeshPayload | undefined) {
  if (!meshPayload?.vertices?.length || !meshPayload?.faces?.length) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(meshPayload.vertices.flat()), 3));
  geometry.setIndex(meshPayload.faces.flat());
  geometry.computeVertexNormals();
  return convertMujocoGeometry(geometry);
}

function createMujocoMaterial(geom: MujocoGeom | undefined) {
  const rgba = geom?.rgba || [0.55, 0.8, 0.45, 1.0];
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(rgba[0], rgba[1], rgba[2]),
    roughness: 0.48,
    metalness: 0.08,
    opacity: rgba[3],
    transparent: rgba[3] < 1,
    side: THREE.DoubleSide,
  });
}

function convertMujocoGeometry(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.computeVertexNormals();
  return geometry;
}

function setMujocoMatrix(
  mesh: THREE.Mesh,
  position: Point3,
  xmat: number[] | undefined,
  calibration: Calibration["model3d"],
  floorOffset: number,
) {
  mesh.matrix.copy(buildMujocoMatrix(position, xmat, calibration, floorOffset));
}

function buildMujocoMatrix(
  position: Point3,
  xmat: number[] | undefined,
  calibration: Calibration["model3d"],
  floorOffset: number,
) {
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

function mujocoToThreePosition(position: Point3, calibration: Calibration["model3d"], floorOffset = 0) {
  const converted = new THREE.Vector3(
    position[0] - calibration.originX,
    position[2],
    -(position[1] - calibration.originZ),
  );
  converted.applyQuaternion(calibration.alignment);
  converted.y += floorOffset;
  return converted;
}

function mujocoRotationToThree(xmat: number[]) {
  const conversion = [
    [1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
  ];
  const rotation = [
    [xmat[0], xmat[1], xmat[2]],
    [xmat[3], xmat[4], xmat[5]],
    [xmat[6], xmat[7], xmat[8]],
  ];
  return multiply3(conversion, rotation).flat();
}

function multiply3(a: number[][], b: number[][]) {
  return a.map((row, rowIndex) =>
    row.map((_, colIndex) => a[rowIndex][0] * b[0][colIndex] + a[rowIndex][1] * b[1][colIndex] + a[rowIndex][2] * b[2][colIndex]),
  );
}

function transformPosePoint(point: Point3, frame: PoseFrame, calibration: Calibration["pose"]) {
  const pelvis = frame[0] || [0, 0, 0];
  const rotated = rotateXZ(point[0] - pelvis[0], point[2] - pelvis[2], calibration.yaw);

  return new THREE.Vector3(
    rotated.x * calibration.scale,
    (point[1] - pelvis[1]) * calibration.scale + calibration.pelvisHeight,
    rotated.z * calibration.scale,
  );
}

function transformFittingPelvis(q: number[], calibration: Calibration["fitting"], coordinateNames: string[]) {
  const rawX = fittingValueFromFrame(q, coordinateNames, "pelvis_tx", 0);
  const rawY = fittingValueFromFrame(q, coordinateNames, "pelvis_ty", DEFAULT_PELVIS_HEIGHT);
  const rawZ = fittingValueFromFrame(q, coordinateNames, "pelvis_tz", 0);

  if (!calibration) {
    return new THREE.Vector3(rawX, rawY, rawZ);
  }

  const rotated = rotateXZ(rawX - calibration.originX, rawZ - calibration.originZ, calibration.directionYaw);

  return new THREE.Vector3(
    clamp(rotated.x * VISUAL_STRIDE_SCALE, -0.28, 0.28),
    DEFAULT_PELVIS_HEIGHT + clamp(rawY - calibration.originY, -0.08, 0.08),
    clamp(rotated.z * VISUAL_STRIDE_SCALE, -0.42, 0.42),
  );
}

function fittingValueFromFrame(frame: number[], coordinateNames: string[], name: string, fallback: number) {
  const index = coordinateNames.indexOf(name);
  if (index < 0 || typeof frame[index] !== "number") return fallback;
  return frame[index];
}

function segmentVector(length: number, flexion: number, lateralOffset: number) {
  return new THREE.Vector3(lateralOffset, -length * Math.cos(flexion), length * Math.sin(flexion));
}

function applyRotation(vector: THREE.Vector3, quaternion: THREE.Quaternion) {
  return vector.clone().applyQuaternion(quaternion);
}

function groundRigPoints(points: Map<string, THREE.Vector3>) {
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

function fillModel3dGroundOffsets(rawOffsets: number[]) {
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

function smoothModel3dGroundOffsets(offsets: number[]) {
  return offsets.map((_, index) => {
    let total = 0;
    let count = 0;
    const start = Math.max(0, index - MODEL3D_GROUND_SMOOTH_RADIUS);
    const end = Math.min(offsets.length - 1, index + MODEL3D_GROUND_SMOOTH_RADIUS);

    for (let i = start; i <= end; i += 1) {
      if (!Number.isFinite(offsets[i])) continue;
      total += offsets[i];
      count += 1;
    }

    return count ? clamp(total / count, -1.4, 1.4) : 0;
  });
}

function isRenderableMujocoGeom(geom: MujocoGeom | undefined) {
  const alpha = geom?.rgba?.[3] ?? 1;
  return Boolean(geom) && geom?.type !== "plane" && alpha > 0.05;
}

function isFootGroundGeom(geom: MujocoGeom | undefined) {
  const label = `${geom?.name || ""} ${geom?.body_name || ""}`.toLowerCase();
  return (
    label.includes("foot") ||
    label.includes("bofoot") ||
    label.includes("toes") ||
    label.includes("talus") ||
    label.includes("calcn")
  );
}

function setLine(line: THREE.Line, start: THREE.Vector3, end: THREE.Vector3) {
  const positions = line.geometry.attributes.position as THREE.BufferAttribute;
  positions.setXYZ(0, start.x, start.y, start.z);
  positions.setXYZ(1, end.x, end.y, end.z);
  positions.needsUpdate = true;
}

function newLineGeometry() {
  return new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
}

function rotateXZ(x: number, z: number, yaw: number) {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);

  return {
    x: cos * x - sin * z,
    z: sin * x + cos * z,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function disposeGroup(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[0] as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    group.remove(child);
    child.geometry?.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
    } else {
      child.material?.dispose();
    }
  }
}

function applySegmentCamera(segmentoId: string | null, camera: THREE.PerspectiveCamera, controls: OrbitControls) {
  if (segmentoId === "perna-direita") {
    camera.position.set(1.55, 0.7, 2.05);
    controls.target.set(0.18, 0.45, 0);
  } else if (segmentoId === "perna-esquerda") {
    camera.position.set(-1.55, 0.7, 2.05);
    controls.target.set(-0.18, 0.45, 0);
  } else if (segmentoId === "tronco-coluna") {
    camera.position.set(0, 1.15, 2.25);
    controls.target.set(0, 0.9, 0);
  } else {
    camera.position.set(2.2, 1.7, 3.1);
    controls.target.set(0, 0.85, 0);
  }
  controls.update();
}

function getFocusedJointIndexes(segmentoId: string | null) {
  if (segmentoId === "perna-direita") return new Set([1, 2, 3]);
  if (segmentoId === "perna-esquerda") return new Set([4, 5, 6]);
  if (segmentoId === "tronco-coluna") return new Set([0, 7, 8, 9, 10, 11, 14]);
  return new Set<number>();
}

function isFocusedConnection(segmentoId: string | null, start: number, end: number) {
  const focused = getFocusedJointIndexes(segmentoId);
  return focused.has(start) && focused.has(end);
}

function isFocusedRigJoint(segmentoId: string | null, name: string) {
  if (segmentoId === "perna-direita") return ["right_hip", "right_knee", "right_ankle", "right_foot"].includes(name);
  if (segmentoId === "perna-esquerda") return ["left_hip", "left_knee", "left_ankle", "left_foot"].includes(name);
  if (segmentoId === "tronco-coluna") return ["pelvis", "spine", "neck", "head", "right_shoulder", "left_shoulder"].includes(name);
  return false;
}

function isFocusedRigConnection(segmentoId: string | null, start: string, end: string) {
  return isFocusedRigJoint(segmentoId, start) && isFocusedRigJoint(segmentoId, end);
}
