import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSavedGame, clearSavedGame, getPlayerStats } from '../utils/gameStorage';

export default function HomeScreen({ navigation }) {
  const [savedGame, setSavedGame] = useState(null);
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0 });
  const [difficultyModalVisible, setDifficultyModalVisible] = useState(false);

  // Comprobar si hay una partida guardada y estadísticas cada vez que se entra a la pantalla
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        const game = await getSavedGame();
        const playerStats = await getPlayerStats();
        if (isActive) {
          setSavedGame(game);
          setStats(playerStats);
        }
      })();
      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleDeleteSavedGame = () => {
    Alert.alert(
      'Descartar Partida',
      '¿Deseas eliminar la partida guardada de tu dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await clearSavedGame();
            setSavedGame(null);
          },
        },
      ]
    );
  };

  const getModeLabel = (mode, difficulty) => {
    switch (mode) {
      case 'bot':
        return `Contra la Máquina (${getDifficultyLabel(difficulty)})`;
      case 'timer':
        return 'Contrarreloj';
      case 'sudden_death':
        return 'Muerte Súbita';
      default:
        return 'Duelo Local';
    }
  };

  const getDifficultyLabel = (diff) => {
    switch (diff) {
      case 'normal':
        return 'Normal';
      case 'dificil':
        return 'Difícil';
      case 'adaptada':
        return 'Adaptada';
      case 'magnus':
        return '👑 Magnus Carlsen';
      default:
        return 'Medio';
    }
  };

  const difficulties = [
    {
      id: 'normal',
      title: '🟢 Normal',
      desc: 'Movimientos básicos, comete errores humanos ocasionales.',
      color: '#2ed573',
    },
    {
      id: 'medio',
      title: '🟡 Medio',
      desc: 'Táctica equilibrada, defiende piezas y busca capturas.',
      color: '#ffa502',
    },
    {
      id: 'dificil',
      title: '🔴 Difícil',
      desc: 'Cálculo profundo Minimax, anticipa tus jugadas.',
      color: '#ff4757',
    },
    {
      id: 'adaptada',
      title: '⚡ Adaptada (IA Dinámica)',
      desc: 'El bot ajusta su fuerza según tu historial de juego.',
      color: '#1e90ff',
    },
    {
      id: 'magnus',
      title: '👑 Magnus Carlsen',
      desc: 'El Gran Maestro Campeón del Mundo: implacable y letal.',
      color: '#d3a625',
      special: true,
    },
  ];

  const handleSelectDifficulty = (difficultyId) => {
    setDifficultyModalVisible(false);
    navigation.navigate('Game', { mode: 'bot', difficulty: difficultyId });
  };

  const gameModes = [
    {
      id: 'local',
      title: '⚔️ Duelo Local (1 vs 1)',
      desc: 'Dos jugadores frente a frente en el mismo tablero.',
      color: '#1b3a27',
      border: '#2a623d',
      action: () => navigation.navigate('Game', { mode: 'local' }),
    },
    {
      id: 'bot',
      title: '🤖 Contra la Máquina',
      desc: 'Elige tu rival: Normal, Medio, Difícil, Adaptada o Magnus.',
      color: '#0e1d3a',
      border: '#20407a',
      action: () => setDifficultyModalVisible(true),
    },
    {
      id: 'timer_3',
      title: '⏳ Contrarreloj (3 Minutos)',
      desc: 'Partida Blitz rápida con reloj digital de ajedrez.',
      color: '#420d11',
      border: '#740001',
      action: () => navigation.navigate('Game', { mode: 'timer', timeLimit: 180 }),
    },
    {
      id: 'timer_5',
      title: '⏳ Contrarreloj (5 Minutos)',
      desc: 'Tiempo clásico para duelos de alta concentración.',
      color: '#381318',
      border: '#6b1923',
      action: () => navigation.navigate('Game', { mode: 'timer', timeLimit: 300 }),
    },
    {
      id: 'sudden_death',
      title: '⚡ Muerte Súbita (15 seg/turno)',
      desc: '¡Mueve antes de que se agoten los 15s por jugada o pierdes!',
      color: '#3d3010',
      textColor: '#ffd32a',
      border: '#d3a625',
      action: () => navigation.navigate('Game', { mode: 'sudden_death', turnLimit: 15 }),
    },
    {
      id: 'online',
      title: '🌐 Duelo Online',
      desc: 'Juega a distancia con amigos (Próximamente).',
      color: '#1e222b',
      border: '#3c4354',
      action: () => navigation.navigate('Game', { mode: 'online' }),
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
      {/* Cabecera con Logo de Caballo e Identidad Jake-Mate */}
      <View style={styles.header}>
        <View style={styles.logoRing}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.title}>JAKE-MATE</Text>
        <Text style={styles.subtitle}>Ajedrez Táctico & Mágico</Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.rank}>🏆 Rango: Gran Maestro</Text>
          </View>
          <View style={styles.statsBadge}>
            <Text style={styles.statsText}>
              Record IA: {stats.wins}V - {stats.losses}D {stats.draws > 0 ? `(${stats.draws}E)` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Tarjeta de Partida Guardada (si existe) */}
      {savedGame && (
        <View style={styles.savedContainer}>
          <TouchableOpacity
            style={styles.savedCard}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('Game', {
                mode: savedGame.mode,
                difficulty: savedGame.difficulty,
                timeLimit: savedGame.timeLimit,
                turnLimit: savedGame.turnLimit,
                savedGame: savedGame,
              })
            }
          >
            <View style={styles.savedCardHeader}>
              <View style={styles.savedTitleRow}>
                <Text style={styles.savedIcon}>📂</Text>
                <Text style={styles.savedTitle}>Continuar Partida</Text>
              </View>
              <TouchableOpacity onPress={handleDeleteSavedGame} style={styles.deleteButton}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.savedDetails}>
              Modo: {getModeLabel(savedGame.mode, savedGame.difficulty)} • Turno:{' '}
              {savedGame.currentTurn === 'w' ? '⚪ Blancas' : '⚫ Negras'}
            </Text>
            <Text style={styles.savedTime}>Guardada en tu teléfono</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Selector de Modos de Juego */}
      <View style={styles.modesContainer}>
        {gameModes.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.modeCard,
              { backgroundColor: item.color, borderColor: item.border },
            ]}
            activeOpacity={0.8}
            onPress={item.action}
          >
            <Text style={[styles.cardTitle, item.textColor ? { color: item.textColor } : null]}>
              {item.title}
            </Text>
            <Text style={[styles.cardDesc, item.textColor ? { color: '#e0c068' } : null]}>
              {item.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Modal Selector de Dificultad para Modo Bot */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={difficultyModalVisible}
        onRequestClose={() => setDifficultyModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDifficultyModalVisible(false)}
        >
          <View style={styles.difficultyCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dificultad de la IA</Text>
              <TouchableOpacity
                onPress={() => setDifficultyModalVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.difficultyList}>
              {difficulties.map((diff) => (
                <TouchableOpacity
                  key={diff.id}
                  style={[
                    styles.diffItem,
                    diff.special && styles.magnusItem,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleSelectDifficulty(diff.id)}
                >
                  <Text style={[styles.diffTitle, { color: diff.color }]}>
                    {diff.title}
                  </Text>
                  <Text style={styles.diffDesc}>{diff.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0d12',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2.5,
    borderColor: '#d3a625',
    overflow: 'hidden',
    shadowColor: '#d3a625',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 14,
    backgroundColor: '#161722',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#d3a625',
    letterSpacing: 3,
    textShadowColor: 'rgba(211, 166, 37, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8e99a8',
    marginTop: 3,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  badge: {
    backgroundColor: '#191b24',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d3a625',
  },
  rank: {
    fontSize: 13,
    color: '#f5cd79',
    fontWeight: 'bold',
  },
  statsBadge: {
    backgroundColor: '#15161f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#303446',
  },
  statsText: {
    color: '#a4b0be',
    fontSize: 12,
    fontWeight: '600',
  },
  // Partida guardada
  savedContainer: {
    width: '100%',
    marginBottom: 16,
  },
  savedCard: {
    backgroundColor: '#151720',
    borderColor: '#d3a625',
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#d3a625',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  savedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  savedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savedIcon: {
    fontSize: 18,
  },
  savedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d3a625',
  },
  deleteButton: {
    padding: 4,
  },
  deleteText: {
    color: '#ff6b81',
    fontSize: 16,
    fontWeight: 'bold',
  },
  savedDetails: {
    color: '#f1f2f6',
    fontSize: 14,
    marginBottom: 4,
  },
  savedTime: {
    color: '#8e99a8',
    fontSize: 12,
  },
  modesContainer: {
    width: '100%',
    gap: 12,
  },
  modeCard: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    color: '#cbd1db',
    lineHeight: 18,
  },
  // Modal de Dificultades
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  difficultyCard: {
    width: '88%',
    backgroundColor: '#151722',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.8,
    borderColor: '#d3a625',
    shadowColor: '#d3a625',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2b2e40',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d3a625',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#a4b0be',
    fontSize: 18,
    fontWeight: 'bold',
  },
  difficultyList: {
    gap: 10,
  },
  diffItem: {
    backgroundColor: '#202231',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#34384e',
  },
  magnusItem: {
    borderColor: '#d3a625',
    backgroundColor: '#28241b',
  },
  diffTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  diffDesc: {
    fontSize: 12,
    color: '#ced6e0',
  },
});
