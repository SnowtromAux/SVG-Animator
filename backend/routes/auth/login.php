<?php
declare(strict_types=1);

require_once __DIR__ . "/../../app/Repositories/UserRepositories.php";
require_once __DIR__ . "/../../app/Helpers/PasswordHasher.php";

$data = Request::json();

$login = trim((string)($data["login"] ?? ""));
$password = (string)($data["password"] ?? "");

if ($login === "" || $password === "") {
    Response::error("INVALID_INPUT", "Липсва login или password.", 422);
}

try{
    $db = MySQLClient::getInstance();
    $db->connect();
    $conn = $db->getConnection();
}
catch(Exception $e){
    Response::error("INTERNAL_SERVER_ERROR", $e->getMessage(), 500);
}

$user = UserRepository::findByEmailOrUsername($conn, $login, $login);

if (!$user || ! PasswordHasher::verify($password, $user["password"])) {
    Response::error("INVALID_CREDENTIALS", "Грешен login или парола.", 401);
}

Session::login((int)$user["id"], (string)$user["username"], (string)$user["email"]);

Response::success([
    "message" => "Успешен вход.",
]);
