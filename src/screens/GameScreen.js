import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import Chessboard from 'react-native-chessboard';
import Chessboard3D from '../components/Chessboard3D';
import { getBestMove } from '../utils/chessAi';
import { saveGameLocally, recordGameResult } from '../utils/gameStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Board size exactly divisible by 8 for crisp Skia squares
const BOARD_SIZE = Math.floor(Math.min(SCREEN_WIDTH - 20, 392) / 8) * 8;

// Componente decorativo de la Escarapela Argentina
const Escarapela = () => (
  <View style={styles.escarapelaWrap}>
    <View style={styles.escarapelaOuter}>
      <View style={styles.escarapelaMid}>
        <View style={styles.escarapelaInner} />
      </View>
    </View>
    {/* Cintas colgantes */}
    <View style={styles.ribbonContainer}>
      <View style={[styles.ribbon, styles.ribbonLeft]} />
      <View style={[styles.ribbon, styles.ribbonRight]} />
    </View>
  </View>
);

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
  const [currentFen, setCurrentFen] = useState(
    savedGame ? savedGame.fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  );
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverText, setGameOverText] = useState('');
  const [isFlipped, setIsFlipped] = useState(savedGame ? savedGame.isFlipped : false);
  const [viewMode, setViewMode] = useState('2d'); // '2d' o '3d'
  const [menuVisible, setMenuVisible] = useState(false);
  const [endGameModalVisible, setEndGameModalVisible] = useState(false);
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
        setCurrentFen(savedGame.fen);
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

    setEndGameModalVisible(true);
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

    if (state.fen) {
      setCurrentFen(state.fen);
    }

    const fenTurn = state.fen ? state.fen.split(' ')[1] : (currentTurn === 'w' ? 'b' : 'w');
    setCurrentTurn(fenTurn);

    if (mode === 'sudden_death') {
      setTurnTime(turnLimit);
    }

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

        setEndGameModalVisible(true);
      } else {
        const msg = 'Empate (Tablas)';
        setGameOverText(msg);
        if (mode === 'bot') recordGameResult('draw');
        setEndGameModalVisible(true);
      }
      return;
    }

    if (mode === 'bot' && fenTurn === 'b') {
      triggerBotMove(state.fen);
    }
  }, [currentTurn, mode, turnLimit, triggerBotMove]);

  // Mover desde la vista 3D
  const handleMove3D = async ({ from, to }) => {
    if (isGameOver || (mode === 'bot' && currentTurn === 'b')) return;
    try {
      if (chessboardRef.current) {
        await chessboardRef.current.move({ from, to, promotion: 'q' });
      }
    } catch (e) {
      console.warn('Jugada 3D inválida:', e);
    }
  };

  // Acción del botón RENDIME
  const handleSurrender = (color) => {
    const playerName = color === 'w' ? 'Blancas' : 'Negras';
    const opponentName = color === 'w' ? 'Negras' : 'Blancas';

    Alert.alert(
      'Rendición',
      `¿El jugador de las ${playerName} confirma su rendición?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Rendirme',
          style: 'destructive',
          onPress: () => {
            setIsGameOver(true);
            const msg = `Victoria de las ${opponentName} por Rendición`;
            setGameOverText(msg);

            if (mode === 'bot') {
              if (color === 'w') recordGameResult('loss');
              else recordGameResult('win');
            }

            setEndGameModalVisible(true);
          },
        },
      ]
    );
  };

  // Acción del botón TABLAS
  const handleDrawOffer = (proposingColor) => {
    const proposer = proposingColor === 'w' ? 'Blancas' : 'Negras';
    const opponent = proposingColor === 'w' ? 'Negras' : 'Blancas';

    if (mode === 'bot') {
      if (currentDifficulty === 'magnus') {
        Alert.alert(
          '👑 Magnus Carlsen',
          '¡Magnus Carlsen rechaza las tablas! "Un verdadero campeón juega hasta el final."'
        );
      } else {
        Alert.alert(
          'Propuesta de Tablas',
          'La máquina acepta el empate. ¡Bien jugado!',
          [
            {
              text: 'OK',
              onPress: () => {
                setIsGameOver(true);
                setGameOverText('Tablas acordadas con la Máquina');
                recordGameResult('draw');
                setEndGameModalVisible(true);
              },
            },
          ]
        );
      }
      return;
    }

    // Modo Local 1 vs 1
    Alert.alert(
      'Propuesta de Tablas',
      `El jugador de las ${proposer} propone un Empate (Tablas). ¿Acepta el jugador de las ${opponent}?`,
      [
        { text: 'Rechazar', style: 'cancel' },
        {
          text: 'Aceptar Tablas',
          onPress: () => {
            setIsGameOver(true);
            setGameOverText('Empate acordado (Tablas)');
            setEndGameModalVisible(true);
          },
        },
      ]
    );
  };

  // Guardar partida en el dispositivo
  const handleSaveGame = async () => {
    const state = chessboardRef.current?.getState();
    const fen = state?.fen || currentFen;
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

  // Reiniciar juego / Revancha
  const resetGame = () => {
    chessboardRef.current?.resetBoard();
    const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setCurrentFen(defaultFen);
    setIsGameOver(false);
    setGameOverText('');
    setCurrentTurn('w');
    setWhiteTime(timeLimit);
    setBlackTime(timeLimit);
    setTurnTime(turnLimit);
    setIsBotThinking(false);
    setMenuVisible(false);
    setEndGameModalVisible(false);
  };

  const getOpponentLabel = () => {
    if (mode !== 'bot') return 'Jugador Negras';
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

  const getModeTitle = () => {
    switch (mode) {
      case 'bot':
        return currentDifficulty === 'magnus'
          ? '👑 Magnus Carlsen'
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
      <StatusBar barStyle="light-content" backgroundColor="#0d1e36" />

      {/* Fondo patriótico albiceleste (renderizado en background sin zIndex negativo) */}
      <View style={styles.flagBackground} pointerEvents="none">
        <View style={styles.flagTopStripe} />
        <View style={styles.flagMidStripe} />
        <View style={styles.flagBottomStripe} />
        <Text style={styles.bgSun}>☀️</Text>
      </View>

      {/* Barra Superior */}
      <View style={styles.topBar}>
        <View style={styles.titleContainer}>
          <Text style={styles.modeTitle} numberOfLines={1}>{getModeTitle()}</Text>
          <View style={styles.turnBadgeRow}>
            <Text style={styles.turnLabel}>Turno:</Text>
            <View style={[styles.turnDot, { backgroundColor: currentTurn === 'w' ? '#ffffff' : '#222222' }]} />
            <Text style={styles.turnColorName}>
              {mode === 'bot' && currentTurn === 'b'
                ? 'Calculando...'
                : currentTurn === 'w' ? 'Blancas' : 'Negras'}
            </Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === '3d' && styles.viewToggleActive]}
            onPress={() => setViewMode((prev) => (prev === '2d' ? '3d' : '2d'))}
            activeOpacity={0.8}
          >
            <Text style={styles.viewToggleText}>
              {viewMode === '2d' ? '🧊 3D' : '♟️ 2D'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsCircleButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.settingsIconText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TARJETA SUPERIOR (JUGADOR NEGRAS) */}
      <View style={[styles.playerCard, styles.playerCardBlack, currentTurn === 'b' && !isGameOver && styles.activeCardBlack]}>
        <View style={styles.playerInfoRow}>
          {/* Avatar con Escarapela */}
          <View style={styles.avatarWrapper}>
            <View style={styles.blackAvatarSphere} />
            <Escarapela />
          </View>
          <View style={styles.playerTexts}>
            <Text style={styles.blackPlayerTitle} numberOfLines={1}>{getOpponentLabel()}</Text>
            {mode === 'timer' && (
              <Text style={styles.clockTextBlack}>⏱️ {formatTime(blackTime)}</Text>
            )}
            {mode === 'sudden_death' && currentTurn === 'b' && (
              <Text style={styles.suddenDeathText}>⚡ {turnTime}s</Text>
            )}
          </View>
        </View>

        {/* Botones Tablas y Rendirme */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.tablasButtonBlack}
            onPress={() => handleDrawOffer('b')}
            activeOpacity={0.8}
          >
            <Text style={styles.tablasButtonTextBlack}>🤝 Tablas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rendirmeButton}
            onPress={() => handleSurrender('b')}
            activeOpacity={0.8}
          >
            <Text style={styles.rendirmeButtonText}>🚩 Rendirme</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TABLERO DE AJEDREZ (Marco Dorado & Albiceleste) */}
      <View style={[styles.boardWrapper, { width: BOARD_SIZE + 6, height: BOARD_SIZE + 6 }]}>
        <View style={viewMode === '2d' ? styles.visibleBoard : styles.hiddenBoard}>
          <Chessboard
            ref={chessboardRef}
            boardSize={BOARD_SIZE}
            onMove={handleMove}
            gestureEnabled={!isGameOver && !(mode === 'bot' && currentTurn === 'b')}
            flipped={isFlipped}
            colors={{
              black: '#4592db', // Celeste argentino vibrante
              white: '#ffffff', // Mármol blanco
              lastMoveHighlight: 'rgba(241, 196, 15, 0.45)', // Amarillo dorado suave
              checkmateHighlight: '#e74c3c',
              dotColor: 'rgba(243, 156, 18, 0.88)', // Puntos en amarillo dorado brillante
            }}
          />
        </View>

        {viewMode === '3d' && (
          <View style={styles.visibleBoard}>
            <Chessboard3D
              fen={currentFen}
              onMove={handleMove3D}
              flipped={isFlipped}
              gestureEnabled={!isGameOver && !(mode === 'bot' && currentTurn === 'b')}
            />
          </View>
        )}
      </View>

      {/* TARJETA INFERIOR (JUGADOR BLANCAS) */}
      <View style={[styles.playerCard, styles.playerCardWhite, currentTurn === 'w' && !isGameOver && styles.activeCardWhite]}>
        <View style={styles.playerInfoRow}>
          {/* Avatar con Escarapela */}
          <View style={styles.avatarWrapper}>
            <View style={styles.whiteAvatarSphere} />
            <Escarapela />
          </View>
          <View style={styles.playerTexts}>
            <Text style={styles.whitePlayerTitle} numberOfLines={1}>
              {mode === 'bot' ? '🧙‍♂️ Tú (Blancas)' : 'Jugador Blancas'}
            </Text>
            {mode === 'timer' && (
              <Text style={styles.clockTextWhite}>⏱️ {formatTime(whiteTime)}</Text>
            )}
            {mode === 'sudden_death' && currentTurn === 'w' && (
              <Text style={styles.suddenDeathText}>⚡ {turnTime}s</Text>
            )}
          </View>
        </View>

        {/* Botones Tablas y Rendirme */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.tablasButtonWhite}
            onPress={() => handleDrawOffer('w')}
            activeOpacity={0.8}
          >
            <Text style={styles.tablasButtonTextWhite}>🤝 Tablas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rendirmeButton}
            onPress={() => handleSurrender('w')}
            activeOpacity={0.8}
          >
            <Text style={styles.rendirmeButtonText}>🚩 Rendirme</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CARTEL MODAL DE FINALIZACIÓN: ¡BUENA PARTIDA! */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={endGameModalVisible}
        onRequestClose={() => setEndGameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.endGameCard}>
            <Text style={styles.endGameFlag}>🇦🇷 ☀️ 🏆</Text>
            <Text style={styles.endGameTitle}>¡Buena partida!</Text>
            <Text style={styles.endGameSubtitle}>{gameOverText || 'Duelo concluido con honor.'}</Text>

            <View style={styles.endGameButtons}>
              <TouchableOpacity
                style={styles.revanchaButton}
                activeOpacity={0.85}
                onPress={resetGame}
              >
                <Text style={styles.revanchaButtonText}>🔄 Revancha</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuVolverButton}
                activeOpacity={0.85}
                onPress={() => {
                  setEndGameModalVisible(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.menuVolverButtonText}>🚪 Volver al Menú</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MENÚ DE AJUSTES (GEAR) */}
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
              <Text style={styles.drawerTitle}>Ajustes del Duelo</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.drawerButtons}>
              <TouchableOpacity
                style={[styles.drawerItem, styles.viewItem]}
                onPress={() => {
                  setViewMode((prev) => (prev === '2d' ? '3d' : '2d'));
                  setMenuVisible(false);
                }}
              >
                <Text style={styles.drawerItemText}>
                  {viewMode === '2d' ? '🧊 Cambiar a Tablero 3D' : '♟️ Cambiar a Tablero 2D'}
                </Text>
              </TouchableOpacity>

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

              <TouchableOpacity
                style={[styles.drawerItem, styles.exitItem]}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.drawerItemText}>🚪 Volver al Menú</Text>
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
    backgroundColor: '#0c1b30',
    justifyContent: 'space-between',
    paddingVertical: 12,
    alignItems: 'center',
  },
  // Fondo ondeante celeste y blanco
  flagBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  flagTopStripe: {
    flex: 1.2,
    backgroundColor: '#0f2442',
  },
  flagMidStripe: {
    flex: 0.9,
    backgroundColor: '#163359',
  },
  flagBottomStripe: {
    flex: 1.2,
    backgroundColor: '#0f2442',
  },
  bgSun: {
    position: 'absolute',
    top: 25,
    right: 25,
    fontSize: 64,
    opacity: 0.25,
  },
  // Barra Superior
  topBar: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  turnBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  turnLabel: {
    fontSize: 13,
    color: '#dbe9f6',
    fontWeight: '600',
  },
  turnDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#d3a625',
  },
  turnColorName: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggleButton: {
    backgroundColor: '#153966',
    borderWidth: 1.5,
    borderColor: '#4ab2f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  viewToggleActive: {
    backgroundColor: '#d3a625',
    borderColor: '#ffffff',
  },
  viewToggleText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  settingsCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#133561',
    borderWidth: 1.5,
    borderColor: '#d3a625',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIconText: {
    fontSize: 16,
  },
  // Tarjetas de Jugadores (Cápsulas)
  playerCard: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#d3a625',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  playerCardBlack: {
    backgroundColor: '#0c1b30',
  },
  activeCardBlack: {
    borderColor: '#ffd32a',
    backgroundColor: '#122542',
  },
  playerCardWhite: {
    backgroundColor: '#f8fafc',
  },
  activeCardWhite: {
    borderColor: '#ffd32a',
    backgroundColor: '#ffffff',
  },
  playerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blackAvatarSphere: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#181a20',
    borderWidth: 2,
    borderColor: '#d3a625',
  },
  whiteAvatarSphere: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#d3a625',
  },
  playerTexts: {
    flex: 1,
  },
  // Escarapela
  escarapelaWrap: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    alignItems: 'center',
  },
  escarapelaOuter: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#4a90e2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#fff',
  },
  escarapelaMid: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  escarapelaInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4a90e2',
  },
  ribbonContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: -1,
  },
  ribbon: {
    width: 3,
    height: 5,
    backgroundColor: '#4a90e2',
    borderRadius: 1,
  },
  ribbonLeft: {
    transform: [{ rotate: '-18deg' }],
  },
  ribbonRight: {
    transform: [{ rotate: '18deg' }],
  },
  blackPlayerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  whitePlayerTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: 'bold',
  },
  clockTextBlack: {
    color: '#f5cd79',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
  },
  clockTextWhite: {
    color: '#1a3b63',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
  },
  suddenDeathText: {
    color: '#ff4757',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Botones de acción en la tarjeta
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tablasButtonBlack: {
    backgroundColor: '#183863',
    borderWidth: 1.5,
    borderColor: '#4ab2f1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tablasButtonTextBlack: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tablasButtonWhite: {
    backgroundColor: '#edf5fd',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tablasButtonTextWhite: {
    color: '#1e3a8a',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rendirmeButton: {
    backgroundColor: '#a81c24',
    borderWidth: 1.5,
    borderColor: '#f87171',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rendirmeButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Marco del Tablero de Ajedrez
  boardWrapper: {
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#d3a625',
    overflow: 'hidden',
    backgroundColor: '#12253f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibleBoard: {
    width: '100%',
    height: '100%',
  },
  hiddenBoard: {
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  // Modal ¡Buena Partida!
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endGameCard: {
    width: '86%',
    backgroundColor: '#10233d',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#d3a625',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#d3a625',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  endGameFlag: {
    fontSize: 34,
    marginBottom: 6,
  },
  endGameTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 8,
  },
  endGameSubtitle: {
    fontSize: 15,
    color: '#e2e8f0',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 24,
    lineHeight: 20,
  },
  endGameButtons: {
    width: '100%',
    gap: 12,
  },
  revanchaButton: {
    backgroundColor: '#d3a625',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
  },
  revanchaButtonText: {
    color: '#0c1b30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuVolverButton: {
    backgroundColor: '#740001',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  menuVolverButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  // Modal de Ajustes
  drawerCard: {
    width: '82%',
    backgroundColor: '#10233d',
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: '#d3a625',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#24456e',
    paddingBottom: 8,
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
    gap: 10,
  },
  drawerItem: {
    backgroundColor: '#1b3b64',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30588c',
  },
  drawerItemText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewItem: {
    borderColor: '#d3a625',
  },
  saveItem: {
    backgroundColor: '#1e40af',
    borderColor: '#60a5fa',
  },
  saveText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  exitItem: {
    backgroundColor: '#740001',
    borderColor: '#ef4444',
    marginTop: 4,
  },
});
