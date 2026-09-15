import { Chess } from 'chess.js';

// Valores aproximados de las piezas en centipeones
const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Bonificación por control del centro
const CENTER_SQUARES = ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'];

/**
 * Evalúa un movimiento específico según material, capturas y táctica.
 */
function evaluateMove(chess, move) {
  let score = 0;

  // Si la jugada captura una pieza, sumamos el valor de la pieza capturada
  if (move.captured) {
    const capturedVal = PIECE_VALUES[move.captured] || 100;
    const pieceVal = PIECE_VALUES[move.piece] || 100;
    // Si capturamos con una pieza menor una pieza mayor, premio extra
    score += capturedVal * 10 + (capturedVal - pieceVal);
  }

  // Si la jugada promociona
  if (move.promotion) {
    score += 800;
  }

  // Simular la jugada para evaluar la posición resultante
  chess.move(move);

  // Si da jaque mate, máxima prioridad
  if (chess.isCheckmate()) {
    score += 50000;
  } else if (chess.isCheck()) {
    score += 60;
  }

  // Bonificación por posicionarse en el centro
  if (CENTER_SQUARES.includes(move.to)) {
    score += 20;
  }

  // Deshacer la simulación
  chess.undo();

  // Factor aleatorio sutil para variedad
  score += Math.floor(Math.random() * 15);

  return score;
}

/**
 * Obtiene la mejor jugada para el turno actual dado un FEN.
 * @param {string} fen Posición actual en formato FEN.
 * @returns {{ from: string, to: string, promotion?: string } | null}
 */
export function getBestMove(fen) {
  try {
    const chess = new Chess(fen);
    if (chess.isGameOver()) return null;

    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    let bestMove = moves[0];
    let highestScore = -Infinity;

    for (const move of moves) {
      const score = evaluateMove(chess, move);
      if (score > highestScore) {
        highestScore = score;
        bestMove = move;
      }
    }

    return {
      from: bestMove.from,
      to: bestMove.to,
      promotion: bestMove.promotion || 'q',
    };
  } catch (error) {
    console.error('Error calculando jugada de IA:', error);
    return null;
  }
}
