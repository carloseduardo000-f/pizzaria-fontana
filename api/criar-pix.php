<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* ==============================
   CONFIG DUTTYFY PIX
=============================== */
define('DUTTYFY_PIX_URL_ENCRYPTED', 'https://www.pagamentos-seguros.app/api-pix/CtAgjEymLwg_4KGo7aEURAoCmjcWPLPdL1dpVXgKKvcXMF9ZGvL6sekAG96M-hLkRtcwtL4rrb9Ab3D6mTRlcA');

/* ==============================
   CONFIG UTMIFY
=============================== */
define('UTMIFY_API_TOKEN', 'e7iSKx7FxK3r3v0HJTEqR4uc4uI0PkQvqAaR');
define('UTMIFY_API_URL', 'https://api.utmify.com.br/api-credentials/orders');
define('PLATFORM_NAME', 'FontanaDiTrevi');

/* ==============================
   LOG
=============================== */
function logError($message, $data = null)
{
    $dir = __DIR__ . '/logs';
    if (!file_exists($dir)) {
        mkdir($dir, 0755, true);
    }

    file_put_contents(
        $dir . '/errors.log',
        '[' . date('Y-m-d H:i:s') . "] {$message}\n" .
        ($data ? json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) : '') . "\n\n",
        FILE_APPEND
    );
}

/* ==============================
   HELPERS
=============================== */
function gerarCPF()
{
    $n = [];
    for ($i = 0; $i < 9; $i++) {
        $n[] = rand(0, 9);
    }

    for ($t = 9; $t < 11; $t++) {
        $d = 0;
        for ($c = 0; $c < $t; $c++) {
            $d += $n[$c] * (($t + 1) - $c);
        }
        $n[] = ((10 * $d) % 11) % 10;
    }

    return implode('', $n);
}

function converterValorParaCentavos($valor)
{
    if ($valor === null || $valor === '') {
        return 0;
    }

    if (is_int($valor)) {
        return $valor >= 100 ? $valor : (int) round($valor * 100);
    }

    if (is_float($valor)) {
        return (int) round($valor * 100);
    }

    if (is_string($valor)) {
        $valor = trim($valor);
        if ($valor === '') {
            return 0;
        }

        // Remove R$ e espaços
        $valorLimpo = preg_replace('/[^0-9,.]/', '', $valor);
        if ($valorLimpo === '' || $valorLimpo === null) {
            return 0;
        }

        // Ex.: 1.234,56
        if (strpos($valorLimpo, ',') !== false) {
            $valorNormalizado = str_replace('.', '', $valorLimpo);
            $valorNormalizado = str_replace(',', '.', $valorNormalizado);
            return (int) round((float) $valorNormalizado * 100);
        }

        // Ex.: 1234 ou 12.34
        if (preg_match('/^\d+$/', $valorLimpo)) {
            $inteiro = (int) $valorLimpo;
            // Se for maior que 100, assume que já está em centavos ou é valor inteiro
            return $inteiro >= 100 ? $inteiro : $inteiro * 100;
        }

        return (int) round((float) $valorLimpo * 100);
    }

    return 0;
}

function normalizarStatusDuttyfy($status)
{
    $map = [
        'COMPLETED' => 'paid',
        'PENDING' => 'waiting_payment',
        'REFUNDED' => 'refunded',
        'FAILED' => 'failed'
    ];

    return $map[$status] ?? 'waiting_payment';
}

function valorProdutoParaCentavos($produto)
{
    if (!is_array($produto)) {
        return 0;
    }

    if (isset($produto['priceInCents'])) {
        return (int) $produto['priceInCents'];
    }

    if (isset($produto['unit_price'])) {
        return (int) $produto['unit_price'];
    }

    if (isset($produto['price'])) {
        return converterValorParaCentavos($produto['price']);
    }

    if (isset($produto['valor'])) {
        return converterValorParaCentavos($produto['valor']);
    }

    return 0;
}

/* ==============================
   UTMIFY
=============================== */
function enviarParaUtmify($orderId, $customer, $products, $trackingParams, $totalInCents, $status, $approvedDate = null)
{
    $payload = [
        'orderId' => $orderId,
        'platform' => PLATFORM_NAME,
        'paymentMethod' => 'pix',
        'status' => $status,
        'createdAt' => gmdate('Y-m-d H:i:s'),
        'approvedDate' => $approvedDate,
        'customer' => $customer,
        'products' => $products,
        'trackingParameters' => $trackingParams,
        'commission' => [
            'totalPriceInCents' => $totalInCents,
            'gatewayFeeInCents' => 0,
            'userCommissionInCents' => $totalInCents,
            'currency' => 'BRL'
        ],
        'isTest' => false
    ];

    $ch = curl_init(UTMIFY_API_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-token: ' . UTMIFY_API_TOKEN
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE)
    ]);

    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err || !in_array($code, [200, 201], true)) {
        logError('Erro UTMify (não crítico)', [
            'curl_error' => $err,
            'http_code' => $code,
            'response' => $res,
            'payload' => $payload
        ]);
        return false;
    }

    return true;
}

/* ==============================
   INPUT
=============================== */
$rawInput = file_get_contents('php://input');
$dados = json_decode($rawInput, true);

if (!is_array($dados)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Dados inválidos'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$nome = trim($dados['nome'] ?? $dados['name'] ?? $dados['cliente_nome'] ?? '');
$telefoneRaw = $dados['whatsapp'] ?? $dados['telefone'] ?? $dados['phone'] ?? $dados['celular'] ?? '';
$whatsappLimpo = preg_replace('/\D/', '', (string) $telefoneRaw);

$documentoRecebido = $dados['cpf'] ?? $dados['document'] ?? gerarCPF();
$cpfPadrao = preg_replace('/\D/', '', (string) $documentoRecebido);

$valorBruto = $dados['valorTotal'] ?? $dados['amount'] ?? $dados['valor'] ?? $dados['preco'] ?? $dados['price'] ?? $dados['total'] ?? $dados['totalAmount'] ?? 0;
$valorTotalCentavos = converterValorParaCentavos($valorBruto);

$products = [];
if (is_array($dados['products'] ?? null)) {
    $products = $dados['products'];
} elseif (is_array($dados['items'] ?? null)) {
    $products = $dados['items'];
} elseif (is_array($dados['itens'] ?? null)) {
    $products = $dados['itens'];
}

$trackingParameters = is_array($dados['trackingParameters'] ?? null) ? $dados['trackingParameters'] : [];
$customerEmail = trim((string) ($dados['email'] ?? 'cliente@email.com'));

// Captura UTM da query string se não vier nos trackingParameters
$utm = '';
if (!empty($dados['utm'])) {
    $utm = $dados['utm'];
} elseif (!empty($_SERVER['HTTP_REFERER'])) {
    $refererParts = parse_url($_SERVER['HTTP_REFERER']);
    if (!empty($refererParts['query'])) {
        $utm = $refererParts['query'];
    }
}

// Se não vier item, cria um item padrão
if (empty($products) && $valorTotalCentavos >= 100) {
    $nomeProduto = trim((string) ($dados['productName'] ?? $dados['produto'] ?? $dados['descricao'] ?? 'Pedido Fontana di Trevi'));
    $products = [[
        'id' => 'SKU-1',
        'name' => $nomeProduto,
        'quantity' => 1,
        'priceInCents' => $valorTotalCentavos
    ]];
}

if ($nome === '' || $whatsappLimpo === '' || $valorTotalCentavos < 100) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Dados obrigatórios ausentes para gerar o pagamento.',
        'debug' => [
            'nome' => $nome !== '',
            'telefone' => $whatsappLimpo !== '',
            'valorTotalMinimo' => $valorTotalCentavos >= 100,
            'valorRecebido' => $valorBruto,
            'valorConvertidoCentavos' => $valorTotalCentavos,
            'products' => !empty($products)
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Prepara o primeiro item para a Duttyfy (ela aceita um item principal)
$primeiroItem = $products[0] ?? null;
$itemTitle = $primeiroItem ? ($primeiroItem['name'] ?? $primeiroItem['title'] ?? 'Pedido') : 'Pedido';
$itemQuantity = $primeiroItem ? ($primeiroItem['quantity'] ?? 1) : 1;
$itemPrice = $primeiroItem ? valorProdutoParaCentavos($primeiroItem) : $valorTotalCentavos;

/* ==============================
   PAYLOAD DUTTYFY
=============================== */
$payload = [
    'amount' => $valorTotalCentavos,
    'customer' => [
        'name' => $nome,
        'document' => $cpfPadrao,
        'email' => $customerEmail,
        'phone' => $whatsappLimpo
    ],
    'item' => [
        'title' => $itemTitle,
        'price' => $itemPrice,
        'quantity' => $itemQuantity
    ],
    'paymentMethod' => 'PIX',
    'utm' => $utm
];

/* ==============================
   REQUEST DUTTYFY COM RETRY
=============================== */
$maxRetries = 3;
$retryDelay = 1;
$response = null;
$httpCode = 0;
$curlError = '';

for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
    $ch = curl_init(DUTTYFY_PIX_URL_ENCRYPTED);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    // Só retry em 5xx ou erro de rede, não em 4xx
    if ($httpCode >= 500 || $curlError) {
        logError("Tentativa {$attempt} falhou, retry em {$retryDelay}s", [
            'httpCode' => $httpCode,
            'curlError' => $curlError
        ]);
        if ($attempt < $maxRetries) {
            sleep($retryDelay);
            $retryDelay *= 2; // exponential backoff: 1s, 2s, 4s
        }
    } else {
        break;
    }
}

$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}
file_put_contents($logDir . '/duttyfy_response.log', $response ?: '');

if ($curlError) {
    logError('Erro cURL Duttyfy após retries', $curlError);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro de comunicação com gateway de pagamento'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$responseData = json_decode($response, true);

if ($httpCode !== 200 || !is_array($responseData) || empty($responseData['pixCode']) || empty($responseData['transactionId'])) {
    logError('Erro Duttyfy', [
        'httpCode' => $httpCode,
        'response' => $responseData,
        'payload' => $payload
    ]);

    http_response_code(500);
    $mensagemErro = is_array($responseData) && !empty($responseData['message'])
        ? $responseData['message']
        : 'Não foi possível gerar o pagamento (HTTP ' . $httpCode . ')';
    echo json_encode([
        'success' => false,
        'message' => $mensagemErro,
        'debug' => [
            'httpCode' => $httpCode,
            'response' => $responseData
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$pixCopiaECola = $responseData['pixCode'];
$transacaoId = $responseData['transactionId'];
$statusLocal = normalizarStatusDuttyfy($responseData['status'] ?? 'PENDING');

/* ==============================
   SALVA LOCAL
=============================== */
$dadosTransacao = [
    'transactionId' => $transacaoId,
    'duttyfy_transaction_id' => $transacaoId,
    'status' => $statusLocal,
    'amount' => $valorTotalCentavos,
    'products' => $products,
    'trackingParameters' => $trackingParameters,
    'customer' => [
        'name' => $nome,
        'email' => $customerEmail,
        'phone' => $whatsappLimpo,
        'document' => $cpfPadrao,
        'country' => 'BR'
    ],
    'createdAt' => gmdate('Y-m-d H:i:s'),
    'pixCopiaECola' => $pixCopiaECola,
    'gatewayResponse' => $responseData
];

$dataDir = __DIR__ . '/data';
if (!file_exists($dataDir)) {
    mkdir($dataDir, 0755, true);
}

$file = $dataDir . '/transacoes.json';
$transacoes = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
if (!is_array($transacoes)) {
    $transacoes = [];
}

$transacoes[$transacaoId] = $dadosTransacao;
file_put_contents($file, json_encode($transacoes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

/* ==============================
   UTMIFY WAITING_PAYMENT
=============================== */
$utmifyProducts = [];
foreach ($products as $p) {
    $productId = (string) ($p['id'] ?? 'SKU');
    $productName = (string) ($p['name'] ?? $p['title'] ?? 'Produto');
    $priceInCents = valorProdutoParaCentavos($p);

    $utmifyProducts[] = [
        'id' => $productId,
        'name' => $productName,
        'planId' => $productId,
        'planName' => $productName,
        'quantity' => (int) ($p['quantity'] ?? 1),
        'priceInCents' => $priceInCents
    ];
}

enviarParaUtmify(
    $transacaoId,
    $dadosTransacao['customer'],
    $utmifyProducts,
    $trackingParameters,
    $valorTotalCentavos,
    'waiting_payment'
);

/* ==============================
   RESPONSE FRONT
=============================== */
echo json_encode([
    'success' => true,
    'transactionId' => $transacaoId,
    'pixCopiaECola' => $pixCopiaECola,
    'qrCodeUrl' => null, // Frontend gera QR code localmente
    'amount' => $valorTotalCentavos / 100,
    'status' => 'waiting_payment',
    'raw' => $responseData
], JSON_UNESCAPED_UNICODE);

exit;
