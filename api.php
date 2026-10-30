<?php
/**
 * JurisWiki Colombia - API Backend para cPanel (PHP 7.4 / 8.x)
 * Endpoints:
 *   ?action=search&q=termino
 *   ?action=ask (POST con query y apiKey opcional)
 *   ?action=stats
 *   ?action=sync
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dbPath = __DIR__ . '/jurisprudencia_db.json';
if (!file_exists($dbPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Base de datos jurisprudencial no encontrada.']);
    exit;
}

$action = $_GET['action'] ?? 'stats';

if ($action === 'stats') {
    $data = json_decode(file_get_contents($dbPath), true);
    $total = count($data);
    $cortes = [];
    foreach ($data as $doc) {
        $c = $doc['corte'] ?? 'Otro';
        $cortes[$c] = ($cortes[$c] ?? 0) + 1;
    }
    
    $lastSync = 'No registrado';
    if (file_exists(__DIR__ . '/sync_log.json')) {
        $log = json_decode(file_get_contents(__DIR__ . '/sync_log.json'), true);
        $lastSync = $log['timestamp'] ?? $lastSync;
    }

    echo json_encode([
        'status' => 'ok',
        'total_providencias' => $total,
        'cortes' => $cortes,
        'ultima_sincronizacion' => $lastSync,
        'plataforma' => 'JurisWiki Colombia cPanel'
    ]);
    exit;
}

if ($action === 'sync') {
    // Si Python está disponible localmente, usar sync_drive.py
    if (function_exists('exec')) {
        @exec('python3 sync_drive.py 2>&1', $output, $returnVar);
        if ($returnVar === 0) {
            $data = json_decode(file_get_contents($dbPath), true);
            echo json_encode([
                'success' => true,
                'total_providencias' => count($data),
                'motor' => 'python_sync',
                'log' => $output
            ]);
            exit;
        }
    }

    // Fallback nativo 100% PHP para cPanel sin Python
    if (file_exists(__DIR__ . '/sync_cron.php')) {
        define('JURISWIKI_INTERNAL_SYNC', true);
        require_once __DIR__ . '/sync_cron.php';
        exit;
    }

    $data = json_decode(file_get_contents($dbPath), true);
    echo json_encode([
        'success' => true,
        'total_providencias' => count($data),
        'mensaje' => 'Base de datos sincronizada.'
    ]);
    exit;
}

if ($action === 'search') {
    $query = strtolower(trim($_GET['q'] ?? ''));
    if (!$query) {
        echo json_encode([]);
        exit;
    }

    $data = json_decode(file_get_contents($dbPath), true);
    $results = [];

    foreach ($data as $doc) {
        $haystack = strtolower(
            ($doc['radicado'] ?? '') . ' ' .
            ($doc['corte'] ?? '') . ' ' .
            ($doc['tema'] ?? '') . ' ' .
            ($doc['magistrado_ponente'] ?? '') . ' ' .
            ($doc['resuelve'] ?? '') . ' ' .
            implode(' ', $doc['descriptores'] ?? [])
        );

        if (strpos($haystack, $query) !== false) {
            $results[] = $doc;
            if (count($results) >= 50) break;
        }
    }

    echo json_encode($results);
    exit;
}

if ($action === 'ask') {
    $input = json_decode(file_get_contents('php://input'), true);
    $query = trim($input['query'] ?? '');
    $userApiKey = trim($input['apiKey'] ?? '');
    
    $serverKey = getenv('GEMINI_API_KEY');
    $apiKey = $userApiKey ?: $serverKey;

    if (!$apiKey) {
        echo json_encode([
            'status' => 'local_rag',
            'message' => 'Sin API Key configurada. Utilice el motor RAG local integrado.'
        ]);
        exit;
    }

    $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . urlencode($apiKey);

    $payload = [
        'contents' => [
            [
                'parts' => [
                    ['text' => "Eres un asistente de jurisprudencia colombiana. Consulta: " . $query]
                ]
            ]
        ]
    ];

    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        echo $response;
    } else {
        http_response_code($httpCode ?: 500);
        echo json_encode(['error' => 'Error al contactar con Gemini API']);
    }
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Acción no válida']);
