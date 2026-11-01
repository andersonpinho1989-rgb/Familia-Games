/**
 * Interface comum de todos os jogos.
 * ctx = { players(): [{id,name,color,connected}], vip(): playerId, update(): void }
 *  - players() vem na ordem de entrada (use para turnos).
 *  - update() reenvia o estado para TV e celulares; chame após qualquer mudança.
 * O servidor NUNCA confia no cliente: valide tudo em onAction.
 */
class GameEngine {
  static meta = { id: 'base', name: 'Base', emoji: '🎲', min: 1, max: 8, available: false };
  constructor(ctx) { this.ctx = ctx; }
  onStart() {}                         // chamado quando o VIP inicia o jogo
  onAction(playerId, type, payload) {} // ação vinda de um celular
  onPlayerChange() {}                  // jogador conectou/desconectou
  hostView() { return {}; }            // JSON público para a TV
  playerView(playerId) { return {}; }  // JSON privado para o celular (cartas, mão, turno)
  destroy() {}                         // limpe timers aqui
}
module.exports = GameEngine;
