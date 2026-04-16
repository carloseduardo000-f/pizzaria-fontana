// Netlify Function - Verificar status PIX

const DUTTYFY_URL = 'https://www.pagamentos-seguros.app/api-pix/CtAgjEymLwg_4KGo7aEURAoCmjcWPLPdL1dpVXgKKvcXMF9ZGvL6sekAG96M-hLkRtcwtL4rrb9Ab3D6mTRlcA';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const id = event.queryStringParameters?.id;

    if (!id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID nao informado' }) };
    }

    const response = await fetch(`${DUTTYFY_URL}?transactionId=${encodeURIComponent(id)}`, {
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await response.json();

    if (!response.ok || !result.status) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          transactionId: id,
          status: 'waiting',
          amount: 0,
          paidAt: null,
          paymentMethod: 'pix'
        })
      };
    }

    const statusMap = {
      'COMPLETED': 'paid',
      'PENDING': 'waiting',
      'REFUNDED': 'refunded',
      'FAILED': 'failed'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transactionId: id,
        status: statusMap[result.status] || 'waiting',
        amount: 0,
        paidAt: result.paidAt || null,
        paymentMethod: 'pix'
      })
    };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
