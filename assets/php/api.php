<?php
// Start de sessie aan het begin van elk request
session_start();

require_once __DIR__ . '/../../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();


// Database verbinding
$servername = "localhost";
$username = $_ENV['sql_uname_API_RPEO'];
$password = $_ENV['sql_pword_API_RPEO'];
$dbname = "shop_data";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed.']);
    exit();
}
$conn->set_charset("utf8mb4");

// Stel de content type header in op JSON
header('Content-Type: application/json');

// --- Hulpfuncties ---
function get_json_input() {
    return json_decode(file_get_contents('php://input'), true);
}

// --- Routering ---
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($endpoint) {
    case 'auth':
        handle_auth($conn, $action);
        break;
    case 'products':
        handle_products($conn, $action);
        break;
    case 'cart':
        handle_cart($conn, $action);
        break;
    case 'orders':
        handle_orders($conn, $action);
        break;
    default:
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Endpoint not found.']);
        break;
}

// --- Endpoint Handlers ---

// Authenticatie (Login, Register, Logout, Check Session)
function handle_auth($conn, $action) {
    $input = get_json_input();
    switch ($action) {
        case 'register':
            $name = $input['name'] ?? '';
            $email = $input['email'] ?? '';
            $password = $input['password'] ?? '';
            if (empty($name) || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($password)) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Vul alle velden correct in.']);
                return;
            }
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $name, $email, $hashed_password);
            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Registratie succesvol.']);
            } else {
                http_response_code(409); // Conflict
                echo json_encode(['status' => 'error', 'message' => 'Dit e-mailadres is al in gebruik.']);
            }
            break;
        case 'login':
            $email = $input['email'] ?? '';
            $password = $input['password'] ?? '';
            $stmt = $conn->prepare("SELECT id, name, password FROM users WHERE email = ?");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($user = $result->fetch_assoc()) {
                if (password_verify($password, $user['password'])) {
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['user_name'] = $user['name'];
                    echo json_encode(['status' => 'success', 'user' => ['id' => $user['id'], 'name' => $user['name']]]);
                } else {
                    http_response_code(401);
                    echo json_encode(['status' => 'error', 'message' => 'Ongeldig wachtwoord.']);
                }
            } else {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'Gebruiker niet gevonden.']);
            }
            break;
        case 'logout':
            session_destroy();
            echo json_encode(['status' => 'success']);
            break;
        case 'check_session':
            if (isset($_SESSION['user_id'])) {
                echo json_encode(['status' => 'success', 'user' => ['id' => $_SESSION['user_id'], 'name' => $_SESSION['user_name']]]);
            } else {
                http_response_code(401);
                echo json_encode(['status' => 'error']);
            }
            break;
    }
}

// Producten (VERVANG DEZE HELE FUNCTIE)
function handle_products($conn, $action) {
    switch ($action) {
        case 'get_all':
            $result = $conn->query("SELECT * FROM products ORDER BY name ASC");
            $products = $result->fetch_all(MYSQLI_ASSOC);
            echo json_encode(['status' => 'success', 'data' => $products]);
            break;

        case 'create':
            // --- NIEUWE CODE HIERONDER ---

            // Security check: alleen de admin (user_id 1) mag dit doen.
            if (!isset($_SESSION['user_id']) || $_SESSION['user_id'] != 1) {
                http_response_code(403); // Forbidden
                echo json_encode(['status' => 'error', 'message' => 'Geen toestemming.']);
                return;
            }

            $input = get_json_input();
            $name = $input['name'] ?? '';
            $description = $input['description'] ?? '';
            $price = $input['price'] ?? 0;
            $image_url = $input['image_url'] ?? '';

            // Validatie
            if (empty($name) || !is_numeric($price) || $price <= 0) {
                http_response_code(400); // Bad Request
                echo json_encode(['status' => 'error', 'message' => 'Naam en een geldige prijs zijn verplicht.']);
                return;
            }

            // Gebruik een prepared statement om SQL injection te voorkomen
            $stmt = $conn->prepare("INSERT INTO products (name, description, price, image_url) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssds", $name, $description, $price, $image_url);

            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Product succesvol toegevoegd.']);
            } else {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => 'Kon product niet toevoegen aan de database.']);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Product action not found.']);
            break;
    }
}

// Winkelmandje
function handle_cart($conn, $action) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Niet ingelogd.']);
        return;
    }
    $user_id = $_SESSION['user_id'];
    $input = get_json_input();

    switch ($action) {
        case 'get':
            $stmt = $conn->prepare("SELECT c.id, p.id as product_id, p.name, p.price, p.image_url, c.quantity FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $cart_items = $result->fetch_all(MYSQLI_ASSOC);
            echo json_encode(['status' => 'success', 'data' => $cart_items]);
            break;
        case 'add':
            $product_id = $input['product_id'] ?? 0;
            // Check if item already in cart
            $stmt = $conn->prepare("SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?");
            $stmt->bind_param("ii", $user_id, $product_id);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($item = $result->fetch_assoc()) {
                // Update quantity
                $new_quantity = $item['quantity'] + 1;
                $stmt = $conn->prepare("UPDATE cart SET quantity = ? WHERE id = ?");
                $stmt->bind_param("ii", $new_quantity, $item['id']);
            } else {
                // Insert new item
                $stmt = $conn->prepare("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)");
                $stmt->bind_param("ii", $user_id, $product_id);
            }
            $stmt->execute();
            echo json_encode(['status' => 'success']);
            break;
        case 'remove':
            $cart_item_id = $input['cart_item_id'] ?? 0;
            $stmt = $conn->prepare("DELETE FROM cart WHERE id = ? AND user_id = ?");
            $stmt->bind_param("ii", $cart_item_id, $user_id);
            $stmt->execute();
            echo json_encode(['status' => 'success']);
            break;
    }
}

// Bestellingen
function handle_orders($conn, $action) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Niet ingelogd.']);
        return;
    }
    $user_id = $_SESSION['user_id'];

    switch ($action) {
        case 'get_history':
            $stmt = $conn->prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $orders = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            // Get items for each order
            for ($i = 0; $i < count($orders); $i++) {
                $stmt_items = $conn->prepare("SELECT oi.quantity, oi.price_per_item, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?");
                $stmt_items->bind_param("i", $orders[$i]['id']);
                $stmt_items->execute();
                $orders[$i]['items'] = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);
            }
            echo json_encode(['status' => 'success', 'data' => $orders]);
            break;
        case 'create':
            // Start transaction
            $conn->begin_transaction();
            try {
                // 1. Get cart items
                $stmt_cart = $conn->prepare("SELECT p.id, p.price, c.quantity FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?");
                $stmt_cart->bind_param("i", $user_id);
                $stmt_cart->execute();
                $cart_items = $stmt_cart->get_result()->fetch_all(MYSQLI_ASSOC);
                
                if(count($cart_items) == 0){
                    throw new Exception("Winkelmandje is leeg.");
                }

                // 2. Calculate total price
                $total_price = 0;
                foreach($cart_items as $item) {
                    $total_price += $item['price'] * $item['quantity'];
                }

                // 3. Create order
                $stmt_order = $conn->prepare("INSERT INTO orders (user_id, total_price) VALUES (?, ?)");
                $stmt_order->bind_param("id", $user_id, $total_price);
                $stmt_order->execute();
                $order_id = $conn->insert_id;

                // 4. Create order items
                $stmt_items = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price_per_item) VALUES (?, ?, ?, ?)");
                foreach($cart_items as $item) {
                    $stmt_items->bind_param("iiid", $order_id, $item['id'], $item['quantity'], $item['price']);
                    $stmt_items->execute();
                }

                // 5. Clear cart
                $stmt_clear = $conn->prepare("DELETE FROM cart WHERE user_id = ?");
                $stmt_clear->bind_param("i", $user_id);
                $stmt_clear->execute();

                // Commit transaction
                $conn->commit();
                echo json_encode(['status' => 'success', 'message' => 'Bestelling succesvol geplaatst.']);

            } catch (Exception $e) {
                $conn->rollback();
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => 'Kon bestelling niet plaatsen: ' . $e->getMessage()]);
            }
            break;
    }
}

$conn->close();
?>