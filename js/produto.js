// ======================================================
// LÓGICA DA PÁGINA DE PRODUTO (FONTANA DI TREVI)
// ======================================================

// --- Variáveis de Escopo Global ---
let todosOsGrupos;
let seletorPrincipal;
let addToCartButton;
let btnLabel;
let precoTotalEl;
let requiredAlert;
let commentTextarea;
let charCounter;


// ------------------------------------------------------
// FUNÇÃO DE CARREGAMENTO DINÂMICO DO PRODUTO
// ------------------------------------------------------
async function carregarProdutoDinamico() {
try {
 // 1️⃣ Captura o ID do produto pela URL
 const urlParams = new URLSearchParams(window.location.search);
 // Define um ID padrão caso nenhum seja passado (ex: o primeiro combo)
 const produtoId = urlParams.get('id') || 'combo-raijin';

 // 2️⃣ Faz a leitura do arquivo JSON (Fontana di Trevi)
 const response = await fetch('js/produtos.json'); // Busca o JSON atualizado
 const produtos = await response.json();

 // 3️⃣ Localiza o produto correspondente
 const produto = produtos[produtoId];
 if (!produto) {
 console.error("❌ Produto não encontrado no JSON:", produtoId);
 // Poderia redirecionar para index ou mostrar erro na página
 document.body.innerHTML = "<h1>Produto não encontrado</h1><a href='index.html'>Voltar</a>";
 return;
 }

 // 4️⃣ Atualiza o título da aba para Fontana di Trevi
 document.title = `${produto.nome} - Fontana di Trevi`;

 // 5️⃣ Atualiza imagem, nome e descrição
 const imgEl = document.querySelector('.product-image img');
 if (imgEl) {
 imgEl.src = produto.imagem; // Caminho da imagem vem do JSON
 imgEl.alt = produto.nome;
 }

 const nomeEl = document.querySelector('.product-info h1');
 if (nomeEl) nomeEl.textContent = produto.nome;

 const descEl = document.querySelector('.product-info .description');
 if (descEl) descEl.textContent = produto.descricao;

 // 6️⃣ Atualiza os preços
 const precoBaseEl = document.getElementById('base-price');
 const precoAntigoEl = document.querySelector('.product-info .old-price');

 if (precoBaseEl) {
 precoBaseEl.textContent = produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
 precoBaseEl.dataset.price = produto.preco; // Guarda o valor base numerico
 }

 if (produto.precoAntigo && precoAntigoEl) {
 precoAntigoEl.textContent = produto.precoAntigo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
 precoAntigoEl.style.display = 'inline'; // Mostra se existir
 } else if (precoAntigoEl) {
 precoAntigoEl.style.display = 'none'; // Esconde se não existir
 }

 // 7️⃣ Atualiza o botão "Adicionar" com o preço inicial
 const totalPriceEl = document.getElementById('total-price');
 if (totalPriceEl && precoBaseEl) {
 totalPriceEl.textContent = precoBaseEl.textContent;
 }

 // 8️⃣ & 9️⃣ Lógica de BebidasMax / BebidaGratis REMOVIDA/COMENTADA
 // Como removemos essas chaves do JSON de Pizza, essa lógica não é mais necessária
 // e poderia causar erros se tentasse ler `produto.bebidasMax`.
 /*
 const bebidasSection = Array.from(document.querySelectorAll('.option-group'))
 .find(section => section.querySelector('h2')?.textContent.includes('Bebidas'));

 if (bebidasSection && produto.bebidasMax) {
 // ... código removido ...
 }

 if (bebidasSection) {
 // ... código removido ...
 }
 */
 // Ajusta a seção de Bebidas conforme o tipo de produto
 const bebidasSection = Array.from(document.querySelectorAll('.option-group'))
 .find(section => section.querySelector('h2')?.textContent.includes('Bebidas'));
 if (bebidasSection) {
    const tagNoHeader = bebidasSection.querySelector('.group-header span');
    if (tagNoHeader) {
        tagNoHeader.classList.remove('tag-required');
        tagNoHeader.classList.add('tag-optional');
        tagNoHeader.textContent = "Opcional";
    }
    const desc = bebidasSection.querySelector('.group-description');
    if (desc) desc.textContent = "Escolha se desejar";

    // Verifica se é um COMBO (preço já inclui bebidas) ou pizza individual
    const isCombo = produtoId.startsWith('combo-');

    const bebidaItens = bebidasSection.querySelectorAll('.option-item');
    bebidaItens.forEach(item => {
        const tagGratis = item.querySelector('.tag-gratis');

        if (isCombo) {
            // Nos combos, bebidas são grátis (preço já incluso no combo)
            item.dataset.price = 0;
            if (!tagGratis) {
                const novaTag = document.createElement('span');
                novaTag.className = 'tag-gratis';
                novaTag.textContent = 'Grátis';
                item.querySelector('.item-info').appendChild(novaTag);
            }
        } else {
            // Nas pizzas individuais, bebidas são pagas
            const precoTextoEl = item.querySelector('.item-price');
            let precoReal = 0;
            if (precoTextoEl) {
                try {
                    precoReal = parseFloat(precoTextoEl.textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                } catch (e) {
                    console.warn("Não foi possível ler o preço da bebida:", precoTextoEl.textContent);
                }
            }
            item.dataset.price = precoReal;
            if (tagGratis) tagGratis.remove();
        }
    });
     console.log(isCombo ? "🍺 Bebidas grátis nos combos!" : "🥤 Bebidas pagas avulsas.");
 }


 console.log(`✅ Produto carregado: ${produto.nome}`);
} catch (error) {
 console.error("❌ Erro ao carregar produto:", error);
 // Exibe um erro mais claro para o usuário
 document.body.innerHTML = `<h1>Erro ao carregar produto</h1><p>${error.message}</p><a href='index.html'>Voltar</a>`;
}
}

// ======================================================
// FUNÇÕES PRINCIPAIS DE LÓGICA (Mantidas, mas sem lógica de obrigatoriedade complexa)
// ======================================================

// Verifica se grupos marcados como obrigatórios no HTML estão preenchidos
// (No nosso HTML adaptado, nenhum grupo é obrigatório por padrão)
function gruposObrigatoriosPreenchidos() {
let tudoOk = true;
todosOsGrupos.forEach(grupo => {
 // Verifica se existe a tag 'tag-required' no cabeçalho do grupo
 if (grupo.querySelector('.group-header .tag-required')) {
   let totalItensNoGrupo = 0;
   // Soma a quantidade de todos os itens dentro do grupo
   grupo.querySelectorAll('.option-item .quantity-selector span').forEach(span => {
    totalItensNoGrupo += parseInt(span.textContent, 10) || 0;
   });
   // Se for obrigatório e não tiver nenhum item, marca como não OK
   if (totalItensNoGrupo === 0) {
     tudoOk = false;
     console.warn("Grupo obrigatório não preenchido:", grupo.querySelector('h2')?.textContent);
   }
 }
});
return tudoOk;
}

// Atualiza o estado do botão principal (Adicionar/Bloqueado)
function atualizarEstadoBotaoPrincipal() {
if (!addToCartButton || !btnLabel) return; // Segurança extra

if (gruposObrigatoriosPreenchidos()) {
 addToCartButton.disabled = false;
 btnLabel.textContent = 'Adicionar'; // Texto padrão quando liberado
 // Garante que o alerta de obrigatório esteja escondido
 if (requiredAlert) requiredAlert.style.display = 'none';
} else {
 addToCartButton.disabled = true;
 btnLabel.textContent = 'Selecione as opções obrigatórias'; // Mensagem de bloqueio
}
}

// Calcula o preço total (Base + Adicionais * Quantidade Principal)
function atualizarTudo() {
let precoAdicionais = 0;
const precoBaseEl = document.getElementById('base-price');
const precoBase = precoBaseEl ? parseFloat(precoBaseEl.dataset.price) : 0; // Pega do data-price
const quantidadePrincipal = seletorPrincipal ? parseInt(seletorPrincipal.querySelector('span').textContent, 10) : 1;

// Itera sobre todos os grupos de opções
todosOsGrupos.forEach(grupo => {
 // Itera sobre cada item dentro do grupo
 grupo.querySelectorAll('.option-item').forEach(item => {
   let qtd = 0;

   // Verifica se é um item com checkbox (sabores) ou com botões +/- (bebidas/adicionais)
   const checkbox = item.querySelector('input[type="checkbox"]');
   const quantitySpan = item.querySelector('.quantity-selector span');

   if (checkbox) {
     // Para checkboxes (sabores), quantidade é 1 se marcado, 0 se não
     qtd = checkbox.checked ? 1 : 0;
   } else if (quantitySpan) {
     // Para botões +/-, lê a quantidade do span
     qtd = parseInt(quantitySpan.textContent, 10) || 0;
   }

   // Pega o preço do item do atributo data-price (definido no HTML ou ajustado pelo JS)
   const precoItem = parseFloat(item.dataset.price) || 0;
   // Soma ao total de adicionais (quantidade * preço do item)
   precoAdicionais += qtd * precoItem;
 });
});

// Calcula o preço final
const precoTotalFinal = (precoBase + precoAdicionais) * quantidadePrincipal;

// Atualiza o texto do preço total no footer
if (precoTotalEl) {
 precoTotalEl.textContent = precoTotalFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
// Atualiza o estado do botão Adicionar (habilita/desabilita)
atualizarEstadoBotaoPrincipal();
}

// ======================================================
// FUNÇÃO PARA ANEXAR LISTENERS (Ouvintes de Eventos)
// ======================================================
function anexarListenersDeQuantidade() {
// Listener para checkboxes e radios (seleção de sabores)
document.querySelectorAll('.option-group .option-item input[type="checkbox"], .option-group .option-item input[type="radio"]').forEach(input => {
 const grupo = input.closest('.option-group');
 const maxItens = parseInt(grupo.dataset.maxItems || '999', 10);

 input.addEventListener('change', () => {
   if (input.checked) {
     // Para radio button, não precisa verificar limite (só permite 1)
     if (input.type === 'radio') {
       atualizarTudo();
       return;
     }

     // Para checkbox, verifica o limite do grupo
     let totalSelecionadosNoGrupo = 0;
     grupo.querySelectorAll('.option-item input[type="checkbox"]:checked').forEach(chk => {
       totalSelecionadosNoGrupo++;
     });

     if (totalSelecionadosNoGrupo > maxItens) {
       input.checked = false; // Desmarca se excedeu o limite
       grupo.classList.remove('shake');
       void grupo.offsetWidth;
       grupo.classList.add('shake');
       if (navigator.vibrate) navigator.vibrate(60);
       console.warn("Limite máximo de sabores atingido:", maxItens);
       return;
     }
   }
   atualizarTudo();
 });
});

// Listener dos botões + e - dos itens opcionais (Adicionais, Bebidas)
document.querySelectorAll('.option-item .quantity-selector').forEach(seletor => {
 const btnPlus = seletor.querySelector('.btn-plus');
 const btnMinus = seletor.querySelector('.btn-minus');
 const quantitySpan = seletor.querySelector('span');

 // Ação ao clicar no botão MAIS (+) para quantity-selectors normais
 if (btnPlus && btnMinus && quantitySpan) {
 btnPlus.addEventListener('click', () => {
   const grupo = btnPlus.closest('.option-group'); // Encontra o grupo pai
   // Pega o limite máximo de itens do grupo (ou 999 se não definido)
   const maxItens = parseInt(grupo.dataset.maxItems || '999', 10);
   let totalAtualNoGrupo = 0;
   // Calcula quantos itens já foram selecionados NESTE grupo
   grupo.querySelectorAll('.option-item .quantity-selector span').forEach(span => {
    totalAtualNoGrupo += parseInt(span.textContent, 10) || 0;
   });

   // Verifica se o limite do grupo foi atingido
   if (totalAtualNoGrupo >= maxItens) {
    // Se atingiu, faz o grupo "tremer" e vibra (feedback visual/tátil)
    grupo.classList.remove('shake');
    void grupo.offsetWidth; // Truque para reiniciar a animação
    grupo.classList.add('shake');
    if (navigator.vibrate) navigator.vibrate(60); // Vibra se o dispositivo suportar
    console.warn("Limite máximo atingido para o grupo:", grupo.querySelector('h2')?.textContent);
    return; // Impede adicionar mais
   }

   // Se não atingiu o limite, incrementa a quantidade do item clicado
   quantitySpan.textContent = (parseInt(quantitySpan.textContent, 10) || 0) + 1;
   btnMinus.disabled = false; // Habilita o botão de menos
   atualizarTudo(); // Recalcula o preço total e atualiza o botão principal
 });

 // Ação ao clicar no botão MENOS (-)
 btnMinus.addEventListener('click', () => {
   const valorAtual = parseInt(quantitySpan.textContent, 10) || 0;
   // Só diminui se for maior que zero
   if (valorAtual > 0) {
    quantitySpan.textContent = valorAtual - 1;
    // Se a quantidade chegar a zero, desabilita o botão de menos
    if (valorAtual - 1 === 0) btnMinus.disabled = true;
    // Habilita todos os botões de mais dentro do grupo (caso estivessem desabilitados pelo limite)
    const grupo = btnMinus.closest('.option-group');
    grupo.querySelectorAll('.btn-plus').forEach(btn => btn.disabled = false);
    atualizarTudo(); // Recalcula o preço total e atualiza o botão principal
   }
 });
 }
});

// Listener dos botões + e - principais (do produto base, no footer)
if (seletorPrincipal) {
 seletorPrincipal.querySelector('.btn-plus').addEventListener('click', () => {
   const span = seletorPrincipal.querySelector('span');
   span.textContent = (parseInt(span.textContent, 10) || 1) + 1;
   seletorPrincipal.querySelector('.btn-minus').disabled = false; // Habilita o menos
   atualizarTudo();
 });

 seletorPrincipal.querySelector('.btn-minus').addEventListener('click', () => {
   const span = seletorPrincipal.querySelector('span');
   const val = parseInt(span.textContent, 10) || 1;
   if (val > 1) { // Só diminui se for maior que 1
     span.textContent = val - 1;
   }
   // Se voltar para 1, desabilita o menos
   if ((parseInt(span.textContent, 10) || 1) === 1) {
     seletorPrincipal.querySelector('.btn-minus').disabled = true;
   }
   atualizarTudo();
 });
}

// Listener da caixa de comentário (Observações)
if (commentTextarea && charCounter) {
 commentTextarea.addEventListener('input', () => {
   // Atualiza o contador de caracteres
   charCounter.textContent = `${commentTextarea.value.length} / 140`;
 });
}
}

// ======================================================
// LÓGICA DO BOTÃO "ADICIONAR AO CARRINHO"
// ======================================================
function configurarBotaoAdicionar() {
    if (!addToCartButton) return; // Sai se o botão não existir

    addToCartButton.addEventListener('click', () => {
        // Verifica novamente se os grupos obrigatórios estão preenchidos
        if (!gruposObrigatoriosPreenchidos()) {
            if (requiredAlert) {
                requiredAlert.style.display = 'flex'; // Mostra o alerta
                window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo
            } else {
                // Fallback caso o alerta não exista
                Swal.fire('Atenção!', 'Selecione as opções obrigatórias.', 'warning');
            }
            return; // Impede a adição
        }

        // Se passou na verificação, esconde o alerta (caso estivesse visível)
        if (requiredAlert) requiredAlert.style.display = 'none';

        // Coleta as opções selecionadas (sabores e bebidas/adicionais)
        const selectedOptions = [];
        document.querySelectorAll('.option-item').forEach(item => {
            let quantity = 0;

            // Verifica se é checkbox (sabor) ou quantity-selector (bebida/adicional)
            const checkbox = item.querySelector('input[type="checkbox"]');
            const quantitySpan = item.querySelector('.quantity-selector span');

            if (checkbox) {
                // Para checkboxes, quantidade é 1 se marcado
                quantity = checkbox.checked ? 1 : 0;
            } else if (quantitySpan) {
                // Para quantity-selectors, lê o valor do span
                quantity = parseInt(quantitySpan.textContent, 10) || 0;
            }

            if (quantity > 0) {
                selectedOptions.push({
                    name: item.querySelector('.item-info h3').textContent,
                    quantity: quantity
                });
            }
        });

        // Pega o ID do produto da URL novamente
        const urlParams = new URLSearchParams(window.location.search);
        const produtoId = urlParams.get('id') || 'combo-raijin'; // Usa o ID padrão se não houver

        // Monta o objeto do produto para adicionar ao carrinho
        const produtoParaAdicionar = {
            id: produtoId + '-' + Date.now(), // Cria um ID único para este item no carrinho
            name: document.querySelector('.product-info h1').textContent, // Nome do produto
            price: document.getElementById('total-price').textContent, // Preço TOTAL calculado
            image: document.querySelector('.product-image img')?.getAttribute('src') || '', // Imagem
            quantity: parseInt(seletorPrincipal?.querySelector('span').textContent, 10) || 1, // Quantidade principal
            options: selectedOptions, // Array com as opções selecionadas
            comment: commentTextarea ? commentTextarea.value.trim() : "" // Comentário/Observação
        };

        // Chama a função global (definida em carrinho.js) para adicionar ao localStorage
        adicionarAoCarrinho(produtoParaAdicionar);

        // Mostra um popup de sucesso (SweetAlert2)
        Swal.fire({
            icon: 'success',
            title: 'Adicionado!',
            text: `${produtoParaAdicionar.name} foi adicionado ao seu carrinho.`,
            showConfirmButton: false,
            timer: 1200 // Fecha automaticamente após 1.2 segundos
        });

        // Redireciona de volta para a página inicial após o popup fechar
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1200); // Mesmo tempo do timer do SweetAlert
    });
}


// ======================================================
// LÓGICA PRINCIPAL DA PÁGINA (STARTUP)
// ======================================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Carrega os dados do produto (imagem, nome, preço base) do JSON
    await carregarProdutoDinamico();

    // 2. ATRIBUIÇÃO DOS SELETORES GERAIS (após o carregamento dinâmico)
    todosOsGrupos = document.querySelectorAll('.option-group');
    seletorPrincipal = document.querySelector('.quantity-selector-main');
    addToCartButton = document.querySelector('.add-to-cart-button');
    // Garante que pegue o span dentro do botão, se existir
    btnLabel = addToCartButton ? (addToCartButton.querySelector('.btn-label') || addToCartButton) : null;
    precoTotalEl = document.getElementById('total-price');
    requiredAlert = document.querySelector('.required-alert');
    commentTextarea = document.getElementById('comment-textarea');
    charCounter = document.getElementById('char-counter');

    // Verifica se os seletores essenciais foram encontrados
    if (!todosOsGrupos || !seletorPrincipal || !addToCartButton || !btnLabel || !precoTotalEl) {
        console.error("❌ ERRO: Elementos essenciais da página não foram encontrados após o carregamento.");
        // Poderia exibir uma mensagem de erro mais robusta aqui
        return;
    }

    // 3. Configura o botão "Adicionar ao Carrinho"
    configurarBotaoAdicionar();

    // 4. Anexa os listeners para os botões de quantidade (+/-)
    anexarListenersDeQuantidade();

    // 5. Calcula o preço inicial e atualiza o estado do botão principal
    atualizarTudo();

    console.log("✅ Página do produto inicializada e listeners anexados.");
});