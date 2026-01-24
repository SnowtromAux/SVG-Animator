<?php

declare(strict_types=1);

require_once __DIR__ . "/../Repositories/UserRepositories.php";
require_once __DIR__ . "/../Helpers/Validator.php";
require_once __DIR__ . "/../Helpers/PasswordHasher.php";

class AuthController
{

    public static function register(): void
    {
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

        try {
            $db = MySQLClient::getInstance();
            $db->connect();
            $conn = $db->getConnection();
        } catch (Exception $e) {
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
    }

    public static function login(): void
    {

        $data = Request::json();

        $login = trim((string)($data["login"] ?? ""));
        $password = (string)($data["password"] ?? "");

        if ($login === "" || $password === "") {
            Response::error("INVALID_INPUT", "Липсва login или password.", 422);
        }

        try {
            $db = MySQLClient::getInstance();
            $db->connect();
            $conn = $db->getConnection();
        } catch (Exception $e) {
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
    }

    public static function logout(): void
    {
        Session::logout();
        Response::success(["message" => "Изходът е успешен."]);
    }

    public static function me(): void
    {
        $user = $_SESSION["user"];
        Response::success([
            "user" => $user,
        ]);
    }
}
