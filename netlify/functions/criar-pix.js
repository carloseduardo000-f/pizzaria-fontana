// Netlify Function - Criar PIX com Duttyfy

const DUTTYFY_URL = 'https://www.pagamentos-seguros.app/api-pix/CtAgjEymLwg_4KGo7aEURAoCmjcWPLPdL1dpVXgKKvcXMF9ZGvL6sekAG96M-hLkRtcwtL4rrb9Ab3D6mTRlcA';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);
    const nome = (data.nome || '').trim();
    const whatsapp = (data.whatsapp || '').replace(/\D/g, '');
    const valor = parseFloat(data.valorTotal) || 0;
    const utm = data.utm || '';

    if (!nome || !whatsapp || valor <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Dados incompletos' }) };
    }

    // Generate CPF
    const cpf = Array(9).fill(0).map(() => Math.floor(Math.random() * 10));
    for (let t = 9; t < 11; t++) {
      let d = 0;
      for (let c = 0; c < t; c++) d += cpf[c] * ((t + 1) - c);
      cpf.push(((10 * d) % 11) % 10);
    }
    const cpfStr = cpf.join('');

    const payload = {
      amount: Math.round(valor * 100),
      customer: {
        name: nome,
        document: cpfStr,
        email: 'cliente@email.com',
        phone: whatsapp
      },
      item: {
        title: 'Pedido Fontana di Trevi',
        price: Math.round(valor * 100),
        quantity: 1
      },
      paymentMethod: 'PIX',
      utm: utm
    };

    const response = await fetch(DUTTYFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.pixCode || !result.transactionId) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro Duttyfy', debug: result }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transactionId: result.transactionId,
        pixCopiaECola: result.pixCode,
        amount: valor,
        status: 'waiting_payment'
      })
    };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
