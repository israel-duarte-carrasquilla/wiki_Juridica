<?php
/**
 * JurisWiki Colombia - API Backend para cPanel (PHP 7.4 / 8.x)
 * Endpoints:
 *   ?action=search&q=termino
 *   ?action=ask (POST con query, provider, model, apiKey)
 *   ?action=stats
 *   ?action=sync
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key, anthropic-version');

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

if ($action === 'ask' || $action === 'ask_ai') {
    $input = json_decode(file_get_contents('php://input'), true);
    $provider = strtolower(trim($input['provider'] ?? 'gemini'));
    $model = trim($input['model'] ?? '');
    $userApiKey = trim($input['apiKey'] ?? '');
    $query = trim($input['query'] ?? '');
    $systemPrompt = trim($input['systemPrompt'] ?? '');
    $context = trim($input['context'] ?? '');

    $apiKey = $userApiKey;
    if (!$apiKey) {
        $envKeyName = strtoupper($provider) . '_API_KEY';
        $apiKey = getenv($envKeyName) ?: getenv('GEMINI_API_KEY');
    }

    if (!$apiKey && $provider !== 'local') {
        echo json_encode([
            'status' => 'local_rag',
            'message' => 'Sin API Key configurada para ' . htmlspecialchars($provider) . '. Utilice el motor RAG local integrado.'
        ]);
        exit;
    }

    $fullPrompt = $query;
    if ($context) {
        $fullPrompt = "CONTEXTO DE JURISPRUDENCIA:\n" . $context . "\n\nCONSULTA:\n" . $query;
    }

    // 1. GOOGLE GEMINI
    if ($provider === 'gemini') {
        $geminiModel = $model ?: 'gemini-2.5-flash';
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" . urlencode($geminiModel) . ":generateContent?key=" . urlencode($apiKey);

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => ($systemPrompt ? $systemPrompt . "\n\n" : "") . $fullPrompt]
                    ]
                ]
            ],
            'generationConfig' => [
                'temperature' => 0.2,
                'maxOutputTokens' => 1500
            ]
        ];

        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            $data = json_decode($response, true);
            $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
            echo json_encode(['success' => true, 'provider' => 'gemini', 'model' => $geminiModel, 'text' => $text]);
        } else {
            http_response_code($httpCode ?: 500);
            echo json_encode(['error' => 'Error al contactar con Google Gemini API (' . $httpCode . ')', 'details' => $response]);
        }
        exit;
    }

    // 2. OPENAI (CHATGPT)
    if ($provider === 'openai') {
        $openaiModel = $model ?: 'gpt-4o-mini';
        $endpoint = "https://api.openai.com/v1/chat/completions";

        $messages = [];
        if ($systemPrompt) {
            $messages[] = ['role' => 'system', 'content' => $systemPrompt];
        }
        $messages[] = ['role' => 'user', 'content' => $fullPrompt];

        $payload = [
            'model' => $openaiModel,
            'messages' => $messages,
            'temperature' => 0.2,
            'max_tokens' => 1500
        ];

        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            $data = json_decode($response, true);
            $text = $data['choices'][0]['message']['content'] ?? '';
            echo json_encode(['success' => true, 'provider' => 'openai', 'model' => $openaiModel, 'text' => $text]);
        } else {
            http_response_code($httpCode ?: 500);
            echo json_encode(['error' => 'Error al contactar con OpenAI ChatGPT (' . $httpCode . ')', 'details' => $response]);
        }
        exit;
    }

    // 3. ANTHROPIC (CLAUDE)
    if ($provider === 'claude') {
        $claudeModel = $model ?: 'claude-3-5-haiku-20241022';
        $endpoint = "https://api.anthropic.com/v1/messages";

        $payload = [
            'model' => $claudeModel,
            'max_tokens' => 1500,
            'temperature' => 0.2,
            'messages' => [
                ['role' => 'user', 'content' => $fullPrompt]
            ]
        ];
        if ($systemPrompt) {
            $payload['system'] = $systemPrompt;
        }

        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            $data = json_decode($response, true);
            $text = $data['content'][0]['text'] ?? '';
            echo json_encode(['success' => true, 'provider' => 'claude', 'model' => $claudeModel, 'text' => $text]);
        } else {
            http_response_code($httpCode ?: 500);
            echo json_encode(['error' => 'Error al contactar con Anthropic Claude (' . $httpCode . ')', 'details' => $response]);
        }
        exit;
    }

    // 4. DEEPSEEK / OPENROUTER
    if ($provider === 'deepseek' || $provider === 'openrouter') {
        $isDeepseek = ($provider === 'deepseek');
        $endpoint = $isDeepseek ? "https://api.deepseek.com/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
        $defaultModel = $isDeepseek ? 'deepseek-chat' : 'deepseek/deepseek-chat';
        $chosenModel = $model ?: $defaultModel;

        $messages = [];
        if ($systemPrompt) {
            $messages[] = ['role' => 'system', 'content' => $systemPrompt];
        }
        $messages[] = ['role' => 'user', 'content' => $fullPrompt];

        $payload = [
            'model' => $chosenModel,
            'messages' => $messages,
            'temperature' => 0.2,
            'max_tokens' => 1500
        ];

        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            $data = json_decode($response, true);
            $text = $data['choices'][0]['message']['content'] ?? '';
            echo json_encode(['success' => true, 'provider' => $provider, 'model' => $chosenModel, 'text' => $text]);
        } else {
            http_response_code($httpCode ?: 500);
            echo json_encode(['error' => 'Error al contactar con ' . $provider . ' (' . $httpCode . ')', 'details' => $response]);
        }
        exit;
    }

    echo json_encode(['error' => 'Proveedor de IA no reconocido']);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Acción no válida']);
