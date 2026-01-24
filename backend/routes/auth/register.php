<?php
require_once __DIR__ . "/../../app/Repositories/UserRepositories.php";
require_once __DIR__ . "/../../app/Helpers/Validator.php";
require_once __DIR__ . "/../../app/Helpers/PasswordHasher.php";

$data = Request::json();

$email = trim($data["email"] ?? "");
$username = trim($data["username"] ?? "");
$password = $data["password"] ?? "";

try {
    Validator::email($email);
    Validator::username($username);
    Validator::password($password);
} catch (Exception $e) {
    Response::error(
        'INVALID_CREDENTIAL', 
        $e->getMessage(), 
        401
    );
}

try{
    $db = MySQLClient::getInstance();
    $db->connect();
    $conn = $db->getConnection();
}
catch(Exception $e){
    Response::error(
        "INTERNAL_SERVER_ERROR",
        $e->getMessage(), 
        500
    );
}

$existing = UserRepository::findByEmailOrUsername($conn, $email, $username);
if ($existing) {
    Response::error(
        "USER_EXISTS",
        "Email и/или username вече съществуват.",
        409
    );
}

$userId = UserRepository::create(
    $conn,
    $username,
    $email,
    PasswordHasher::hash($password)
);

Response::success([
    "message" => "Регистрацията е успешна.",
    "data" => ["id" => $userId]
], 201);
