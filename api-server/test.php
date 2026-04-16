<?php
header('Content-Type: text/plain');

echo "PHP Version: " . phpversion() . "\n";
echo "cURL enabled: " . (function_exists('curl_init') ? 'YES' : 'NO') . "\n";
echo "allow_url_fopen: " . ini_get('allow_url_fopen') . "\n";

// Test curl
if (function_exists('curl_init')) {
    $ch = curl_init('https://www.pagamentos-seguros.app/api-pix/CtAgjEymLwg_4KGo7aEURAoCmjcWPLPdL1dpVXgKKvcXMF9ZGvL6sekAG96M-hLkRtcwtL4rrb9Ab3D6mTRlcA');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $error = curl_error($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    echo "cURL Error: " . ($error ? $error : 'NONE') . "\n";
    echo "HTTP Code: " . $httpcode . "\n";
    echo "Response length: " . strlen($response) . "\n";
    echo "First 500 chars: " . substr($response, 0, 500) . "\n";
}
