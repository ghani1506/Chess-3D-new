import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ChessEngine } from "./chess-engine.js";
import { createBoard, boardToWorld } from "./board.js";
import { loadPortraitTextures, createPieceMesh, FOOTBALLER_ASSIGNMENTS } from "./pieces.js";
import { chooseAIMove } from "./game.js";

const container = document.getElementById("scene-container");
const turnIndicator = document.getElementById("turn-indicator");
const selectedIndicator = document.getElementById("selected-indicator");
const gameIndicator = document.getElementById("game-indicator");
const newGameBtn = document.getElementById("new-game-btn");
const toggleAiBtn = document.getElementById("toggle-ai-btn");
const rotateBtn = document.getElementById("rotate-btn");
const legendGrid = document.getElementById("legend-grid");

const engine = new ChessEngine();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x08111f, 0.035);

const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(13, 16, 15);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.5, 0);
controls.minDistance = 12;
controls.maxDistance = 28;
controls.maxPolarAngle = Math.PI * 0.48;

const ambient = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.15);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 1.6);
directional.position.set(12, 22, 10);
directional.castShadow = true;
directional.shadow.mapSize.set(2048, 2048);
directional.shadow.camera.near = 0.5;
directional.shadow.camera.far = 60;
directional.shadow.camera.left = -18;
directional.shadow.camera.right = 18;
directional.shadow.camera.top = 18;
directional.shadow.camera.bottom = -18;
scene.add(directional);

const fill = new THREE.PointLight(0x60a5fa, 30, 60, 2);
fill.position.set(-10, 8, -10);
scene.add(fill);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(36, 80),
  new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.92, metalness: 0.06 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.05;
floor.receiveShadow = true;
scene.add(floor);

const { board, markers } = createBoard();
scene.add(board);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let textureMap = null;
let pieceGroups = [];
let selectedSquare = null;
let legalMoves = [];
let aiEnabled = true;
let busy = false;

function buildLegend() {
  legendGrid.innerHTML = "";
  for (const side of ["white", "black"]) {
    for (const [pieceType, meta] of Object.entries(FOOTBALLER_ASSIGNMENTS[side])) {
      const card = document.createElement("div");
      card.className = "legend-card";
      card.innerHTML = `<strong>${side[0].toUpperCase() + side.slice(1)} ${pieceType}</strong><span>${meta.name}</span>`;
      legendGrid.appendChild(card);
    }
  }
}

function clearPieces() {
  for (const item of pieceGroups) scene.remove(item.group);
  pieceGroups = [];
}

function pieceDisplayName(piece) {
  const meta = FOOTBALLER_ASSIGNMENTS[piece.color][piece.type];
  return `${piece.color} ${piece.type} — ${meta.name}`;
}

function syncBoardMeshes(animated = false) {
  clearPieces();
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = engine.getPiece(x, y);
      if (!piece) continue;
      const group = createPieceMesh(piece, textureMap);
      const position = boardToWorld(x, y);
      group.position.copy(position);
      group.position.y = 0.18;
      group.scale.setScalar(0.82);
      group.userData = { ...group.userData, x, y, piece };
      group.traverse((child) => {
        child.castShadow = true;
        child.receiveShadow = true;
      });
      scene.add(group);
      pieceGroups.push({ group, x, y });
    }
  }
}

function refreshMarkers() {
  markers.forEach((marker) => (marker.visible = false));
  legalMoves.forEach((move, index) => {
    const marker = markers[index];
    const pos = boardToWorld(move.to.x, move.to.y);
    marker.position.set(pos.x, 0.27, pos.z);
    marker.visible = true;
    marker.material.color.set(move.capture ? 0xf97316 : 0x22c55e);
  });
}

function updateHud() {
  turnIndicator.textContent = engine.turn[0].toUpperCase() + engine.turn.slice(1);
  selectedIndicator.textContent = selectedSquare
    ? pieceDisplayName(engine.getPiece(selectedSquare.x, selectedSquare.y))
    : "None";
  gameIndicator.textContent = engine.getStatusText();
  toggleAiBtn.textContent = `AI: ${aiEnabled ? "On" : "Off"}`;
}

function selectSquare(x, y) {
  const piece = engine.getPiece(x, y);
  if (!piece || piece.color !== engine.turn) {
    selectedSquare = null;
    legalMoves = [];
    refreshMarkers();
    updateHud();
    return;
  }

  selectedSquare = { x, y };
  legalMoves = engine.getLegalMovesFor(x, y);
  refreshMarkers();
  updateHud();
}

function resetCamera() {
  camera.position.set(13, 16, 15);
  controls.target.set(0, 1.5, 0);
  controls.update();
}

function getIntersectedObject(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const sceneObjects = [...pieceGroups.map((p) => p.group), ...board.children.filter((c) => c.userData?.kind === "square")];
  const hits = raycaster.intersectObjects(sceneObjects, true);
  return hits[0] || null;
}

function findRootPiece(obj) {
  let node = obj;
  while (node && !node.userData?.kind) node = node.parent;
  return node?.userData?.kind === "piece" ? node : null;
}

function tryMove(targetX, targetY) {
  const move = legalMoves.find((m) => m.to.x === targetX && m.to.y === targetY);
  if (!move) return false;
  const success = engine.makeMove(move);
  if (!success) return false;

  selectedSquare = null;
  legalMoves = [];
  refreshMarkers();
  syncBoardMeshes(true);
  updateHud();

  if (aiEnabled && engine.turn === "black" && engine.gameState !== "checkmate" && engine.gameState !== "stalemate") {
    busy = true;
    setTimeout(() => {
      const aiMove = chooseAIMove(engine);
      if (aiMove) {
        engine.makeMove(aiMove);
        syncBoardMeshes(true);
      }
      busy = false;
      updateHud();
    }, 420);
  }

  return true;
}

renderer.domElement.addEventListener("click", (event) => {
  if (busy) return;
  const hit = getIntersectedObject(event);
  if (!hit) return;

  const pieceRoot = findRootPiece(hit.object);
  if (pieceRoot) {
    const { x, y } = pieceRoot.userData;
    if (selectedSquare && tryMove(x, y)) return;
    selectSquare(x, y);
    return;
  }

  const square = hit.object.userData?.kind === "square" ? hit.object.userData : null;
  if (!square) return;
  if (selectedSquare && tryMove(square.x, square.y)) return;
  selectSquare(square.x, square.y);
});

newGameBtn.addEventListener("click", () => {
  engine.reset();
  selectedSquare = null;
  legalMoves = [];
  refreshMarkers();
  syncBoardMeshes();
  updateHud();
});

toggleAiBtn.addEventListener("click", () => {
  aiEnabled = !aiEnabled;
  updateHud();
});

rotateBtn.addEventListener("click", resetCamera);

window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

(async function init() {
  textureMap = await loadPortraitTextures();
  buildLegend();
  syncBoardMeshes();
  updateHud();
})();

const clock = new THREE.Clock();

function animate() {
  const elapsed = clock.getElapsedTime();
  controls.update();

  pieceGroups.forEach(({ group }, index) => {
    group.rotation.y = Math.sin(elapsed * 0.8 + index * 0.4) * 0.02;
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
