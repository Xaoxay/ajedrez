import { Chess } from 'chess.js';
import { getPlayerStats } from './gameStorage';

// Valores de piezas
const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Tablas de valores posicionales para piezas negras (desde la perspectiva de la IA)
const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

function getSquareCoords(square) {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = 8 - parseInt(square[1], 10);
  return { file, rank };
}

/**
 * Evaluación estática de una posición desde la perspectiva de las Negras.
 */
function evaluateBoard(chess) {
  if (chess.isCheckmate()) {
    return chess.turn() === 'b' ? -50000 : 50000;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
    return 0;
  }

  let totalScore = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;

      const val = PIECE_VALUES[piece.type] || 0;
      let posBonus = 0;

      if (piece.type === 'p') {
        posBonus = piece.color === 'b' ? PAWN_TABLE[r][f] : PAWN_TABLE[7 - r][f];
      } else if (piece.type === 'n') {
        posBonus = piece.color === 'b' ? KNIGHT_TABLE[r][f] : KNIGHT_TABLE[7 - r][f];
      }

      const score = val + posBonus;
      if (piece.color === 'b') {
        totalScore += score;
      } else {
        totalScore -= score;
      }
    }
  }

  return totalScore;
}

/**
 * Algoritmo Minimax con poda Alfa-Beta para cálculo táctico profundo.
 */
function minimax(chess, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  const moves = chess.moves({ verbose: true });
  // Ordenar capturas primero para maximizar la poda alfa-beta
  moves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalScore = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalScore = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/**
 * Obtiene la mejor jugada para el turno de la IA según el nivel de dificultad seleccionado.
 * @param {string} fen Posición actual FEN
 * @param {string} difficulty 'normal' | 'medio' | 'dificil' | 'adaptada' | 'magnus'
 */
export async function getBestMove(fen, difficulty = 'medio') {
  try {
    const chess = new Chess(fen);
    if (chess.isGameOver()) return null;

    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    let targetDifficulty = difficulty;

    // Dificultad Adaptada: evalúa el rendimiento del jugador
    if (targetDifficulty === 'adaptada') {
      const stats = await getPlayerStats();
      const totalGames = stats.wins + stats.losses;
      if (totalGames < 2) {
        targetDifficulty = 'medio';
      } else {
        const winRate = stats.wins / totalGames;
        if (winRate > 0.65) targetDifficulty = 'magnus';
        else if (winRate > 0.45) targetDifficulty = 'dificil';
        else if (winRate > 0.3) targetDifficulty = 'medio';
        else targetDifficulty = 'normal';
      }
    }

    // 1. Dificultad NORMAL (Principiante / Errores humanos)
    if (targetDifficulty === 'normal') {
      // 40% de probabilidades de elegir un movimiento al azar para darle ventajas al jugador
      if (Math.random() < 0.4) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        return {
          from: randomMove.from,
          to: randomMove.to,
          promotion: randomMove.promotion || 'q',
        };
      }
    }

    // 2. Dificultad MEDIO (Profundidad 1 con evaluación material y capturas)
    if (targetDifficulty === 'medio' || targetDifficulty === 'normal') {
      let bestMove = moves[0];
      let bestScore = -Infinity;

      for (const move of moves) {
        chess.move(move);
        let score = evaluateBoard(chess);
        chess.undo();

        // Variabilidad sutil
        score += Math.floor(Math.random() * 10);

        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }

      return {
        from: bestMove.from,
        to: bestMove.to,
        promotion: bestMove.promotion || 'q',
      };
    }

    // 3. Dificultad DIFÍCIL (Profundidad 2 con Minimax + Alfa-Beta)
    if (targetDifficulty === 'dificil') {
      let bestMove = moves[0];
      let bestScore = -Infinity;

      for (const move of moves) {
        chess.move(move);
        const score = minimax(chess, 1, -Infinity, Infinity, false);
        chess.undo();

        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }

      return {
        from: bestMove.from,
        to: bestMove.to,
        promotion: bestMove.promotion || 'q',
      };
    }

    // 4. Modo MAGNUS CARLSEN (Profundidad 3 con Minimax, evaluación implacable)
    if (targetDifficulty === 'magnus') {
      let bestMove = moves[0];
      let bestScore = -Infinity;

      // Ordenar capturas primero
      moves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

      for (const move of moves) {
        chess.move(move);
        const score = minimax(chess, 2, -Infinity, Infinity, false);
        chess.undo();

        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }

      return {
        from: bestMove.from,
        to: bestMove.to,
        promotion: bestMove.promotion || 'q',
      };
    }

    // Por defecto retornar primer movimiento
    return {
      from: moves[0].from,
      to: moves[0].to,
      promotion: moves[0].promotion || 'q',
    };
  } catch (error) {
    console.error('Error calculando jugada de IA:', error);
    return null;
  }
}
