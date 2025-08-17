'use client';

import { motion } from 'framer-motion';
import { useMemo, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Billboard,
  Environment,
  OrbitControls,
  Text,
  useGLTF,
} from '@react-three/drei';
import { Vector3 } from 'three';
import {
  ArrowLeft,
  Heart,
  Navigation,
  Shield,
  Zap,
  MapPin,
} from 'lucide-react';
import {
  PLANET_TO_NETWORK,
  NETWORKS,
  type NetworkKey,
} from '@/config/networks';
import { useStarship } from '@/hooks/useStarship';
import { useCurrentNetworkKey } from '@/hooks/useCurrentNetwork';
import { useStarHubContract } from '@/hooks/useStarHubContract';
import { useStarshipContract } from '@/hooks/useStarshipContract';
import { useAccount } from 'wagmi';
import { Address } from 'viem';

interface GalaxyProps {
  onBackToCockpit: () => void;
}

interface PlanetDescriptor {
  id: number;
  name: string;
  modelPath: string;
  position: [number, number, number];
  scale?: number;
  type: string;
  difficulty: string;
  resources: string[];
  distance: string;
  accent: string; // tailwind color for UI accents
}

type SelectedPositionRef = React.MutableRefObject<Vector3 | null>;

// Planet data for location tracking
const PLANETS = {
  'arbitrum-sepolia': { name: 'Vulcania', type: 'Mining' },
  'base-sepolia': { name: 'Amethea', type: 'Research' },
} as const;

function CameraRig({
  selected,
  selectedPositionRef,
}: {
  selected?: PlanetDescriptor | null;
  selectedPositionRef: SelectedPositionRef;
}) {
  const { camera } = useThree();
  const defaultPosition = useMemo(() => new Vector3(0, 2, 14), []);
  const targetPositionRef = useRef(new Vector3().copy(defaultPosition));

  useFrame(() => {
    const currentSelectedPos = selectedPositionRef.current;
    const desired = selected
      ? currentSelectedPos
        ? new Vector3(
            currentSelectedPos.x,
            currentSelectedPos.y + 0.6,
            currentSelectedPos.z + 3.6
          )
        : new Vector3(
            selected.position[0],
            selected.position[1] + 0.5,
            selected.position[2] + 3.5
          )
      : defaultPosition;

    const lerpFactor = selected ? 0.25 : 0.05;
    targetPositionRef.current.lerp(desired, lerpFactor);
    camera.position.copy(targetPositionRef.current);
    const lookAtTarget = selected
      ? currentSelectedPos
        ? currentSelectedPos
        : new Vector3(
            selected.position[0],
            selected.position[1],
            selected.position[2]
          )
      : new Vector3(0, 0, 0);
    camera.lookAt(lookAtTarget);
  });
  return null;
}

function Planet({
  data,
  isSelected,
  onSelect,
  onPositionFrame,
}: {
  data: PlanetDescriptor;
  isSelected: boolean;
  onSelect: (p: PlanetDescriptor) => void;
  onPositionFrame?: (pos: Vector3) => void;
}) {
  // orbitRef controls orbital translation around the scene center
  const orbitRef = useRef<any>(null);
  // spinRef rotates only the planet mesh so labels don't spin
  const spinRef = useRef<any>(null);
  // hover scaling is disabled for this use case
  const { scene } = useGLTF(data.modelPath);
  const angleRef = useRef<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const currentScaleRef = useRef(1);

  useFrame((_, delta) => {
    if (!orbitRef.current) return;
    if (spinRef.current) {
      spinRef.current.rotation.y += 0.2 * delta;

      // Animate scale on hover
      const targetScale = isHovered ? 1.1 : 1;
      const scaleDiff = targetScale - currentScaleRef.current;
      currentScaleRef.current += scaleDiff * delta * 8; // Smooth transition
      spinRef.current.scale.setScalar(currentScaleRef.current);
    }
    // Optional orbit around a central point
    const orbit: any = (data as any).orbit;
    if (orbit) {
      angleRef.current += (orbit.speed ?? 0.4) * delta;
      const radius = orbit.radius ?? 4;
      const height = orbit.height ?? 0;
      const phase = orbit.phase ?? 0;
      const center = orbit.center ?? [0, 0, 0];
      const x = center[0] + Math.cos(angleRef.current + phase) * radius;
      const z = center[2] + Math.sin(angleRef.current + phase) * radius;
      const y = center[1] + height;
      orbitRef.current.position.set(x, y, z);
    }
    if (isSelected && onPositionFrame) {
      onPositionFrame(orbitRef.current.position);
    }
  });

  return (
    <group
      ref={orbitRef}
      position={data.position}
      scale={data.scale ?? 1}
      onClick={e => {
        e.stopPropagation();
        onSelect(data);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
        setIsHovered(true);
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
        setIsHovered(false);
      }}
    >
      <group ref={spinRef}>
        <primitive object={scene} />
      </group>
      <Billboard position={[0, 1.3, 0]} follow={false}>
        <Text
          fontSize={0.26}
          color={isSelected ? '#e6ffff' : '#ffffff'}
          outlineWidth={0.015}
          outlineColor={isSelected ? '#22d3ee' : 'rgba(0,0,0,0.9)'}
          anchorX='center'
          anchorY='middle'
          renderOrder={999}
          frustumCulled={false}
          material-depthTest={false}
          material-toneMapped={false}
        >
          {data.name}
        </Text>
      </Billboard>
    </group>
  );
}

export default function Galaxy({ onBackToCockpit }: GalaxyProps) {
  const currentNetwork = useCurrentNetworkKey('base-sepolia');
  const { state, travel, refresh } = useStarship(currentNetwork);
  const { state: starHubState } = useStarHubContract();
  const { address } = useAccount();
  const contract = useStarshipContract(currentNetwork);
  const planets: PlanetDescriptor[] = [
    {
      id: 1,
      name: 'Vulcania',
      modelPath: '/lava_planet.glb',
      position: [-3.5, 0, 0],
      // @ts-expect-error - orbit is an internal runtime field
      orbit: { radius: 1, speed: 0.25, height: -0.6, phase: 0 },
      scale: 0.8,
      type: 'Mining',
      difficulty: 'Medium',
      resources: ['Basalt Crystals', 'Magma Cores'],
      distance: '2.3 LY',
      accent: 'from-orange-500 to-red-600',
    },
    {
      id: 2,
      name: 'Amethea',
      modelPath: '/purple_planet.glb',
      position: [3.5, 0.3, -1.2],
      // @ts-expect-error - orbit is an internal runtime field
      orbit: { radius: 4, speed: 0.12, height: 1.5, phase: 1.57 },
      scale: 0.9,
      type: 'Research',
      difficulty: 'Hard',
      resources: ['Void Dust', 'Prismatic Shards'],
      distance: '4.7 LY',
      accent: 'from-fuchsia-500 to-violet-600',
    },
  ];

  const [selected, setSelected] = useState<PlanetDescriptor | null>(null);
  const selectedPositionRef = useRef<Vector3 | null>(null);

  // Determine current ship location
  const currentLocation = useMemo(() => {
    if (!state.hasShip || !state.tokenId) return null;

    // Find which network has the ship
    for (const [network, balanceInfo] of Object.entries(state.balances)) {
      if (balanceInfo.tokenIds.includes(state.tokenId!)) {
        return PLANETS[network as NetworkKey];
      }
    }
    return null;
  }, [state.hasShip, state.tokenId, state.balances]);

  // Check if ship is at the selected planet
  const isShipAtSelectedPlanet = useMemo(() => {
    if (!selected || !currentLocation) return false;
    return selected.name === currentLocation.name;
  }, [selected, currentLocation]);

  // Check if travel is possible (ship must be at selected planet to initiate travel)
  const canTravelFromSelectedPlanet = useMemo(() => {
    if (!selected || !currentLocation) return false;
    return selected.name === currentLocation.name;
  }, [selected, currentLocation]);

  return (
    <div className='relative min-h-screen w-full overflow-hidden'>
      {/* Galaxy background (temporary fixed-resolution image) */}
      <div className='absolute inset-0 overflow-hidden'>
        <img
          src='/galaxy.png'
          alt='Galaxy'
          className='w-full h-full object-cover select-none pointer-events-none'
        />
      </div>

      {/* 3D Scene */}
      <div className='absolute inset-0'>
        <Canvas
          camera={{ position: [0, 2, 14], fov: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          onPointerMissed={() => {
            // When clicking on empty space, deselect the current planet
            setSelected(null);
          }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[6, 8, 5]}
            intensity={1.2}
            color={'#ffffff'}
          />
          <pointLight
            position={[-8, -2, -6]}
            intensity={0.5}
            color={'#7dd3fc'}
          />

          <Suspense fallback={null}>
            {planets.map(p => (
              <Planet
                key={p.id}
                data={p}
                isSelected={selected?.id === p.id}
                onSelect={setSelected}
                onPositionFrame={pos => {
                  if (selected?.id === p.id) {
                    if (!selectedPositionRef.current) {
                      selectedPositionRef.current = new Vector3();
                    }
                    selectedPositionRef.current.copy(pos);
                  }
                }}
              />
            ))}
            <Environment preset='night' />
          </Suspense>

          <CameraRig
            selected={selected}
            selectedPositionRef={selectedPositionRef}
          />
          <OrbitControls
            enablePan={false}
            enableRotate={!selected}
            enableZoom={false}
          />
        </Canvas>
      </div>

      {/* Top Bar */}
      <div className='relative z-10 p-6 flex items-center justify-between'>
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='flex items-center gap-4'
        >
          <motion.button
            className='bg-black/40 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 hover:bg-black/60 transition-all duration-300'
            onClick={onBackToCockpit}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className='w-6 h-6 text-cyan-300' />
          </motion.button>
          <div>
            <h1 className='text-3xl md:text-4xl font-bold text-white'>
              Galaxy Explorer
            </h1>
            <p className='text-cyan-200'>
              Pick a world, zoom in, and begin mining
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className='bg-black/40 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 text-sm flex gap-4'
        >
          <div className='flex items-center gap-1'>
            <Zap className='w-4 h-4 text-yellow-400' />
            <span className='text-white'>
              ATK:{' '}
              {starHubState.isLoading
                ? '...'
                : starHubState.shipSpecs
                  ? Number(starHubState.shipSpecs.attack)
                  : '10'}
            </span>
          </div>
          <div className='flex items-center gap-1'>
            <Shield className='w-4 h-4 text-blue-400' />
            <span className='text-white'>
              DEF:{' '}
              {starHubState.isLoading
                ? '...'
                : starHubState.shipSpecs
                  ? Number(starHubState.shipSpecs.defense)
                  : '10'}
            </span>
          </div>
          <div className='flex items-center gap-1'>
            <Heart className='w-4 h-4 text-red-400' />
            <span className='text-white'>
              {starHubState.isLoading
                ? '...'
                : starHubState.shipSpecs
                  ? Number(starHubState.shipSpecs.health)
                  : '100'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Selected planet info panel */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className='absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[92%] md:w-[600px] bg-black/55 backdrop-blur-md border border-white/15 rounded-xl p-5'
        >
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h3 className='text-2xl font-bold text-white mb-1'>
                {selected.name}
              </h3>
              <p className='text-cyan-200 mb-3'>
                {selected.type} • {selected.difficulty} • {selected.distance}
              </p>
              <div className='mb-3'>
                <h4 className='text-sm font-semibold text-cyan-300 mb-1'>
                  Resources
                </h4>
                <div className='flex flex-wrap gap-2'>
                  {selected.resources.map(r => (
                    <span
                      key={r}
                      className='text-xs px-2 py-1 rounded-md bg-white/10 text-gray-100 border border-white/10'
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              {/* Ship location indicator */}
              {currentLocation && (
                <div className='mb-3'>
                  <h4 className='text-sm font-semibold text-cyan-300 mb-1 flex items-center'>
                    <MapPin className='w-4 h-4 mr-1' />
                    Ship Location
                  </h4>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs px-2 py-1 rounded-md bg-white/10 text-gray-100 border border-white/10'>
                      {currentLocation.name}
                    </span>
                    {isShipAtSelectedPlanet ? (
                      <span className='text-xs px-2 py-1 rounded-md bg-green-500/20 text-green-300 border border-green-500/30'>
                        Ship is here
                      </span>
                    ) : (
                      <span className='text-xs px-2 py-1 rounded-md bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'>
                        Ship is elsewhere
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              className='shrink-0 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm'
            >
              Back to Galaxy
            </button>
          </div>

          {/* Action buttons */}
          <div className='mt-4 space-y-3'>
            {/* Mint Button - Show when user has no tokens */}
            {!state.hasShip && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className='w-full py-2.5 px-4 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90'
                onClick={async () => {
                  if (!address) return;
                  try {
                    console.log('Minting token for address:', address);
                    const tx = await contract.mint(address as Address, 1n);
                    console.log('Mint transaction:', tx);
                    // Refresh the state after minting
                    await refresh();
                  } catch (e: any) {
                    console.error('Mint error:', e);
                  }
                }}
              >
                🚀 Mint Starship NFT
              </motion.button>
            )}

            {/* Travel Button - Cross-chain travel with composer */}
            <motion.button
              whileHover={canTravelFromSelectedPlanet ? { scale: 1.02 } : {}}
              whileTap={canTravelFromSelectedPlanet ? { scale: 0.98 } : {}}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold ${
                canTravelFromSelectedPlanet
                  ? `bg-gradient-to-r ${selected.accent} text-white hover:opacity-90`
                  : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
              }`}
              onClick={async () => {
                if (!state.tokenId || !canTravelFromSelectedPlanet) return;
                const destination =
                  PLANET_TO_NETWORK[selected.name] ?? 'base-sepolia';
                const dst = NETWORKS[destination];
                try {
                  // Use player ID 1 for travel (you can make this configurable)
                  await travel({
                    destination,
                    tokenId: state.tokenId,
                    playerId: 1,
                  });
                } catch (e: any) {
                  console.error('Travel error:', e);
                }
              }}
              disabled={!canTravelFromSelectedPlanet}
            >
              {canTravelFromSelectedPlanet
                ? 'Travel to Battle'
                : 'Ship not at this planet'}
            </motion.button>

            {/* Battle Button - Same chain battle */}
            <motion.button
              whileHover={isShipAtSelectedPlanet ? { scale: 1.02 } : {}}
              whileTap={isShipAtSelectedPlanet ? { scale: 0.98 } : {}}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold ${
                isShipAtSelectedPlanet
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:opacity-90'
                  : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
              }`}
              onClick={async () => {
                if (!state.tokenId || !isShipAtSelectedPlanet) return;
                const currentNetworkConfig = NETWORKS[currentNetwork];
                try {
                  // Use player ID 2 for battle (you can make this configurable)
                  await travel({
                    destination: currentNetwork,
                    tokenId: state.tokenId,
                    playerId: 2,
                  });
                } catch (e: any) {
                  console.error('Battle error:', e);
                }
              }}
              disabled={!isShipAtSelectedPlanet}
            >
              {isShipAtSelectedPlanet
                ? 'Battle Here'
                : 'Ship must be at this planet'}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Navigation tips */}
      {!selected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className='absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[92%] md:w-[700px] bg-black/35 backdrop-blur-md border border-cyan-500/30 rounded-xl p-6 text-sm text-gray-200'
        >
          <h3 className='text-lg font-bold text-cyan-300 mb-2 flex items-center'>
            <Navigation className='mr-2' /> Navigation Tips
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div>
              <div className='font-semibold text-cyan-200 mb-1'>
                Mining Worlds
              </div>
              <p>Harvest rare minerals to upgrade your starship systems.</p>
            </div>
            <div>
              <div className='font-semibold text-cyan-200 mb-1'>
                Research Hubs
              </div>
              <p>Discover blueprints and craft advanced modules.</p>
            </div>
            <div>
              <div className='font-semibold text-cyan-200 mb-1'>Navigation</div>
              <p>Select a planet to zoom in and reveal actions.</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Preload planet models for faster interaction
useGLTF.preload('/lava_planet.glb');
useGLTF.preload('/purple_planet.glb');
