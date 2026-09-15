import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSavedGame, clearSavedGame } from '../utils/gameStorage';

export default function HomeScreen({ navigation }) {
  const [savedGame, setSavedGame] = useState(null);

  // Comprobar si hay una partida guardada cada vez que se entra a la pantalla
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        const game = await getSavedGame();
        if (isActive) {
          setSavedGame(game);
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

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'bot':
        return 'Contra la Máquina';
      case 'timer':
        return 'Contrarreloj';
      case 'sudden_death':
        return 'Muerte Súbita';
      default:
        return 'Duelo Local';
    }
  };

  const gameModes = [
    {
      id: 'local',
      title: '⚔️ Duelo Local (1 vs 1)',
      desc: 'Dos magos frente a frente en el mismo tablero.',
      color: '#2a623d', // Slytherin Green
      border: '#5d8a68',
      params: { mode: 'local' },
    },
    {
      id: 'bot',
      title: '🤖 Contra la Máquina',
      desc: 'Enfréntate al autómata de ajedrez mágico.',
      color: '#0e1a40', // Ravenclaw Blue
      border: '#4a69bd',
      params: { mode: 'bot' },
    },
    {
      id: 'timer_3',
      title: '⏳ Contrarreloj (3 Minutos)',
      desc: 'Partida Blitz rápida con reloj de ajedrez.',
      color: '#740001', // Gryffindor Red
      border: '#b83b3e',
      params: { mode: 'timer', timeLimit: 180 },
    },
    {
      id: 'timer_5',
      title: '⏳ Contrarreloj (5 Minutos)',
      desc: 'Tiempo estándar para duelos de alta tensión.',
      color: '#5c1b24',
      border: '#a34855',
      params: { mode: 'timer', timeLimit: 300 },
    },
    {
      id: 'sudden_death',
      title: '⚡ Muerte Súbita (15 seg/turno)',
      desc: '¡Mueve antes de que se agoten los 15 segundos o pierdes!',
      color: '#d3a625', // Gold
      textColor: '#1a1a1a',
      border: '#f5cd79',
      params: { mode: 'sudden_death', turnLimit: 15 },
    },
    {
      id: 'online',
      title: '🌐 Duelo Online',
      desc: 'Juega a distancia con amigos (Próximamente).',
      color: '#222f3e',
      border: '#576574',
      params: { mode: 'online' },
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sala Principal</Text>
        <Text style={styles.subtitle}>Duelos Mágicos de Ajedrez</Text>
        <View style={styles.badge}>
          <Text style={styles.rank}>🧙‍♂️ Rango: Aprendiz Muggle</Text>
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
                timeLimit: savedGame.timeLimit,
                turnLimit: savedGame.turnLimit,
                savedGame: savedGame,
              })
            }
          >
            <View style={styles.savedCardHeader}>
              <Text style={styles.savedTitle}>📂 Continuar Partida</Text>
              <TouchableOpacity onPress={handleDeleteSavedGame} style={styles.deleteButton}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.savedDetails}>
              Modo: {getModeLabel(savedGame.mode)} • Turno:{' '}
              {savedGame.currentTurn === 'w' ? '⚪ Blancas' : '⚫ Negras'}
            </Text>
            <Text style={styles.savedTime}>
              Guardada en este dispositivo
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.modesContainer}>
        {gameModes.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.modeCard,
              { backgroundColor: item.color, borderColor: item.border },
            ]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Game', item.params)}
          >
            <Text style={[styles.cardTitle, item.textColor ? { color: item.textColor } : null]}>
              {item.title}
            </Text>
            <Text style={[styles.cardDesc, item.textColor ? { color: '#333' } : null]}>
              {item.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d3a625', // Gryffindor Gold
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: '#a4b0be',
    marginTop: 4,
  },
  badge: {
    marginTop: 12,
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  rank: {
    fontSize: 14,
    color: '#ecf0f1',
    fontWeight: '600',
  },
  // Partida guardada
  savedContainer: {
    width: '100%',
    marginBottom: 16,
  },
  savedCard: {
    backgroundColor: '#1e272e',
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
    color: '#a4b0be',
    fontSize: 12,
  },
  modesContainer: {
    width: '100%',
    gap: 14,
  },
  modeCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#dcdde1',
    lineHeight: 18,
  },
});
