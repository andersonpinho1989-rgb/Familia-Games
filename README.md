# Família Games (estilo Jackbox)

## Rodar localmente
1. `npm install` e `npm start`
2. TV: abra `http://IP-DO-PC:3000` (descubra o IP com `ipconfig` / `ifconfig`; TV e celulares na mesma Wi-Fi).
3. Celulares: escaneiem o QR Code. O primeiro a entrar (⭐) escolhe o jogo e inicia.

## Deploy grátis na Render
1. Suba a pasta para um repositório no GitHub.
2. Render → New → Web Service → conecte o repo (o `render.yaml` já configura tudo) → plano Free.
3. Abra `https://seu-app.onrender.com` na TV. O QR Code já usa essa URL (HTTPS).
Obs.: o plano free "dorme" após ~15 min sem uso; o primeiro acesso demora ~50 s.
Vercel não serve para o servidor (funções serverless não mantêm WebSocket); só hospedaria o frontend estático.

## Novo jogo
Copie `server/games/_template.js`, implemente `onStart / onAction / hostView / playerView`,
registre em `server/games/index.js` e renderize a view em `public/index.html` (TV) e `public/play.html` (celular).

## Ludo (2–4 jogadores)
- Cores por assento (vermelho, verde, amarelo, azul). Com 2 jogadores, ficam em lados opostos.
- Precisa tirar **6** para tirar uma peça da base. Tirar 6 ou capturar dá **jogada extra**; três 6 seguidos perdem a vez.
- Capturar = cair numa casa com peça adversária (exceto casas de largada e ★, que são seguras). A peça capturada volta à base.
- Para chegar em casa é preciso o número **exato** no dado.
- Se só houver uma jogada possível, ela é feita sozinha. Se o jogador demorar 30 s (ou estiver desconectado, 3 s), o servidor joga por ele.
