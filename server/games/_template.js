// Copie este arquivo para criar um novo jogo (ex.: ludo.js) e registre em games/index.js
const GameEngine = require('./GameEngine');
class MeuJogo extends GameEngine {
  static meta = { id: 'meujogo', name: 'Meu Jogo', emoji: '🎲', min: 2, max: 4, available: true };
  onStart() { this.turn = 0; this.ctx.update(); }
  currentPlayer() { return this.ctx.players()[this.turn % this.ctx.players().length].id; }
  onAction(pid, type, payload) {
    if (pid !== this.currentPlayer()) return;      // valide o turno SEMPRE no servidor
    // ... aplique regras, depois:
    this.turn++; this.ctx.update();
  }
  hostView() { return { turn: this.currentPlayer() }; }                 // tabuleiro público
  playerView(pid) { return { myTurn: pid === this.currentPlayer() }; }  // dados privados
}
module.exports = MeuJogo;
