# Ativação do mural

A prévia localhost é uma demonstração isolada: usa armazenamento local, convite DEMO-CASAMENTO e um convidado fictício. Não grava no Firestore oficial. O limite local é demonstrativo; a garantia entre dispositivos está nas transações da Cloud Function.

O novo mural usa a Cloud Function callable weddingMural. Recados pendentes e códigos ficam em weddingMuralPrivate/{appId}; o navegador recebe somente aprovados, exceto quando o usuário autenticado possui admins/{uid}.active. Os dois slots são permanentes mesmo se um recado for recusado. Gerar outro código para o mesmo convidado revoga o anterior sem zerar os slots. Uma foto opcional por recado: duas fotos totais.

Antes de ativar em produção:

1. Revisar as regras existentes do Firestore e garantir que weddingMuralPrivate/{document=**} não pode ser lido ou gravado por clientes. Uma regra ampla que permita tudo precisa ser removida/restringida: adicionar um deny não sobrepõe um allow existente.
2. Instalar as dependências em functions e testar no emulador. A implantação requer acesso administrativo ao projeto Firebase e plano compatível com Cloud Functions.
3. Implantar somente functions:wedding-mural no projeto correto. Este trabalho não implantou funções nem alterou regras/banco oficial.
4. No painel, selecionar um convidado e gerar seu código. Entregar o código individualmente. Não há envio automático de mensagens.

Fotos JPG/PNG/WebP até 3 MB são decodificadas, redimensionadas e reexportadas como JPEG pelo navegador, sem metadados. O resultado é limitado a 340.000 caracteres para caber no documento Firestore. Não são aceitos vídeos, GIFs ou SVGs. URLs externas são permitidas apenas para hero/produtos; mural requer o arquivo.

Recados antigos da coleção messages não são publicados automaticamente pelo novo mural. Permanecem preservados; migração e aprovação exigem revisão dos noivos.

Os testes de policy verificam validação, duplicidade e cotas. A validação integral de autenticação, regras e concorrência deve ser feita com emulador antes de liberar produção.
