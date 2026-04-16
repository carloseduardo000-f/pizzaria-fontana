// ======================================================
// LÓGICA DA PÁGINA CARRINHO - MODO ONE PAGE CHECKOUT (FINAL V3 💹)
// ======================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- SELETORES ---
    const cartSection = document.querySelector('.cart-section');
    const checkoutSection = document.getElementById('checkout-section');
    const summarySection = document.querySelector('.summary-section');
    const pixPaymentSection = document.getElementById('pix-payment-section');
    const mobileFooter = document.getElementById('mobile-footer');
    const btnFinalizarMobile = document.getElementById('btn-finalizar-mobile');
    const btnFinalizarDesktop = document.getElementById('btn-finalizar-desktop');

    const FATOR = 100;
    let subtotalCache = 0;
    let freteAtual = 0; 
    let timerInterval = null;
    let pedidoFinal = { itens: [], total: 0 };

    // --- HELPERS ---
    function limparPreco(precoStr) {
        if (!precoStr) return 0;
        let num = String(precoStr)
            .replace('R$', '')
            .replace(/\s/g, '')
            .replace('.', '')
            .replace(',', '.');
        return parseFloat(num) || 0;
    }

    function formatarPreco(precoNum) {
        return (Math.round((precoNum || 0) * FATOR) / FATOR)
            .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // 🔹 Helper para ler cookies (caso o UTMify/gravação esteja em cookie)
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        return null;
    }

    // 🔹 Helper de tracking: tenta URL → localStorage → cookie
    function getTrackingParams() {
        const params = new URLSearchParams(window.location.search);

        function getValue(key) {
            return (
                params.get(key) ||
                localStorage.getItem(key) ||
                getCookie(key) ||
                null
            );
        }

        return {
            src: params.get('src') || getCookie('src') || null,
            sck: params.get('sck') || getCookie('sck') || null,
            utm_source: getValue('utm_source'),
            utm_campaign: getValue('utm_campaign'),
            utm_medium: getValue('utm_medium'),
            utm_content: getValue('utm_content'),
            utm_term: getValue('utm_term')
        };
    }

    // --- LÓGICA DE TOTAIS ---
    window.atualizarTotalComFrete = function(valorFrete) {
        freteAtual = parseFloat(valorFrete);
        const displayFrete = document.getElementById('display-frete');
        if (displayFrete) {
            displayFrete.textContent = freteAtual === 0 ? 'Grátis' : formatarPreco(freteAtual);
            displayFrete.style.color = freteAtual === 0 ? 'green' : '#333';
            displayFrete.style.fontWeight = 'bold';
        }
        recalcularTudo();
    };

    function recalcularTudo() {
        const carrinhoJSON = localStorage.getItem('elfuego-cart');
        const carrinho = carrinhoJSON ? JSON.parse(carrinhoJSON) : [];
        let subtotal = 0;
        carrinho.forEach(item => subtotal += limparPreco(item.price));
        subtotalCache = subtotal;
        const totalFinal = subtotal + freteAtual;

        document.querySelectorAll('.total-price')
            .forEach(el => el.textContent = formatarPreco(totalFinal));
        document.querySelectorAll('.total-amount')
            .forEach(el => el.textContent = formatarPreco(totalFinal));
        
        const subtotalEl = document.querySelector('.summary-item:nth-child(1) span:last-child');
        if (subtotalEl) subtotalEl.textContent = formatarPreco(subtotal);

        pedidoFinal.itens = [...carrinho];
        pedidoFinal.total = totalFinal;
    }

    // --- RENDERIZAR CARRINHO ---
    function renderizarCarrinho() {
        const carrinhoJSON = localStorage.getItem('elfuego-cart');
        const carrinho = carrinhoJSON ? JSON.parse(carrinhoJSON) : [];

        document.querySelectorAll('.cart-item').forEach(item => item.remove());
        document.querySelector('.empty-cart-message')?.remove();

        // Garante que o footer volte se sair da tela pix
        if (mobileFooter) mobileFooter.style.display = 'flex'; 
        if (btnFinalizarMobile) btnFinalizarMobile.style.display = 'flex';

        if (carrinho.length === 0) {
            if (cartSection) {
                cartSection.innerHTML = `
                    <div class="empty-cart-message" style="text-align:center; padding:40px;">
                        <p>Seu carrinho está vazio.</p>
                        <button class="add-more-items-button" onclick="window.location.href='index.html'">
                            Ver Cardápio
                        </button>
                    </div>`;
            }
            if (checkoutSection) checkoutSection.style.display = 'none';
            if (summarySection) summarySection.style.display = 'none';
            if (mobileFooter) mobileFooter.style.display = 'none';
            return;
        }

        let container = cartSection.querySelector('.group-header');
        carrinho.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-item');
            let optionsHTML = item.options
                .map(opt => `<li>${opt.name} (${opt.quantity}x)</li>`)
                .join('');
            itemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div class="item-details">
                    <h3>${item.name}</h3>
                    <span class="item-price">${item.price}</span>
                    <ul class="item-options-list">${optionsHTML}</ul>
                </div>
                <div class="quantity-selector">
                    <button class="btn-minus" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="btn-plus" data-id="${item.id}">+</button>
                </div>`;
            if (container) {
                container.insertAdjacentElement('afterend', itemElement);
                container = itemElement;
            }
        });

        const freteSelecionadoInput = document.querySelector('input[name="shipping-method"]:checked');
        if (freteSelecionadoInput) atualizarTotalComFrete(freteSelecionadoInput.value);
        else recalcularTudo();
    }

    // --- QUANTIDADE ---
    function controlarQuantidade(itemId, acao) {
        let carrinho = JSON.parse(localStorage.getItem('elfuego-cart')) || [];
        const index = carrinho.findIndex(i => i.id === itemId);
        if (index > -1) {
            let item = carrinho[index];
            if (acao === 'add') {
                item.quantity++;
                let novoTotal = (limparPreco(item.price) / (item.quantity - 1)) * item.quantity;
                item.price = formatarPreco(novoTotal);
            } else if (acao === 'rem') {
                if (item.quantity <= 1) {
                    carrinho.splice(index, 1);
                } else {
                    let novoTotal = (limparPreco(item.price) / item.quantity) * (item.quantity - 1);
                    item.quantity--;
                    item.price = formatarPreco(novoTotal);
                }
            }
        }
        localStorage.setItem('elfuego-cart', JSON.stringify(carrinho));
        renderizarCarrinho();
    }

    document.querySelector('.cart-section')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.quantity-selector button');
        if (btn) controlarQuantidade(btn.dataset.id, btn.classList.contains('btn-plus') ? 'add' : 'rem');
    });

    // ======================================================
    // 5. FINALIZAR PEDIDO (COM TRACKING DE PIXEL E AUTO-URL 🎯)
    // ======================================================
    async function finalizarPedido() {
        const nome = document.getElementById('nome')?.value.trim();
        const whatsapp = document.getElementById('whatsapp')?.value.trim();
        const rua = document.getElementById('rua')?.value.trim();
        const numero = document.getElementById('numero')?.value.trim();
        const bairro = document.getElementById('bairro')?.value.trim();
        const cep = document.getElementById('cep')?.value.trim();

        if (!nome || !whatsapp || !rua || !numero || !bairro || !cep) {
            Swal.fire({
                icon: 'warning',
                title: 'Atenção',
                text: 'Preencha todos os campos obrigatórios.',
                confirmButtonColor: '#EA1D2C'
            });
            document.getElementById('checkout-form')
                .scrollIntoView({ behavior: 'smooth' });
            return;
        }

        const btns = [btnFinalizarMobile, btnFinalizarDesktop];
        btns.forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            }
        });

        // 🔥 TENTA LER O CARRINHO DO EL FUEGO, SE NÃO ACHAR, TENTA O DO JAPA (Para funcionar nos 2 sites)
        const carrinho =
            JSON.parse(localStorage.getItem('elfuego-cart')) ||
            JSON.parse(localStorage.getItem('fontana-cart')) ||
            [];
        
        // Prepara produtos para API e para o Pixel
        const produtosParaEnvio = carrinho.map(item => ({ 
            id: item.id || 'SKU-GEN', 
            name: item.name, 
            quantity: item.quantity, 
            price: limparPreco(item.price) 
        }));

        // 🔹 NOVO: captura parâmetros de tracking (UTM/UTMify)
        const trackingParameters = getTrackingParams();

        // Captura a query string completa para a Duttyfy (UTM + fbclid + fbp + tudo)
        const utmQueryString = window.location.search.replace(/^\?/, "");

        const dadosPedido = {
            valorTotal: subtotalCache + freteAtual,
            nome: nome,
            whatsapp: whatsapp,
            cep: cep,
            rua: rua,
            numero: numero,
            bairro: bairro,
            complemento: document.getElementById('complemento')?.value || '',
            products: produtosParaEnvio,
            trackingParameters: trackingParameters, // 🔥 AGORA VAI COM UTM!
            utm: utmQueryString // 🔥 Query string completa para Duttyfy
        };

        // URL DO BACKEND (Netlify Function - mesmo domínio, sem CORS)
        const apiUrl = 'api/criar-pix.php';

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosPedido)
            });

            if (!response.ok) throw new Error('Erro servidor');
            const pixResponse = await response.json();
            
            if (pixResponse.success) {
                
                // 🔥 DISPARO DO PIXEL DE COMPRA (PURCHASE) 🔥
                if (typeof fbq === 'function') {
                    fbq('track', 'Purchase', {
                        value: dadosPedido.valorTotal,
                        currency: 'BRL',
                        content_type: 'product',
                        content_ids: produtosParaEnvio.map(p => p.id),
                        num_items: produtosParaEnvio.reduce((acc, item) => acc + item.quantity, 0)
                    });
                    console.log(" pPixel 'Purchase' disparado com sucesso! 💰");
                }
                // ----------------------------------

                mostrarTelaPix(dadosPedido.valorTotal, pixResponse);
            } else {
                throw new Error(pixResponse.message);
            }

        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Ops!',
                text: 'Erro ao gerar pagamento. Tente novamente.'
            });
            btns.forEach(btn => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = 'Pagar com PIX <i class="fas fa-qrcode"></i>';
                }
            });
        }
    }
    
    // Reativa os botões com a nova função
    if (btnFinalizarMobile) btnFinalizarMobile.addEventListener('click', finalizarPedido);
    if (btnFinalizarDesktop) btnFinalizarDesktop.addEventListener('click', finalizarPedido);

    // --- TELA PIX (🔥 CORREÇÃO FOOTER) ---
    function mostrarTelaPix(total, data) {
        try {
            if (cartSection) cartSection.style.display = 'none';
            if (checkoutSection) checkoutSection.style.display = 'none';
            if (summarySection) summarySection.style.display = 'none';
            if (document.querySelector('.cart-title')) {
                document.querySelector('.cart-title').style.display = 'none';
            }
            
            // 🔥 BOMBA ATÔMICA NO FOOTER 🔥
            if (mobileFooter) {
                mobileFooter.style.setProperty('display', 'none', 'important');
                mobileFooter.style.visibility = 'hidden';
            }

            if (pixPaymentSection) {
                pixPaymentSection.style.display = 'block';
                window.scrollTo(0, 0);
            }

            
            const inputPix = document.getElementById('pix-code-input');
            
            if (inputPix) inputPix.value = data.pixCopiaECola;
            
            // 🔥 GERAR QR CODE PIX
if (data.pixCopiaECola) {
    gerarQRCodePix(data.pixCopiaECola);
}

            
            const nomeEl = document.getElementById('pix-delivery-name');
            const phoneEl = document.getElementById('pix-delivery-phone');
            const addrEl = document.getElementById('pix-delivery-address');
            
            if (nomeEl) nomeEl.textContent = document.getElementById('nome')?.value || 'Cliente';
            if (phoneEl) phoneEl.textContent = document.getElementById('whatsapp')?.value || '';
            
            const rua = document.getElementById('rua')?.value || '';
            const numero = document.getElementById('numero')?.value || '';
            const bairro = document.getElementById('bairro')?.value || '';
            const comp = document.getElementById('complemento')?.value;
            if (addrEl) {
                addrEl.textContent = `${rua}, ${numero} - ${bairro} ${comp ? '('+comp+')' : ''}`;
            }

            const itemsContainer = document.getElementById('pix-order-items-list-container');
            if (itemsContainer) {
                itemsContainer.innerHTML = '';
                pedidoFinal.itens.forEach(item => {
                    itemsContainer.innerHTML += `
                        <div class="final-product-list-item">
                            <div style="display: flex; align-items: center;">
                                <img src="${item.image}" alt="${item.name}" class="final-product-image">
                                <div>
                                    <span style="font-weight:bold; color: #EA1D2C; margin-right: 4px;">
                                        ${item.quantity}x
                                    </span> 
                                    <span style="color: #4A5568; font-size: 0.9rem;">
                                        ${item.name}
                                    </span>
                                </div>
                            </div>
                            <span style="font-weight:600; font-size: 0.9rem;">
                                ${item.price}
                            </span>
                        </div>`;
                });
            }

            const totalPixCard1 = document.getElementById('pix-order-total-card1');
            const totalPixResumo = document.getElementById('pix-order-total');
            const valorFormatado = (typeof total === 'number') ? formatarPreco(total) : total;
            if (totalPixCard1) totalPixCard1.textContent = valorFormatado;
            if (totalPixResumo) totalPixResumo.textContent = valorFormatado;

            const agora = new Date();
            const formatHora = (d) =>
                `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
            const entregaMin = new Date(agora.getTime() + 30*60000);
            const entregaMax = new Date(agora.getTime() + 50*60000);
            const estimateEl = document.getElementById('delivery-estimate-time');
            if (estimateEl) {
                estimateEl.textContent = `${formatHora(entregaMin)} - ${formatHora(entregaMax)}`;
            }

            const copyBtn = document.getElementById('copy-pix-btn');
            if (copyBtn && inputPix) {
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(inputPix.value);
                    Swal.fire({
                        toast:true,
                        icon:'success',
                        title:'Copiado!',
                        position:'top-end',
                        timer:1500,
                        showConfirmButton:false
                    });
                };
            }
            iniciarContagemRegressiva(300, data.transactionId);
        } catch (e) {
            console.error("Erro pix:", e);
        }
    }
    
    
    function gerarQRCodePix(pixCopiaECola) {
    const container = document.getElementById('pix-qrcode');
    if (!container || !pixCopiaECola) return;

    container.innerHTML = ""; // limpa QR anterior

    new QRCode(container, {
        text: pixCopiaECola,
        width: 220,
        height: 220,
        correctLevel: QRCode.CorrectLevel.M
    });
}


    // --- TIMER E VERIFICAÇÃO ---
    function iniciarContagemRegressiva(segundos, transactionId) {
        const timerEl = document.getElementById('pix-timer');
        const statusEl = document.getElementById('pix-status-text');
        const progressBar = document.getElementById('delivery-progress-bar');
        const totalDuration = segundos;
        let tempo = segundos;

        verificarStatus(transactionId);

        timerInterval = setInterval(() => {
            tempo--;
            const min = Math.floor(tempo / 60);
            const sec = tempo % 60;
            if (timerEl) timerEl.textContent = `${min}:${sec.toString().padStart(2,'0')}`;
            if (progressBar && totalDuration > 0) {
                const percentage = Math.max(0, (tempo / totalDuration) * 100);
                progressBar.style.width = percentage + '%';
            }
            if (tempo % 5 === 0) verificarStatus(transactionId);
            if (tempo <= 0) {
                clearInterval(timerInterval);
                if (statusEl) {
                    statusEl.textContent = "Expirado";
                    statusEl.style.color = "red";
                }
                if (progressBar) progressBar.style.width = '0%';
            }
        }, 1000);
    }

    async function verificarStatus(id) {
        try {
            const res = await fetch(`api/verificar-status.php?id=${id}`);
            const data = await res.json();
            if (data.status === 'paid' || data.status === 'approved') {
                clearInterval(timerInterval);
                const statusEl = document.getElementById('pix-status-text');
                const progressBar = document.getElementById('delivery-progress-bar');
                if (statusEl) {
                    statusEl.textContent = "PAGO COM SUCESSO! 🚀";
                    statusEl.style.color = "green";
                }
                if (progressBar) {
                    progressBar.style.width = '100%';
                    progressBar.style.backgroundColor = 'green';
                }
                localStorage.removeItem('elfuego-cart');
                Swal.fire({
                    icon: 'success',
                    title: 'Pagamento Confirmado!',
                    text: 'Seu pedido já está sendo preparado.',
                    showConfirmButton: false,
                    timer: 4000
                }).then(() => {
                    window.location.href = 'obrigado.html';
                });
            }
        } catch(e) {
            console.log("Verificando...", e);
        }
    }

    // --- API CEP ---
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('blur', () => {
            let cep = cepInput.value.replace(/\D/g, '');
            if (cep.length === 8) {
                fetch(`https://viacep.com.br/ws/${cep}/json/`)
                    .then(res => res.json())
                    .then(data => {
                        if (!data.erro) {
                            document.getElementById('rua').value = data.logradouro;
                            document.getElementById('bairro').value = data.bairro;
                        }
                    });
            }
        });
    }

    if (window.jQuery && $.fn.mask) {
        $('#whatsapp').mask('(00) 00000-0000');
        $('#cep').mask('00000-000');
    }

    renderizarCarrinho();
});