import * as THREE from "three";

export const FOOTBALLER_ASSIGNMENTS = {
  white: {
    king: { name: "Lionel Messi", file: "messi.svg" },
    queen: { name: "Cristiano Ronaldo", file: "ronaldo.svg" },
    rook: { name: "Zinedine Zidane", file: "zidane.svg" },
    bishop: { name: "Neymar Jr.", file: "neymar.svg" },
    knight: { name: "Kylian Mbappé", file: "mbappe.svg" },
    pawn: { name: "Mohamed Salah", file: "salah.svg" }
  },
  black: {
    king: { name: "Pelé", file: "pele.svg" },
    queen: { name: "Diego Maradona", file: "maradona.svg" },
    rook: { name: "David Beckham", file: "beckham.svg" },
    bishop: { name: "Ronaldinho", file: "ronaldinho.svg" },
    knight: { name: "Erling Haaland", file: "haaland.svg" },
    pawn: { name: "Luka Modrić", file: "modric.svg" }
  }
};

const METALS = {
  white: new THREE.MeshPhysicalMaterial({
    color: 0xf5f5f4,
    metalness: 0.5,
    roughness: 0.28,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2
  }),
  black: new THREE.MeshPhysicalMaterial({
    color: 0x151515,
    metalness: 0.72,
    roughness: 0.22,
    clearcoat: 0.55,
    clearcoatRoughness: 0.14
  })
};

export async function loadPortraitTextures() {
  const loader = new THREE.TextureLoader();
  const entries = [];

  for (const side of ["white", "black"]) {
    for (const [pieceType, meta] of Object.entries(FOOTBALLER_ASSIGNMENTS[side])) {
      const key = `${side}-${pieceType}`;
      entries.push(
        new Promise((resolve, reject) => {
          loader.load(
            `./assets/faces/${meta.file}`,
            (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;
              resolve([key, texture]);
            },
            undefined,
            reject
          );
        })
      );
    }
  }

  const loaded = await Promise.all(entries);
  return Object.fromEntries(loaded);
}

function createBaseProfile(type) {
  switch (type) {
    case "pawn":
      return [
        [0, 0], [0.52, 0], [0.58, 0.08], [0.48, 0.14], [0.43, 0.28], [0.28, 0.36],
        [0.23, 0.5], [0.34, 0.62], [0.21, 0.76], [0.17, 0.9], [0.24, 1.08], [0.18, 1.25]
      ];
    case "rook":
      return [
        [0, 0], [0.62, 0], [0.68, 0.08], [0.57, 0.16], [0.56, 0.9], [0.68, 1.05], [0.68, 1.32],
        [0.55, 1.32], [0.55, 1.45], [0.42, 1.45], [0.42, 1.32], [0.3, 1.32], [0.3, 1.45],
        [0.16, 1.45], [0.16, 1.26], [0.18, 1.1], [0.1, 1.02], [0.12, 0.18], [0, 0]
      ];
    case "knight":
      return [
        [0, 0], [0.56, 0], [0.6, 0.08], [0.48, 0.16], [0.43, 0.42], [0.58, 0.54], [0.66, 0.82],
        [0.48, 1.1], [0.36, 1.24], [0.54, 1.46], [0.2, 1.54], [0.12, 1.26], [0.14, 0.18], [0, 0]
      ];
    case "bishop":
      return [
        [0, 0], [0.56, 0], [0.62, 0.08], [0.5, 0.15], [0.48, 0.42], [0.34, 0.64], [0.3, 0.9],
        [0.4, 1.14], [0.3, 1.38], [0.16, 1.58], [0.2, 1.72], [0.08, 1.78], [0.18, 1.9], [0.02, 2.0]
      ];
    case "queen":
      return [
        [0, 0], [0.62, 0], [0.68, 0.08], [0.56, 0.16], [0.52, 0.44], [0.4, 0.78], [0.48, 1.22],
        [0.28, 1.48], [0.16, 1.86], [0.34, 2.06], [0.18, 2.22], [0.02, 2.3]
      ];
    case "king":
      return [
        [0, 0], [0.62, 0], [0.68, 0.08], [0.56, 0.16], [0.52, 0.44], [0.42, 0.82], [0.44, 1.24],
        [0.28, 1.54], [0.16, 1.92], [0.3, 2.12], [0.16, 2.34], [0.06, 2.54]
      ];
    default:
      return [[0, 0], [0.6, 0], [0.2, 1.4], [0.02, 1.6]];
  }
}

function createLatheMesh(type, material) {
  const points = createBaseProfile(type).map(([x, y]) => new THREE.Vector2(x, y));
  const geom = new THREE.LatheGeometry(points, 40);
  geom.computeVertexNormals();
  return new THREE.Mesh(geom, material);
}

function addKingCross(group, color) {
  const mat = METALS[color];
  const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), mat);
  vertical.position.y = 3.02;
  const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.12), mat);
  horizontal.position.y = 3.05;
  group.add(vertical, horizontal);
}

function addQueenCrown(group, color) {
  const mat = METALS[color];
  const jewel = new THREE.SphereGeometry(0.08, 18, 18);
  const jewelY = 2.72;
  const offsets = [-0.22, -0.07, 0.07, 0.22];
  offsets.forEach((x, i) => {
    const mesh = new THREE.Mesh(jewel, mat);
    mesh.position.set(x, jewelY + (i % 2 ? 0.04 : 0), 0);
    group.add(mesh);
  });
}

function addBishopCut(group) {
  const slit = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.42, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x101010, metalness: 0.1, roughness: 0.95 })
  );
  slit.position.set(0, 2.1, 0);
  slit.rotation.z = Math.PI / 8;
  group.add(slit);
}

function addRookTop(group, color) {
  const mat = METALS[color];
  const crenel = new THREE.BoxGeometry(0.16, 0.14, 0.16);
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(crenel, mat);
    const angle = (Math.PI / 2) * i;
    mesh.position.set(Math.cos(angle) * 0.38, 1.48, Math.sin(angle) * 0.38);
    group.add(mesh);
  }
}

function addKnightHead(group, color) {
  const mat = METALS[color];
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.4, 6, 12), mat);
  head.position.set(0, 1.75, 0.12);
  head.rotation.z = -0.55;
  group.add(head);

  const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 12), mat);
  ear.position.set(0.12, 2.12, 0.1);
  ear.rotation.z = -0.2;
  group.add(ear);
}

function createPortraitDisc(texture, color) {
  const group = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 0.06, 32),
    new THREE.MeshPhysicalMaterial({
      color: color === "white" ? 0xd4af37 : 0x8b5cf6,
      metalness: 0.85,
      roughness: 0.28
    })
  );
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  const portrait = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 40),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  portrait.position.z = 0.035;
  group.add(portrait);
  return group;
}

export function createPieceMesh(piece, textureMap) {
  const group = new THREE.Group();
  const material = METALS[piece.color].clone();
  const body = createLatheMesh(piece.type, material);
  group.add(body);

  const key = `${piece.color}-${piece.type}`;
  const texture = textureMap[key];
  const discFront = createPortraitDisc(texture, piece.color);
  discFront.position.set(0, piece.type === "pawn" ? 0.88 : piece.type === "rook" ? 0.92 : piece.type === "knight" ? 1.16 : piece.type === "bishop" ? 1.28 : piece.type === "queen" ? 1.48 : 1.62, 0.62);
  discFront.rotation.y = 0;
  group.add(discFront);

  const discBack = createPortraitDisc(texture, piece.color);
  discBack.position.copy(discFront.position);
  discBack.position.z *= -1;
  discBack.rotation.y = Math.PI;
  group.add(discBack);

  if (piece.type === "king") addKingCross(group, piece.color);
  if (piece.type === "queen") addQueenCrown(group, piece.color);
  if (piece.type === "bishop") addBishopCut(group);
  if (piece.type === "rook") addRookTop(group, piece.color);
  if (piece.type === "knight") addKnightHead(group, piece.color);

  group.userData.kind = "piece";
  group.castShadow = true;
  group.receiveShadow = true;
  return group;
}
