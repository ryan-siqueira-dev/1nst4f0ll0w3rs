# 1nst4f0ll0w3rs

Aplicação web que compara os seguidores e as contas seguidas usando a
exportação oficial do Instagram. Todo o processamento acontece localmente no
navegador.

## Funcionalidades

- Importação direta do ZIP oficial, sem descompactar.
- Suporte a exportações divididas em `followers_1.json`,
  `followers_2.json` etc.
- Lista de quem não segue você de volta.
- Lista de quem você não segue de volta.
- Lista de seguidores mútuos.
- Busca por nome de usuário e exportação CSV.
- Nenhum login, senha, backend ou envio de dados.

## Executar

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

## Testes e build

```bash
npm test
npm run build
```

## Como gerar o arquivo

No Instagram:

1. Abra **Central de Contas**.
2. Entre em **Suas informações e permissões**.
3. Selecione **Baixar suas informações**.
4. Escolha a conta e **Algumas das suas informações**.
5. Marque **Seguidores e seguindo**.
6. Use o período **Desde o início** e o formato **JSON**.
7. Baixe o ZIP e envie-o diretamente à aplicação.

O Instagram pode alterar os nomes e a localização dos menus. A aplicação não é
afiliada ao Instagram ou à Meta.
