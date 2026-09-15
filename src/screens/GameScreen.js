import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import Chessboard from 'react-native-chessboard';
import { getBestMove } from '../utils/chessAi';
import { saveGameLocally, recordGameResult } from '../utils/gameStorage';

export default function GameScreen({ route, navigation }) {
  const {
    mode = 'local',
    difficulty = 'medio',
    timeLimit = 300,
    turnLimit = 15,
    savedGame = null,
  } = route.params || {};

  const currentDifficulty = savedGame ? savedGame.difficulty || difficulty : difficulty;

  const chessboardRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Estados de la partida
  const [currentTurn, setCurrentTurn] = useState(savedGame ? savedGame.currentTurn : 'w');
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverText, setGameOverText] = useState('');
  const [isFlipped, setIsFlipped] = useState(savedGame ? savedGame.isFlipped : false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);

  // Estados de reloj
  const [whiteTime, setWhiteTime] = useState(savedGame ? savedGame.whiteTime : timeLimit);
  const [blackTime, setBlackTime] = useState(savedGame ? savedGame.blackTime : timeLimit);
  const [turnTime, setTurnTime] = useState(savedGame ? savedGame.turnTime : turnLimit);

  // Cargar tablero si venimos de partida guardada
  useEffect(() => {
    if (savedGame && savedGame.fen) {
      setTimeout(() => {
        chessboardRef.current?.resetBoard(savedGame.fen);
      }, 300);
    }
  }, [savedGame]);

  // Formato mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Manejador de fin de juego por tiempo
  const handleTimeOut = useCallback((loserColor) => {
    setIsGameOver(true);
    const winner = loserColor === 'w' ? 'Negras' : 'Blancas';
    const text = `¡Tiempo agotado! Ganan las ${winner}`;
    setGameOverText(text);

    if (mode === 'bot') {
      if (winner === 'Blancas') recordGameResult('win');
      else recordGameResult('loss');
    }

    Alert.alert('⌛ Tiempo Agotado', text);
  }, [mode]);

  // Lógica de temporizadores
  useEffect(() => {
    if (isGameOver) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    if (mode === 'timer') {
      timerIntervalRef.current = setInterval(() => {
        if (currentTurn === 'w') {
          setWhiteTime((prev) => {
            if (prev <= 1) {
              clearInterval(timerIntervalRef.current);
              handleTimeOut('w');
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 1) {
              clearInterval(timerIntervalRef.current);
              handleTimeOut('b');
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (mode === 'sudden_death') {
      timerIntervalRef.current = setInterval(() => {
        setTurnTime((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            handleTimeOut(currentTurn);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [currentTurn, isGameOver, mode, handleTimeOut]);

  // Turno de la IA (bot)
  const triggerBotMove = useCallback(async (fen) => {
    if (isGameOver) return;
    setIsBotThinking(true);

    // Pequeño retardo de pensamiento táctico
    setTimeout(async () => {
      try {
        const botMove = await getBestMove(fen, currentDifficulty);
        if (botMove && chessboardRef.current) {
          await chessboardRef.current.move({
            from: botMove.from,
            to: botMove.to,
            promotion: botMove.promotion,
          });
        }
      } catch (err) {
        console.error('Error al ejecutar jugada de bot:', err);
      } finally {
        setIsBotThinking(false);
      }
    }, currentDifficulty === 'magnus' ? 400 : 700);
  }, [isGameOver, currentDifficulty]);

  // Manejador tras cada movimiento en el tablero
  const handleMove = useCallback((info) => {
    const state = chessboardRef.current?.getState();
    if (!state) return;

    // Detectar turno desde el FEN
    const fenTurn = state.fen ? state.fen.split(' ')[1] : (currentTurn === 'w' ? 'b' : 'w');
    setCurrentTurn(fenTurn);

    // Reiniciar reloj de turno en muerte súbita
    if (mode === 'sudden_death') {
      setTurnTime(turnLimit);
    }

    // Verificar si la partida terminó según las reglas de ajedrez
    if (state.isGameOver) {
      setIsGameOver(true);
      if (state.isCheckmate) {
        const history = state.history || [];
        const lastMove = history[history.length - 1];
        const winner = lastMove?.color === 'w' ? 'Blancas' : 'Negras';
        const msg = `¡Jaque Mate! Ganan las ${winner}`;
        setGameOverText(msg);

        if (mode === 'bot') {
          if (winner === 'Blancas') recordGameResult('win');
          else recordGameResult('loss');
        }

        Alert.alert('¡Victoria Mágica!', msg);
      } else {
        const msg = 'Empate (Tablas)';
        setGameOverText(msg);
        if (mode === 'bot') recordGameResult('draw');
        Alert.alert('Tablas', 'El duelo ha concluido en empate.');
      }
      return;
    }

    // Si es modo contra la máquina y ahora le toca a las negras
    if (mode === 'bot' && fenTurn === 'b') {
      triggerBotMove(state.fen);
    }
  }, [currentTurn, mode, turnLimit, triggerBotMove]);

  // Guardar partida en el dispositivo
  const handleSaveGame = async () => {
    const state = chessboardRef.current?.getState();
    const fen = state?.fen;
    if (!fen) {
      Alert.alert('Error', 'No se pudo obtener el estado del tablero.');
      return;
    }

    const ok = await saveGameLocally({
      fen,
      mode,
      difficulty: currentDifficulty,
      currentTurn,
      whiteTime,
      blackTime,
      turnTime,
      isFlipped,
      timeLimit,
      turnLimit,
    });

    setMenuVisible(false);
    if (ok) {
      Alert.alert(
        '💾 Partida Guardada',
        'Tu partida ha sido guardada en tu dispositivo. Puedes retomarla en cualquier momento desde la Sala Principal.'
      );
    } else {
      Alert.alert('Error', 'No se pudo guardar la partida en el almacenamiento local.');
    }
  };

  // Reiniciar juego
  const resetGame = () => {
    chessboardRef.current?.resetBoard();
    setIsGameOver(false);
    setGameOverText('');
    setCurrentTurn('w');
    setWhiteTime(timeLimit);
    setBlackTime(timeLimit);
    setTurnTime(turnLimit);
    setIsBotThinking(false);
    setMenuVisible(false);
  };

  // Rendirse
  const surrender = () => {
    setMenuVisible(false);
    Alert.alert(
      'Rendirse',
      '¿Estás seguro de que deseas rendirte en este duelo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rendirme',
          style: 'destructive',
          onPress: () => {
            setIsGameOver(true);
            const winner = currentTurn === 'w' ? 'Negras' : 'Blancas';
            const msg = `Rendición: Ganan las ${winner}`;
            setGameOverText(msg);

            if (mode === 'bot') {
              recordGameResult('loss');
            }

            Alert.alert('Duelo Terminado', msg);
          },
        },
      ]
    );
  };

  const getOpponentLabel = () => {
    if (mode !== 'bot') return '⚫ Jugador Negras';
    switch (currentDifficulty) {
      case 'magnus':
        return '👑 Magnus Carlsen';
      case 'dificil':
        return '🤖 Autómata (Difícil)';
      case 'adaptada':
        return '⚡ Autómata (Adaptada)';
      case 'normal':
        return '🟢 Autómata (Normal)';
      default:
        return '🟡 Autómata (Medio)';
    }
  };

  // Obtener nombre del modo para la barra superior
  const getModeTitle = () => {
    switch (mode) {
      case 'bot':
        return currentDifficulty === 'magnus'
          ? '👑 Duelo vs Magnus Carlsen'
          : `🤖 vs Máquina (${currentDifficulty.toUpperCase()})`;
      case 'timer':
        return `⏳ Contrarreloj (${Math.floor(timeLimit / 60)}m)`;
      case 'sudden_death':
        return '⚡ Muerte Súbita (15s)';
      case 'online':
        return '🌐 Duelo Online';
      default:
        return '⚔️ Duelo Local';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra Superior con Título y Botón de Menú Ocultable */}
      <View style={styles.topBar}>
        <View style={styles.titleContainer}>
          <Text style={styles.modeTitle}>{getModeTitle()}</Text>
          {gameOverText ? (
            <Text style={styles.winnerText}>{gameOverText}</Text>
          ) : (
            <Text style={styles.turnSubtext}>
              {mode === 'bot' && currentTurn === 'b'
                ? `${currentDifficulty === 'magnus' ? '👑 Magnus' : '🤖 La máquina'} está calculando...`
                : `Turno: ${currentTurn === 'w' ? '⚪ Blancas' : '⚫ Negras'}`}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.menuIconButton}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.menuIconText}>⚙️ Menú</Text>
        </TouchableOpacity>
      </View>

      {/* Reloj / Panel de Jugador Superior (Negras / Bot) */}
      <View style={[styles.playerBanner, currentTurn === 'b' && !isGameOver && styles.activePlayerBanner]}>
        <Text style={[styles.playerName, currentDifficulty === 'magnus' && mode === 'bot' && styles.magnusText]}>
          {getOpponentLabel()}
        </Text>
        {mode === 'timer' && (
          <Text style={[styles.clockText, currentTurn === 'b' && styles.activeClockText]}>
            ⏱️ {formatTime(blackTime)}
          </Text>
        )}
        {mode === 'sudden_death' && currentTurn === 'b' && (
          <Text style={[styles.clockText, styles.suddenDeathText]}>
            ⚡ {turnTime}s
          </Text>
        )}
      </View>

      {/* Tablero de Ajedrez */}
      <View style={styles.boardWrapper}>
        <Chessboard
          ref={chessboardRef}
          onMove={handleMove}
          gestureEnabled={!isGameOver && !(mode === 'bot' && currentTurn === 'b')}
          flipped={isFlipped}
          colors={{
            black: '#4b6584',
            white: '#d1d8e0',
            lastMoveHighlight: 'rgba(211, 166, 37, 0.5)',
            checkmateHighlight: '#e74c3c',
          }}
        />
      </View>

      {/* Reloj / Panel de Jugador Inferior (Blancas) */}
      <View style={[styles.playerBanner, currentTurn === 'w' && !isGameOver && styles.activePlayerBanner]}>
        <Text style={styles.playerName}>
          {mode === 'bot' ? '🧙‍♂️ Tú (Blancas)' : '⚪ Jugador Blancas'}
        </Text>
        {mode === 'timer' && (
          <Text style={[styles.clockText, currentTurn === 'w' && styles.activeClockText]}>
            ⏱️ {formatTime(whiteTime)}
          </Text>
        )}
        {mode === 'sudden_death' && currentTurn === 'w' && (
          <Text style={[styles.clockText, styles.suddenDeathText]}>
            ⚡ {turnTime}s
          </Text>
        )}
      </View>

      {/* Pestaña / Menú Lateral Ocultable (Modal) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.drawerCard} onStartShouldSetResponder={() => true}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Opciones del Duelo</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.drawerButtons}>
              <TouchableOpacity style={[styles.drawerItem, styles.saveItem]} onPress={handleSaveGame}>
                <Text style={[styles.drawerItemText, styles.saveText]}>💾 Guardar Partida</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={resetGame}>
                <Text style={styles.drawerItemText}>🔄 Reiniciar Duelo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => {
                  setIsFlipped((prev) => !prev);
                  setMenuVisible(false);
                }}
              >
                <Text style={styles.drawerItemText}>
                  🔄 Invertir Tablero ({isFlipped ? 'Normal' : 'Invertido'})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.drawerItem, styles.surrenderItem]} onPress={surrender}>
                <Text style={[styles.drawerItemText, styles.surrenderText]}>
                  🏳️ Rendirse
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerItem, styles.exitItem]}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.drawerItemText}>🚪 Volver a la Sala</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f14',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  topBar: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#272733',
  },
  titleContainer: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d3a625', // Gryffindor Gold
  },
  turnSubtext: {
    fontSize: 13,
    color: '#a4b0be',
    marginTop: 2,
  },
  winnerText: {
    fontSize: 14,
    color: '#2ed573',
    fontWeight: 'bold',
    marginTop: 2,
  },
  menuIconButton: {
    backgroundColor: '#272733',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3f3f50',
  },
  menuIconText: {
    color: '#f1f2f6',
    fontWeight: 'bold',
    fontSize: 13,
  },
  playerBanner: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1b1b24',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2f2f3d',
  },
  activePlayerBanner: {
    borderColor: '#d3a625',
    backgroundColor: '#252530',
  },
  playerName: {
    color: '#ced6e0',
    fontSize: 15,
    fontWeight: '600',
  },
  magnusText: {
    color: '#d3a625',
    fontWeight: 'bold',
  },
  clockText: {
    color: '#a4b0be',
    fontSize: 16,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  activeClockText: {
    color: '#d3a625',
  },
  suddenDeathText: {
    color: '#ff4757',
    fontSize: 17,
  },
  boardWrapper: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  // Estilos del Menú Desplegable / Ocultable
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerCard: {
    width: '82%',
    backgroundColor: '#1c1d24',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#d3a625',
    shadowColor: '#d3a625',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2f313d',
    paddingBottom: 10,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d3a625',
  },
  closeButton: {
    padding: 6,
  },
  closeButtonText: {
    color: '#a4b0be',
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawerButtons: {
    gap: 12,
  },
  drawerItem: {
    backgroundColor: '#272936',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#393c4d',
  },
  drawerItemText: {
    color: '#f1f2f6',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveItem: {
    backgroundColor: '#1e3799',
    borderColor: '#4a69bd',
  },
  saveText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  surrenderItem: {
    borderColor: '#5c2025',
  },
  surrenderText: {
    color: '#ff6b81',
  },
  exitItem: {
    backgroundColor: '#740001',
    borderColor: '#a3292b',
    marginTop: 6,
  },
});
