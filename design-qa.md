# Design QA — 2026-10-15

Resultado visual: passed. Aprovações em produção: blocked por implantação Firebase ausente.

Comparação realizada entre a referência de feltro roxo fornecida e a captura desktop do mural. A textura original 740x493 foi preservada; não é um arquivo 8K. Moldura dourada, papéis curvos, fotos e alfinetes são geometria Three.js, adaptação intencional ao tema do casamento.

Validado em desktop 1440px e mobile 390px: composição de 12 recados fictícios, ampliação por clique/toque, lista de leitura acessível, navegação superior e distribuição proporcional. A demonstração não grava no Firebase. Revisão anterior também verificou a biografia interativa e aprovação local.

22 testes automatizados passaram, incluindo distribuição do mural, imagens, políticas de aprovação, Spotify e regressões. Renderização agora permanece suspensa fora da área visível, com aba oculta ou contexto WebGL perdido. HTML fornece alternativa sem WebGL.

Limitação conhecida: endpoints weddingMural e weddingGifts retornaram HTTP 404 na verificação anterior. O merge do frontend não implanta essas funções; funcionamento de aprovações em produção não está certificado.

As mudanças principais já estavam em origin/main (5f5c0fa) por upload externo. Este PR preserva esse conteúdo e finaliza o ajuste de ciclo de renderização e este registro de revisão.
