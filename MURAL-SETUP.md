# Mural

O mural usa Firestore diretamente no plano gratuito. Não é necessário implantar `weddingMural` nem ativar Blaze. Veja `FIREBASE-DEPLOYMENT.md` para regras, publicação e validações.

O visitante seleciona o nome cadastrado, escreve até 1.000 caracteres e pode anexar uma foto. Ao salvar, o próprio formulário exibe **Recado enviado**, informando que aguarda aprovação. Em falhas, mostra erro sem confirmar envio.

Os administradores aprovam ou recusam no Painel do Casal. Apenas recados aprovados aparecem no mural público. Cada convidado tem dois slots permanentes, com uma foto opcional por recado. A prévia localhost continua isolada e usa dados fictícios.

O feltro enviado pelo usuário é usado na composição Three.js. Há leitura ampliada, alternativa acessível em lista e fallback sem WebGL. Conteúdo antigo permanece preservado e não é publicado automaticamente.
