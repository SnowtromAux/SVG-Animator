<?php

declare(strict_types=1);

require_once __DIR__ . "/../Repositories/UserRepositories.php";
require_once __DIR__ . "/../Helpers/Validator.php";
require_once __DIR__ . "/../Helpers/PasswordHasher.php";
require_once __DIR__ . "/Controller.php";

/// AuthController е клас съдържащ имплементация на контролерите за аутентикация
class AuthController extends Controller
{
    /// контролер за регистрация на потребител
    public static function register(): void
    {
        self::withDb(
            function ($conn) {
                $data = Request::json();

                $email = trim($data["email"] ?? "");
                $username = trim($data["username"] ?? "");
                $password = $data["password"] ?? "";

                $valid = Validator::email($email);
                if (!$valid["valid"]) {
                    Response::error('INVALID_CREDENTIAL',$valid["message"], 401);
                    return;
                }
                $valid = Validator::username($username);
                if (!$valid["valid"]) {
                    Response::error('INVALID_CREDENTIAL',$valid["message"], 401);
                    return;
                }
                $valid = Validator::password($password);
                if (!$valid["valid"]) {
                    Response::error('INVALID_CREDENTIAL',$valid["message"], 401);
                    return;
                }

                $existing = UserRepository::findByEmailOrUsername($conn, $email, $username);
                if ($existing["email"] === $email && $existing["username"] === $username) {
                    Response::error(
                        "USER_EXISTS",
                        "Email и username вече съществуват.",
                        409
                    );
                    return;
                }
                if ($existing["email"] === $email) {
                    Response::error(
                        "USER_EXISTS",
                        "Email вече e използван",
                        409
                    );
                    return;
                }
                if ($existing["username"] === $username) {
                    Response::error(
                        "USER_EXISTS",
                        "този username вече e използван",
                        409
                    );
                    return;
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

    // контроллер за логин на съществуващ потребител
    public static function login(): void
    {
        self::withDb(
            function ($conn) {
                $data = Request::json();

                $login = trim((string)($data["login"] ?? ""));
                $password = (string)($data["password"] ?? "");
                
                $user = UserRepository::findByEmailOrUsername($conn, $login, $login);

                if(!$user){
                    Response::error("INVALID_CREDENTIALS", "не съществува user с това потребителско име или имейл", 401);
                    return;
                } 

                if (! PasswordHasher::verify($password, $user["password"])) {
                    Response::error("INVALID_CREDENTIALS", "Грешна парола", 401);
                    return;
                }

                Session::login((int)$user["id"], (string)$user["username"], (string)$user["email"]);

                Response::success([
                    "message" => "Успешен вход.",
                ]);
            }
        );
    }

    // контролер за logout на log-нат потребител
    public static function logout(): void
    {
        Session::logout();
        Response::success(["message" => "Изходът е успешен."]);
    }

    /// контролер който връща информация за логнатия потребител
    public static function me(): void
    {
        $user = $_SESSION["user"];
        Response::success([
            "user" => $user,
        ]);
    }
}
