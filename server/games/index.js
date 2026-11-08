const Adedonha = require('./adedonha');
const Ludo = require('./ludo');
const Chess = require('./chess');
const Dama = require('./dama');
const soon = (id, name, emoji, min, max) => ({ meta: { id, name, emoji, min, max, available: false } });
// Para ativar um jogo: crie a classe (veja _template.js) e troque a linha "soon" por require().
const GAMES = {
  adedonha: Adedonha,
  ludo: Ludo,
  banco: soon('banco', 'Banco Imobiliário', '🏠', 2, 6),
  xadrez: Chess,
  dama: Dama,
  domino: soon('domino', 'Dominó', '🁢', 2, 4),
};
module.exports = { GAMES, list: () => Object.values(GAMES).map((g) => g.meta) };
