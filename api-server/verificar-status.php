<?php
// Disable error display
error_reporting(0);
ini_set('display_errors', 0);

// Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle OPTIONS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only GET
if ($_SERVER['REQUEST_METHOD'] != 'GET') {
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

$id = isset($_GET['id']) ? $_GET['id'] : '';

if (empty($id)) {
    echo json_encode(["success" => false, "message" => "ID nao informado"]);
    exit;
}

$url = 'https://www.pagamentos-seguros.app/api-pix/CtAgjEymLwg_4KGo7aEURAoCmjcWPLPdL1dpVXgKKvcXMF9ZGvL6sekAG96M-hLkRtcwtL4rrb9Ab3D6mTRlcA?transactionId=' . urlencode($id);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpcode != 200) {
    echo json_encode([
        "success" => true,
        "transactionId" => $id,
        "status" => "waiting",
        "amount" => 0,
        "paidAt" => null,
        "paymentMethod" => "pix"
    ]);
    exit;
}

$result = json_decode($response, true);

if (!$result || !isset($result['status'])) {
    echo json_encode([
        "success" => true,
        "transactionId" => $id,
        "status" => "waiting",
        "amount" => 0,
        "paidAt" => null,
        "paymentMethod" => "pix"
    ]);
    exit;
}

$status_map = [
    "COMPLETED" => "paid",
    "PENDING" => "waiting",
    "REFUNDED" => "refunded",
    "FAILED" => "failed"
];

$status = isset($status_map[$result['status']]) ? $status_map[$result['status']] : "waiting";
$paidAt = isset($result['paidAt']) ? $result['paidAt'] : null;

echo json_encode([
    "success" => true,
    "transactionId" => $id,
    "status" => $status,
    "amount" => 0,
    "paidAt" => $paidAt,
    "paymentMethod" => "pix"
]);
