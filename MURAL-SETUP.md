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

## Fundos e música

O painel permite escolher uma foto e seu enquadramento para Início, História & truco, Instagram, Presentes, Mural e Presença. Cada configuração é salva em `artifacts/{appId}/public/data/backgrounds/{section}`; documentos separados evitam acumular as seis imagens no documento de configurações. Sem imagem, o site usa os retratos dos noivos. Antes da publicação, revisar as regras dessa coleção: leitura pública, escrita apenas por administradores autenticados, com validação de campos e tamanho. Não foram implantadas regras neste trabalho.

O miniplayer usa o embed oficial do Spotify, aceita links completos, localizados e URIs Spotify e mantém um link para abrir no aplicativo e uma opção de recarregar. A reprodução depende da disponibilidade do conteúdo e das restrições do Spotify/navegador. Na verificação local, o endpoint respondeu HTTP 200, mas o iframe permaneceu em branco no navegador integrado; a reprodução de áudio não foi confirmada.
