<?php
session_start();

// Simple hardcoded password hash for the prototype (Password: 'admin123')
$admin_password_hash = password_hash('admin123', PASSWORD_DEFAULT);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    // In a real app, you'd compare against a stored hash in a DB or config file.
    // For this prototype, we're checking against 'admin123'.
    if ($_POST['password'] === 'admin123') { 
        $_SESSION['logged_in'] = true;
        // Prevent session fixation
        session_regenerate_id(true);
    } else {
        $error = "Invalid password.";
    }
}

if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: index.php");
    exit;
}

$is_logged_in = isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Olorsoft Admin Dashboard</title>
    <link rel="stylesheet" href="css/admin.css">
</head>
<body>
    <div class="admin-container">
        <?php if (!$is_logged_in): ?>
            <div class="login-box">
                <h2>Admin Login</h2>
                <?php if (isset($error)): ?>
                    <p class="error"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
                <?php endif; ?>
                <form method="POST" action="">
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required>
                    <button type="submit">Login</button>
                </form>
            </div>
        <?php else: ?>
            <div class="dashboard">
                <header>
                    <h2>Olorsoft Admin Dashboard</h2>
                    <a href="?logout=1" class="btn-logout">Logout</a>
                </header>
                
                <main>
                    <section class="upload-section">
                        <h3>Upload Assets</h3>
                        <form id="uploadForm" enctype="multipart/form-data">
                            <input type="file" id="assetFile" name="assetFile" accept=".glb,.gltf,.png,.jpg,.jpeg" required>
                            <button type="submit">Upload</button>
                        </form>
                        <p id="uploadStatus"></p>
                    </section>

                    <section class="data-section">
                        <h3>Update Content (JSON)</h3>
                        <textarea id="jsonContent" rows="15" cols="50"></textarea>
                        <br>
                        <button id="saveJsonBtn">Save JSON</button>
                        <p id="jsonStatus"></p>
                    </section>
                </main>
            </div>
            <script src="js/admin.js"></script>
        <?php endif; ?>
    </div>
</body>
</html>
