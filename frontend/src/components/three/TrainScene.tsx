'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { 
  Environment, 
  Float,
  MeshTransmissionMaterial,
  Text3D,
  Center,
  useMatcapTexture,
  PerspectiveCamera
} from '@react-three/drei'
import * as THREE from 'three'

// Modern Swiss train carriage
function TrainCarriage({ position = [0, 0, 0], isLocomotive = false }: { position?: number[], isLocomotive?: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const [matcap] = useMatcapTexture('C7C7D7_4C4E5A_818393_6C6C74', 256)
  
  const bodyColor = isLocomotive ? '#dc2626' : '#ffffff'
  const stripeColor = '#dc2626'
  
  return (
    <group ref={groupRef} position={position as [number, number, number]}>
      {/* Main body */}
      <mesh castShadow receiveShadow position={[0, 0.8, 0]}>
        <boxGeometry args={[isLocomotive ? 2.8 : 2.5, 0.9, 1.1]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </mesh>
      
      {/* Red stripe for white carriages */}
      {!isLocomotive && (
        <mesh position={[0, 0.95, 0.551]}>
          <boxGeometry args={[2.4, 0.15, 0.01]} />
          <meshStandardMaterial color={stripeColor} />
        </mesh>
      )}
      
      {/* Roof */}
      <mesh castShadow position={[0, 1.35, 0]}>
        <boxGeometry args={[isLocomotive ? 2.6 : 2.3, 0.15, 1.0]} />
        <meshStandardMaterial color="#e5e5e5" metalness={0.5} roughness={0.3} />
      </mesh>
      
      {/* Windows */}
      {!isLocomotive && [-0.8, -0.3, 0.2, 0.7].map((x, i) => (
        <mesh key={i} position={[x, 0.85, 0.56]}>
          <boxGeometry args={[0.35, 0.4, 0.02]} />
          <meshStandardMaterial color="#1a365d" metalness={0.8} roughness={0.1} />
        </mesh>
      ))}
      
      {/* Locomotive front window */}
      {isLocomotive && (
        <>
          <mesh position={[1.35, 0.9, 0]}>
            <boxGeometry args={[0.1, 0.5, 0.8]} />
            <meshStandardMaterial color="#1a365d" metalness={0.8} roughness={0.1} />
          </mesh>
          {/* Headlight */}
          <mesh position={[1.41, 0.7, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.5} />
          </mesh>
        </>
      )}
      
      {/* Undercarriage */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[isLocomotive ? 2.6 : 2.3, 0.2, 0.9]} />
        <meshStandardMaterial color="#404040" metalness={0.6} roughness={0.5} />
      </mesh>
      
      {/* Wheels */}
      {[-0.8, 0.8].map((x, i) => (
        <group key={i} position={[x, 0.15, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.45]}>
            <cylinderGeometry args={[0.18, 0.18, 0.08, 24]} />
            <meshMatcapMaterial matcap={matcap} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.45]}>
            <cylinderGeometry args={[0.18, 0.18, 0.08, 24]} />
            <meshMatcapMaterial matcap={matcap} />
          </mesh>
        </group>
      ))}
      
      {/* Connection points */}
      <mesh position={[isLocomotive ? -1.45 : -1.3, 0.4, 0]}>
        <boxGeometry args={[0.1, 0.15, 0.15]} />
        <meshStandardMaterial color="#404040" />
      </mesh>
      {!isLocomotive && (
        <mesh position={[1.3, 0.4, 0]}>
          <boxGeometry args={[0.1, 0.15, 0.15]} />
          <meshStandardMaterial color="#404040" />
        </mesh>
      )}
    </group>
  )
}

// Railway track
function RailwayTrack() {
  const trackLength = 30
  const sleeperCount = 60
  
  return (
    <group position={[0, 0, 0]}>
      {/* Rails */}
      <mesh position={[0, 0.05, 0.4]}>
        <boxGeometry args={[trackLength, 0.08, 0.06]} />
        <meshStandardMaterial color="#6b7280" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.05, -0.4]}>
        <boxGeometry args={[trackLength, 0.08, 0.06]} />
        <meshStandardMaterial color="#6b7280" metalness={0.9} roughness={0.3} />
      </mesh>
      
      {/* Sleepers */}
      {Array.from({ length: sleeperCount }).map((_, i) => (
        <mesh key={i} position={[-trackLength/2 + i * (trackLength/sleeperCount) + 0.25, 0.01, 0]}>
          <boxGeometry args={[0.15, 0.06, 1.2]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
      ))}
      
      {/* Ground/Ballast */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[trackLength, 0.1, 1.6]} />
        <meshStandardMaterial color="#78716c" roughness={0.9} />
      </mesh>
    </group>
  )
}

// Moving train with multiple carriages
function MovingTrain() {
  const trainRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (trainRef.current) {
      // Move train back and forth
      const time = state.clock.getElapsedTime()
      trainRef.current.position.x = Math.sin(time * 0.3) * 8
      
      // Slight vertical movement for realism
      trainRef.current.position.y = Math.sin(time * 2) * 0.01
    }
  })
  
  return (
    <group ref={trainRef}>
      <TrainCarriage position={[0, 0, 0]} isLocomotive={true} />
      <TrainCarriage position={[-3, 0, 0]} />
      <TrainCarriage position={[-5.7, 0, 0]} />
      <TrainCarriage position={[-8.4, 0, 0]} />
    </group>
  )
}

// Swiss mountains background
function SwissMountains() {
  const mountainsRef = useRef<THREE.Group>(null)
  
  const mountainData = useMemo(() => [
    { x: -15, z: -15, scale: 8, height: 6 },
    { x: -8, z: -18, scale: 10, height: 8 },
    { x: 0, z: -20, scale: 12, height: 10 },
    { x: 10, z: -17, scale: 9, height: 7 },
    { x: 18, z: -15, scale: 7, height: 5 },
  ], [])
  
  return (
    <group ref={mountainsRef}>
      {mountainData.map((m, i) => (
        <mesh key={i} position={[m.x, m.height / 2 - 1, m.z]}>
          <coneGeometry args={[m.scale, m.height, 4]} />
          <meshStandardMaterial 
            color={i === 2 ? '#f0f9ff' : '#94a3b8'} 
            flatShading 
          />
        </mesh>
      ))}
      
      {/* Snow caps */}
      {mountainData.map((m, i) => (
        <mesh key={`snow-${i}`} position={[m.x, m.height - 1.5, m.z]}>
          <coneGeometry args={[m.scale * 0.4, m.height * 0.3, 4]} />
          <meshStandardMaterial color="#ffffff" flatShading />
        </mesh>
      ))}
    </group>
  )
}

// Sun with glow effect
function Sun() {
  return (
    <group position={[10, 12, -10]}>
      <mesh>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      <pointLight intensity={2} color="#fef08a" distance={50} />
    </group>
  )
}

// Main Scene component
function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[8, 4, 10]} fov={45} />
      
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      
      {/* Environment */}
      <Environment preset="sunset" />
      <fog attach="fog" args={['#bae6fd', 20, 50]} />
      
      {/* Sky gradient */}
      <mesh position={[0, 15, -30]}>
        <planeGeometry args={[100, 50]} />
        <meshBasicMaterial color="#7dd3fc" />
      </mesh>
      
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#86efac" />
      </mesh>
      
      {/* Scene elements */}
      <SwissMountains />
      <Sun />
      <RailwayTrack />
      
      {/* Floating Train for visual interest */}
      <Float 
        speed={1.5}
        rotationIntensity={0.1}
        floatIntensity={0.3}
      >
        <MovingTrain />
      </Float>
    </>
  )
}

// Export the main component
export default function TrainScene() {
  return (
    <div className="w-full h-full min-h-[500px] lg:min-h-[600px] rounded-2xl overflow-hidden bg-gradient-to-b from-sky-200 to-sky-400">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ 
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true
        }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}

