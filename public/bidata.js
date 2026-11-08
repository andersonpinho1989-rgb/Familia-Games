/* Dados do Banco Imobiliário (tabuleiro, grupos, fichas, cartas). Usado pelo servidor (require) e pelas telas (window.BI).
   Nomes, valores e cartas são originais: edite à vontade. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.BI = factory(); })(this, function () {
  var GROUP = {
    marrom: { c: '#8B5A2B', n: 'Marrom' }, azulclaro: { c: '#8FD3F4', n: 'Azul-claro' }, rosa: { c: '#E76FA6', n: 'Rosa' }, laranja: { c: '#F4A03A', n: 'Laranja' },
    vermelho: { c: '#E5484D', n: 'Vermelho' }, amarelo: { c: '#F2D03B', n: 'Amarelo' }, verde: { c: '#3BB273', n: 'Verde' }, azul: { c: '#2F5FD0', n: 'Azul-escuro' }
  };
  var SQ = new Array(40);
  function prop(i, name, g, price, house, rent) { SQ[i] = { i: i, type: 'prop', name: name, group: g, price: price, house: house, rent: rent, mort: price / 2 }; }
  function other(i, type, name, extra) { var o = { i: i, type: type, name: name }; for (var k in extra) o[k] = extra[k]; SQ[i] = o; }
  other(0, 'start', 'Início');
  prop(1, 'Vila Nova', 'marrom', 60, 50, [2, 10, 30, 90, 160, 250]);
  other(2, 'card', 'Sorte ou Revés');
  prop(3, 'Jardim das Flores', 'marrom', 60, 50, [4, 20, 60, 180, 320, 450]);
  other(4, 'tax', 'Imposto de Renda', { amt: 200 });
  other(5, 'station', 'Estação Central', { price: 200, mort: 100 });
  prop(6, 'Praia Azul', 'azulclaro', 100, 50, [6, 30, 90, 270, 400, 550]);
  other(7, 'card', 'Sorte ou Revés');
  prop(8, 'Ilha Bela', 'azulclaro', 100, 50, [6, 30, 90, 270, 400, 550]);
  prop(9, 'Porto Seguro', 'azulclaro', 120, 50, [8, 40, 100, 300, 450, 600]);
  other(10, 'jail', 'Prisão / Visita');
  prop(11, 'Av. das Palmeiras', 'rosa', 140, 100, [10, 50, 150, 450, 625, 750]);
  other(12, 'util', 'Companhia de Energia', { price: 150, mort: 75 });
  prop(13, 'Rua das Acácias', 'rosa', 140, 100, [10, 50, 150, 450, 625, 750]);
  prop(14, 'Alameda dos Ipês', 'rosa', 160, 100, [12, 60, 180, 500, 700, 900]);
  other(15, 'station', 'Terminal Rodoviário', { price: 200, mort: 100 });
  prop(16, 'Largo do Chafariz', 'laranja', 180, 100, [14, 70, 200, 550, 750, 950]);
  other(17, 'card', 'Sorte ou Revés');
  prop(18, 'Rua do Mercado', 'laranja', 180, 100, [14, 70, 200, 550, 750, 950]);
  prop(19, 'Av. Comercial', 'laranja', 200, 100, [16, 80, 220, 600, 800, 1000]);
  other(20, 'parking', 'Parada Livre');
  prop(21, 'Rua das Mangueiras', 'vermelho', 220, 150, [18, 90, 250, 700, 875, 1050]);
  other(22, 'card', 'Sorte ou Revés');
  prop(23, 'Praça da Matriz', 'vermelho', 220, 150, [18, 90, 250, 700, 875, 1050]);
  prop(24, 'Av. Beira-Rio', 'vermelho', 240, 150, [20, 100, 300, 750, 925, 1100]);
  other(25, 'station', 'Aeroporto', { price: 200, mort: 100 });
  prop(26, 'Alto da Serra', 'amarelo', 260, 150, [22, 110, 330, 800, 975, 1150]);
  prop(27, 'Vale Verde', 'amarelo', 260, 150, [22, 110, 330, 800, 975, 1150]);
  other(28, 'util', 'Companhia de Água', { price: 150, mort: 75 });
  prop(29, 'Mirante Real', 'amarelo', 280, 150, [24, 120, 360, 850, 1025, 1200]);
  other(30, 'gotojail', 'Vá para a Prisão');
  prop(31, 'Av. Atlântica Sul', 'verde', 300, 200, [26, 130, 390, 900, 1100, 1275]);
  prop(32, 'Rua dos Cristais', 'verde', 300, 200, [26, 130, 390, 900, 1100, 1275]);
  other(33, 'card', 'Sorte ou Revés');
  prop(34, 'Av. Imperial', 'verde', 320, 200, [28, 150, 450, 1000, 1200, 1400]);
  other(35, 'station', 'Porto', { price: 200, mort: 100 });
  other(36, 'card', 'Sorte ou Revés');
  prop(37, 'Cobertura Premium', 'azul', 350, 200, [35, 175, 500, 1100, 1300, 1500]);
  other(38, 'tax', 'Taxa de Luxo', { amt: 100 });
  prop(39, 'Palácio das Nações', 'azul', 400, 200, [50, 200, 600, 1400, 1700, 2000]);

  var GROUPS = {}; SQ.forEach(function (s) { if (s.group) (GROUPS[s.group] = GROUPS[s.group] || []).push(s.i); });

  var TOKENS = [{ n: 'Carro', e: '🚗', c: '#E5484D' }, { n: 'Cartola', e: '🎩', c: '#4D96FF' }, { n: 'Cachorro', e: '🐕', c: '#3BB273' },
    { n: 'Navio', e: '🚢', c: '#F2C14E' }, { n: 'Bota', e: '👢', c: '#9B5DE5' }, { n: 'Foguete', e: '🚀', c: '#FF8C42' }];

  // 28 cartas de "Sorte ou Revés" (texto original)
  var CARDS = [
    { t: 'collect', amt: 200, text: 'Você ganhou na loteria! Receba R$ 200.' },
    { t: 'collect', amt: 100, text: 'Herança inesperada de uma tia distante: receba R$ 100.' },
    { t: 'collect', amt: 50, text: 'Restituição do imposto: receba R$ 50.' },
    { t: 'collect', amt: 150, text: 'Venda de ações com lucro: receba R$ 150.' },
    { t: 'collect', amt: 50, text: 'Dividendos do banco: receba R$ 50.' },
    { t: 'collect', amt: 20, text: 'Você achou dinheiro na rua: receba R$ 20.' },
    { t: 'collect', amt: 10, text: 'Prêmio de simpatia no bairro: receba R$ 10.' },
    { t: 'eachGive', amt: 25, text: 'Seu aniversário! Cada jogador lhe dá R$ 25.' },
    { t: 'moveTo', sq: 0, text: 'Avance até o Início e receba o salário.' },
    { t: 'moveTo', sq: 6, text: 'Passeio na praia: avance até Praia Azul.' },
    { t: 'moveTo', sq: 39, text: 'Convite para um evento de gala: avance até o Palácio das Nações.' },
    { t: 'moveTo', sq: 23, text: 'Feira na praça: avance até a Praça da Matriz.' },
    { t: 'moveTo', sq: 3, text: 'Visita à vovó: avance até o Jardim das Flores.' },
    { t: 'moveTo', sq: 20, text: 'Dia de folga: vá até a Parada Livre.' },
    { t: 'nearest', kind: 'station', text: 'Avance até a Estação mais próxima. Se tiver dono, pague o dobro do aluguel.' },
    { t: 'nearest', kind: 'util', text: 'Avance até a Companhia mais próxima. Se tiver dono, pague 10 vezes o valor do dado.' },
    { t: 'back', n: 3, text: 'Você se perdeu no caminho: volte 3 casas.' },
    { t: 'jail', text: 'Vá direto para a prisão! Não passe pelo Início.' },
    { t: 'jailCard', text: 'Saia da prisão de graça! Guarde esta carta até precisar.' },
    { t: 'pay', amt: 50, text: 'Multa de trânsito: pague R$ 50.' },
    { t: 'pay', amt: 100, text: 'Conta do médico: pague R$ 100.' },
    { t: 'pay', amt: 150, text: 'Mensalidade da escola: pague R$ 150.' },
    { t: 'pay', amt: 75, text: 'O seguro do carro venceu: pague R$ 75.' },
    { t: 'pay', amt: 60, text: 'Imposto da casa de veraneio: pague R$ 60.' },
    { t: 'pay', amt: 100, text: 'Doação ao hospital da cidade: pague R$ 100.' },
    { t: 'payEach', amt: 25, text: 'Festa surpresa! Pague R$ 25 a cada jogador.' },
    { t: 'repairs', house: 40, hotel: 115, text: 'Reforma geral: pague R$ 40 por casa e R$ 115 por hotel.' },
    { t: 'repairs', house: 25, hotel: 100, text: 'Conserto do telhado: pague R$ 25 por casa e R$ 100 por hotel.' }
  ];

  var fmt = function (n) { return 'R$ ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  return { GROUP: GROUP, SQ: SQ, GROUPS: GROUPS, TOKENS: TOKENS, CARDS: CARDS, fmt: fmt, HOUSES: 32, HOTELS: 12, JAIL: 10, FINE: 50 };
});
