<?php

/// Validator е помощен клас за за валидираме на email, password, username

class Validator
{
    public static function email(string $email): void
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception("Невалиден email");
        }
    }

    public static function username(string $username): void
    {
        if (!filter_var($username, FILTER_VALIDATE_REGEXP, [
            "options" => ["regexp" => "/^[A-Za-z0-9._-]{3,50}$/"]
        ])) {
            throw new Exception("Невалиден username");
        }
    }

    public static function password(string $password): void
    {
        if (strlen($password) < 6) {
            throw new Exception("Паролата трябва да е поне 6 символа.");
        }
    }
}
