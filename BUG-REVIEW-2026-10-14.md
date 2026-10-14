# Revisão de bugs — 14/10/2026

Escopo: código da main 3566a64, fluxos locais com dados isolados, leitura da configuração pública e disponibilidade do endpoint do mural. Não é uma garantia de ausência de todos os defeitos. Nenhuma configuração ou credencial de produção foi alterada.

## Corrigidos nesta branch

- A entrada HTML carregava firebase-init.js com query string, mas os módulos importavam a mesma entrada sem query. Eram duas identidades de módulo, com dois estados, listeners e inicializações. Unificada a entrada; teste de regressão adicionado.
- O IntersectionObserver da rolagem removia a classe active do painel ao passar por seções públicas. O painel agora é uma vista explícita e o observer fica suspenso durante a edição.
- Falhas ao consultar permissões de administrador não eram tratadas; mensagens ficavam atrás do login. Agora há tratamento de erro, aviso visível e bloqueio contra envios repetidos. A senha não perde espaços nas extremidades. A autorização continua exigindo Firebase Auth e documento admins/{uid}.active === true.
- Botões de Pix chamavam funções inexistentes. Implementadas abertura da chave/titular, cópia e estado sem chave. Removidas as telas de QR/confirmar pagamento que não tinham implementação. O site não confirma transferências.
- Presentes não tinham endereço da loja nem edição. Adicionados campo HTTPS, edição e link externo, inclusive no diálogo Pix; valores inválidos são rejeitados.
- Spotify agora cria o iframe ao abrir o miniplayer, preserva a reprodução quando não há alteração da URL e permite recarregar. Verificado carregamento e transição Play → Pausar com playlist de demonstração no navegador.
- O jogo e ranking foram removidos da interface e dos módulos. A biografia aproveita os textos existentes da timeline, com foto opcional por capítulo, ordem e curiosidades individuais em post-its, editáveis pelos noivos. Os dados antigos permanecem no banco.
- Contagem regressiva calculava minutos dividindo por uma hora; corrigida e limitada a zero depois da data.
- RSVP mostrava undefined em idade/relação de acompanhantes sem esses campos; corrigido.
- Campos vazios de Pix/Spotify não limpavam a interface; corrigido. Atualizações de configuração não sobrescrevem mais o formulário que contém alterações não salvas.
- Biblioteca de ícones indisponível não deve interromper a inicialização do aplicativo.
- Galeria passa a processar incorporações ao entrar na seção por rolagem, além do menu.
- Deploy passa a enviar somente index, css, js e assets, excluindo a página legada 1index.html e fontes do backend.

## Pendências verificadas fora do código

- O campo radioUrl no documento público oficial estava vazio na consulta desta revisão. A chave Pix e o titular estavam preenchidos. O link exato da playlist do casal ainda precisa ser informado/salvo no ambiente oficial.
- O documento público de configurações contém um campo legado chamado adminPass. Seu valor não foi reproduzido neste relatório. Ele não deve estar em uma coleção pública: remover pelo console administrativo e trocar a credencial caso ainda seja utilizada. O app deixa de incorporá-lo ao estado, mas isso NÃO remove a exposição existente no servidor.
- O endpoint us-central1 do callable weddingMural respondeu 404. A implantação e revisão de regras continuam pendentes conforme MURAL-SETUP.md. Não confundir a demonstração local funcional com um backend já ativado.
- Login com a conta real e regras privadas do Firebase não foram verificados: não foi utilizada uma credencial do proprietário. Testado o comportamento visual do painel no modo local; preservado o controle de acesso oficial.
- Sincronização automática de todo o perfil Instagram continua fora da implementação; são incorporados os links adicionados pelos noivos.

## Verificação

12 testes automatizados aprovados (validação de fotos, links, identidade do módulo principal, contagem regressiva e política do mural); checagem de sintaxe dos módulos e git diff --check. Na prévia: salvar/recarregar chave Pix, copiar chave, editar link de loja e recuperar após reload, editar foto/texto/post-its e persistir, entrar/sair do painel, carregar Spotify e acionar Play/Pausar. Dados usados nesses testes são locais e fictícios.

## Atualização: landing page, curiosidades e trilha

Navegação lateral fixa apenas com ícones e nomes acessíveis; a página permanece contínua. Animações por seção com fades, entradas laterais, subida, descida e escala, respeitando movimento reduzido. Curiosidades usam uma única autoria por foto, com post-it diagonal sobre a borda; registros antigos continuam legíveis sem misturar as duas pessoas.

Spotify agora fica incorporado na página com o álbum fornecido pelo casal. A API oficial tenta iniciar a reprodução quando pronta, mantendo controles nativos e fallback de iframe. Autoplay pode exigir interação, e a disponibilidade de músicas completas/prévias depende do Spotify. Configuração vazia usa o álbum fornecido como padrão; nenhuma configuração de produção foi escrita.

Validação atual: 14 testes aprovados. Na prévia local, painel abriu, capítulo foi salvo com autoria individual, álbum carregou e o player indicou reprodução. As pendências de backend e credencial pública descritas acima permanecem fora destas alterações de frontend.
