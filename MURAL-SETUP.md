# Ativação do mural

A prévia localhost é uma demonstração isolada: usa armazenamento local e convidados fictícios. Não grava no Firestore oficial. O visitante digita e seleciona seu nome ou o nome do acompanhante, sem código de convite. A seleção não autentica identidade; os noivos continuam aprovando cada recado.

O novo mural usa a Cloud Function callable weddingMural. Recados pendentes e contagens ficam em weddingMuralPrivate/{appId}; o navegador recebe somente aprovados, exceto quando o usuário autenticado possui admins/{uid}.active. A transação confere o participante na lista oficial e obtém seu nome no servidor. Os dois slots por participante são permanentes mesmo se um recado for recusado; reenvios com o mesmo identificador não consomem outra vaga. Uma foto opcional por recado: duas fotos totais. Contagens anteriores do mesmo participante são preservadas.

Antes de ativar em produção:

1. Revisar as regras existentes do Firestore e garantir que weddingMuralPrivate/{document=**} não pode ser lido ou gravado por clientes. Uma regra ampla que permita tudo precisa ser removida/restringida: adicionar um deny não sobrepõe um allow existente.
2. Instalar as dependências em functions e testar no emulador. A implantação requer acesso administrativo ao projeto Firebase e plano compatível com Cloud Functions.
3. Implantar somente functions:wedding-mural no projeto correto. Este trabalho não implantou funções nem alterou regras/banco oficial.
4. Conferir a lista de convidados e acompanhantes no painel. O visitante seleciona seu nome e envia o recado; os noivos aprovam no mural. Não há envio automático de mensagens. As regras de escrita dos convidados e administradores devem ser restritas aos noivos.

Fotos JPG/PNG/WebP até 3 MB são decodificadas, redimensionadas e reexportadas como JPEG pelo navegador, sem metadados. O resultado é limitado a 340.000 caracteres para caber no documento Firestore. Não são aceitos vídeos, GIFs ou SVGs. URLs externas são permitidas apenas para hero/produtos; mural requer o arquivo.

Recados antigos da coleção messages não são publicados automaticamente pelo novo mural. Permanecem preservados; migração e aprovação exigem revisão dos noivos.

Os testes de policy verificam validação, duplicidade e cotas. A validação integral de autenticação, regras e concorrência deve ser feita com emulador antes de liberar produção.
