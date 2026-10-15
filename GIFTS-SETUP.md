# Presentes e comprovantes

O fluxo usa Firestore no plano gratuito, sem Cloud Functions ou cartão. Veja `FIREBASE-DEPLOYMENT.md` para regras e verificações.

Os noivos cadastram a foto do presente, valor, QR Pix, link de pagamento e link da loja. O convidado informa a contribuição antes de visualizar os meios de pagamento. O QR é estático; o valor precisa ser conferido no banco.

**Enviar comprovante** exige nome cadastrado, valor, imagem e declaração de pagamento realizado. A confirmação aparece na tela somente após salvar. Comprar na loja usa o mesmo fluxo de confirmação pelo card.

Os comprovantes ficam privados na fila administrativa. Aprovar publica apenas o valor e o presente, nunca a imagem nem o nome do pagador. Transações evitam contagem duplicada. Recusar não soma valor. Não existe confirmação bancária automática: os noivos devem conferir o recebimento real.

Compartilhamento via WhatsApp é opcional e depende da ação do usuário; o site não envia mensagens nem anexos automaticamente. A prévia localhost usa apenas dados fictícios locais.
