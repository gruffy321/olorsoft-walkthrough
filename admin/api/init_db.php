<?php
// admin/api/init_db.php
// Run this script ONCE in your browser to generate the tables.

require_once 'config.php';

try {
    // 1. Create Users Table (for Admin authentication later, or players if we add login)
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // 2. Create Items/Assets Table (For the Level Builder to track uploaded models)
    $pdo->exec("CREATE TABLE IF NOT EXISTS models (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        filepath VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // 3. Create Player Progress Table (To track which items have been cleaned/unlocked)
    $pdo->exec("CREATE TABLE IF NOT EXISTS progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id VARCHAR(100) NOT NULL,
        is_cleaned BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    echo "<h1>Database Setup Complete!</h1>";
    echo "<p>The necessary tables (users, models, progress) have been successfully created.</p>";
    echo "<p><strong>Security Warning:</strong> Please delete or rename this file (init_db.php) now so it cannot be run again by accident.</p>";

} catch (PDOException $e) {
    echo "<h1>Error creating tables:</h1>";
    echo "<p>" . $e->getMessage() . "</p>";
}
?>
