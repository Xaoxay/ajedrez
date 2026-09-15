import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@hp_chess_saved_game';

/**
 * Guarda el estado actual de la partida en el almacenamiento local del dispositivo.
 */
export async function saveGameLocally(gameState) {
  try {
    const payload = {
      ...gameState,
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Error al guardar partida localmente:', error);
    return false;
  }
}

/**
 * Recupera la partida guardada localmente si existe.
 */
export async function getSavedGame() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al cargar partida local:', error);
    return null;
  }
}

/**
 * Borra la partida guardada.
 */
export async function clearSavedGame() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error al eliminar partida guardada:', error);
    return false;
  }
}
