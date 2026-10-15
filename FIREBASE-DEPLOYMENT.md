# Firebase — implantação de 15/10/2026

Projeto confirmado: casamentojer-f582b. A conta autenticada corresponde ao único administrador ativo já cadastrado; nenhum privilégio novo foi concedido.

## Concluído

- Backup das regras anteriores preservado fora do repositório antes da publicação.
- Regras Firestore compiladas e implantadas com sucesso. Removida escrita pública irrestrita; edição de conteúdo e cadastro de convidados exigem administrador. Clientes não podem criar/alterar permissões de administrador.
- RSVP mantém o fluxo existente por nome e permite apenas alteração do campo status para confirmed/declined. Selecionar um nome não autentica identidade.
- Verificação REST sem autenticação: recados privados, comprovantes e lista de administradores retornam 403; convidados e configurações públicas retornam 200.
- Mural mostra Recado enviado dentro do formulário somente depois de salvar. Aprovação/recusa de recados e comprovantes, fundos e demais fluxos de confirmação têm retorno visível. Teste local de envio e aprovação realizado; 22 testes automatizados passaram.

## Bloqueio de publicação das funções

O projeto está sem faturamento (billingEnabled=false). A tentativa real de deploy foi interrompida pelo Firebase: Cloud Build exige plano Blaze. A ativação depende do proprietário e não foi feita pelo agente.

Após ativar o Blaze, executar:

    firebase deploy --only "functions:wedding-mural:weddingMural,functions:wedding-mural:weddingGifts" --project casamentojer-f582b

Depois validar envio, acesso administrativo e aprovação em produção. Não afirmar que aprovações públicas estão funcionando antes dessa validação.
