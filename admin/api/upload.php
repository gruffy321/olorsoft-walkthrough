<?php
session_start();
header('Content-Type: application/json');

// 1. Authentication Check
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// 2. File Upload Check
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['assetFile'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['assetFile'];

// 3. Error Check
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Upload failed with error code ' . $file['error']]);
    exit;
}

// 4. Strict Validation
$allowedMimeTypes = [
    'model/gltf-binary' => 'glb',
    'model/gltf+json' => 'gltf',
    'image/png' => 'png',
    'image/jpeg' => 'jpg'
];

$fileInfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($fileInfo, $file['tmp_name']);
finfo_close($fileInfo);

if (!array_key_exists($mimeType, $allowedMimeTypes)) {
    // Fallback checking for GLB/GLTF which sometimes lack solid MIME type detection depending on the server setup
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!(($ext === 'glb' || $ext === 'gltf') && ($mimeType === 'application/octet-stream' || $mimeType === 'text/plain'))) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file type. Detected MIME: ' . $mimeType]);
        exit;
    }
} else {
    $ext = $allowedMimeTypes[$mimeType];
}

// 5. Sanitized Filename
$originalName = pathinfo($file['name'], PATHINFO_FILENAME);
// Remove any non-alphanumeric characters for safety
$safeName = preg_replace('/[^a-zA-Z0-9_-]/', '', $originalName);
$fileName = $safeName . '_' . time() . '.' . $ext;

// Determine destination folder based on extension
$targetDir = '../../assets/models/';
if ($ext === 'png' || $ext === 'jpg') {
    $targetDir = '../../assets/images/';
}

$targetPath = $targetDir . $fileName;

// 6. Move the file
if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    // Return relative path for frontend usage
    $relativePath = str_replace('../../', '', $targetPath);
    echo json_encode(['success' => true, 'path' => $relativePath]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
}
