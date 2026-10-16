// Legacy chapters contain seed IDs (t1, t2...) which are not Firestore paths.
export function biographyDocument(snapshot) {
    const data = snapshot.data();
    const legacyOrder = /^t([1-9]\d*)$/.exec(data.id || '');
    return { ...data, order: data.order ?? (legacyOrder ? Number(legacyOrder[1]) - 1 : 0), id: snapshot.id };
}

export function biographySaveError(error) {
    if (error.code === 'permission-denied' || error.code === 'unauthenticated') return 'Sua sessão não tem permissão para salvar. Entre novamente no Painel do Casal. Seu texto continua neste formulário.';
    if (error.code === 'not-found') return 'Este capítulo não foi encontrado. Copie suas alterações e recarregue a página antes de tentar novamente.';
    return 'Não foi possível salvar agora. Confira a conexão e tente novamente. Suas alterações continuam neste formulário.';
}
