import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Group } from 'three';
import { CameraMarker } from './CameraMarker';
import type { StationModelProps } from './types';

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

// --- Tech Wireframe Style ---

const CityContext: React.FC = () => {
  const buildings = useMemo(() => {
    const items = [];
    for(let x = -5; x <= 5; x++) {
      for(let z = -5; z <= 5; z++) {
        if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;
        if (Math.random() > 0.7) continue;
        const height = Math.random() * 20 + 5;
        items.push({ position: [x * 10, height/2, z * 10], size: [6, height, 6] });
      }
    }
    return items;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={b.position as any}>
            <boxGeometry args={b.size as any} />
            <meshBasicMaterial color="#004466" wireframe transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  );
};

const Train: React.FC<{ direction: 1 | -1; position: [number, number, number]; color: string }> = ({ direction, position, color }) => {
  const trainRef = useRef<Group>(null);
  useFrame((state, delta) => {
    if (trainRef.current) {
      const speed = 15 * direction; 
      trainRef.current.position.x += speed * delta;
      if (direction === 1 && trainRef.current.position.x > 60) trainRef.current.position.x = -60;
      else if (direction === -1 && trainRef.current.position.x < -60) trainRef.current.position.x = 60;
    }
  });
  return (
    <group ref={trainRef} position={position}>
       {[0,1,2,3,4].map(i => (
         <mesh key={i} position={[i * -4.5 * direction, 1, 0]}>
           <boxGeometry args={[4.2, 2, 1.6]} />
           <meshBasicMaterial color={color} wireframe />
         </mesh>
       ))}
    </group>
  )
}

export const StationModel: React.FC<StationModelProps> = ({ exploded, activeFloor, cameras, onCameraClick }) => {
  // --- GLB Loading Logic (Uncomment when file is ready) ---
  /*
  const { scene } = useGLTF('/models/station.glb');
  // If using GLB, you might simply return:
  // return <primitive object={scene} ... />
  */

  const groundRef = useRef<Group>(null);
  const b1GroupRef = useRef<Group>(null);
  const b2GroupRef = useRef<Group>(null);
  const [hoveredFloor, setHoveredFloor] = useState<'Ground' | 'B1' | 'B2' | null>(null);
  
  useFrame((state, delta) => {
    const speed = delta * 3;
    if (groundRef.current) groundRef.current.position.y = lerp(groundRef.current.position.y, exploded ? 20 : 8, speed);
    if (b1GroupRef.current) b1GroupRef.current.position.y = lerp(b1GroupRef.current.position.y, exploded ? 6 : 0, speed);
    if (b2GroupRef.current) b2GroupRef.current.position.y = lerp(b2GroupRef.current.position.y, -8, speed);
  });

  const getLayerStyle = (floor: 'Ground' | 'B1' | 'B2') => {
    if (activeFloor !== 'All' && activeFloor !== floor) return { opacity: 0, visible: false };
    
    // Hover effect
    let opacity = 0.8;
    if (activeFloor === 'All' && exploded && hoveredFloor && hoveredFloor !== floor) {
        opacity = 0.1;
    }
    
    return { opacity, visible: true };
  };

  const handlePointerOver = (e: any, floor: 'Ground' | 'B1' | 'B2') => {
    e.stopPropagation();
    if (exploded) setHoveredFloor(floor);
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHoveredFloor(null);
  };

  const groundStyle = getLayerStyle('Ground');
  const b1Style = getLayerStyle('B1');
  const b2Style = getLayerStyle('B2');

  // Common material for consistency
  const wireframeMat = <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.3} />;
  const floorMat = <meshBasicMaterial color="#001122" transparent opacity={0.8} />;

  return (
    <group onPointerMissed={() => setHoveredFloor(null)}>
      
      {(activeFloor === 'All' || activeFloor === 'Ground') && (
         <group position={[0, 5, 0]}>
           <CityContext />
         </group>
      )}

      {/* === Ground Level === */}
      <group 
        ref={groundRef} 
        position={[0, 8, 0]}
        visible={groundStyle.visible}
        onPointerOver={(e) => handlePointerOver(e, 'Ground')}
        onPointerOut={handlePointerOut}
      >
         <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <planeGeometry args={[80, 80, 20, 20]} />
            <meshBasicMaterial color="#1a1a1a" wireframe transparent opacity={0.1} />
         </mesh>
         
         {/* Entrance A */}
         <mesh position={[-12, 2, 8]}>
            <boxGeometry args={[5, 4, 8]} />
            <meshBasicMaterial color="#00ffff" wireframe />
         </mesh>

         {cameras.filter(c => c.floor === 'Ground').map(cam => (
          <CameraMarker key={cam.id} data={cam} onClick={onCameraClick} />
        ))}
      </group>

      {/* === B1 Concourse === */}
      <group 
        ref={b1GroupRef} 
        position={[0, 0, 0]}
        visible={b1Style.visible}
        onPointerOver={(e) => handlePointerOver(e, 'B1')}
        onPointerOut={handlePointerOut}
      >
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[50, 25, 10, 5]} />
            <meshBasicMaterial color="#00aaff" wireframe transparent opacity={0.15} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
             <planeGeometry args={[50, 25]} />
             <meshBasicMaterial color="#001122" transparent opacity={0.9} side={2} />
        </mesh>

        {/* Pillars */}
        {[...Array(8)].map((_, i) => (
            <mesh key={i} position={[(i%4 - 1.5)*10, 2, Math.floor(i/4)*10 - 5]}>
                <cylinderGeometry args={[0.6, 0.6, 4, 8]} />
                <meshBasicMaterial color="#0088aa" wireframe transparent opacity={0.3} />
            </mesh>
        ))}

        {cameras.filter(c => c.floor === 'B1').map(cam => (
          <CameraMarker key={cam.id} data={cam} onClick={onCameraClick} />
        ))}
      </group>

      {/* === B2 Platform === */}
      <group 
        ref={b2GroupRef} 
        position={[0, -8, 0]}
        visible={b2Style.visible}
        onPointerOver={(e) => handlePointerOver(e, 'B2')}
        onPointerOut={handlePointerOut}
      >
         <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[50, 12, 10, 4]} />
            <meshBasicMaterial color="#00aaff" wireframe transparent opacity={0.15} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
             <planeGeometry args={[50, 12]} />
             <meshBasicMaterial color="#001122" transparent opacity={0.9} side={2} />
        </mesh>
        
        {/* Tracks */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
            <planeGeometry args={[60, 25, 20, 10]} />
            <meshBasicMaterial color="#222" wireframe transparent opacity={0.1} />
        </mesh>

        <group opacity={b2Style.opacity}>
          <Train direction={1} position={[-30, -0.5, 8]} color="#00ffff" />
          <Train direction={-1} position={[30, -0.5, -8]} color="#ff00aa" />
        </group>

        {cameras.filter(c => c.floor === 'B2').map(cam => (
          <CameraMarker key={cam.id} data={cam} onClick={onCameraClick} />
        ))}
      </group>
    </group>
  );
};
