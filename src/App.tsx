import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Sky, Float, Html, ContactShadows } from '@react-three/drei'
import { Suspense, useState, useCallback, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

// Flower types with their colors and shapes
const FLOWER_TYPES = [
  { name: 'Rose', petalColor: '#ff6b8a', centerColor: '#ffd700', petalCount: 8, petalShape: 'round' },
  { name: 'Tulip', petalColor: '#ff4757', centerColor: '#ffa502', petalCount: 6, petalShape: 'pointed' },
  { name: 'Daisy', petalColor: '#ffffff', centerColor: '#f1c40f', petalCount: 12, petalShape: 'thin' },
  { name: 'Lavender', petalColor: '#9b59b6', centerColor: '#8e44ad', petalCount: 5, petalShape: 'tiny' },
  { name: 'Sunflower', petalColor: '#f39c12', centerColor: '#8b4513', petalCount: 16, petalShape: 'thin' },
  { name: 'Bluebell', petalColor: '#5dade2', centerColor: '#2980b9', petalCount: 5, petalShape: 'bell' },
]

interface PlantedFlower {
  id: number
  x: number
  z: number
  type: typeof FLOWER_TYPES[number]
  plantedAt: number
  growthStage: number
  watered: boolean
}

// Individual petal component
function Petal({
  rotation,
  petalColor,
  petalShape,
  scale
}: {
  rotation: number
  petalColor: string
  petalShape: string
  scale: number
}) {
  const petalRef = useRef<THREE.Mesh>(null!)

  const getGeometry = () => {
    switch (petalShape) {
      case 'round':
        return <sphereGeometry args={[0.08 * scale, 8, 8]} />
      case 'pointed':
        return <coneGeometry args={[0.05 * scale, 0.15 * scale, 4]} />
      case 'thin':
        return <boxGeometry args={[0.02 * scale, 0.12 * scale, 0.005 * scale]} />
      case 'tiny':
        return <sphereGeometry args={[0.03 * scale, 6, 6]} />
      case 'bell':
        return <cylinderGeometry args={[0.02 * scale, 0.05 * scale, 0.1 * scale, 6]} />
      default:
        return <sphereGeometry args={[0.06 * scale, 8, 8]} />
    }
  }

  return (
    <mesh
      ref={petalRef}
      position={[
        Math.cos(rotation) * 0.08 * scale,
        0.02,
        Math.sin(rotation) * 0.08 * scale
      ]}
      rotation={[0.3, rotation, 0]}
    >
      {getGeometry()}
      <meshStandardMaterial color={petalColor} roughness={0.6} />
    </mesh>
  )
}

// Flower component
function Flower({
  position,
  flowerType,
  growthStage,
  watered,
  onClick
}: {
  position: [number, number, number]
  flowerType: typeof FLOWER_TYPES[number]
  growthStage: number
  watered: boolean
  onClick?: () => void
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)

  // Gentle swaying animation
  useFrame((state) => {
    if (groupRef.current && growthStage > 0.3) {
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.5 + position[0]) * 0.05
      groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 1.2 + position[2]) * 0.03
    }
  })

  const stemHeight = 0.3 * growthStage
  const flowerScale = Math.max(0, (growthStage - 0.5) * 2)

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Soil mound */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial color={watered ? "#5d4037" : "#8b7355"} />
      </mesh>

      {/* Stem */}
      {growthStage > 0.1 && (
        <mesh position={[0, stemHeight / 2, 0]}>
          <cylinderGeometry args={[0.01, 0.015, stemHeight, 8]} />
          <meshStandardMaterial color="#228b22" />
        </mesh>
      )}

      {/* Leaves */}
      {growthStage > 0.3 && (
        <>
          <mesh position={[0.03, stemHeight * 0.3, 0]} rotation={[0, 0, 0.5]}>
            <sphereGeometry args={[0.04 * growthStage, 6, 4]} />
            <meshStandardMaterial color="#32cd32" />
          </mesh>
          <mesh position={[-0.03, stemHeight * 0.5, 0]} rotation={[0, 0, -0.5]}>
            <sphereGeometry args={[0.035 * growthStage, 6, 4]} />
            <meshStandardMaterial color="#32cd32" />
          </mesh>
        </>
      )}

      {/* Flower head */}
      {flowerScale > 0 && (
        <group position={[0, stemHeight + 0.02, 0]}>
          {/* Center */}
          <mesh>
            <sphereGeometry args={[0.04 * flowerScale, 12, 12]} />
            <meshStandardMaterial
              color={flowerType.centerColor}
              emissive={hovered ? flowerType.centerColor : '#000000'}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </mesh>

          {/* Petals */}
          {Array.from({ length: flowerType.petalCount }).map((_, i) => (
            <Petal
              key={i}
              rotation={(i / flowerType.petalCount) * Math.PI * 2}
              petalColor={flowerType.petalColor}
              petalShape={flowerType.petalShape}
              scale={flowerScale}
            />
          ))}
        </group>
      )}

      {/* Water droplet indicator */}
      {watered && growthStage < 1 && (
        <Float speed={3} floatIntensity={0.3}>
          <mesh position={[0.08, stemHeight + 0.1, 0]}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshStandardMaterial color="#87ceeb" transparent opacity={0.8} />
          </mesh>
        </Float>
      )}
    </group>
  )
}

// Garden plot grid
function GardenPlot({
  position,
  onPlant,
  isSelected,
  hasFlower
}: {
  position: [number, number, number]
  onPlant: () => void
  isSelected: boolean
  hasFlower: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={!hasFlower ? onPlant : undefined}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <planeGeometry args={[0.4, 0.4]} />
      <meshStandardMaterial
        color={hovered && !hasFlower ? "#8fbc8f" : isSelected ? "#90ee90" : "#654321"}
        roughness={0.9}
        transparent
        opacity={hasFlower ? 0 : 0.8}
      />
    </mesh>
  )
}

// Watering can
function WateringCan({
  position,
  isActive,
  onClick
}: {
  position: [number, number, number]
  isActive: boolean
  onClick: () => void
}) {
  const canRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (canRef.current) {
      canRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
      canRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.02
    }
  })

  return (
    <Float speed={2} floatIntensity={0.2}>
      <group ref={canRef} position={position} onClick={onClick}>
        {/* Main body */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.2, 12]} />
          <meshStandardMaterial
            color={isActive ? "#4ecdc4" : "#e74c3c"}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>

        {/* Spout */}
        <mesh position={[0.15, 0.05, 0]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.02, 0.015, 0.15, 8]} />
          <meshStandardMaterial color={isActive ? "#4ecdc4" : "#e74c3c"} metalness={0.6} />
        </mesh>

        {/* Handle */}
        <mesh position={[-0.08, 0.12, 0]} rotation={[0, 0, 0.3]}>
          <torusGeometry args={[0.06, 0.015, 8, 16, Math.PI]} />
          <meshStandardMaterial color={isActive ? "#4ecdc4" : "#e74c3c"} metalness={0.6} />
        </mesh>

        {/* Label */}
        <Html position={[0, 0.2, 0]} center>
          <div className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded whitespace-nowrap pointer-events-none select-none">
            {isActive ? "Watering Mode" : "Click to Water"}
          </div>
        </Html>
      </group>
    </Float>
  )
}

// Seed packet
function SeedPacket({
  position,
  flowerType,
  isSelected,
  onClick
}: {
  position: [number, number, number]
  flowerType: typeof FLOWER_TYPES[number]
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <Float speed={3} floatIntensity={isSelected ? 0.4 : 0.1}>
      <group position={position} onClick={onClick}>
        <mesh>
          <boxGeometry args={[0.12, 0.18, 0.02]} />
          <meshStandardMaterial
            color={isSelected ? flowerType.petalColor : "#f5f5dc"}
            roughness={0.8}
          />
        </mesh>

        {/* Flower preview on packet */}
        <mesh position={[0, 0.02, 0.015]}>
          <circleGeometry args={[0.03, 8]} />
          <meshStandardMaterial color={flowerType.petalColor} />
        </mesh>

        <Html position={[0, -0.06, 0.02]} center>
          <div className="text-[8px] font-bold text-neutral-700 whitespace-nowrap pointer-events-none select-none">
            {flowerType.name}
          </div>
        </Html>
      </group>
    </Float>
  )
}

// Decorative butterfly
function Butterfly({ startPosition }: { startPosition: [number, number, number] }) {
  const butterflyRef = useRef<THREE.Group>(null!)
  const wingRef1 = useRef<THREE.Mesh>(null!)
  const wingRef2 = useRef<THREE.Mesh>(null!)

  const color = ['#ff6b8a', '#9b59b6', '#f39c12', '#5dade2'][Math.floor(Math.random() * 4)]
  const speed = 0.5 + Math.random() * 0.5
  const radius = 1 + Math.random() * 2

  useFrame((state) => {
    if (butterflyRef.current) {
      const t = state.clock.elapsedTime * speed
      butterflyRef.current.position.x = startPosition[0] + Math.sin(t) * radius
      butterflyRef.current.position.z = startPosition[2] + Math.cos(t) * radius
      butterflyRef.current.position.y = startPosition[1] + Math.sin(t * 2) * 0.3
      butterflyRef.current.rotation.y = t + Math.PI / 2
    }
    if (wingRef1.current && wingRef2.current) {
      const wingFlap = Math.sin(state.clock.elapsedTime * 15) * 0.5
      wingRef1.current.rotation.y = wingFlap
      wingRef2.current.rotation.y = -wingFlap
    }
  })

  return (
    <group ref={butterflyRef} position={startPosition}>
      {/* Body */}
      <mesh>
        <capsuleGeometry args={[0.01, 0.04, 4, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Wings */}
      <mesh ref={wingRef1} position={[0.02, 0, 0]}>
        <circleGeometry args={[0.04, 8]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
      <mesh ref={wingRef2} position={[-0.02, 0, 0]}>
        <circleGeometry args={[0.04, 8]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

// Ground
function Ground() {
  return (
    <>
      {/* Main grass ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[8, 64]} />
        <meshStandardMaterial color="#7cb342" roughness={1} />
      </mesh>

      {/* Garden bed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#5d4037" roughness={0.95} />
      </mesh>

      {/* Decorative fence posts */}
      {[-1.6, -0.8, 0, 0.8, 1.6].map((x, i) => (
        <mesh key={`fence-front-${i}`} position={[x, 0.1, 1.6]}>
          <boxGeometry args={[0.05, 0.25, 0.05]} />
          <meshStandardMaterial color="#8b4513" roughness={0.9} />
        </mesh>
      ))}
      {[-1.6, -0.8, 0, 0.8, 1.6].map((x, i) => (
        <mesh key={`fence-back-${i}`} position={[x, 0.1, -1.6]}>
          <boxGeometry args={[0.05, 0.25, 0.05]} />
          <meshStandardMaterial color="#8b4513" roughness={0.9} />
        </mesh>
      ))}

      {/* Fence rails */}
      <mesh position={[0, 0.15, 1.6]}>
        <boxGeometry args={[3.3, 0.03, 0.03]} />
        <meshStandardMaterial color="#a0522d" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.15, -1.6]}>
        <boxGeometry args={[3.3, 0.03, 0.03]} />
        <meshStandardMaterial color="#a0522d" roughness={0.9} />
      </mesh>
    </>
  )
}

// Main scene
function Scene({
  flowers,
  selectedSeed,
  wateringMode,
  onPlant,
  onWater
}: {
  flowers: PlantedFlower[]
  selectedSeed: number | null
  wateringMode: boolean
  onPlant: (x: number, z: number) => void
  onWater: (id: number) => void
}) {
  const GRID_SIZE = 5
  const CELL_SIZE = 0.5
  const OFFSET = (GRID_SIZE - 1) * CELL_SIZE / 2

  return (
    <>
      <Sky sunPosition={[100, 50, 100]} turbidity={0.3} rayleigh={0.5} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <pointLight position={[-3, 3, -3]} intensity={0.3} color="#ffefd5" />

      <Ground />

      {/* Garden grid */}
      {Array.from({ length: GRID_SIZE }).map((_, row) =>
        Array.from({ length: GRID_SIZE }).map((_, col) => {
          const x = col * CELL_SIZE - OFFSET
          const z = row * CELL_SIZE - OFFSET
          const flowerHere = flowers.find(f => f.x === x && f.z === z)

          return (
            <group key={`cell-${row}-${col}`}>
              <GardenPlot
                position={[x, 0.001, z]}
                onPlant={() => onPlant(x, z)}
                isSelected={selectedSeed !== null && !flowerHere}
                hasFlower={!!flowerHere}
              />
              {flowerHere && (
                <Flower
                  position={[x, 0, z]}
                  flowerType={flowerHere.type}
                  growthStage={flowerHere.growthStage}
                  watered={flowerHere.watered}
                  onClick={wateringMode ? () => onWater(flowerHere.id) : undefined}
                />
              )}
            </group>
          )
        })
      )}

      {/* Butterflies */}
      <Butterfly startPosition={[2, 0.8, 1]} />
      <Butterfly startPosition={[-1.5, 0.6, -1]} />
      <Butterfly startPosition={[0.5, 1, 2]} />

      <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={10} blur={2} />
      <Environment preset="park" />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={8}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0.3, 0]}
      />
    </>
  )
}

export default function App() {
  const [flowers, setFlowers] = useState<PlantedFlower[]>([])
  const [selectedSeed, setSelectedSeed] = useState<number | null>(null)
  const [wateringMode, setWateringMode] = useState(false)
  const [coins, setCoins] = useState(100)
  const nextId = useRef(1)

  const handlePlant = useCallback((x: number, z: number) => {
    if (selectedSeed === null || coins < 10) return

    const type = FLOWER_TYPES[selectedSeed]
    setFlowers(prev => [...prev, {
      id: nextId.current++,
      x,
      z,
      type,
      plantedAt: Date.now(),
      growthStage: 0,
      watered: false
    }])
    setCoins(prev => prev - 10)
    setSelectedSeed(null)
  }, [selectedSeed, coins])

  const handleWater = useCallback((id: number) => {
    if (!wateringMode) return
    setFlowers(prev => prev.map(f =>
      f.id === id ? { ...f, watered: true } : f
    ))
  }, [wateringMode])

  const handleHarvest = useCallback((id: number) => {
    const flower = flowers.find(f => f.id === id)
    if (flower && flower.growthStage >= 1) {
      setFlowers(prev => prev.filter(f => f.id !== id))
      setCoins(prev => prev + 25)
    }
  }, [flowers])

  // Growth simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setFlowers(prev => prev.map(f => ({
        ...f,
        growthStage: Math.min(1, f.growthStage + (f.watered ? 0.02 : 0.005))
      })))
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const grownFlowers = flowers.filter(f => f.growthStage >= 1)

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50 overflow-hidden relative">
      {/* Title */}
      <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <h1 className="text-3xl md:text-5xl font-black text-amber-800 drop-shadow-lg tracking-tight"
            style={{ fontFamily: "'Fredoka', sans-serif", textShadow: '2px 2px 0 #fef3c7' }}>
          🌸 Bloom Garden 🌻
        </h1>
        <p className="text-center text-amber-700/80 text-sm md:text-base mt-1"
           style={{ fontFamily: "'Quicksand', sans-serif" }}>
          Plant seeds, water flowers, harvest joy
        </p>
      </div>

      {/* Coins display */}
      <div className="absolute top-4 right-4 z-20 bg-amber-100/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border-2 border-amber-300">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪙</span>
          <span className="text-xl font-bold text-amber-800" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            {coins}
          </span>
        </div>
      </div>

      {/* Seed selection panel */}
      <div className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20
                      bg-white/80 backdrop-blur-md rounded-3xl p-2 md:p-3 shadow-xl border-2 border-amber-200
                      flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        <div className="text-xs md:text-sm font-bold text-amber-700 text-center pb-1 border-b border-amber-200"
             style={{ fontFamily: "'Fredoka', sans-serif" }}>
          Seeds (10🪙)
        </div>
        {FLOWER_TYPES.map((type, i) => (
          <button
            key={type.name}
            onClick={() => setSelectedSeed(selectedSeed === i ? null : i)}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all
                       ${selectedSeed === i
                         ? 'bg-amber-300 scale-110 shadow-lg ring-2 ring-amber-500'
                         : 'bg-amber-50 hover:bg-amber-100 hover:scale-105'}`}
          >
            <div
              className="w-5 h-5 md:w-6 md:h-6 rounded-full"
              style={{ backgroundColor: type.petalColor }}
            />
            <span className="text-[8px] md:text-[10px] text-amber-700 font-medium truncate w-full px-1 text-center"
                  style={{ fontFamily: "'Quicksand', sans-serif" }}>
              {type.name}
            </span>
          </button>
        ))}
      </div>

      {/* Tools panel */}
      <div className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20
                      bg-white/80 backdrop-blur-md rounded-3xl p-2 md:p-3 shadow-xl border-2 border-sky-200
                      flex flex-col gap-3">
        <div className="text-xs md:text-sm font-bold text-sky-700 text-center pb-1 border-b border-sky-200"
             style={{ fontFamily: "'Fredoka', sans-serif" }}>
          Tools
        </div>

        <button
          onClick={() => { setWateringMode(!wateringMode); setSelectedSeed(null); }}
          className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all
                     ${wateringMode
                       ? 'bg-sky-300 scale-110 shadow-lg ring-2 ring-sky-500'
                       : 'bg-sky-50 hover:bg-sky-100 hover:scale-105'}`}
        >
          <span className="text-xl md:text-2xl">💧</span>
          <span className="text-[8px] md:text-[10px] text-sky-700 font-medium"
                style={{ fontFamily: "'Quicksand', sans-serif" }}>
            Water
          </span>
        </button>

        <button
          onClick={() => grownFlowers.forEach(f => handleHarvest(f.id))}
          disabled={grownFlowers.length === 0}
          className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all
                     ${grownFlowers.length > 0
                       ? 'bg-green-100 hover:bg-green-200 hover:scale-105'
                       : 'bg-gray-100 opacity-50 cursor-not-allowed'}`}
        >
          <span className="text-xl md:text-2xl">🌾</span>
          <span className="text-[8px] md:text-[10px] text-green-700 font-medium"
                style={{ fontFamily: "'Quicksand', sans-serif" }}>
            Harvest
          </span>
          {grownFlowers.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {grownFlowers.length}
            </span>
          )}
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 z-20
                      bg-white/70 backdrop-blur-sm rounded-2xl px-3 md:px-4 py-2 shadow-lg max-w-xs md:max-w-md text-center">
        <p className="text-xs md:text-sm text-amber-800" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          {selectedSeed !== null
            ? `Click an empty plot to plant ${FLOWER_TYPES[selectedSeed].name}`
            : wateringMode
              ? "Click flowers to water them 💧"
              : "Select a seed to plant or water your flowers!"}
        </p>
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [3, 4, 5], fov: 45 }}
        className="touch-none"
      >
        <Suspense fallback={null}>
          <Scene
            flowers={flowers}
            selectedSeed={selectedSeed}
            wateringMode={wateringMode}
            onPlant={handlePlant}
            onWater={handleWater}
          />
        </Suspense>
      </Canvas>

      {/* Footer */}
      <footer className="absolute bottom-2 md:bottom-3 left-1/2 -translate-x-1/2 z-20">
        <p className="text-[10px] md:text-xs text-amber-700/60" style={{ fontFamily: "'Quicksand', sans-serif" }}>
          Requested by <a href="https://twitter.com/BitG_MEME" className="hover:text-amber-800 underline decoration-dotted">@BitG_MEME</a> · Built by <a href="https://twitter.com/clonkbot" className="hover:text-amber-800 underline decoration-dotted">@clonkbot</a>
        </p>
      </footer>
    </div>
  )
}
