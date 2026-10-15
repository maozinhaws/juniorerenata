# Testes de regras e transações Spark

Pré-requisitos: Java 21+, Node e Firebase CLI. Não há acesso ao projeto de produção nestes testes.

1. Na raiz: `firebase emulators:start --only firestore --project demo-wedding`.
2. Neste diretório: `npm install` e `npm test`.

Os testes usam projetos demo-wedding e demo-adapter no emulador localhost:8080. Validam regras com administrador autenticado e visitante anônimo. O segundo teste carrega o código real do adaptador, substituindo somente imports de ambiente e dependências CDN por dependências Node, sem alterar a lógica.

Os arquivos spark-context.mjs e spark-adapter.mjs são temporários e ignorados pelo Git.
