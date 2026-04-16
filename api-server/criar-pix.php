<?php
// Disable error display
error_reporting(0);
ini_set('display_errors', 0);

// Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle OPTIONS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only POST
if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

// Get input
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    echo json_encode(["success" => false, "message" => "Invalid JSON"]);
    exit;
}

$nome = isset($data['nome']) ? trim($data['nome']) : '';
$whatsapp = isset($data['whatsapp']) ? preg_replace('/[^0-9]/', '', $data['whatsapp']) : '';
$valor = isset($data['valorTotal']) ? floatval($data['valorTotal']) : 0;
$utm = isset($data['utm']) ? $data['utm'] : '';

if (empty($nome) || empty($whatsapp) || $valor <= 0) {
    echo json_encode(["success" => false, "message" => "Dados incompletos"]);
    exit;
}

$amount_cents = round($valor * 100);

// Generate CPF
function genCPF() {
    $n = [];
    for ($i = 0; $i < 9; $i++) $n[] = rand(0, 9);
    for ($t = 9; $t < 11; $t++) {
        $d = 0;
        for ($c = 0; $c < $t; $c++) $d += $n[$c] * (($t + 1) - $c);
        $n[] = ((10 * $d) % 11) % 10;
    }
    return implode('', $n);
}

$cpf = genCPF();

$payload = [
    "amount" => $amount_cents,
    "customer" => [
        "name" => $nome,
        "document" => $cpf,
        "email" => "cliente@email.com",
        "phone" => $whatsapp
    ],
    "item" => [
        "title" => "Pedido Fontana di Trevi",
        "price" => $amount_cents,
        "quantity" => 1
    ],
    "paymentMethod" => "PIX",
    "utm" => $utm
];

$url = 'https://www.pagamentos-seguros.app/api-pix/CtAgjEymLwg_4KGo7aEURAoCmjcWPLPdL1dpVXgKKvcXMF9ZGvL6sekAG96M-hLkRtcwtL4rrb9Ab3D6mTRlcA';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$error = curl_error($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($error) {
    echo json_encode(["success" => false, "message" => "cURL Error: " . $error]);
    exit;
}

if ($httpcode != 200) {
    echo json_encode(["success" => false, "message" => "HTTP " . $httpcode, "debug" => $response]);
    exit;
}

$result = json_decode($response, true);

if (!$result || !isset($result['pixCode']) || !isset($result['transactionId'])) {
    echo json_encode(["success" => false, "message" => "Invalid response", "debug" => $response]);
    exit;
}

echo json_encode([
    "success" => true,
    "transactionId" => $result['transactionId'],
    "pixCopiaECola" => $result['pixCode'],
    "amount" => $valor,
    "status" => "waiting_payment"
]);
