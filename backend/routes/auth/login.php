<?php
declare(strict_types=1);

require_once __DIR__ . "/../../app/Repositories/UserRepositories.php";
require_once __DIR__ . "/../../app/Helpers/Auth.php";

$data = Request::json();

$login = trim((string)($data["login"] ?? ""));
$password = (string)($data["password"] ?? "");

if ($login === "" || $password === "") {
    Response::error("INVALID_INPUT", "Липсва login или password.", 422);
}

$db = MySQLClient::getInstance();
$db->connect();
$conn = $db->getConnection();

$user = UserRepository::findByEmailOrUsername($conn, $login, $login);

if (!$user || !Auth::verify($password, $user["password"])) {
    Response::error("INVALID_CREDENTIALS", "Грешен login или парола.", 401);
}

Session::login((int)$user["id"], (string)$user["username"], (string)$user["email"]);

Response::success([
    "message" => "Успешен вход.",
]);
