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

## Adedonha: digitação e avanço
- Os campos da rodada são montados **uma única vez**; novas atualizações do servidor não recriam os campos (o teclado não fecha e o texto não some). O rascunho volta se o celular reconectar.
- Teclado: a tecla **Próximo/Enter** pula para a categoria seguinte; no último campo, fecha o teclado.
- **Próxima rodada ➜**: qualquer jogador pode tocar. O ⭐ também pode girar a letra no lugar do sorteador e encerrar a validação antes do tempo.

## Temas, 2D/3D, tempos e botão de sair
- **Ludo – 2D/3D:** o tabuleiro 3D agora fica **parado** (só os peões se movem). Troque entre 3D e 2D a qualquer momento: botão "🖥 Trocar para 2D/3D" no topo da TV, ou pelo celular do ⭐ (também no lobby, em "Tabuleiro na TV").
- **Ludo – temas:** Clássico, Transformers e Shrek (o ⭐ escolhe no lobby). Cada cor é um personagem (nome + emoji + cor), e **cada jogador escolhe a sua cor/personagem** no celular antes de começar. Quem não escolher recebe uma cor livre. A ordem das jogadas segue o sentido do tabuleiro.
- **Áudio por tema:** música de fundo e efeitos mudam conforme o tema (clássico, robótico/metálico, folk/medieval). São composições originais sintetizadas no navegador, no estilo do tema, e não as músicas oficiais. Os temas ficam em `public/themes.js` (nomes, cores, emojis, formato do peão) e a parte sonora em `public/audio.js`. Para usar arte ou músicas próprias, edite esses arquivos.
- **Adedonha – tempos:** no lobby o ⭐ escolhe tempo por rodada (30 s a 3 min), tempo de validação (20 a 90 s) e número de rodadas (3, 5 ou 7).
- **Botão de sair:** fica no canto superior direito do celular, ao lado do 🔊. Para o ⭐ durante a partida é **⏹ Encerrar** (encerra para todos); para os demais é **🚪 Sair** (deixa a sala; no meio da partida o servidor joga por ele no Ludo).
- Novas opções para outros jogos: declare `options` (e `pick`) no `static meta` do jogo; as telas de lobby as montam sozinhas.

## Xadrez e Dama (2 jogadores, 2D e 3D)
- **Xadrez:** regras completas (xeque, xeque-mate, afogamento, roque, en passant, promoção com escolha, repetição tripla, regra dos 50 lances e material insuficiente). O motor passa nas contagens oficiais de lances legais (perft). Histórico em notação algébrica (Nf3, O-O, exd5, Qxf7#).
- **Dama brasileira:** captura obrigatória, **maior captura** obrigatória, peça comum captura para trás, dama voadora, promoção só se a jogada terminar na última fileira, 20 lances só de damas sem captura = empate. Se houver duas sequências diferentes até a mesma casa, vale a primeira.
- **TV:** tabuleiro 2D ou 3D (botão "🖥 Trocar para 2D/3D" na TV ou no celular do ⭐; câmera fixa), peças que deslizam (cavalo salta), último lance e xeque destacados, capturadas e vantagem de material, histórico de lances.
- **Celular:** toque na peça para ver os lances possíveis e toque no destino. O tabuleiro vira para quem joga de pretas. Seletor de promoção, propor empate / aceitar / recusar, desistir e revanche (troca as cores).
- No lobby o ⭐ escolhe quem joga de brancas (sorteio, ⭐ ou o outro jogador) e 2D/3D.

## Banco Imobiliário (2 a 6 jogadores, tabuleiro 3D ou 2D)
- **Regras:** dois dados (dupla joga de novo; 3 duplas = prisão); cair em imóvel livre = comprar ou **leilão** (lances com mínimo de R$ 10, vez em rodízio, 25 s por lance); aluguel (dobro com o grupo completo sem casas; estações 25/50/100/200; companhias 4× ou 10× o dado); **casas e hotéis** (grupo completo, construção uniforme, estoque de 32 casas e 12 hotéis); **hipoteca** (resgate com 10%); **prisão** (pagar R$ 50, carta de saída ou tirar dupla; 3ª tentativa paga); **Sorte ou Revés** (28 cartas); impostos; **trocas** entre jogadores (dinheiro, imóveis e carta da prisão); **falência** (bens vão ao credor ou voltam ao banco) e vencedor.
- **Lobby:** dinheiro inicial (R$ 1.000 / 1.500 / 2.500), salário (R$ 200 / 300), Parada Livre acumula multas (sim/não) e 2D/3D.
- **TV:** tabuleiro 3D com fichas diferentes (carro, cartola, cachorro, navio, bota, foguete) que andam casa por casa, casas e hotéis, marca do dono e véu de hipoteca; dois dados 3D; dinheiro de todos, leilão, trocas, cartas e histórico. Se não houver WebGL, usa o 2D.
- **Celular:** abas Jogo / Imóveis / Jogadores. Rolar, comprar ou leiloar, dar lances, construir, vender, hipotecar, resgatar, montar e responder trocas, pagar a prisão, desistir.
- **Jogador desconectado:** o servidor joga por ele (rola, compra se sobrar dinheiro, passa nos leilões, recusa trocas, falência se não houver como pagar).
- **Simplificações:** construir, hipotecar e propor trocas só na sua vez; bens de quem falece para o banco voltam livres (sem leilão); propriedade hipotecada recebida numa troca gera taxa de 10% para quem recebe.
- **Dados editáveis:** `public/bidata.js` tem casas, preços, aluguéis, fichas e cartas. Os nomes e textos são originais (não são os do tabuleiro comercial).
