const FILES = "abcdefgh";

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function inBounds(x, y) {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

function algebraic(x, y) {
  return `${FILES[x]}${8 - y}`;
}

function deepCloneMove(move) {
  return JSON.parse(JSON.stringify(move));
}

export class ChessEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    this.turn = "white";
    this.selected = null;
    this.gameState = "in_progress";
    this.winner = null;
    this.moveHistory = [];
    this.lastMove = null;
    this.setupPieces();
  }

  setupPieces() {
    const back = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];

    for (let x = 0; x < 8; x++) {
      this.board[0][x] = { type: back[x], color: "black", hasMoved: false };
      this.board[1][x] = { type: "pawn", color: "black", hasMoved: false };
      this.board[6][x] = { type: "pawn", color: "white", hasMoved: false };
      this.board[7][x] = { type: back[x], color: "white", hasMoved: false };
    }
  }

  getPiece(x, y) {
    if (!inBounds(x, y)) return null;
    return this.board[y][x];
  }

  isSquareAttacked(x, y, byColor, board = this.board) {
    for (let sy = 0; sy < 8; sy++) {
      for (let sx = 0; sx < 8; sx++) {
        const piece = board[sy][sx];
        if (!piece || piece.color !== byColor) continue;
        const attacks = this.getPseudoMoves(sx, sy, board, true);
        if (attacks.some((m) => m.to.x === x && m.to.y === y)) {
          return true;
        }
      }
    }
    return false;
  }

  findKing(color, board = this.board) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = board[y][x];
        if (piece && piece.type === "king" && piece.color === color) {
          return { x, y };
        }
      }
    }
    return null;
  }

  isInCheck(color, board = this.board) {
    const king = this.findKing(color, board);
    if (!king) return false;
    const enemy = color === "white" ? "black" : "white";
    return this.isSquareAttacked(king.x, king.y, enemy, board);
  }

  getPseudoMoves(x, y, board = this.board, attackOnly = false) {
    const piece = board[y][x];
    if (!piece) return [];
    const moves = [];
    const dir = piece.color === "white" ? -1 : 1;

    const pushMove = (tx, ty, extras = {}) => {
      if (!inBounds(tx, ty)) return;
      moves.push({
        from: { x, y },
        to: { x: tx, y: ty },
        piece: piece.type,
        color: piece.color,
        ...extras,
      });
    };

    const slide = (dx, dy) => {
      let tx = x + dx;
      let ty = y + dy;
      while (inBounds(tx, ty)) {
        const target = board[ty][tx];
        if (!target) {
          pushMove(tx, ty);
        } else {
          if (target.color !== piece.color) {
            pushMove(tx, ty, { capture: true });
          }
          break;
        }
        tx += dx;
        ty += dy;
      }
    };

    if (piece.type === "pawn") {
      if (attackOnly) {
        for (const dx of [-1, 1]) {
          const tx = x + dx;
          const ty = y + dir;
          if (inBounds(tx, ty)) pushMove(tx, ty, { attackOnly: true });
        }
        return moves;
      }

      const one = y + dir;
      const two = y + dir * 2;
      if (inBounds(x, one) && !board[one][x]) {
        if (one === 0 || one === 7) {
          pushMove(x, one, { promotion: "queen" });
        } else {
          pushMove(x, one);
        }

        if (!piece.hasMoved && inBounds(x, two) && !board[two][x]) {
          pushMove(x, two, { doubleStep: true });
        }
      }

      for (const dx of [-1, 1]) {
        const tx = x + dx;
        const ty = y + dir;
        if (!inBounds(tx, ty)) continue;
        const target = board[ty][tx];
        if (target && target.color !== piece.color) {
          pushMove(tx, ty, { capture: true, promotion: ty === 0 || ty === 7 ? "queen" : null });
        }
      }

      if (this.lastMove && this.lastMove.piece === "pawn" && this.lastMove.doubleStep) {
        const { to } = this.lastMove;
        if (to.y === y && Math.abs(to.x - x) === 1) {
          pushMove(to.x, y + dir, {
            capture: true,
            enPassant: true,
          });
        }
      }
    } else if (piece.type === "rook") {
      slide(1, 0);
      slide(-1, 0);
      slide(0, 1);
      slide(0, -1);
    } else if (piece.type === "bishop") {
      slide(1, 1);
      slide(1, -1);
      slide(-1, 1);
      slide(-1, -1);
    } else if (piece.type === "queen") {
      slide(1, 0);
      slide(-1, 0);
      slide(0, 1);
      slide(0, -1);
      slide(1, 1);
      slide(1, -1);
      slide(-1, 1);
      slide(-1, -1);
    } else if (piece.type === "knight") {
      const offsets = [
        [1, 2], [2, 1], [-1, 2], [-2, 1],
        [1, -2], [2, -1], [-1, -2], [-2, -1]
      ];
      for (const [dx, dy] of offsets) {
        const tx = x + dx;
        const ty = y + dy;
        if (!inBounds(tx, ty)) continue;
        const target = board[ty][tx];
        if (!target || target.color !== piece.color) {
          pushMove(tx, ty, { capture: !!target });
        }
      }
    } else if (piece.type === "king") {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (!dx && !dy) continue;
          const tx = x + dx;
          const ty = y + dy;
          if (!inBounds(tx, ty)) continue;
          const target = board[ty][tx];
          if (!target || target.color !== piece.color) {
            pushMove(tx, ty, { capture: !!target });
          }
        }
      }

      if (!attackOnly && !piece.hasMoved) {
        const row = y;
        const kingSideRook = board[row][7];
        if (
          kingSideRook &&
          kingSideRook.type === "rook" &&
          kingSideRook.color === piece.color &&
          !kingSideRook.hasMoved &&
          !board[row][5] &&
          !board[row][6]
        ) {
          pushMove(6, row, { castle: "king" });
        }

        const queenSideRook = board[row][0];
        if (
          queenSideRook &&
          queenSideRook.type === "rook" &&
          queenSideRook.color === piece.color &&
          !queenSideRook.hasMoved &&
          !board[row][1] &&
          !board[row][2] &&
          !board[row][3]
        ) {
          pushMove(2, row, { castle: "queen" });
        }
      }
    }

    return moves;
  }

  simulateMove(move, board = this.board) {
    const next = cloneBoard(board);
    const piece = { ...next[move.from.y][move.from.x] };

    if (move.enPassant) {
      const dir = piece.color === "white" ? 1 : -1;
      next[move.to.y + dir][move.to.x] = null;
    }

    if (move.castle) {
      if (move.castle === "king") {
        next[move.to.y][5] = { ...next[move.to.y][7], hasMoved: true };
        next[move.to.y][7] = null;
      } else {
        next[move.to.y][3] = { ...next[move.to.y][0], hasMoved: true };
        next[move.to.y][0] = null;
      }
    }

    next[move.from.y][move.from.x] = null;
    next[move.to.y][move.to.x] = {
      ...piece,
      type: move.promotion || piece.type,
      hasMoved: true,
    };

    return next;
  }

  getLegalMovesFor(x, y) {
    const piece = this.getPiece(x, y);
    if (!piece || piece.color !== this.turn) return [];

    const pseudo = this.getPseudoMoves(x, y);
    const legal = [];

    for (const move of pseudo) {
      if (move.castle) {
        const enemy = piece.color === "white" ? "black" : "white";
        const middleX = move.castle === "king" ? 5 : 3;
        if (
          this.isInCheck(piece.color) ||
          this.isSquareAttacked(middleX, y, enemy) ||
          this.isSquareAttacked(move.to.x, y, enemy)
        ) {
          continue;
        }
      }

      const next = this.simulateMove(move);
      if (!this.isInCheck(piece.color, next)) {
        legal.push(move);
      }
    }

    return legal;
  }

  getAllLegalMoves(color = this.turn) {
    const moves = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const piece = this.board[y][x];
        if (!piece || piece.color !== color) continue;
        const legal = this.getLegalMovesFor(x, y);
        moves.push(...legal);
      }
    }
    return moves;
  }

  makeMove(move) {
    const legalMoves = this.getLegalMovesFor(move.from.x, move.from.y);
    const legal = legalMoves.find((m) =>
      m.to.x === move.to.x &&
      m.to.y === move.to.y &&
      !!m.castle === !!move.castle &&
      !!m.enPassant === !!move.enPassant
    );
    if (!legal) return false;

    const piece = this.getPiece(legal.from.x, legal.from.y);
    const target = this.getPiece(legal.to.x, legal.to.y);
    const notation = `${piece.type} ${algebraic(legal.from.x, legal.from.y)} → ${algebraic(legal.to.x, legal.to.y)}`;

    if (legal.enPassant) {
      const dir = piece.color === "white" ? 1 : -1;
      this.board[legal.to.y + dir][legal.to.x] = null;
    }

    if (legal.castle) {
      if (legal.castle === "king") {
        this.board[legal.to.y][5] = { ...this.board[legal.to.y][7], hasMoved: true };
        this.board[legal.to.y][7] = null;
      } else {
        this.board[legal.to.y][3] = { ...this.board[legal.to.y][0], hasMoved: true };
        this.board[legal.to.y][0] = null;
      }
    }

    this.board[legal.from.y][legal.from.x] = null;
    this.board[legal.to.y][legal.to.x] = {
      ...piece,
      type: legal.promotion || piece.type,
      hasMoved: true,
    };

    this.lastMove = {
      ...deepCloneMove(legal),
      piece: piece.type,
      captured: target ? target.type : (legal.enPassant ? "pawn" : null),
      doubleStep: !!legal.doubleStep,
      notation,
    };

    this.moveHistory.push(this.lastMove);

    this.turn = this.turn === "white" ? "black" : "white";
    this.evaluateState();
    return true;
  }

  evaluateState() {
    const legal = this.getAllLegalMoves(this.turn);
    const inCheck = this.isInCheck(this.turn);
    if (legal.length === 0) {
      if (inCheck) {
        this.gameState = "checkmate";
        this.winner = this.turn === "white" ? "black" : "white";
      } else {
        this.gameState = "stalemate";
        this.winner = null;
      }
    } else if (inCheck) {
      this.gameState = "check";
      this.winner = null;
    } else {
      this.gameState = "in_progress";
      this.winner = null;
    }
  }

  getStatusText() {
    if (this.gameState === "checkmate") {
      return `Checkmate — ${this.winner[0].toUpperCase() + this.winner.slice(1)} wins`;
    }
    if (this.gameState === "stalemate") return "Stalemate";
    if (this.gameState === "check") {
      return `${this.turn[0].toUpperCase() + this.turn.slice(1)} is in check`;
    }
    return "In progress";
  }
}
