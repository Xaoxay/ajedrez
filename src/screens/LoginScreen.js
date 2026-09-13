import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function LoginScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajedrez Mágico</Text>
      <Text style={styles.subtitle}>Inicia sesión para jugar</Text>
      <Button 
        title="Entrar (Temporal)" 
        onPress={() => navigation.replace('Home')} 
        color="#740001" // Gryffindor Red
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d3a625', // Gryffindor Gold
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 30,
  }
});
