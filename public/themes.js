/* Temas do Ludo. seats[k] = personagem/cor do assento k (0 esquerda-cima, 1 direita-cima, 2 direita-baixo, 3 esquerda-baixo).
   Só usa nomes, cores e emojis: sem imagens nem músicas oficiais. Para usar arte própria, troque aqui. */
window.THEMES = {
  classic: {
    name: 'Clássico', pawn: 'classic', bg: '#1B2B52', paper: '#F8F5EE', wood: 0x5b3a22, slab: 0x1B2B52,
    seats: [{ n: 'Vermelho', c: '#E5484D', e: '🔴' }, { n: 'Verde', c: '#3BB273', e: '🟢' }, { n: 'Amarelo', c: '#F2C14E', e: '🟡' }, { n: 'Azul', c: '#4D96FF', e: '🔵' }]
  },
  transformers: {
    name: 'Transformers', pawn: 'robot', bg: '#1b2230', paper: '#C7CFDA', wood: 0x2a2f38, slab: 0x161b25,
    seats: [{ n: 'Optimus Prime', c: '#D7263D', e: '🚛' }, { n: 'Bumblebee', c: '#F6C90E', e: '🐝' }, { n: 'Megatron', c: '#8E4FC4', e: '🦾' }, { n: 'Soundwave', c: '#2F7DE1', e: '📡' }]
  },
  shrek: {
    name: 'Shrek', pawn: 'round', bg: '#2a3a1f', paper: '#EADFB4', wood: 0x4a3a1e, slab: 0x22301a,
    seats: [{ n: 'Shrek', c: '#6AA84F', e: '🧅' }, { n: 'Burro', c: '#9AA5B1', e: '🫏' }, { n: 'Gato de Botas', c: '#F28C28', e: '🐱' }, { n: 'Fiona', c: '#E56BA6', e: '👸' }]
  }
};
