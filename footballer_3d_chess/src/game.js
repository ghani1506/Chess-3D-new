export function chooseAIMove(engine) {
  const moves = engine.getAllLegalMoves(engine.turn);
  if (!moves.length) return null;

  const scored = moves.map((move) => {
    let score = 0;
    if (move.capture) score += 25;
    if (move.castle) score += 12;
    if (move.promotion) score += 35;

    const centrality = 7 - (Math.abs(3.5 - move.to.x) + Math.abs(3.5 - move.to.y));
    score += centrality * 1.2;

    const pieceWeight = {
      pawn: 3, knight: 6, bishop: 6, rook: 5, queen: 2, king: 1
    };
    score += pieceWeight[move.piece] || 0;
    score += Math.random() * 4;
    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}
