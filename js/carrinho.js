// ======================================================
// CÉREBRO DO CARRINHO - js/carrinho.js
// Contém todas as funções para manipular o carrinho
// ======================================================

function adicionarAoCarrinho(produtoInfo) {
    // 1. Tenta pegar o carrinho que já existe na memória.
    const carrinhoAtual = localStorage.getItem('elfuego-cart');

    // 2. Cria uma lista de itens do carrinho.
    // Se já existia um carrinho, ele carrega os itens. Se não, cria uma lista vazia.
    let carrinhoItens = carrinhoAtual ? JSON.parse(carrinhoAtual) : [];

    // 3. Adiciona o novo produto à lista.
    carrinhoItens.push(produtoInfo);

    // 4. Salva a lista ATUALIZADA de volta na memória.
    localStorage.setItem('elfuego-cart', JSON.stringify(carrinhoItens));
}