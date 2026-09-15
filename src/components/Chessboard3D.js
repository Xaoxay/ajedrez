import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export default function Chessboard3D({ fen, onMove, flipped = false, gestureEnabled = true }) {
  const webViewRef = useRef(null);

  // Enviar nuevo FEN al WebView cada vez que cambia el estado
  useEffect(() => {
    if (fen && webViewRef.current) {
      const msg = JSON.stringify({ type: 'SET_FEN', fen, flipped });
      webViewRef.current.postMessage(msg);
    }
  }, [fen, flipped]);

  // Manejar mensajes recibidos desde el WebView (jugada del usuario)
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MOVE' && onMove && gestureEnabled) {
        onMove({ from: data.from, to: data.to });
      }
    } catch (e) {
      console.error('Error procesando mensaje 3D:', e);
    }
  };

  const resetCamera = () => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'RESET_CAMERA' }));
    }
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Tablero 3D Harry Potter</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: #0f0f14;
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
  scene.background = new THREE.Color(0x0f0f14);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const rig = new THREE.Group();
  scene.add(rig);

  // Luces mágicas estilo Gran Comedor
  const ambientLight = new THREE.AmbientLight(0xfff3e0, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(6, 12, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  // Luz dorada cálida secundaria
  const warmLight = new THREE.PointLight(0xd3a625, 0.6, 20);
  warmLight.position.set(-6, 8, -6);
  scene.add(warmLight);

  // Materiales de mármol y piedra de Hogwarts
  const lightSquareMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.4 });
  const darkSquareMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.5 });
  const boardBorderMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.6, metalness: 0.2 });

  const whitePieceMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.3, metalness: 0.1 });
  const blackPieceMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.3, metalness: 0.4 });
  const selectedPieceMat = new THREE.MeshStandardMaterial({ color: 0xd3a625, roughness: 0.2, emissive: 0x740001 });

  // Marco exterior del tablero
  const borderGeo = new THREE.BoxGeometry(8.6, 0.3, 8.6);
  const borderMesh = new THREE.Mesh(borderGeo, boardBorderMat);
  borderMesh.position.y = -0.16;
  borderMesh.receiveShadow = true;
  rig.add(borderMesh);

  // Cuadrícula 8x8 de casillas
  const squareMeshes = [];
  const squaresGroup = new THREE.Group();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const geo = new THREE.BoxGeometry(1, 0.2, 1);
      const isLight = (r + c) % 2 === 0;
      const mat = (isLight ? lightSquareMat : darkSquareMat).clone();
      const square = new THREE.Mesh(geo, mat);
      square.position.set(c - 3.5, 0, r - 3.5);
      square.receiveShadow = true;

      const squareName = files[c] + (8 - r);
      square.userData = { square: squareName, defaultColor: isLight ? 0xdcdde1 : 0x2f3640 };
      squaresGroup.add(square);
      squareMeshes.push(square);
    }
  }
  rig.add(squaresGroup);

  // Grupo contenedor de piezas 3D
  const piecesGroup = new THREE.Group();
  rig.add(piecesGroup);

  // Constructor procedural de piezas 3D
  function createPieceMesh(type, isWhite) {
    const mat = isWhite ? whitePieceMat : blackPieceMat;
    const group = new THREE.Group();

    // Base de la pieza
    const baseGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.15, 16);
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.y = 0.175;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    let topMesh;
    const pType = type.toLowerCase();

    if (pType === 'p') {
      topMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), mat);
      topMesh.position.y = 0.45;
    } else if (pType === 'r') {
      topMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.45, 8), mat);
      topMesh.position.y = 0.5;
    } else if (pType === 'n') {
      topMesh = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 5), mat);
      topMesh.position.y = 0.55;
      topMesh.rotation.y = Math.PI / 4;
    } else if (pType === 'b') {
      topMesh = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 16), mat);
      topMesh.position.y = 0.6;
    } else if (pType === 'q') {
      topMesh = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.75, 16), mat);
      topMesh.position.y = 0.68;
    } else if (pType === 'k') {
      topMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 0.75, 16), mat);
      topMesh.position.y = 0.72;
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), mat);
      cross.position.y = 1.15;
      cross.castShadow = true;
      group.add(cross);
    }

    if (topMesh) {
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      group.add(topMesh);
    }

    return group;
  }

  // Posicionar piezas según FEN
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
          const piece = createPieceMesh(char, isWhite);
          piece.position.set(c - 3.5, 0.1, r - 3.5);
          const sqName = files[c] + (8 - r);
          piece.userData = { piece: char, isWhite, square: sqName };
          piecesGroup.add(piece);
          c++;
        }
      }
    }
  }

  // Cámara inicial
  camera.position.set(0, 7.5, 7.2);
  camera.lookAt(0, 0, 0);
  rig.rotation.x = -0.55;

  // Interacción táctil y rotación de cámara
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

    rig.rotation.y += dx * 0.008;
    rig.rotation.x += dy * 0.008;
    rig.rotation.x = Math.max(-1.1, Math.min(0.1, rig.rotation.x));

    prevX = e.clientX;
    prevY = e.clientY;
  }

  function onPointerUp(e) {
    isDragging = false;

    // Si fue un toque directo sin arrastrar la cámara: Raycasting para seleccionar o mover
    if (!hasMovedMuch) {
      pointer.x = (e.clientX / width) * 2 - 1;
      pointer.y = -(e.clientY / height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // 1. Verificar si tocó una casilla
      const squareIntersects = raycaster.intersectObjects(squareMeshes);
      if (squareIntersects.length > 0) {
        const clickedSquare = squareIntersects[0].object.userData.square;

        if (selectedSquare) {
          if (selectedSquare !== clickedSquare) {
            // Notificar intento de jugada a React Native
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
          // Buscar si hay una pieza en esa casilla
          const foundPiece = piecesGroup.children.find(p => p.userData?.square === clickedSquare);
          if (foundPiece) {
            selectPiece(foundPiece, clickedSquare);
          }
        }
      }
    }
  }

  function selectPiece(pieceGroup, squareName) {
    selectedSquare = squareName;
    selectedPieceGroup = pieceGroup;
    pieceGroup.position.y += 0.3; // Elevar la pieza mágicamente
  }

  function clearSelection() {
    if (selectedPieceGroup) {
      selectedPieceGroup.position.y = 0.1;
    }
    selectedSquare = null;
    selectedPieceGroup = null;
  }

  container.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  // Escuchar mensajes de React Native
  window.addEventListener('message', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'SET_FEN') {
        loadFen(data.fen);
        if (data.flipped) {
          rig.rotation.y = Math.PI;
        }
      } else if (data.type === 'RESET_CAMERA') {
        rig.rotation.set(-0.55, 0, 0);
      }
    } catch (err) {}
  });

  document.addEventListener('message', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'SET_FEN') {
        loadFen(data.fen);
      } else if (data.type === 'RESET_CAMERA') {
        rig.rotation.set(-0.55, 0, 0);
      }
    } catch (err) {}
  });

  // Animación continua
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  // Redimensión si rota la pantalla
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
      <TouchableOpacity style={styles.resetCamButton} onPress={resetCamera}>
        <Text style={styles.resetCamText}>📷 Centrar Cámara</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f0f14',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f0f14',
  },
  resetCamButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(27, 27, 36, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#444',
  },
  resetCamText: {
    color: '#d3a625',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
