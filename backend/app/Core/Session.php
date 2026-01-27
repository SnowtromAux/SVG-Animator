<?php

declare(strict_types=1);

/// Session е клас който се грижи за сесиите от логването на user-a до logout-ването му 
class Session
{
    public static function start(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_set_cookie_params([
                "lifetime" => 0,
                "path" => "/",
                "httponly" => true,
                "secure" => false,
                "samesite" => "Lax",
            ]);

            session_start();
        }
    }

    public static function login(int $userId, string $username, string $email): void
    {
        self::start();

        session_regenerate_id(true);

        $_SESSION["user"] = [
            "id" => $userId,
            "username" => $username,
            "email" => $email,
        ];
    }

    public static function user(): ?array
    {
        self::start();
        return $_SESSION["user"] ?? null;
    }

    public static function logout(): void
    {
        self::start();

        $_SESSION = [];

        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), "", [
                "expires"  => time() - 42000,
                "path"     => $params["path"] ?? "/",
                "domain"   => $params["domain"] ?? "",
                "secure"   => $params["secure"] ?? false,
                "httponly" => $params["httponly"] ?? true,
                "samesite" => $params["samesite"] ?? "Lax",
            ]);
        }

        session_destroy();
    }
}
