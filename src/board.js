import * as THREE from "three";

export function createBoard() {
  const board = new THREE.Group();
  const squareSize = 2;
  const originOffset = 7;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(18.2, 1.2, 18.2),
    new THREE.MeshPhysicalMaterial({
      color: 0x3f2b1a,
      metalness: 0.15,
      roughness: 0.65,
      clearcoat: 0.15
    })
  );
  frame.position.y = -0.7;
  frame.receiveShadow = true;
  board.add(frame);

  const lightMat = new THREE.MeshStandardMaterial({ color: 0xe7d8b1, roughness: 0.72, metalness: 0.05 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x7c4f2b, roughness: 0.78, metalness: 0.05 });

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const square = new THREE.Mesh(
        new THREE.BoxGeometry(squareSize, 0.35, squareSize),
        (x + y) % 2 === 0 ? lightMat : darkMat
      );
      square.position.set(x * squareSize - originOffset, 0, y * squareSize - originOffset);
      square.receiveShadow = true;
      square.userData = { kind: "square", x, y };
      board.add(square);
    }
  }

  const markerGeom = new THREE.TorusGeometry(0.5, 0.09, 12, 32);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const markers = [];

  for (let i = 0; i < 64; i++) {
    const marker = new THREE.Mesh(markerGeom, markerMat.clone());
    marker.rotation.x = Math.PI / 2;
    marker.visible = false;
    board.add(marker);
    markers.push(marker);
  }

  return { board, markers, squareSize, originOffset };
}

export function boardToWorld(x, y) {
  return new THREE.Vector3(x * 2 - 7, 0.18, y * 2 - 7);
}
