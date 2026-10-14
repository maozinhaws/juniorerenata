# Materiais do mural

- felt-purple.png: cópia sem alteração da textura roxa anexada pelo usuário (codex-clipboard-9dbba622-3bd4-4553-9c49-6f3154fe54a7.png), 740 × 493 pixels. Usada como mapa de cor e relevo, com repetição espelhada. Não é uma textura 8K e não foi aumentada artificialmente.
- Moldura, relevos de canto, alfinetes e papéis: geometria Three.js criada para este projeto conforme pedido explícito de objetos 3D. As referências com marca-d’água não foram incorporadas.
- Texto dos recados: CanvasTexture dinâmica, fonte Caveat já usada no site; leitura integral no diálogo HTML acessível.
- Three.js r170: distribuição local em js/vendor, com licença MIT em three-LICENSE.txt. Carregado somente perto do mural. Sem dependência do CDN em runtime.

O modo demonstrativo existe apenas em localhost. Mostra 12 recados fictícios com fotos já disponíveis no projeto, não grava nem aprova dados.

O renderizador limita o pixel ratio a 1.5, só anima por alguns quadros após interação e pausa fora da tela. Perda de contexto ou indisponibilidade de WebGL conserva o mural HTML e a lista de leitura. A aprovação no Firebase continua sendo um serviço separado.
