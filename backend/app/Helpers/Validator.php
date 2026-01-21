<?php

/// Validator е помощен клас за за валидираме на email, password, username

class Validator
{
    public static function email(string $email): void
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error("INVALID_EMAIL", "Невалиден email.", 422);
        }
    }

    public static function username(string $username): void
    {
        if (!filter_var($username, FILTER_VALIDATE_REGEXP, [
            "options" => ["regexp" => "/^[A-Za-z0-9._-]{3,50}$/"]
        ])) {
            Response::error("INVALID_USERNAME", "Невалиден username.", 422);
        }
    }

    public static function password(string $password): void
    {
        if (strlen($password) < 6) {
            Response::error("INVALID_PASSWORD", "Паролата трябва да е поне 6 символа.", 422);
        }
    }
}
