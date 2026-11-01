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

## Encerrar partida, som e sorteio de letra
- **Encerrar a qualquer momento:** botão "⏹ Encerrar partida" no celular do ⭐ (pede confirmação) e na TV (toque duas vezes). Se o ⭐ perder a conexão, o primeiro jogador conectado assume o papel dele.
- **Som:** música de fundo e efeitos são gerados no próprio navegador (WebAudio, sem arquivos). A TV só pode tocar som depois do primeiro clique/OK no controle (regra dos navegadores): aparece um aviso até lá. Botão 🔊/🔇 na TV e no celular. A música toca na TV; os celulares tocam só efeitos.
- **Adedonha:** a cada rodada um jogador (em rodízio) gira a roleta no celular; a TV anima o sorteio. Uma letra nunca se repete na partida. O alfabeto fica em `ALPHABET` no topo de `server/games/adedonha.js` (por padrão sem K, W e Y).

## Nova sala, validação e Ludo 3D
- **Encerrar tudo (tela inicial):** botão "🔄 Encerrar tudo e gerar novo QR Code" no canto da TV (toque duas vezes). Fecha a sala, desconecta todos os celulares (eles voltam para a tela de entrada com um aviso) e mostra um novo código/QR para escanear de novo.
- **Adedonha – validação:** ao fim de cada rodada abre a fase "Validação" (45 s). Cada jogador vê, no celular, as respostas dos outros e toca ✗ nas que considera erradas. A resposta é anulada se **mais da metade dos outros jogadores** contestar. Respostas com letra errada/curtas já aparecem como inválidas. A fase termina quando todos tocam "Terminei de validar" ou o tempo acaba. Repetidas valem 5, únicas 10.
- **Ludo 3D:** tabuleiro 3D (Three.js carregado da CDN cdnjs) com peões torneados, mesa de madeira, câmera com leve balanço e peões que pulam casa por casa. Se o navegador da TV não tiver WebGL ou a CDN estiver bloqueada, a TV usa automaticamente o tabuleiro 2D. O dado é um cubo 3D em CSS que rola e cai na face sorteada (TV e celular).
