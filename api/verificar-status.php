<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

/* ==============================
   DUTTYFY CONFIG
================================ */
define('DUTTYFY_PIX_URL_ENCRYPTED', 'https://www.pagamentos-seguros.app/api-pix/CtAgjEymLwg_4KGo7aEURAoCmjcWPLPdL1dpVXgKKvcXMF9ZGvL6sekAG96M-hLkRtcwtL4rrb9Ab3D6mTRlcA');

/* ==============================
   UTMIFY CONFIG
================================ */
define('UTMIFY_API_TOKEN', 'e7iSKx7FxK3r3v0HJTEqR4uc4uI0PkQvqAaR');
define('UTMIFY_API_URL', 'https://api.utmify.com.br/api-credentials/orders');
define('PLATFORM_NAME', 'FontanaDiTrevi');

/* ==============================
   LOG
================================ */
function logPayment($message, $data = null) {
    $logFile = __DIR__ . '/logs/pagamentos.log';
    if (!file_exists(__DIR__ . '/logs')) {
        mkdir(__DIR__ . '/logs', 0755, true);
    }
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    if ($data) {
        $logMessage .= "\nData: " . json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    file_put_contents($logFile, $logMessage . "\n\n", FILE_APPEND);
}

function statusGatewayParaFront($status) {
    $map = [
        'COMPLETED' => 'paid',
        'PENDING' => 'waiting',
        'REFUNDED' => 'refunded',
        'FAILED' => 'failed'
    ];

    return $map[$status] ?? 'waiting';
}

/* ==============================
   UTMIFY - PAID
================================ */
function enviarPagoPraUtmify($transacaoLocal) {

    $payload = [
        'orderId' => $transacaoLocal['transactionId'],
        'platform' => PLATFORM_NAME,
        'paymentMethod' => 'pix',
        'status' => 'paid',
        'createdAt' => $transacaoLocal['createdAt'] ?? gmdate('Y-m-d H:i:s'),
        'approvedDate' => gmdate('Y-m-d H:i:s'),
        'customer' => $transacaoLocal['customer'] ?? [],
        'products' => $transacaoLocal['products'] ?? [],
        'trackingParameters' => $transacaoLocal['trackingParameters'] ?? [],
        'commission' => [
            'totalPriceInCents' => $transacaoLocal['amount'],
            'gatewayFeeInCents' => 0,
            'userCommissionInCents' => $transacaoLocal['amount'],
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

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!in_array($httpCode, [200, 201])) {
        logPayment('❌ Erro UTMify PAID', [
            'code' => $httpCode,
            'response' => $response,
            'payload' => $payload
        ]);
        return false;
    }

    logPayment('✅ Pagamento enviado para UTMify', [
        'orderId' => $transacaoLocal['transactionId']
    ]);

    return true;
}

/* ==============================
   INPUT
================================ */
$transactionId = $_GET['id'] ?? null;

if (!$transactionId) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ID da transação não informado'
    ]);
    exit;
}

/* ==============================
   CARREGA TRANSACOES
================================ */
$transacoesFile = __DIR__ . '/data/transacoes.json';
$transacoes = file_exists($transacoesFile)
    ? json_decode(file_get_contents($transacoesFile), true)
    : [];

if (!is_array($transacoes)) {
    $transacoes = [];
}

$transacaoLocal = $transacoes[$transactionId] ?? null;

if (!$transacaoLocal) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Transação não encontrada'
    ]);
    exit;
}

/* ==============================
   CONSULTA DUTTYFY
================================ */
// Monta a URL com transactionId como query param
$url = DUTTYFY_PIX_URL_ENCRYPTED . '?transactionId=' . urlencode($transactionId);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json'
    ],
    CURLOPT_TIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

$responseData = json_decode($response, true);

if ($curlError || $httpCode !== 200 || !isset($responseData['status'])) {
    logPayment('❌ Erro consulta Duttyfy', [
        'curlError' => $curlError,
        'httpCode' => $httpCode,
        'response' => $responseData,
        'transactionId' => $transactionId
    ]);

    // Retorna o status atual em caso de erro
    echo json_encode([
        'success' => true,
        'transactionId' => $transactionId,
        'status' => $transacaoLocal['status'] ?? 'waiting',
        'amount' => ($transacaoLocal['amount'] ?? 0) / 100,
        'paidAt' => $transacaoLocal['paidAt'] ?? null,
        'paymentMethod' => 'pix'
    ]);
    exit;
}

$statusGateway = $responseData['status'];
$status = statusGatewayParaFront($statusGateway);

// Só atualiza os campos necessários, não faz INSERT OR REPLACE
$transacoes[$transactionId]['lastStatusCheckAt'] = gmdate('Y-m-d H:i:s');

// Se o status mudou, atualiza
if ($status !== ($transacaoLocal['status'] ?? 'waiting')) {
    $transacoes[$transactionId]['status'] = $status;
    $transacoes[$transactionId]['gatewayConsulta'] = $responseData;
}

/* ==============================
   SE PAGO -> UTMIFY
================================ */
if ($status === 'paid' && empty($transacaoLocal['utmifyPaidSent'])) {
    // Salva o paidAt
    $paidAt = $responseData['paidAt'] ?? gmdate('Y-m-d H:i:s');
    $transacoes[$transactionId]['paidAt'] = $paidAt;

    $enviado = enviarPagoPraUtmify($transacoes[$transactionId]);

    if ($enviado) {
        $transacoes[$transactionId]['utmifyPaidSent'] = true;
        $transacoes[$transactionId]['utmifyPaidSentAt'] = gmdate('Y-m-d H:i:s');
    }

    logPayment('💰 Pagamento confirmado', [
        'transactionId' => $transactionId,
        'amount' => ($transacaoLocal['amount'] ?? 0) / 100,
        'utmify' => $enviado,
        'gatewayStatus' => $statusGateway,
        'paidAt' => $paidAt
    ]);
}

file_put_contents($transacoesFile, json_encode($transacoes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

/* ==============================
   RESPONSE FRONT (INALTERADO)
================================ */
$paidAt = $responseData['paidAt'] ?? ($transacoes[$transactionId]['paidAt'] ?? null);

echo json_encode([
    'success' => true,
    'transactionId' => $transactionId,
    'status' => $status,
    'amount' => ($transacaoLocal['amount'] ?? 0) / 100,
    'paidAt' => $paidAt,
    'paymentMethod' => 'pix'
]);
