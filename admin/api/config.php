<?php
// admin/api/config.php
// Store your cPanel MySQL Database Credentials here.

$db_host = 'localhost'; // Usually localhost on cPanel shared hosting
$db_name = 'olorsoft_db'; // Replace with your actual DB Name
$db_user = 'olorsoft_db_user'; // Replace with your actual DB Username
$db_pass = 'K-sq~.Zf{C2&Zqbc'; // Replace with the password you set

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    // Set PDO to throw exceptions on error
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Set default fetch mode to associative array
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Database Connection failed. Please check your credentials in config.php");
}
?>
