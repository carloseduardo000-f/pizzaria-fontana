// ======================================================
// LÓGICA DA PÁGINA INICIAL - js/index.js (FINAL E ESTÁVEL)
// ======================================================

// ======================================================
// FUNÇÃO PRINCIPAL DE ATUALIZAÇÃO DO FOOTER DO CARRINHO (VERSÃO DE DEPURAÇÃO)
// ======================================================
function atualizarCarrinhoFooter() {
    console.log("--- Iniciando atualização do footer ---");

    // Mapeia o cartFooter
    const cartFooter = document.querySelector('.cart-footer');
    
    // VAMOS VERIFICAR SE O ELEMENTO PRINCIPAL FOI ENCONTRADO
    console.log("1. Buscando o elemento '.cart-footer':", cartFooter);

    if (!cartFooter) {
        console.error("ERRO CRÍTICO: Não foi possível encontrar o elemento '.cart-footer' no HTML.");
        return;
    }

    const cartInfoText = cartFooter.querySelector('.cart-info p');
    const cartInfoPrice = cartFooter.querySelector('.cart-info strong');
    const cartButton = cartFooter.querySelector('.btn-cart');

    // VAMOS VERIFICAR OS ELEMENTOS INTERNOS
    console.log("2. Buscando sub-elementos:", {
        texto: cartInfoText,
        preco: cartInfoPrice,
        botao: cartButton
    });

    const carrinhoJSON = localStorage.getItem('elfuego-cart');
    console.log("3. Conteúdo do localStorage ('elfuego-cart'):", carrinhoJSON);
    
    let carrinho = [];

    if (carrinhoJSON) {
        try {
            carrinho = JSON.parse(carrinhoJSON);
        } catch (e) {
            console.error('Erro ao analisar o JSON do carrinho:', e);
            localStorage.removeItem('elfuego-cart');
        }
    }

    console.log("4. Carrinho convertido para objeto. Itens:", carrinho.length);

    const limparPreco = (precoStr) =>
        parseFloat(String(precoStr).replace('R$', '').replace(/\s/g, '').replace(',', '.'));
    const formatarPreco = (precoNum) =>
        precoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


    // Lógica para Carrinho Vazio
    if (carrinho.length === 0) {
        console.log("5. O carrinho está vazio. Escondendo o footer.");
        cartFooter.style.display = 'none'; 
        return;
    }

    // Carrinho COM itens
    let valorTotal = 0;
    carrinho.forEach((item) => {
        valorTotal += limparPreco(item.price);
    });

    console.log("6. Cálculo do valor total:", formatarPreco(valorTotal));

    if (cartInfoText) cartInfoText.textContent = `Total`;
    if (cartInfoPrice) cartInfoPrice.textContent = formatarPreco(valorTotal);
    if (cartButton) {
        cartButton.disabled = false;
        cartButton.textContent = 'Ver carrinho';
        cartButton.href = 'carrinho.html';
    }

    console.log("7. Mostrando o footer na tela.");
    // MOSTRA O CARRINHO
    cartFooter.style.display = 'flex';
}


// ======================================================
// LÓGICA DA PÁGINA INICIAL (Inicialização e Listeners)
// ======================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("🔥 SCRIPT INDEX.JS CARREGADO!");
    
    // Chamada inicial para ler o localStorage e definir o estado (MOSTRAR/ESCONDER)
    // Se o CSP estiver quebrando a geolocalização e SweetAlert, essa é a única função que precisa rodar.
    atualizarCarrinhoFooter();

    // ======================================================
    // FUNÇÕES DE UTILIDADE (MÉTODO SEGURO DE ADIÇÃO RÁPIDA)
    // ======================================================
    function limparPreco(precoStr) {
        return parseFloat(precoStr.replace('R$', '').replace(/\s/g, '').replace(',', '.'));
    }
    
    function formatarPreco(precoNum) {
        return precoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function adicionarItemSimples(produtoInfo) {
        const carrinhoAtual = localStorage.getItem('elfuego-cart');
        let carrinhoItens = carrinhoAtual ? JSON.parse(carrinhoAtual) : [];

        const precoUnitarioRaw = limparPreco(produtoInfo.price);
        const itemExistente = carrinhoItens.find(
            (item) => item.name === produtoInfo.name && item.options.length === 0
        );

        if (itemExistente) {
            itemExistente.quantity += 1;
            const precoTotalExistenteRaw = limparPreco(itemExistente.price);
            const novoTotalRaw = precoTotalExistenteRaw + precoUnitarioRaw;
            itemExistente.price = formatarPreco(novoTotalRaw);
        } else {
            carrinhoItens.push(produtoInfo);
        }

        localStorage.setItem('elfuego-cart', JSON.stringify(carrinhoItens));
    }


    // ======================================================
    // LÓGICA DE AÇÃO DIRETA (Acompanhamentos/Bebidas)
    // ======================================================

    const botoesDiretos = document.querySelectorAll('.produtos a.add-direct');

    botoesDiretos.forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();

            const nome = link.dataset.nome;
            const precoRaw = parseFloat(link.dataset.preco);
            const imagem = link.dataset.img;

            const produtoSimples = {
                id: link.dataset.id + '-' + Date.now(),
                name: nome,
                price: precoRaw.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                }),
                image: imagem,
                quantity: 1,
                options: [],
                comment: '',
            };

            adicionarItemSimples(produtoSimples);
            
            // Atualiza o footer
            atualizarCarrinhoFooter();

            // Feedback visual elegante (ENVOLVER EM TRY/CATCH POR SEGURANÇA)
            try {
                 const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                });
                Toast.fire({
                    icon: 'success',
                    title: `${nome} adicionado ao carrinho!`,
                });
            } catch (e) {
                console.warn('Alerta de adição de produto falhou (SweetAlert não carregado):', e);
            }
        });
    });
});