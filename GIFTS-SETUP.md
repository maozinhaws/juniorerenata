# Presentes e comprovantes

Na prévia localhost, pagamentos e aprovações são fictícios e ficam apenas no armazenamento local. Não alteram o Firebase oficial.

## Fluxo

- O administrador edita foto, valor, QR Pix por presente, link de pagamento e link da loja. O botão Enviar QR code usa o mesmo processamento de imagens: JPG/PNG/WebP até 3 MB, convertido em JPEG otimizado. Vídeos não são aceitos.
- O convidado informa o valor antes de visualizar o QR e os links. O QR enviado pelos noivos é estático: o site não altera o valor codificado nele. O convidado confere o valor no banco.
- Enviar comprovante exige participante cadastrado, valor, forma de pagamento, imagem e declaração de pagamento realizado. Comprar pela loja também usa esse fluxo.
- O comprovante fica pendente no painel. Só a aprovação soma o valor ao total público. Recusa não soma; repetição da mesma decisão no servidor não duplica o valor.
- O compartilhamento é opcional: o navegador oferece compartilhamento de arquivo quando suportado; nos demais casos baixa a imagem para anexar manualmente no WhatsApp. Abrir a conversa não envia mensagens nem anexos automaticamente.
- Selecionar um nome não autentica a identidade do convidado. Os noivos precisam conferir o comprovante com o recebimento real antes de aprovar.

## Ativação em produção

A função callable `weddingGifts` está implementada em `functions/index.js`. Não foi implantada neste trabalho. Antes de liberar a versão pública:

1. Revisar as regras existentes do Firestore. Clientes não podem ler nem escrever `weddingGiftsPrivate/{document=**}`. Uma regra ampla permissiva prevalece sobre um bloqueio específico; é necessário restringi-la. A função usa o Admin SDK.
2. Escritas em presentes, convidados, contribuições legadas e permissões administrativas devem ser restritas. Clientes não podem conceder a si mesmos `admins/{uid}.active`. A função verifica essa permissão para listar comprovantes e aprovar.
3. Testar autenticação, acesso negado a comprovantes, repetição e concorrência de aprovações no emulador. Os testes unitários de política e a prévia local não substituem essa validação.
4. Implantar apenas a nova função com `firebase deploy --only functions:weddingGifts --project casamentojer-f582b`, após confirmar o projeto e as regras. Não substituir regras de produção por uma regra genérica.
5. Testar o fluxo publicado com um presente de teste antes de liberar aos convidados.

Dados privados: `weddingGiftsPrivate/casamento-junior-renata-v1/{claims,quotas,totals}`. A API pública retorna somente totais aprovados; comprovantes pendentes são retornados apenas ao administrador autenticado. Os totais de contribuições antigas são preservados e adicionados aos novos totais aprovados.

Reenvio com o mesmo identificador é idempotente. Há limite de vinte solicitações por participante por dia no servidor. Os comprovantes são imagens JPEG otimizadas, limitadas a 340.000 caracteres. Não há confirmação bancária automática.
