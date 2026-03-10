import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { FOOTBALLER_FACES, PLAYER_BY_PIECE } from './footballers.js';

const canvas = document.querySelector('#scene');
const statusEl = document.querySelector('#status-indicator');
const turnEl = document.querySelector('#turn-indicator');
const moveLogEl = document.querySelector('#move-log');
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const files = 'abcdefgh';
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x06111c, 18, 34);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(8.4, 12, 10.5);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 0.8, 0);
controls.minDistance = 8;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI / 2.15;

const ambient = new THREE.HemisphereLight(0xbdd8ff, 0x122236, 1.4);
scene.add(ambient);
const spot = new THREE.SpotLight(0xffffff, 2.2, 45, Math.PI / 6, 0.3, 1);
spot.position.set(5, 18, 7);
spot.castShadow = true;
spot.shadow.mapSize.set(2048, 2048);
scene.add(spot);
scene.add(spot.target);
const rim = new THREE.PointLight(0x7cffb7, 1.2, 28);
rim.position.set(-7, 7, -7);
scene.add(rim);

const root = new THREE.Group();
scene.add(root);

const squareMeshes = [];
const pieceMeshes = new Map();
const faceTextureCache = new Map();
const moveHighlights = [];

let game = createInitialGame();
let selectedSquare = null;
let legalTargets = [];
let history = [];

initBoard();
setupUI();
refreshSceneFromState();
onResize();
animate();

function setupUI() {
  document.querySelector('#new-game-btn').addEventListener('click', () => {
    game = createInitialGame();
    history = [];
    selectedSquare = null;
    legalTargets = [];
    clearHighlights();
    refreshSceneFromState();
    setStatus('New match started. White to move.');
  });
  document.querySelector('#undo-btn').addEventListener('click', () => {
    if (history.length < 2) return;
    history.pop();
    game = cloneGame(history.pop());
    selectedSquare = null;
    legalTargets = [];
    clearHighlights();
    refreshSceneFromState();
    setStatus('Undid the last full turn.');
  });
  document.querySelector('#camera-btn').addEventListener('click', () => {
    camera.position.set(8.4, 12, 10.5);
    controls.target.set(0, 0.8, 0);
    controls.update();
  });
  canvas.addEventListener('pointerdown', onPointerDown);
}

function initBoard() {
  const boardGroup = new THREE.Group();
  root.add(boardGroup);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(10.2, 0.8, 10.2),
    new THREE.MeshStandardMaterial({ color: 0x2b1b12, metalness: 0.15, roughness: 0.8 })
  );
  base.position.y = -0.45;
  base.receiveShadow = true;
  boardGroup.add(base);

  const squareGeo = new THREE.BoxGeometry(1, 0.18, 1);
  for (let z = 0; z < 8; z++) {
    for (let x = 0; x < 8; x++) {
      const light = (x + z) % 2 === 0;
      const square = new THREE.Mesh(
        squareGeo,
        new THREE.MeshStandardMaterial({
          color: light ? 0xf0dfc0 : 0x5a3d2b,
          roughness: 0.85,
          metalness: 0.1,
          emissive: 0x000000
        })
      );
      square.position.set(x - 3.5, 0, z - 3.5);
      square.receiveShadow = true;
      square.userData.square = coordsToSquare(x, z);
      boardGroup.add(square);
      squareMeshes.push(square);
    }
  }

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(16, 64),
    new THREE.MeshStandardMaterial({ color: 0x07131d, roughness: 0.95, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.55;
  ground.receiveShadow = true;
  root.add(ground);
}

function onPointerDown(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([...squareMeshes, ...pieceMeshes.values()], true);
  if (!hits.length) return;
  const object = findClickableObject(hits[0].object);
  if (!object) return;

  const clickedSquare = object.userData.square;
  const piece = game.board[clickedSquare];

  if (selectedSquare && legalTargets.includes(clickedSquare)) {
    applyPlayerMove(selectedSquare, clickedSquare);
    return;
  }

  if (piece && piece.color === game.turn) {
    selectedSquare = clickedSquare;
    legalTargets = generateLegalMoves(game, game.turn)
      .filter(m => m.from === selectedSquare)
      .map(m => m.to);
    drawHighlights(selectedSquare, legalTargets);
    setStatus(`${piece.color === 'w' ? 'White' : 'Black'} ${piece.type} selected.`);
  } else {
    selectedSquare = null;
    legalTargets = [];
    clearHighlights();
  }
}

function applyPlayerMove(from, to) {
  const legal = generateLegalMoves(game, game.turn).find(m => m.from === from && m.to === to);
  if (!legal) return;
  history.push(cloneGame(game));
  game = applyMove(game, legal);
  selectedSquare = null;
  legalTargets = [];
  clearHighlights();
  refreshSceneFromState();
  if (handleEndState()) return;
  setTimeout(aiTurn, 350);
}

function aiTurn() {
  if (game.turn !== 'b') return;
  const moves = generateLegalMoves(game, 'b');
  if (!moves.length) {
    handleEndState();
    return;
  }
  const scored = moves.map(move => ({ move, score: scoreMove(game, move) + Math.random() * 0.3 }));
  scored.sort((a, b) => b.score - a.score);
  history.push(cloneGame(game));
  game = applyMove(game, scored[0].move);
  refreshSceneFromState();
  handleEndState();
}

function scoreMove(state, move) {
  const values = { pawn: 1, knight: 3.2, bishop: 3.3, rook: 5, queen: 9, king: 0 };
  let score = 0;
  if (move.capture) score += values[move.capture.type] * 2.2;
  if (move.promotion) score += 7;
  if (move.castle) score += 1.1;
  const centerDist = Math.abs(squareToCoords(move.to).x - 3.5) + Math.abs(squareToCoords(move.to).z - 3.5);
  score += (7 - centerDist) * 0.07;
  const preview = applyMove(state, move, { skipLog: true });
  if (isInCheck(preview, 'w')) score += 0.45;
  return score;
}

function handleEndState() {
  const side = game.turn;
  const moves = generateLegalMoves(game, side);
  const checked = isInCheck(game, side);
  if (!moves.length && checked) {
    setStatus(`Checkmate. ${side === 'w' ? 'Black' : 'White'} wins.`);
    return true;
  }
  if (!moves.length) {
    setStatus('Stalemate. Draw.');
    return true;
  }
  if (checked) {
    setStatus(`${side === 'w' ? 'White' : 'Black'} is in check.`);
  } else {
    setStatus(`${side === 'w' ? 'White' : 'Black'} to move.`);
  }
  return false;
}

function refreshSceneFromState() {
  turnEl.textContent = game.turn === 'w' ? 'White' : 'Black';
  syncBoardEmissive();
  updateMoveLog();
  const activeSquares = new Set(Object.keys(game.board));
  for (const [sq, mesh] of pieceMeshes.entries()) {
    if (!activeSquares.has(sq)) {
      root.remove(mesh);
      disposeHierarchy(mesh);
      pieceMeshes.delete(sq);
    }
  }
  for (const [sq, piece] of Object.entries(game.board)) {
    let mesh = pieceMeshes.get(sq);
    if (!mesh) {
      mesh = createPieceMesh(piece);
      pieceMeshes.set(sq, mesh);
      root.add(mesh);
    }
    mesh.userData.square = sq;
    mesh.userData.piece = piece;
    const pos = squareToWorld(sq);
    mesh.position.lerp(pos, 1);
  }
}

function updateMoveLog() {
  if (!game.moves.length) {
    moveLogEl.innerHTML = '<div class="badge">No moves yet</div>';
    return;
  }
  const rows = [];
  for (let i = 0; i < game.moves.length; i += 2) {
    const white = game.moves[i]?.san || '';
    const black = game.moves[i + 1]?.san || '';
    rows.push(`<div class="move-row"><strong>${(i / 2) + 1}.</strong><span>${white}</span><span>${black}</span></div>`);
  }
  moveLogEl.innerHTML = rows.join('');
}

function createPieceMesh(piece) {
  const group = new THREE.Group();
  group.castShadow = true;
  group.receiveShadow = true;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: piece.color === 'w' ? 0xe7edf6 : 0x1a2029,
    metalness: 0.2,
    roughness: 0.5
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: piece.color === 'w' ? 0xb8d2ff : 0x7cffb7,
    emissive: piece.color === 'w' ? 0x0f2342 : 0x123826,
    metalness: 0.3,
    roughness: 0.35
  });

  const type = piece.type;
  const scale = { pawn: 0.82, knight: 0.98, bishop: 1.03, rook: 1.08, queen: 1.18, king: 1.25 }[type];
  const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 0.14, 32), bodyMat);
  base1.position.y = 0.07;
  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.12, 32), trimMat);
  base2.position.y = 0.18;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.65 * scale, 28), bodyMat);
  stem.position.y = 0.55 * scale;
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 28, 20), trimMat);
  shoulder.position.y = 0.9 * scale;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, 28, 20), bodyMat);
  head.position.y = 1.16 * scale;
  group.add(base1, base2, stem, shoulder, head);

  if (type === 'rook') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 6), trimMat);
    crown.position.y = 1.35 * scale;
    group.add(crown);
  } else if (type === 'bishop') {
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 18, 18), trimMat);
    top.position.y = 1.42 * scale;
    group.add(top);
  } else if (type === 'queen') {
    const top = new THREE.Mesh(new THREE.TorusGeometry(0.14 * scale, 0.045, 12, 28), trimMat);
    top.rotation.x = Math.PI / 2;
    top.position.y = 1.38 * scale;
    group.add(top);
  } else if (type === 'king') {
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), trimMat);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.08), trimMat);
    bar1.position.y = 1.42 * scale;
    bar2.position.y = 1.42 * scale;
    group.add(bar1, bar2);
  } else if (type === 'knight') {
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.14), trimMat);
    neck.position.set(0, 1.2 * scale, 0.05);
    neck.rotation.z = 0.2;
    group.add(neck);
  }

  const faceKey = PLAYER_BY_PIECE[piece.color][piece.type];
  const portrait = createFaceBillboard(faceKey, piece.color);
  portrait.position.set(0, 1.1 * scale, 0.22);
  group.add(portrait);

  group.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return group;
}

function createFaceBillboard(faceKey, color) {
  let texture = faceTextureCache.get(faceKey);
  if (!texture) {
    const svg = FOOTBALLER_FACES[faceKey];
    const img = new Image();
    const tex = new THREE.Texture(img);
    img.onload = () => { tex.needsUpdate = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    texture = tex;
    faceTextureCache.set(faceKey, texture);
  }
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.34),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.7,
      metalness: 0.1,
      emissive: new THREE.Color(color === 'w' ? 0x0d1c31 : 0x112319),
      emissiveIntensity: 0.35
    })
  );
  card.castShadow = true;
  return card;
}

function drawHighlights(fromSquare, targets) {
  clearHighlights();
  syncBoardEmissive(fromSquare, targets);
  const selectedPos = squareToWorld(fromSquare);
  const selectedRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.33, 0.028, 16, 48),
    new THREE.MeshBasicMaterial({ color: 0x77a9ff })
  );
  selectedRing.rotation.x = Math.PI / 2;
  selectedRing.position.copy(selectedPos).setY(0.16);
  root.add(selectedRing);
  moveHighlights.push(selectedRing);

  for (const sq of targets) {
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.06, 24),
      new THREE.MeshBasicMaterial({ color: 0x7cffb7 })
    );
    marker.position.copy(squareToWorld(sq)).setY(0.12);
    root.add(marker);
    moveHighlights.push(marker);
  }
}

function clearHighlights() {
  while (moveHighlights.length) {
    const obj = moveHighlights.pop();
    root.remove(obj);
    disposeHierarchy(obj);
  }
  syncBoardEmissive();
}

function syncBoardEmissive(selected = null, targets = []) {
  const targetSet = new Set(targets);
  for (const square of squareMeshes) {
    const sq = square.userData.square;
    square.material.emissive.setHex(
      sq === selected ? 0x163f77 : targetSet.has(sq) ? 0x113b26 : 0x000000
    );
    square.material.emissiveIntensity = sq === selected || targetSet.has(sq) ? 0.65 : 0;
  }
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function onResize() {
  const rect = canvas.getBoundingClientRect();
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  renderer.setSize(rect.width, rect.height, false);
}
window.addEventListener('resize', onResize);

function setStatus(text) { statusEl.textContent = text; }

function squareToWorld(square) {
  const { x, z } = squareToCoords(square);
  return new THREE.Vector3(x - 3.5, 0.11, z - 3.5);
}
function squareToCoords(square) {
  const file = files.indexOf(square[0]);
  const rank = Number(square[1]) - 1;
  return { x: file, z: rank };
}
function coordsToSquare(x, z) { return `${files[x]}${z + 1}`; }

function findClickableObject(object) {
  let o = object;
  while (o && !o.userData.square) o = o.parent;
  return o;
}

function cloneGame(state) {
  return JSON.parse(JSON.stringify(state));
}

function createInitialGame() {
  const board = {};
  const back = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let i = 0; i < 8; i++) {
    board[coordsToSquare(i, 0)] = { color: 'w', type: back[i], moved: false };
    board[coordsToSquare(i, 1)] = { color: 'w', type: 'pawn', moved: false };
    board[coordsToSquare(i, 6)] = { color: 'b', type: 'pawn', moved: false };
    board[coordsToSquare(i, 7)] = { color: 'b', type: back[i], moved: false };
  }
  return {
    board,
    turn: 'w',
    enPassant: null,
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    moves: []
  };
}

function generateLegalMoves(state, color) {
  const pseudo = generatePseudoMoves(state, color);
  return pseudo.filter(move => !isInCheck(applyMove(state, move, { skipLog: true }), color));
}

function generatePseudoMoves(state, color) {
  const moves = [];
  for (const [sq, piece] of Object.entries(state.board)) {
    if (piece.color !== color) continue;
    moves.push(...pieceMoves(state, sq, piece));
  }
  return moves;
}

function pieceMoves(state, from, piece) {
  const { x, z } = squareToCoords(from);
  const list = [];
  const forward = piece.color === 'w' ? 1 : -1;
  if (piece.type === 'pawn') {
    const one = coordsToSquare(x, z + forward);
    if (inside(x, z + forward) && !state.board[one]) {
      addPawnMove(list, state, from, one, piece);
      const two = coordsToSquare(x, z + 2 * forward);
      if (!piece.moved && inside(x, z + 2 * forward) && !state.board[two]) {
        list.push({ from, to: two, piece, doubleStep: true });
      }
    }
    for (const dx of [-1, 1]) {
      const tx = x + dx;
      const tz = z + forward;
      if (!inside(tx, tz)) continue;
      const to = coordsToSquare(tx, tz);
      const target = state.board[to];
      if (target && target.color !== piece.color) addPawnMove(list, state, from, to, piece, target);
      if (state.enPassant === to) {
        const capSq = coordsToSquare(tx, z);
        list.push({ from, to, piece, capture: state.board[capSq], enPassant: capSq });
      }
    }
  }
  if (piece.type === 'knight') {
    for (const [dx, dz] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]) {
      pushMove(state, list, from, x + dx, z + dz, piece);
    }
  }
  if (piece.type === 'bishop' || piece.type === 'rook' || piece.type === 'queen') {
    const dirs = [];
    if (piece.type !== 'bishop') dirs.push([1,0],[-1,0],[0,1],[0,-1]);
    if (piece.type !== 'rook') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
    for (const [dx, dz] of dirs) sweep(state, list, from, x, z, dx, dz, piece);
  }
  if (piece.type === 'king') {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (dx || dz) pushMove(state, list, from, x + dx, z + dz, piece);
    }
    const enemy = piece.color === 'w' ? 'b' : 'w';
    if (!isInCheck(state, piece.color)) {
      if (piece.color === 'w' && state.castling.wK && !state.board['f1'] && !state.board['g1'] && !isSquareAttacked(state, 'f1', enemy) && !isSquareAttacked(state, 'g1', enemy)) {
        list.push({ from, to: 'g1', piece, castle: 'K' });
      }
      if (piece.color === 'w' && state.castling.wQ && !state.board['b1'] && !state.board['c1'] && !state.board['d1'] && !isSquareAttacked(state, 'c1', enemy) && !isSquareAttacked(state, 'd1', enemy)) {
        list.push({ from, to: 'c1', piece, castle: 'Q' });
      }
      if (piece.color === 'b' && state.castling.bK && !state.board['f8'] && !state.board['g8'] && !isSquareAttacked(state, 'f8', enemy) && !isSquareAttacked(state, 'g8', enemy)) {
        list.push({ from, to: 'g8', piece, castle: 'K' });
      }
      if (piece.color === 'b' && state.castling.bQ && !state.board['b8'] && !state.board['c8'] && !state.board['d8'] && !isSquareAttacked(state, 'c8', enemy) && !isSquareAttacked(state, 'd8', enemy)) {
        list.push({ from, to: 'c8', piece, castle: 'Q' });
      }
    }
  }
  return list;
}

function addPawnMove(list, state, from, to, piece, capture = null) {
  const promotionRank = piece.color === 'w' ? '8' : '1';
  if (to[1] === promotionRank) list.push({ from, to, piece, capture, promotion: 'queen' });
  else list.push({ from, to, piece, capture });
}
function pushMove(state, list, from, x, z, piece) {
  if (!inside(x, z)) return;
  const to = coordsToSquare(x, z);
  const target = state.board[to];
  if (!target) list.push({ from, to, piece });
  else if (target.color !== piece.color) list.push({ from, to, piece, capture: target });
}
function sweep(state, list, from, x, z, dx, dz, piece) {
  let cx = x + dx, cz = z + dz;
  while (inside(cx, cz)) {
    const to = coordsToSquare(cx, cz);
    const target = state.board[to];
    if (!target) list.push({ from, to, piece });
    else {
      if (target.color !== piece.color) list.push({ from, to, piece, capture: target });
      break;
    }
    cx += dx; cz += dz;
  }
}
function inside(x, z) { return x >= 0 && x < 8 && z >= 0 && z < 8; }

function applyMove(state, move, options = {}) {
  const next = cloneGame(state);
  const piece = { ...next.board[move.from], moved: true };
  delete next.board[move.from];
  if (move.enPassant) delete next.board[move.enPassant];
  if (move.capture && !move.enPassant) delete next.board[move.to];
  next.enPassant = null;
  if (move.doubleStep) {
    const { x, z } = squareToCoords(move.to);
    next.enPassant = coordsToSquare(x, z + (piece.color === 'w' ? -1 : 1));
  }
  if (piece.type === 'king') {
    if (piece.color === 'w') { next.castling.wK = false; next.castling.wQ = false; }
    else { next.castling.bK = false; next.castling.bQ = false; }
    if (move.castle === 'K') {
      const rookFrom = piece.color === 'w' ? 'h1' : 'h8';
      const rookTo = piece.color === 'w' ? 'f1' : 'f8';
      next.board[rookTo] = { ...next.board[rookFrom], moved: true };
      delete next.board[rookFrom];
    }
    if (move.castle === 'Q') {
      const rookFrom = piece.color === 'w' ? 'a1' : 'a8';
      const rookTo = piece.color === 'w' ? 'd1' : 'd8';
      next.board[rookTo] = { ...next.board[rookFrom], moved: true };
      delete next.board[rookFrom];
    }
  }
  if (piece.type === 'rook') {
    if (move.from === 'a1') next.castling.wQ = false;
    if (move.from === 'h1') next.castling.wK = false;
    if (move.from === 'a8') next.castling.bQ = false;
    if (move.from === 'h8') next.castling.bK = false;
  }
  if (move.capture?.type === 'rook') {
    if (move.to === 'a1') next.castling.wQ = false;
    if (move.to === 'h1') next.castling.wK = false;
    if (move.to === 'a8') next.castling.bQ = false;
    if (move.to === 'h8') next.castling.bK = false;
  }
  next.board[move.to] = move.promotion ? { color: piece.color, type: move.promotion, moved: true } : piece;
  next.turn = state.turn === 'w' ? 'b' : 'w';
  if (!next.moves) next.moves = [];
  if (!options.skipLog) next.moves.push({ ...move, san: moveToSAN(state, move) });
  return next;
}

function findKingSquare(state, color) {
  return Object.entries(state.board).find(([, p]) => p.color === color && p.type === 'king')?.[0] || null;
}
function isInCheck(state, color) {
  const kingSq = findKingSquare(state, color);
  if (!kingSq) return false;
  const enemy = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(state, kingSq, enemy);
}
function isSquareAttacked(state, square, byColor) {
  const { x, z } = squareToCoords(square);
  for (const [sq, piece] of Object.entries(state.board)) {
    if (piece.color !== byColor) continue;
    const { x: px, z: pz } = squareToCoords(sq);
    if (piece.type === 'pawn') {
      const dir = byColor === 'w' ? 1 : -1;
      for (const dx of [-1, 1]) if (px + dx === x && pz + dir === z) return true;
    } else if (piece.type === 'knight') {
      for (const [dx, dz] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]) if (px + dx === x && pz + dz === z) return true;
    } else if (piece.type === 'king') {
      if (Math.max(Math.abs(px - x), Math.abs(pz - z)) === 1) return true;
    } else {
      const dirs = [];
      if (piece.type === 'bishop' || piece.type === 'queen') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
      if (piece.type === 'rook' || piece.type === 'queen') dirs.push([1,0],[-1,0],[0,1],[0,-1]);
      for (const [dx, dz] of dirs) {
        let cx = px + dx, cz = pz + dz;
        while (inside(cx, cz)) {
          const cur = coordsToSquare(cx, cz);
          if (cx === x && cz === z) return true;
          if (state.board[cur]) break;
          cx += dx; cz += dz;
        }
      }
    }
  }
  return false;
}

function moveToSAN(state, move) {
  if (move.castle === 'K') return 'O-O';
  if (move.castle === 'Q') return 'O-O-O';
  const pieceLetter = { king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '' }[move.piece.type];
  const capture = move.capture || move.enPassant ? 'x' : '';
  const prefix = move.piece.type === 'pawn' && capture ? move.from[0] : pieceLetter;
  let san = `${prefix}${capture}${move.to}`;
  if (move.promotion) san += '=Q';
  const preview = applyMove(state, move, { skipLog: true });
  if (isInCheck(preview, preview.turn)) {
    san += generateLegalMoves(preview, preview.turn).length ? '+' : '#';
  }
  return san;
}

function disposeHierarchy(obj) {
  obj.traverse?.(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material.dispose();
    }
  });
}
