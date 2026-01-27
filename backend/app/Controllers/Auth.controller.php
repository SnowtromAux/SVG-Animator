<?php

declare(strict_types=1);

require_once __DIR__ . "/../Repositories/UserRepositories.php";
require_once __DIR__ . "/../Helpers/Validator.php";
require_once __DIR__ . "/../Helpers/PasswordHasher.php";
require_once __DIR__ . "/Controller.php";

class AuthController extends Controller
{
    public static function register(): void
    {
        self::withDb(
            function ($conn) {
                $data = Request::json();

                $email = trim($data["email"] ?? "");
                $username = trim($data["username"] ?? "");
                $password = $data["password"] ?? "";

                if (!Validator::email($email)) {
                    Response::error('INVALID_CREDENTIAL',"невалиден имейл", 401);
                    return;
                }
                if (Validator::username($username)) {
                    Response::error('INVALID_CREDENTIAL',"невалидено потребителско име", 401);
                    return;
                }
                if (Validator::password($password)) {
                    Response::error('INVALID_CREDENTIAL',"невалидна парола", 401);
                    return;
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
        );
    }


    public static function login(): void
    {
        self::withDb(
            function ($conn) {
                $data = Request::json();

                $login = trim((string)($data["login"] ?? ""));
                $password = (string)($data["password"] ?? "");
                
                $user = UserRepository::findByEmailOrUsername($conn, $login, $login);

                if (!$user || ! PasswordHasher::verify($password, $user["password"])) {
                    Response::error("INVALID_CREDENTIALS", "Грешен login или парола.", 401);
                }

                Session::login((int)$user["id"], (string)$user["username"], (string)$user["email"]);

                Response::success([
                    "message" => "Успешен вход.",
                ]);
            }
        );
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
