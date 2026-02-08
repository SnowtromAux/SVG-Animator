<?php

/// Validator е помощен клас за за валидираме на email, password, username

class Validator
{
    public static function email(string $email): array
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return [
                "valid" => false,
                "message" => "Невалиден имейл адрес."
            ];
        }

        return [
            "valid" => true,
            "message" => ""
        ];
    }


    public static function username(string $username): array
    {
        $length = mb_strlen($username);

        if ($length < 3) {
            return [
                "valid" => false,
                "message" => "Потребителското име е твърде късо (минимум 3 символа)."
            ];
        }

        if ($length > 50) {
            return [
                "valid" => false,
                "message" => "Потребителското име е твърде дълго (максимум 50 символа)."
            ];
        }

        if (!preg_match('/^[A-Za-z0-9._-]+$/', $username)) {
            return [
                "valid" => false,
                "message" => "Забранени са интервали, кирилица и специални символи като: ! @ # $ % ^ & * ( ) + = { } [ ] | \\ : ; \" ' < > , ? /"
            ];
        }


        return [
            "valid" => true,
            "message" => ""
        ];
    }


    public static function password(string $password): array
    {
        if (strlen($password) < 6) {
            return [
                "valid" => false,
                "message" => "Паролата трябва да бъде поне 6 символа."
            ];
        }

        return [
            "valid" => true,
            "message" => ""
        ];
    }


    public static function checkUserId(int $userId): bool
    {
        if (Session::user()["id"] !== $userId) {
            return false;
        }
        return true;
    }

    private static function containsMaliciousCode(string $input): bool
    {
        $patterns = [
            // SQL Injection
            '/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i',

            // XSS
            '/<\s*script\b/i',
            '/on\w+\s*=/i',
            '/javascript:/i',

            // Command injection
            '/(;|\||&&|\$\(|`)/',

            // PHP code injection
            '/<\?php/i',

            // Directory traversal
            '/\.\.\//'
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return true;
            }
        }

        return false;
    }

    public static function validateLogin(string $login): bool
    {
        $login = trim($login);

        if (
            $login === '' ||
            self::containsMaliciousCode($login) ||
            filter_var($login, FILTER_VALIDATE_EMAIL) ||
            !preg_match('/^[a-zA-Z0-9_.-]{3,32}$/', $login)
        ) {
            return false;
        }

        return true;
    }

    public static function validatePassword(string $password): bool
    {
        if (
            $password === '' ||
            strlen($password) < 6 ||
            strlen($password) > 255 ||
            self::containsMaliciousCode($password)
        ) {
            return false;
        }

        return true;
    }
}
