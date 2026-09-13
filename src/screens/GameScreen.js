import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import Chessboard from 'react-native-chessboard';

export default function GameScreen({ route, navigation }) {
  const { mode } = route.params || { mode: 'local' };
  const chessboardRef = useRef(null);
  const [gameOverText, setGameOverText] = useState('');

  const handleMove = useCallback((result) => {
    // result contains the move info
    const state = chessboardRef.current?.getState();
    if (!state) return;

    if (state.isGameOver) {
      if (state.isCheckmate) {
        // En ajedrez, si es jaque mate, pierde el que tiene el turno. 
        // Como el turno ya cambió después de la jugada, el color de la jugada actual (history) da el ganador.
        const history = state.history;
        const lastMove = history[history.length - 1];
        const winner = lastMove.color === 'w' ? 'Blancas' : 'Negras';
        setGameOverText(`¡Jaque Mate! Ganan las ${winner}`);
        Alert.alert('¡Duelo Terminado!', `Ganan las ${winner} con un hechizo impecable.`);
      } else if (state.isDraw || state.isStalemate || state.isThreefoldRepetition || state.isInsufficientMaterial) {
        setGameOverText('Empate (Tablas)');
        Alert.alert('Tablas', 'Los magos han empatado el duelo.');
      }
    }
  }, []);

  const resetGame = () => {
    chessboardRef.current?.resetBoard();
    setGameOverText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Duelo {mode === 'local' ? 'Local' : 'Online'}</Text>
        {gameOverText ? <Text style={styles.winnerText}>{gameOverText}</Text> : null}
      </View>
      
      <View style={styles.boardContainer}>
        <Chessboard 
          ref={chessboardRef} 
          onMove={handleMove}
        />
      </View>
      
      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={resetGame}>
          <Text style={styles.buttonText}>Reiniciar Duelo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.backButton]} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Volver al Comedor</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a', // Oscuro, estilo Hogwarts
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    height: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#d3a625', // Gryffindor Gold
  },
  winnerText: {
    fontSize: 20,
    color: '#2a623d', // Slytherin Green
    marginTop: 5,
    fontWeight: 'bold',
  },
  boardContainer: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: 40,
    shadowColor: '#d3a625',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  controls: {
    width: '80%',
    gap: 15,
  },
  button: {
    backgroundColor: '#0e1a40', // Ravenclaw Blue
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#740001', // Gryffindor Red
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
