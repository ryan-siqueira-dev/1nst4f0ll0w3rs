# 1nst4f0ll0w3rs

> Projeto experimental de estudo. A extensão depende da estrutura atual do Instagram Web e pode deixar de funcionar quando a plataforma mudar. Não há publicação na Chrome Web Store.

Extensão para navegadores Chromium que compara seguidores e contas seguidas
diretamente no Instagram Web. Não é preciso solicitar uma exportação nem
enviar arquivos: a captura e a comparação acontecem no próprio navegador.

## Demonstração

A extensão ainda não possui vídeo ou captura de tela versionada. Para avaliá-la, faça o build e carregue a pasta `dist` em um navegador Chromium conforme as instruções de instalação.

## O que a extensão faz

- Captura as listas de **Seguidores** e **Seguindo** exibidas pelo Instagram.
- Percorre automaticamente cada lista até confirmar que chegou ao fim.
- Compara somente duas capturas completas feitas no mesmo perfil.
- Mostra quem não segue de volta, quem não é seguido de volta e os seguidores
  mútuos.
- Permite buscar contas e exportar cada resultado em CSV.
- Mantém as capturas no armazenamento local da extensão.

## Como usar

1. Abra o Instagram Web e acesse o perfil que deseja analisar.
2. No painel da extensão, capture **Seguidores**.
3. Capture **Seguindo** sem trocar de perfil.
4. Consulte a comparação ou exporte uma categoria em CSV.

Durante a captura, mantenha a aba aberta e não feche a lista que o Instagram
exibir. Perfis com muitas contas podem levar alguns minutos.

Ao refazer uma das capturas, a comparação anterior é apagada para evitar a
mistura de listas obtidas em momentos diferentes.

## Privacidade

Todo o processamento acontece localmente:

- a extensão não solicita login ou senha;
- não há backend, telemetria ou envio das listas para terceiros;
- não são usadas APIs privadas nem requisições próprias ao Instagram;
- os dados ficam em `chrome.storage.local` até o usuário apagá-los;
- a extensão tem acesso somente a `https://www.instagram.com/*`.

A permissão `storage` é usada apenas para manter as duas capturas e o resultado
entre navegações.

## Riscos e uso responsável

Esta extensão é uma ferramenta independente e não oficial. Ela automatiza a
abertura e a rolagem das listas exibidas pelo Instagram Web para ler os nomes de
usuário que aparecem no DOM da página. Esse comportamento pode ser interpretado
pelo Instagram/Meta como coleta automatizada de dados ou scraping, mesmo quando
iniciado manualmente pelo usuário.

Use por sua conta e risco. O Instagram pode alterar a interface, limitar a
captura, exigir verificação, bloquear temporariamente ações da conta ou aplicar
outras restrições se detectar atividade considerada automatizada ou incomum.

Recomendações:

- use apenas em contas e perfis que você tem autorização para analisar;
- não use em massa, em muitos perfis ou em execuções repetidas;
- mantenha intervalos razoáveis entre capturas;
- não compartilhe CSVs ou listas capturadas sem consentimento das pessoas
  envolvidas;
- leia e respeite os Termos de Uso do Instagram e as políticas da Meta.

Este projeto não garante conformidade com os Termos do Instagram/Meta e não é
afiliado, patrocinado ou mantido pelo Instagram ou pela Meta.

## Instalação local

Requisitos:

- Node.js 20 ou superior;
- Chrome, Edge, Brave ou outro navegador compatível com extensões Manifest V3.

```bash
npm install
npm run build
```

Depois:

1. Abra a página de extensões do navegador.
2. Ative o modo de desenvolvedor.
3. Escolha **Carregar sem compactação**.
4. Selecione a pasta `dist`.
5. Abra ou recarregue `https://www.instagram.com`.

Depois de alterar o código, execute `npm run build` e recarregue a extensão.

## Desenvolvimento

O projeto usa React, TypeScript e Vite. O build gera um content script único,
injetado nas páginas do Instagram. A interface é isolada da página por Shadow
DOM.

```bash
npm run test:watch
npm test
npm run build
```

Principais arquivos:

- `src/content.tsx`: injeta e monta o painel da extensão;
- `src/App.tsx`: coordena capturas, armazenamento e comparação;
- `src/lib/instagram-dom.ts`: localiza, percorre e valida as listas;
- `src/lib/storage.ts`: persiste as capturas localmente;
- `public/manifest.json`: configura permissões e content script.

## Limitações

Mudanças na estrutura da interface do Instagram podem interromper a captura.
Quando não consegue confirmar o fim da lista, a extensão interrompe a operação
e não salva aquela captura como concluída. O resultado corresponde ao conteúdo
que o Instagram Web disponibilizou no momento da captura.

O projeto não é afiliado, patrocinado ou mantido pelo Instagram ou pela Meta.

## Decisões técnicas

- Manifest V3 com permissão restrita a `https://www.instagram.com/*`;
- processamento e armazenamento locais, sem backend;
- Shadow DOM para reduzir conflitos entre os estilos da extensão e da página;
- capturas incompletas não são salvas como resultados válidos;
- testes automatizados para comparação, sessão, armazenamento e leitura do DOM.

## Aspectos para revisar antes de apresentar

Antes de usar o projeto em uma entrevista, é importante conseguir explicar o fluxo do content script, o isolamento por Shadow DOM, a persistência em `chrome.storage.local`, as condições de parada da captura e os riscos de depender do DOM de uma plataforma externa.

## Melhorias futuras

- adicionar uma demonstração visual real;
- dividir a lógica de captura em unidades menores;
- revisar acessibilidade do painel injetado;
- avaliar um nome mais legível para o repositório;
- acompanhar alterações do Instagram e das políticas da Meta.

## Autor

Ryan Siqueira — [GitHub](https://github.com/ryan-siqueira-dev)
