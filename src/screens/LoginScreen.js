import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

export default function LoginScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logoImage}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.title}>JAKE-MATE</Text>
      <Text style={styles.subtitle}>El Duelo Mágico de Ajedrez</Text>

      <TouchableOpacity
        style={styles.enterButton}
        activeOpacity={0.8}
        onPress={() => navigation.replace('Home')}
      >
        <Text style={styles.enterButtonText}>⚔️ Entrar al Juego</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0c0d12',
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#d3a625',
    overflow: 'hidden',
    shadowColor: '#d3a625',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 12,
    marginBottom: 24,
    backgroundColor: '#161722',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#d3a625',
    letterSpacing: 4,
    marginBottom: 6,
    textShadowColor: 'rgba(211, 166, 37, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e99a8',
    marginBottom: 40,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  enterButton: {
    backgroundColor: '#740001',
    borderColor: '#d3a625',
    borderWidth: 1.5,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 30,
    shadowColor: '#740001',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  enterButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
