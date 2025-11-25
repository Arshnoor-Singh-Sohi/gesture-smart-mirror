import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Plane } from '@react-three/drei';
import * as THREE from 'three';

const Background3D = () => {
  const gridRef = useRef();

  // Animate the grid moving towards the user
  useFrame((state, delta) => {
    if (gridRef.current) {
      // Move texture to simulate infinite scrolling
      gridRef.current.material.map.offset.y -= delta * 0.2;
    }
  });

  // Create a grid texture manually
  const gridTexture = new THREE.TextureLoader().load(
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/uv_grid_opengl.jpg' 
  );
  // Note: Usually we use a generated material, but a simple wireframe plane works best for "Tron" look
  
  return (
    <group>
      {/* 1. The Stars (You liked these) */}
      <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={1} />

      {/* 2. The Infinite Floor */}
      {/* A large plane rotated 90 degrees to sit flat */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -10, 0]} 
      >
        <planeGeometry args={[200, 200, 40, 40]} />
        <meshStandardMaterial 
          color="#000000"
          emissive="#00ffff"
          emissiveIntensity={0.2}
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* 3. Ambient Fog to fade floor into distance */}
      <fog attach="fog" args={['#000000', 10, 60]} />
    </group>
  );
};

export default Background3D;