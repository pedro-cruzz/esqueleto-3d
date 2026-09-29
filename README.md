<div align="center">
  <img src="public/icon.svg" width="112" alt="Logo do Pose Lab">
  <h1>Pose Lab · Atlas de anatomia</h1>
  <p>Atlas interativo para identificar, separar e explorar estruturas anatômicas em 3D.</p>
</div>

## Sobre

O Pose Lab é uma aplicação web de estudo de anatomia. Permite identificar,
isolar, ocultar e separar estruturas anatômicas em 3D, além de explorar
movimentos articulares no sistema esquelético. Os modelos são carregados
localmente e os catálogos de estudo preservam o nome original de cada malha.

A interface funciona em desktop e celular, pode ser instalada como PWA e
oferece controles para tronco, cabeça, braços, mãos, dedos, pernas e pés.

## Recursos

- Tela inicial separada do visualizador, com catálogo de sistemas e opções de estudo.
- Acesso direto ao corpo em 3D, lista de ossos ou controles de movimento.
- Navegação de volta ao menu a partir do atlas.

- Catálogo de 277 estruturas ósseas e 467 estruturas musculares/tendíneas, com nomes editoriais e nomes originais.
- Seleção por clique/toque no modelo ou pela lista, com destaque e rótulo na cena.
- Busca sem distinção de acentos e filtros por região, lateralidade e tipo que controlam a lista e a cena 3D.
- Modo `Lista de peças`: prévias individuais do modelo, nomes e acesso direto ao estudo isolado em 3D.
- Ficha com nome, tipo de estrutura, região, lado e visibilidade.
- Isolamento com enquadramento automático, visualização por região, ocultação, foco e atenuação das estruturas ao redor.
- Separação geral e individual reversível, com espaçamento entre as caixas das peças na pose neutra, preservando os pivôs de movimento.
- Vistas anterior, posterior e laterais direita e esquerda.
- Menu Explorar / Movimentar / Sistemas, com módulos disponíveis e expansões identificadas como planejadas.
- 278 malhas no arquivo fonte: 277 peças de estudo e uma malha auxiliar oculta.
  As peças incluem partes ósseas, dentes, cartilagens e cavidades; não equivalem
  a uma contagem de ossos do corpo humano.
- 61 controles de movimento organizados por região corporal.
- Movimentação individual dos cinco dedos de cada mão.
- Movimentação individual dos cinco dedos de cada pé.
- Acoplamento escapuloumeral durante a elevação dos braços.
- Inclinação pélvica em cadeia fechada, sem arrastar os fêmures.
- Flexão segmentada da coluna entre as regiões lombar e torácicas.
- Cotovelos e joelhos protegidos contra hiperextensão pelos controles.
- Acompanhamento aproximado da patela durante a flexão dos joelhos.
- Limites articulares aproximados para evitar poses extremas.
- Câmera orbital com rotação, zoom e centralização.
- Layout responsivo com painel inferior ou lateral no celular.
- Instalação como Progressive Web App (PWA).
- Modelos esquelético e muscular, além do decodificador Draco, disponíveis localmente.

## Tecnologias

- HTML, CSS e JavaScript sem framework.
- Three.js r128.
- GLTFLoader e DRACOLoader.
- WebGL.
- Service Worker e Web App Manifest.

## Executando localmente

O projeto não precisa de instalação de dependências ou etapa de build. Use um
servidor HTTP, pois o modelo GLB e o service worker não funcionam corretamente
quando o `index.html` é aberto diretamente com `file://`.

### Requisitos

- Python 3 ou outro servidor HTTP local.
- Navegador moderno com WebGL habilitado.
- Internet no primeiro carregamento para baixar as bibliotecas Three.js das CDNs.

### Iniciar

Na raiz do projeto, execute:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Depois acesse:

```text
http://127.0.0.1:8080
```

Também é possível iniciar pelo npm, sem instalar dependências:

```bash
npm start
```

O comando `npm run dev` é um atalho para o mesmo servidor. Para executar as
verificações do projeto, use `npm test`. Se a porta 8080 já estiver ocupada,
escolha outra porta:

```bash
PORT=8081 npm run dev
```

Mantenha o terminal do servidor aberto enquanto estiver usando o aplicativo.

## Publicação na Vercel

O arquivo `vercel.json` configura este projeto como site estático:

- **Framework Preset:** Other.
- **Root Directory:** a pasta que contém `package.json`, `index.html` e `vercel.json`
  (a raiz do repositório neste projeto).
- **Build Command:** `npm run build`.
- **Output Directory:** `dist`.

O build copia as páginas, `src/`, `public/`, o service worker e os créditos
para `dist/`, preservando os caminhos dos modelos. Também verifica as referências
locais antes de concluir. Não configure `public` como Output Directory: essa
pasta contém recursos, enquanto a página inicial está na raiz do projeto.

Para conferir localmente:

```bash
npm run build
python3 -m http.server 8081 --bind 127.0.0.1 --directory dist
```

Envie essas alterações para a branch vinculada à Vercel e gere um novo deploy.
Confira também `/atlas.html?system=organs&view=model` e `/radiologia.html`.
O servidor de `npm start` é usado apenas no desenvolvimento local.

## Acessando pelo celular

### Com ngrok

Com o servidor local ativo na porta `8080`, abra outro terminal e execute:

```bash
ngrok http http://127.0.0.1:8080
```

Abra no celular o endereço `https://` exibido na linha `Forwarding`. Os dois
terminais, servidor e ngrok, precisam permanecer abertos.

Para utilizar um domínio ngrok já associado à sua conta:

```bash
ngrok http http://127.0.0.1:8080 --url=seu-dominio.ngrok-free.dev
```

Nunca publique ou compartilhe seu authtoken. Se ele for exposto, revogue a
credencial no painel do ngrok e gere uma nova.

### Pela rede local

Se o Mac e o celular estiverem na mesma rede Wi-Fi, também é possível iniciar o
servidor para a rede local:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Descubra o IP local do Mac e abra `http://IP-DO-MAC:8080` no celular. Esse modo
deixa o servidor acessível para outros dispositivos da mesma rede; encerre-o
com `Ctrl+C` quando terminar.

## Navegação

A página inicial (`index.html`) mostra o menu e o catálogo de sistemas.
O visualizador fica em `atlas.html`, com acessos diretos:

- `atlas.html?system=skeletal&view=model`: sistema esquelético em 3D.
- `atlas.html?system=muscular&view=model`: sistema muscular em 3D.
- `atlas.html?system=skeletal&view=gallery`: lista de ossos e partes ósseas.
- `atlas.html?system=muscular&view=gallery`: lista de músculos e tendões.
- `atlas.html?view=motion`: painel de movimentos (aberto também no celular).

`Menu principal` e a marca Pose Lab voltam à tela inicial. O catálogo compartilhado
em `src/data/systems.js` mantém os mesmos sistemas, modelos e estados no menu e
no visualizador. Os módulos em preparação não abrem um visualizador vazio. A tela inicial não
inicializa WebGL; o atlas carrega suas bibliotecas ao entrar no módulo disponível.

## Controles

- Arraste sobre a cena para girar a câmera.
- Use pinça no celular ou scroll no computador para controlar o zoom.
- Em `Explorar`, busque uma estrutura ou clique/toque diretamente nela no modelo.
- Use `Focar estrutura`, `Isolar estrutura` e `Ocultar estrutura` na ficha.
- Ajuste `Separar estruturas` para afastar todas as peças, ou `Afastar esta estrutura`
  para deslocar apenas a seleção. Esses deslocamentos são esquemáticos.
- `Restaurar visualização` recompõe as peças, mostra todas e limpa filtros e seleção.
  A pose continua independente; restaure-a na aba `Movimentar`.
- Busca e filtros também escondem as peças que não correspondem na cena 3D e
  enquadram o grupo restante. Mudar os filtros encerra o isolamento e mostra as
  peças do novo grupo, inclusive as que haviam sido ocultadas manualmente.
- Use `Ver só esta região` na ficha para visualizar o grupo anatômico da seleção.
- Use `Lista de peças` para navegar por cartões com cada estrutura separada.
  `Tipo de estrutura > Somente ossos e partes ósseas` exclui cartilagens, dentes e cavidades.
  Abrir um cartão retorna ao corpo em 3D com a peça isolada e ampliada.
- As prévias da lista usam a geometria real em pose neutra e escalas independentes;
  não servem para comparar tamanhos. São geradas sob demanda com um único
  renderizador reutilizado. O visualizador principal pausa enquanto a lista está aberta.
- `Mostrar todas as estruturas` limpa os filtros e encerra o isolamento, mantendo
  a pose e os valores de separação. `Centralizar` enquadra o grupo visível.
- Abra `Movimentar` para alterar a pose. No celular, abra `Ferramentas de estudo`
  e escolha o movimento. O menu recolhe e o slider aparece na faixa inferior,
  mantendo o tamanho e o zoom da cena. `Separar estruturas` e `Afastar esta
  estrutura` usam o mesmo fluxo.
- `Trocar ferramenta` reabre as opções sem zerar o ajuste. O botão de fechar
  dispensa o controle compacto e preserva a pose; use `Restaurar pose neutra`
  ou `Restaurar visualização` para desfazer os ajustes correspondentes.
- Toque no nome de uma região corporal para expandir ou recolher seus controles.
- Use `Restaurar pose neutra` para zerar todos os movimentos.
- Use `Centralizar` para restaurar a câmera.
- Use `Tela cheia` para ampliar a área do aplicativo.

## Estrutura do projeto

| Caminho | Responsabilidade |
| --- | --- |
| `index.html` | Tela inicial com sistemas e opções de estudo. |
| `src/styles/menu.css` / `src/components/menu.js` | Estilos e cartões do menu principal. |
| `src/data/systems.js` | Catálogo de sistemas, modelos e estados. |
| `atlas.html` | Interface do visualizador e carregamento das bibliotecas 3D. |
| `src/core/register-sw.js` | Registro e atualização da PWA, compartilhado entre as telas. |
| `scripts/server.mjs` | Servidor estático usado por `npm start`, com porta configurável. |
| `src/styles/atlas.css` | Interface responsiva, painéis e visualizador. |
| `src/data/anatomy-catalog.js` | Índice de nomes, regiões, lateralidade e tipos ósseos. |
| `src/data/muscle-catalog.js` | Índice de músculos e tendões do modelo muscular. |
| `scripts/build-catalog.py` | Gera o catálogo a partir dos nomes do GLB; falha se faltar tradução. |
| `scripts/build-muscle-catalog.py` | Gera o catálogo muscular a partir do GLB. |
| `src/components/study.js` | Seleção, busca, ficha, visibilidade e separação. |
| `src/logic/study-logic.js` | Regras de filtragem, visibilidade e cálculo de posições separadas. |
| `src/components/specimen-gallery.js` | Lista de peças com prévias individuais geradas sob demanda. |
| `tests/study-logic.test.cjs` | Regressão de filtros, isolamento e espaçamento entre peças. |
| `tests/catalog.test.cjs` | Integridade do catálogo em relação ao modelo real. |
| `tests/muscle-catalog.test.cjs` | Integridade do catálogo muscular e lateralidade. |
| `src/core/app.js` | Cena 3D, seleção de modelo, rig esquelético e radiologia. |
| `public/models/` | Modelos GLB do esqueleto e da musculatura. |
| `public/draco/` | Decodificador Draco usado pelo GLTFLoader. |
| `public/icon.svg` | Marca, favicon e ícone da PWA. |
| `public/manifest.json` | Metadados de instalação da PWA. |
| `service-worker.js` | Cache local dos recursos principais. |
| `THIRD_PARTY_NOTICES.md` | Créditos e licença do modelo anatômico. |

## Como funciona

1. O `GLTFLoader` carrega o modelo comprimido com Draco.
2. A aplicação procura pontos anatômicos e calcula centros articulares.
3. As estruturas ósseas são agrupadas em pivôs para tronco e membros.
4. Cada slider aplica uma rotação limitada ao pivô correspondente.
5. Regras adicionais distribuem movimentos entre escápula e úmero, acompanham
   a patela e articulam as falanges dos dedos.

O modelo original não possui necessariamente um rig pronto para todos os
controles. A aplicação constrói essa articulação no navegador sem modificar o
arquivo GLB original.

## Solução de problemas

### `ERR_NGROK_8012`

O túnel está online, mas o servidor local não está respondendo. Inicie novamente:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Confirme no Mac que `http://127.0.0.1:8080` abre antes de testar o endereço do
ngrok.

### Endpoint ngrok offline

O processo do ngrok não está conectado. Execute novamente o comando do túnel e
mantenha seu terminal aberto.

### `ERR_NGROK_107`

O authtoken configurado é inválido ou foi revogado. Gere uma credencial nova no
painel do ngrok e configure-a localmente:

```bash
ngrok config add-authtoken SEU_NOVO_TOKEN
```

Não envie o token em mensagens, issues ou commits.

### Alterações antigas continuam aparecendo

O service worker pode estar usando uma versão anterior do cache. Recarregue a
página; se necessário, feche o app instalado e abra novamente. Em ferramentas
de desenvolvimento, também é possível limpar os dados do site.

### O modelo não carrega

- Confirme que `public/models/esqueleto-anatomico.glb` existe para o sistema esquelético.
- Confirme que `public/models/musculos.glb` existe para o sistema muscular.
- Confirme que os três arquivos necessários existem em `public/draco/`.
- Abra o console do navegador e procure erros de WebGL, GLTF ou rede.
- Verifique a conexão com a internet para carregar Three.js pelas CDNs.

## Créditos e licença do modelo

O arquivo `public/models/esqueleto-anatomico.glb` deriva do projeto
[Z-Anatomy / BodyParts3D](https://github.com/Z-Anatomy/Models-of-human-anatomy) e
é distribuído sob a licença
[Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

O modelo muscular `public/models/musculos.glb` usa a mesma base anatômica em uma
seleção de músculos e tendões disponibilizada pelo projeto
[BodyExplorer](https://github.com/JohanBellander/BodyExplorer), que documenta
BodyParts3D e Z-Anatomy como suas fontes de dados.

A conversão GLB esquelética usada como fonte está disponível em
[Liyucheng1997/242_lab-human-anatomy](https://github.com/Liyucheng1997/242_lab-human-anatomy).

Consulte [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) antes de redistribuir
o modelo ou uma adaptação.

## Aviso

Os movimentos, amplitudes e acoplamentos implementados são aproximações
biomecânicas para fins educacionais. O aplicativo não substitui material médico,
diagnóstico, avaliação clínica ou orientação profissional.

## Validação e evolução do atlas

Execute `node --test tests/*.test.cjs` para conferir a correspondência entre
catálogo e GLB, filtros de visibilidade, isolamento e separação sem sobreposição
das caixas na pose neutra. Para atualizar o índice após alterar nomes ou trocar o modelo,
execute `python3 scripts/build-catalog.py` e revise as traduções geradas.

O catálogo `ANATOMY_SYSTEMS` em `src/data/systems.js`, exposto também por
`AnatomyStudy.systems`, apresenta os sistemas esquelético e muscular como
disponíveis. Sistema nervoso e órgãos continuam planejados até que recebam
assets com licença compatível, alinhamento espacial e metadados próprios.

Esta versão é uma base funcional de estudo, ainda sem validação profissional.
As traduções editoriais preservam o nome original do modelo para rastreabilidade
e precisam de revisão por especialista. A referência para uma futura curadoria
terminológica é a [Terminologia Anatomica da FIPAT](https://libraries.dal.ca/Fipat/ta2.html).

Para evoluir ao uso profissional, os próximos passos são: revisão anatômica do
modelo e da nomenclatura; fichas com referências e relações anatômicas; modelos
musculares, nervosos e viscerais alinhados; e modos de avaliação e revisão.
