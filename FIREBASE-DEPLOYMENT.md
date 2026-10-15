# Firebase no plano gratuito

O site utiliza Firestore e Firebase Authentication no plano Spark, sem Cloud Functions, cartão ou faturamento habilitado. `firebase.json` publica apenas regras; o código antigo em `functions/` não participa mais do fluxo do site.

## Fluxo e proteção

- Recados e comprovantes são enviados por transações no navegador e validados por `firestore.rules`.
- O nome deve corresponder a um convidado/acompanhante existente. Como solicitado, escolher o nome não autentica identidade: a aprovação dos noivos continua obrigatória.
- Cada participante tem dois slots permanentes de recados (incluindo recusados), com uma foto por recado. Slots e recado são gravados atomicamente. Repetir a mesma solicitação não cria outro recado.
- Recados pendentes/recusados são acessíveis somente aos administradores. A consulta pública filtra `status == approved`.
- Comprovantes nunca são públicos, inclusive depois de aprovados. Apenas `{giftId, amountCents}` é publicado por aprovação. A transação impede somar duas vezes ou publicar um valor diferente do aprovado. Há limite de 20 solicitações por participante/dia UTC.
- Clientes não podem conceder privilégios administrativos nem editar livremente os conteúdos do site. RSVP mantém a edição pública apenas do campo `status`.
- Fotos e comprovantes são JPEGs otimizados dentro dos documentos, limitados a 340.000 caracteres. O seletor aceita arquivos de até 3 MB e bloqueia vídeos.

## Publicação e verificação — 15/10/2026

Regras compiladas e publicadas em `casamentojer-f582b`. Confirmado `billingEnabled=false` após a implantação.

30 verificações de autorização/atomicidade passaram no emulador, mais teste do adaptador real (`spark-approvals.js`) cobrindo envio, repetição, limite, privacidade, aprovação e soma exata. Também passaram os 22 testes existentes.

Verificação controlada em produção: envio anônimo aceito; pendente bloqueado (403); recado aprovado público (200); comprovante permaneceu privado (403); total aprovado público (200). A decisão administrativa nessa verificação usou OAuth autorizado; a permissão do cliente administrativo foi exercitada no emulador. Todos os documentos fictícios foram removidos após o teste.

As cotas gratuitas de armazenamento e operações do Firestore continuam aplicáveis; não foi ativado faturamento. Os dados antigos foram preservados. Documentos antigos em `messages` não são publicados automaticamente; precisam de revisão/migração específica.

## Implantar regras

    firebase deploy --only firestore:rules --project casamentojer-f582b

Os testes reproduzíveis estão em `tests/firestore/README.md`.
