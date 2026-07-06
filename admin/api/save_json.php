<?php
session_start();
header('Content-Type: application/json');

// 1. Authentication Check
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// 2. Validate Request Method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// 3. Get JSON payload
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON structure']);
    exit;
}

// 4. Recursive Sanitization
function sanitizeArray(&$array) {
    foreach ($array as $key => &$value) {
        if (is_array($value)) {
            sanitizeArray($value);
        } else if (is_string($value)) {
            // Remove any potential script tags or HTML elements to prevent XSS
            // ENT_QUOTES | ENT_HTML5 will encode both double and single quotes
            $value = htmlspecialchars(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
    }
}

sanitizeArray($data);

// 5. Save the JSON safely
$jsonFile = '../../assets/data/content.json';

// Write to a temporary file first, then rename to ensure atomicity
$tmpFile = $jsonFile . '.tmp';
$encodedJson = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

if ($encodedJson === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to encode JSON']);
    exit;
}

if (file_put_contents($tmpFile, $encodedJson) !== false) {
    if (rename($tmpFile, $jsonFile)) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to rename temporary file']);
    }
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to write data']);
}
