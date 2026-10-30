<?php
/**
 * JurisWiki Colombia - Motor de Sincronización Automática 100% PHP para cPanel
 * 
 * Modos de ejecución en cPanel:
 * 1. Desde Cron Job de cPanel (Línea de comandos):
 *    php -q /home/TU_USUARIO/public_html/sync_cron.php
 * 
 * 2. Desde URL Web (vía cURL o Cron HTTP):
 *    https://tudominio.com/sync_cron.php?token=juriswiki2026
 * 
 * 3. Desde el botón "Sincronizar Drive" en la web (llamado desde api.php?action=sync)
 */

// Evitar timeout en sincronizaciones largas
@set_time_limit(300);
@ini_set('memory_limit', '256M');

$SECRET_TOKEN = 'juriswiki2026'; // Token de seguridad para ejecuciones vía HTTP

// Verificar acceso
$isCli = (php_sapi_name() === 'cli');
$hasValidToken = isset($_GET['token']) && $_GET['token'] === $SECRET_TOKEN;
$isInternalCall = defined('JURISWIKI_INTERNAL_SYNC');

if (!$isCli && !$hasValidToken && !$isInternalCall) {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado. Se requiere token de autorización.']);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');

function fetchUrl($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    curl_close($ch);
    return $response;
}

function cleanString($s) {
    if (!$s) return "";
    $s = str_replace(["\x93", "\x94"], '"', $s);
    $s = str_replace(["\x91", "\x92"], "'", $s);
    $s = str_replace(["\x96", "\x97"], '-', $s);
    $s = str_replace("\xa0", ' ', $s);
    return trim(preg_replace('/\s+/', ' ', $s));
}

function runPhpDriveSync() {
    $dbPath = __DIR__ . '/jurisprudencia_db.json';
    $jsonDir = __DIR__ . '/data/json_docs';
    $mdDir = __DIR__ . '/data/md_docs';

    if (!is_dir($jsonDir)) @mkdir($jsonDir, 0755, true);
    if (!is_dir($mdDir)) @mkdir($mdDir, 0755, true);

    $existingDb = file_exists($dbPath) ? json_decode(file_get_contents($dbPath), true) : [];
    $seenIds = [];
    foreach ($existingDb as $doc) {
        $seenIds[$doc['id']] = true;
    }

    $rootId = "1Wy9jIetIcQ4vw0R-IeafGC7-8GGDaaIZ";
    $queue = [[$rootId, ""]];
    $visited = [$rootId => true];
    $allDriveFiles = [];

    // 1. Rastrear carpetas
    while (!empty($queue)) {
        list($currId, $currPath) = array_shift($queue);
        $url = "https://drive.google.com/drive/folders/{$currId}";
        $html = fetchUrl($url);
        if (!$html) continue;

        preg_match_all('/data-id="([a-zA-Z0-9_-]{28,})"[^>]*data-tooltip="([^"]+)"/', $html, $matches, PREG_SET_ORDER);

        foreach ($matches as $m) {
            $itemId = $m[1];
            $itemName = $m[2];

            if (strpos($itemName, 'Shared folder') !== false) {
                $subName = trim(str_replace('Shared folder', '', $itemName));
                if (!isset($visited[$itemId])) {
                    $visited[$itemId] = true;
                    $newPath = $currPath ? "{$currPath}/{$subName}" : $subName;
                    $queue[] = [$itemId, $newPath];
                }
            } else {
                $allDriveFiles[] = [
                    'id' => $itemId,
                    'name' => $itemName,
                    'folder_path' => $currPath
                ];
            }
        }
        usleep(80000); // 0.08 segundos
    }

    // 2. Descargar archivos faltantes
    $newJsonCount = 0;
    $newRecords = [];

    foreach ($allDriveFiles as $file) {
        $cleanName = preg_replace('/\s+(Unknown|Markdown|PDF|HTML|Text|Microsoft Word)$/i', '', $file['name']);
        $cleanName = trim($cleanName);
        $base = pathinfo($cleanName, PATHINFO_FILENAME);

        if (substr($cleanName, -5) === '.json') {
            $dest = "{$jsonDir}/{$cleanName}";
            if (!file_exists($dest) || filesize($dest) < 10) {
                $downloadUrl = "https://drive.google.com/uc?export=download&id={$file['id']}";
                $content = fetchUrl($downloadUrl);
                if ($content && strlen($content) > 10) {
                    file_put_contents($dest, $content);
                    $newJsonCount++;
                }
            }

            // Procesar si no está en la base de datos
            if (!isset($seenIds[$base]) && file_exists($dest)) {
                $raw = @json_decode(file_get_contents($dest), true);
                if ($raw) {
                    $radicado = cleanString($raw['radicado'] ?? $base);
                    $corte = cleanString($raw['corte'] ?? 'Corte Constitucional');
                    $ponente = cleanString($raw['magistrado_ponente'] ?? '');
                    $fecha = cleanString($raw['fecha_providencia'] ?? '');
                    
                    $citacion = "{$corte}, Providencia {$radicado}";
                    if ($ponente) $citacion .= " (M.P. {$ponente})";
                    if ($fecha) $citacion .= ", {$fecha}";

                    $record = [
                        "id" => $base,
                        "radicado" => $radicado,
                        "corte" => $corte,
                        "ano" => (string)($raw['ano'] ?? ''),
                        "tipo" => cleanString($raw['tipo'] ?? ''),
                        "magistrado_ponente" => $ponente,
                        "fecha_providencia" => $fecha,
                        "expediente" => cleanString($raw['expediente'] ?? ''),
                        "sala_especializada" => cleanString($raw['sala_especializada'] ?? ''),
                        "tema" => cleanString($raw['tema'] ?? ''),
                        "descriptores" => [],
                        "resuelve" => cleanString($raw['resuelve'] ?? ''),
                        "url_origen" => cleanString($raw['url_origen'] ?? ''),
                        "drive_url" => "https://drive.google.com/file/d/{$file['id']}/view",
                        "citacion_formal" => $citacion
                    ];

                    $existingDb[] = $record;
                    $seenIds[$base] = true;
                    $newRecords[] = $radicado;
                }
            }
        }
    }

    // 3. Guardar base de datos actualizada
    if ($newJsonCount > 0 || count($newRecords) > 0 || empty($existingDb)) {
        file_put_contents($dbPath, json_encode($existingDb, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    // 4. Guardar log de sincronización
    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'total_archivos_drive' => count($allDriveFiles),
        'total_providencias' => count($existingDb),
        'nuevos_documentos' => $newRecords,
        'nuevos_descargados' => $newJsonCount,
        'estado' => 'completado_exitoso'
    ];
    file_put_contents(__DIR__ . '/sync_log.json', json_encode($logData, JSON_PRETTY_PRINT));

    return $logData;
}

// Ejecución
$result = runPhpDriveSync();
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
