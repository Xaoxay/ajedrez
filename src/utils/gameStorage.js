import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@hp_chess_saved_game';
const STATS_KEY = '@hp_chess_player_stats';

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

/**
 * Obtiene el historial de estadísticas del jugador para el cálculo de dificultad adaptada.
 */
export async function getPlayerStats() {
  try {
    const data = await AsyncStorage.getItem(STATS_KEY);
    if (!data) {
      return { wins: 0, losses: 0, draws: 0 };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al leer estadísticas:', error);
    return { wins: 0, losses: 0, draws: 0 };
  }
}

/**
 * Registra el resultado de una partida para nutrir el algoritmo adaptativo.
 * @param {'win' | 'loss' | 'draw'} result 
 */
export async function recordGameResult(result) {
  try {
    const current = await getPlayerStats();
    if (result === 'win') current.wins += 1;
    else if (result === 'loss') current.losses += 1;
    else if (result === 'draw') current.draws += 1;

    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(current));
    return current;
  } catch (error) {
    console.error('Error al registrar resultado:', error);
    return null;
  }
}
