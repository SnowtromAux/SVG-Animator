<?php
require_once __DIR__ . "/../../app/Repositories/UserRepositories.php";
require_once __DIR__ . "/../../app/Helpers/Validator.php";
require_once __DIR__ . "/../../app/Helpers/Auth.php";

$data = Request::json();

$email = trim($data["email"] ?? "");
$username = trim($data["username"] ?? "");
$password = $data["password"] ?? "";

Validator::email($email);
Validator::username($username);
Validator::password($password);

$db = MySQLClient::getInstance();
$db->connect();
$conn = $db->getConnection();

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
    Auth::hash($password)
);

Response::success([
    "message" => "Регистрацията е успешна.",
    "data" => ["id" => $userId]
], 201);
