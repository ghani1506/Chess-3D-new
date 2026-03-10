
const canvas = document.getElementById("scene")

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(
75,
window.innerWidth/window.innerHeight,
0.1,
1000
)

const renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true})
renderer.setSize(window.innerWidth,window.innerHeight)

camera.position.set(6,8,10)

const controls = new THREE.OrbitControls(camera, renderer.domElement)

const light = new THREE.DirectionalLight(0xffffff,1)
light.position.set(5,10,7)
scene.add(light)

const ambient = new THREE.AmbientLight(0xaaaaaa)
scene.add(ambient)

// chess board
for(let x=0;x<8;x++){
for(let z=0;z<8;z++){

const geometry = new THREE.BoxGeometry(1,0.2,1)

const color = (x+z)%2===0 ? 0xffffff : 0x222222

const material = new THREE.MeshStandardMaterial({color:color})

const square = new THREE.Mesh(geometry,material)

square.position.set(x-3.5,0,z-3.5)

scene.add(square)

}
}

// simple chess pieces
function createPiece(x,z,color){

const geometry = new THREE.CylinderGeometry(0.3,0.4,1.2,32)
const material = new THREE.MeshStandardMaterial({color:color})

const piece = new THREE.Mesh(geometry,material)
piece.position.set(x-3.5,0.7,z-3.5)

scene.add(piece)

}

// place pawns
for(let i=0;i<8;i++){
createPiece(i,1,0xffffff)
createPiece(i,6,0x000000)
}

function animate(){
requestAnimationFrame(animate)
controls.update()
renderer.render(scene,camera)
}

animate()

window.addEventListener("resize",()=>{
camera.aspect = window.innerWidth/window.innerHeight
camera.updateProjectionMatrix()
renderer.setSize(window.innerWidth,window.innerHeight)
})
