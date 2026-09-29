# Pose Lab — direção visual e mobile

Revisão de 29/09/2026. Pesquisa pelo Google, consulta a fontes oficiais e
inspeção visual das páginas públicas do Anatomy.app e BioDigital.

## Referências e decisões

- [Anatomy.app](https://anatomy.app/): anatomia em destaque na entrada, com
  acesso claro aos assuntos. Aplicação: prancha do modelo real ao lado do título,
  chamada principal legível e sistemas com hierarquia consistente.
- [BioDigital — Anatomy Tree](https://support.biodigital.com/hc/en-us/articles/360005542733-What-is-the-Anatomy-Tree):
  exploração por estruturas e ações contextuais, documentadas para desktop e
  mobile. Aplicação: manter o modelo visível e dar acesso direto à ficha da seleção.
- [Linear — atualização de interface](https://linear.app/changelog/2026-03-12-ui-refresh)
  e [interface mobile](https://linear.app/changelog/2025-10-16-mobile-app-redesign):
  controles consistentes, painéis discretos e ferramentas acessíveis na parte
  inferior. Aplicação: controles progressivos e menos competição com a cena.

As decisões são adaptações para o Pose Lab. Não são cópias nem uma avaliação dos
aplicativos autenticados dessas empresas.

## Implementação

A página inicial preserva o fundo escuro e a tipografia editorial. A ilustração
vem do GLB local; o WebP transparente mede 800 × 900 e cerca de 104 KB. A entrada
continua sem inicializar WebGL. Os cartões inteiros permitem abrir um sistema;
no celular se tornam linhas legíveis com áreas amplas de toque. Prévias mantêm
seu estado de revisão explícito.

O atlas tem painel inferior recolhível, atalho “Ver ficha” para a seleção,
campos com fonte de 16px e controles de pelo menos 44px. Na horizontal, as
ferramentas sobrepõem a lateral da cena. Foco, Escape, inert e aria-expanded seguem
o estado do painel. Abrir e fechar o menu mantém a área e o enquadramento da cena.
Os filtros e ajustes de visualização começam recolhidos em todas as telas,
deixando a busca junto dos resultados. O grupo preserva seus valores e sua
abertura ao redimensionar. A ação de mostrar todas as estruturas permanece fora
dele e um contador indica filtros secundários ativos.

A validação responsiva no navegador não substitui uma avaliação em aparelhos
físicos, especialmente teclado virtual, gestos multitouch e desempenho da GPU.

## Verificação da revisão inicial

- Homepage: 320 × 740, 390 × 844, 768 × 1024, 1024 × 768 e desktop
  1440 × 1000; sem transbordamento horizontal nas larguras verificadas.
- Atlas: mobile 390 × 844, horizontal 844 × 390 e desktop 1440 × 1000.
- Busca “femur”: duas estruturas; isolamento: uma; mostrar todas: 277.
- Filtro Pelve: quatro estruturas; valor e contador mantidos ao recolher o grupo.
- Galeria: abertura, prévias e retorno a uma peça isolada; acesso aos movimentos.
- Atalho da ficha, Escape e foco; painel e cena lado a lado em landscape.
- 18 testes Node passaram; sintaxe dos scripts e `git diff --check` aprovados.

## Controle compacto no celular

Após avaliação do usuário, o menu passou a sobrepor a cena sem reduzi-la. Ao
escolher um movimento, separação geral ou afastamento individual, o mesmo input
e seu rótulo são movidos para uma faixa inferior. Não há sliders duplicados nem
valores paralelos. A faixa identifica a região ou estrutura em estudo.

“Trocar ferramenta” devolve o controle ao menu e preserva todos os ajustes;
fechar a faixa não restaura a pose. Na volta ao desktop, o input retorna à sua
posição original. Trocar ou limpar uma seleção encerra o controle individual
antigo; abrir a galeria também encerra o controle compacto. Eventos de resize
sem mudança real da área não reenquadram o modelo.

Conferido no navegador: cena de 390 × 512 em viewport 390 × 844, mantendo
exatamente essas dimensões com menu aberto e slider ativo; em 844 × 390,
cena de 844 × 188 preservada ao abrir o painel lateral. Flexão de cotovelo,
separação geral e individual, restauração e foco com Escape foram verificados.
