import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Environment, Lightformer } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import * as THREE from 'three'
import { useMemo } from 'react'

function Skeleton() {
  const gltf = useLoader(GLTFLoader, './models/skeleton.glb', (l) => l.setMeshoptDecoder(MeshoptDecoder))
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#efe6d2', roughness: 0.55, clearcoat: 0.2 }), [])
  useMemo(() => gltf.scene.traverse((o: any) => { if (o.isMesh) o.material = mat }), [gltf, mat])
  return <primitive object={gltf.scene} />
}
export default function App() {
  return (
    <Canvas camera={{ position: [0, 0.1, 2.6], fov: 40 }} style={{ position: 'fixed', inset: 0, background: '#0a0d14' }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 3, 2]} intensity={2} />
      <Environment resolution={256}><Lightformer intensity={2} position={[0,4,2]} scale={[6,2,1]} /><Lightformer intensity={1} position={[-4,0,2]} scale={[2,6,1]} /></Environment>
      <Skeleton />
      <OrbitControls autoRotate />
    </Canvas>
  )
}
