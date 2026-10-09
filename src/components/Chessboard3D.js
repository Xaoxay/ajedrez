import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export default function Chessboard3D({
  fen,
  onMove,
  turn = 'w',
  flipped = false,
  gestureEnabled = true,
}) {
  const webViewRef = useRef(null);
  const [autoRotate, setAutoRotate] = useState(true);

  // Sincronizar FEN, turno y modo volteado con la escena Three.js
  useEffect(() => {
    if (fen && webViewRef.current) {
      const msg = JSON.stringify({
        type: 'SYNC_STATE',
        fen,
        turn,
        flipped,
        autoRotate,
      });
      webViewRef.current.postMessage(msg);
    }
  }, [fen, turn, flipped, autoRotate]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MOVE' && onMove && gestureEnabled) {
        onMove({ from: data.from, to: data.to });
      }
    } catch (e) {
      console.error('Error procesando jugada 3D:', e);
    }
  };

  const toggleAutoRotate = () => {
    const nextVal = !autoRotate;
    setAutoRotate(nextVal);
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'SET_AUTO_ROTATE', value: nextVal }));
    }
  };

  const resetCamera = () => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'RESET_CAMERA', turn, flipped }));
    }
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Tablero 3D Jake-Mate</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: #0c1a2e;
    height: 100%;
    width: 100%;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
  }
  #canvas-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
  }
</style>
</head>
<body>
<div id="canvas-container"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
  const container = document.getElementById('canvas-container');
  let width = window.innerWidth;
  let height = window.innerHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1a2e);

  // Cámara con perspectiva amplia para visión tridimensional inmersiva
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 8.2, 7.8);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Rig contenedor del tablero para rotación suave e inclinación por turno
  const rig = new THREE.Group();
  scene.add(rig);

  // Iluminación ambiental y solar estilo Sol de Mayo
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.82);
  scene.add(ambientLight);

  const sunDirLight = new THREE.DirectionalLight(0xfff5e6, 0.95);
  sunDirLight.position.set(5, 14, 7);
  sunDirLight.castShadow = true;
  sunDirLight.shadow.mapSize.width = 1024;
  sunDirLight.shadow.mapSize.height = 1024;
  sunDirLight.shadow.bias = -0.001;
  scene.add(sunDirLight);

  // Luz dorada secundaria de relleno
  const goldLight = new THREE.PointLight(0xf5cd79, 0.65, 25);
  goldLight.position.set(-6, 9, -5);
  scene.add(goldLight);

  // Materiales PBR para mármol blanco, celeste argentino y marco dorado
  const lightSquareMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.28,
    metalness: 0.08
  });
  const darkSquareMat = new THREE.MeshStandardMaterial({
    color: 0x4592db,
    roughness: 0.32,
    metalness: 0.12
  });
  const highlightMat = new THREE.MeshStandardMaterial({
    color: 0xf1c40f,
    emissive: 0xd3a625,
    emissiveIntensity: 0.55,
    roughness: 0.2
  });
  const boardBorderMat = new THREE.MeshStandardMaterial({
    color: 0x0e2038,
    roughness: 0.4,
    metalness: 0.4
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd3a625,
    roughness: 0.25,
    metalness: 0.8
  });

  // Materiales de piezas: Marfil albiceleste y Obsidiana noche
  const whitePieceMat = new THREE.MeshStandardMaterial({
    color: 0xf7fafc,
    roughness: 0.22,
    metalness: 0.18
  });
  const blackPieceMat = new THREE.MeshStandardMaterial({
    color: 0x162233,
    roughness: 0.28,
    metalness: 0.35
  });

  // Base y marco exterior del tablero
  const baseBox = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.4, 8.9), boardBorderMat);
  baseBox.position.y = -0.21;
  baseBox.receiveShadow = true;
  rig.add(baseBox);

  // Ribete dorado decorativo
  const trimBox = new THREE.Mesh(new THREE.BoxGeometry(8.94, 0.06, 8.94), goldTrimMat);
  trimBox.position.y = -0.02;
  rig.add(trimBox);

  // Cuadrícula 8x8 de casillas
  const squareMeshes = [];
  const squaresGroup = new THREE.Group();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const geo = new THREE.BoxGeometry(1.0, 0.18, 1.0);
      const isLight = (r + c) % 2 === 0;
      const square = new THREE.Mesh(geo, isLight ? lightSquareMat : darkSquareMat);
      square.position.set(c - 3.5, 0, r - 3.5);
      square.receiveShadow = true;

      const sqName = files[c] + (8 - r);
      square.userData = { square: sqName, isLight };
      squaresGroup.add(square);
      squareMeshes.push(square);
    }
  }
  rig.add(squaresGroup);

  // Anillos indicadores de casilla seleccionada
  const selectRingGeo = new THREE.RingGeometry(0.32, 0.46, 24);
  selectRingGeo.rotateX(-Math.PI / 2);
  const selectRing = new THREE.Mesh(selectRingGeo, new THREE.MeshBasicMaterial({ color: 0xf1c40f, side: THREE.DoubleSide }));
  selectRing.position.y = 0.11;
  selectRing.visible = false;
  rig.add(selectRing);

  // Grupo de piezas 3D
  const piecesGroup = new THREE.Group();
  rig.add(piecesGroup);

  // Constructor procedural de piezas Staunton 3D realistas
  function createStauntonPiece(type, isWhite) {
    const mat = isWhite ? whitePieceMat : blackPieceMat;
    const group = new THREE.Group();
    const pType = type.toLowerCase();

    // 1. Zócalo y base escalonada (Común a todas las piezas)
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.1, 20), mat);
    plinth.position.y = 0.15;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    const baseFillet = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.08, 20), mat);
    baseFillet.position.y = 0.23;
    baseFillet.castShadow = true;
    group.add(baseFillet);

    if (pType === 'p') {
      // --- PEÓN ---
      // Cuerpo cónico elegante
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.25, 0.36, 16), mat);
      body.position.y = 0.44;
      body.castShadow = true;
      group.add(body);

      // Cuello
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), mat);
      collar.position.y = 0.63;
      collar.castShadow = true;
      group.add(collar);

      // Cabeza esférica
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat);
      head.position.y = 0.81;
      head.castShadow = true;
      group.add(head);

    } else if (pType === 'r') {
      // --- TORRE ---
      // Torre cilíndrica robusta
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.27, 0.5, 16), mat);
      tower.position.y = 0.51;
      tower.castShadow = true;
      group.add(tower);

      // Almenas del castillo
      const parapet = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.16, 16), mat);
      parapet.position.y = 0.81;
      parapet.castShadow = true;
      group.add(parapet);

      // Hueco almenado
      const crenel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12), mat);
      crenel.position.y = 0.86;
      group.add(crenel);

    } else if (pType === 'n') {
      // --- CABALLO ---
      // Pecho y cuello arqueado
      const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.36, 14), mat);
      chest.position.set(0, 0.43, -0.04);
      chest.rotation.x = 0.22;
      chest.castShadow = true;
      group.add(chest);

      // Cabeza y hocico de caballo esculpido
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.38), mat);
      head.position.set(0, 0.72, 0.06);
      head.rotation.x = -0.3;
      head.castShadow = true;
      group.add(head);

      // Orejas
      const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), mat);
      leftEar.position.set(0.08, 0.94, -0.06);
      leftEar.rotation.x = -0.2;
      group.add(leftEar);

      const rightEar = leftEar.clone();
      rightEar.position.x = -0.08;
      group.add(rightEar);

    } else if (pType === 'b') {
      // --- ALFIL ---
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 0.52, 16), mat);
      body.position.y = 0.52;
      body.castShadow = true;
      group.add(body);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), mat);
      collar.position.y = 0.8;
      group.add(collar);

      // Mitra ovalada
      const mitre = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), mat);
      mitre.scale.set(1.0, 1.45, 1.0);
      mitre.position.y = 1.02;
      mitre.castShadow = true;
      group.add(mitre);

      // Pomo superior
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), mat);
      finial.position.y = 1.32;
      group.add(finial);

    } else if (pType === 'q') {
      // --- REINA ---
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.29, 0.65, 16), mat);
      body.position.y = 0.58;
      body.castShadow = true;
      group.add(body);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16), mat);
      collar.position.y = 0.93;
      group.add(collar);

      // Corona de la reina
      const coronet = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.16, 0.22, 16), mat);
      coronet.position.y = 1.06;
      coronet.castShadow = true;
      group.add(coronet);

      // Orbe real
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 14), mat);
      orb.position.y = 1.25;
      group.add(orb);

    } else if (pType === 'k') {
      // --- REY ---
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.72, 16), mat);
      body.position.y = 0.62;
      body.castShadow = true;
      group.add(body);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), mat);
      collar.position.y = 1.02;
      group.add(collar);

      // Corona imperial
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.24, 16), mat);
      crown.position.y = 1.16;
      crown.castShadow = true;
      group.add(crown);

      // Cruz cristiana tridimensional
      const crossVert = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.06), mat);
      crossVert.position.y = 1.41;
      crossVert.castShadow = true;
      group.add(crossVert);

      const crossHoriz = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.06), mat);
      crossHoriz.position.y = 1.43;
      crossHoriz.castShadow = true;
      group.add(crossHoriz);
    }

    return group;
  }

  // Carga y posicionamiento del tablero a partir del FEN
  function loadFen(fenString) {
    while (piecesGroup.children.length > 0) {
      piecesGroup.remove(piecesGroup.children[0]);
    }

    const rows = (fenString || '').split(' ')[0].split('/');
    for (let r = 0; r < 8 && r < rows.length; r++) {
      let c = 0;
      for (const char of rows[r]) {
        if (!isNaN(char)) {
          c += parseInt(char, 10);
        } else {
          const isWhite = char === char.toUpperCase();
          const piece = createStauntonPiece(char, isWhite);
          piece.position.set(c - 3.5, 0, r - 3.5);
          const sqName = files[c] + (8 - r);
          piece.userData = { piece: char, isWhite, square: sqName };
          piecesGroup.add(piece);
          c++;
        }
      }
    }
  }

  // Variables de control de cámara y auto-inclinación por turno
  let currentTurnState = 'w';
  let isFlippedState = false;
  let autoRotateEnabled = true;

  // Ángulos objetivos para la auto-inclinación suave
  let targetRigRotationY = 0;
  let targetRigRotationX = -0.58;

  function updateTargetTilt() {
    if (!autoRotateEnabled) return;

    // Si le toca a las Blancas: el tablero se inclina hacia el jugador blanco
    // Si le toca a las Negras: el tablero gira suavemente 180° hacia el jugador negro
    const facingWhite = isFlippedState ? currentTurnState === 'b' : currentTurnState === 'w';

    if (facingWhite) {
      targetRigRotationY = 0;
      targetRigRotationX = -0.58;
    } else {
      targetRigRotationY = Math.PI;
      targetRigRotationX = -0.58;
    }
  }

  // Control táctil de rotación manual
  let isDragging = false;
  let hasMovedMuch = false;
  let startX = 0, startY = 0;
  let prevX = 0, prevY = 0;
  let selectedSquare = null;
  let selectedPieceGroup = null;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function onPointerDown(e) {
    isDragging = true;
    hasMovedMuch = false;
    startX = e.clientX;
    startY = e.clientY;
    prevX = e.clientX;
    prevY = e.clientY;
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;

    if (Math.abs(e.clientX - startX) > 6 || Math.abs(e.clientY - startY) > 6) {
      hasMovedMuch = true;
    }

    rig.rotation.y += dx * 0.007;
    rig.rotation.x += dy * 0.007;
    rig.rotation.x = Math.max(-1.15, Math.min(0.05, rig.rotation.x));

    prevX = e.clientX;
    prevY = e.clientY;
  }

  function onPointerUp(e) {
    isDragging = false;

    // Toque directo sin arrastre: selección o movimiento
    if (!hasMovedMuch) {
      pointer.x = (e.clientX / width) * 2 - 1;
      pointer.y = -(e.clientY / height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const squareIntersects = raycaster.intersectObjects(squareMeshes);
      if (squareIntersects.length > 0) {
        const clickedSquare = squareIntersects[0].object.userData.square;

        if (selectedSquare) {
          if (selectedSquare !== clickedSquare) {
            // Enviar jugada al contenedor de React Native
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MOVE',
                from: selectedSquare,
                to: clickedSquare
              }));
            }
          }
          clearSelection();
        } else {
          // Buscar pieza en la casilla tocada
          const piece = piecesGroup.children.find(p => p.userData?.square === clickedSquare);
          if (piece) {
            // Verificar si corresponde al turno actual
            const pieceColor = piece.userData.isWhite ? 'w' : 'b';
            if (pieceColor === currentTurnState) {
              selectPiece(piece, clickedSquare);
            }
          }
        }
      } else {
        clearSelection();
      }
    }
  }

  function selectPiece(pieceGroup, squareName) {
    clearSelection();
    selectedSquare = squareName;
    selectedPieceGroup = pieceGroup;

    // Elevar la pieza 3D mágicamente
    pieceGroup.position.y = 0.35;

    // Mostrar anillo dorado bajo la casilla
    selectRing.position.set(pieceGroup.position.x, 0.11, pieceGroup.position.z);
    selectRing.visible = true;
  }

  function clearSelection() {
    if (selectedPieceGroup) {
      selectedPieceGroup.position.y = 0.0;
    }
    selectedSquare = null;
    selectedPieceGroup = null;
    selectRing.visible = false;
  }

  container.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  // Escuchar mensajes entrantes desde React Native
  function handleIncomingMessage(raw) {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (data.type === 'SYNC_STATE') {
        loadFen(data.fen);
        currentTurnState = data.turn || 'w';
        isFlippedState = !!data.flipped;
        if (data.autoRotate !== undefined) autoRotateEnabled = data.autoRotate;
        updateTargetTilt();
      } else if (data.type === 'SET_AUTO_ROTATE') {
        autoRotateEnabled = !!data.value;
        if (autoRotateEnabled) updateTargetTilt();
      } else if (data.type === 'RESET_CAMERA') {
        updateTargetTilt();
      }
    } catch (err) {}
  }

  window.addEventListener('message', (e) => handleIncomingMessage(e.data));
  document.addEventListener('message', (e) => handleIncomingMessage(e.data));

  // Ciclo de animación continua con rotación suave (Lerp)
  function animate() {
    requestAnimationFrame(animate);

    if (!isDragging && autoRotateEnabled) {
      // Interpolación angular para eje Y
      let diffY = targetRigRotationY - rig.rotation.y;
      while (diffY < -Math.PI) diffY += Math.PI * 2;
      while (diffY > Math.PI) diffY -= Math.PI * 2;

      rig.rotation.y += diffY * 0.07;
      rig.rotation.x += (targetRigRotationX - rig.rotation.x) * 0.07;
    }

    renderer.render(scene, camera);
  }
  animate();

  // Ajuste automático al cambiar tamaño o rotación
  window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
</script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        style={styles.webview}
      />

      {/* Controles de cámara en la esquina superior del tablero 3D */}
      <View style={styles.overlayControls}>
        <TouchableOpacity style={styles.ctrlPill} onPress={toggleAutoRotate} activeOpacity={0.8}>
          <Text style={[styles.ctrlText, autoRotate && styles.ctrlTextActive]}>
            {autoRotate ? '🧭 Giro Turno: ON' : '⏸️ Giro: OFF'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ctrlPill} onPress={resetCamera} activeOpacity={0.8}>
          <Text style={styles.ctrlText}>📷 Centrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0c1a2e',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0c1a2e',
  },
  overlayControls: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 6,
  },
  ctrlPill: {
    backgroundColor: 'rgba(12, 27, 48, 0.88)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d3a625',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  ctrlText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: 'bold',
  },
  ctrlTextActive: {
    color: '#ffd32a',
  },
});
