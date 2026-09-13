import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gran Comedor</Text>
      <Text style={styles.rank}>Rango: Muggle</Text>
      <View style={styles.buttonContainer}>
        <Button 
          title="Jugar Local" 
          onPress={() => navigation.navigate('Game', { mode: 'local' })} 
          color="#2a623d" // Slytherin Green
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button 
          title="Jugar Online" 
          onPress={() => navigation.navigate('Game', { mode: 'online' })} 
          color="#0e1a40" // Ravenclaw Blue
        />
      </View>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d3a625',
    marginBottom: 5,
  },
  rank: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 40,
  },
  buttonContainer: {
    marginVertical: 10,
    width: '60%',
  }
});
