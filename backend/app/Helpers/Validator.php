<?php

/// Validator е помощен клас за за валидираме на email, password, username

class Validator
{
    public static function email(string $email): bool
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        return true;
    }

    public static function username(string $username): bool
    {
        if (!filter_var($username, FILTER_VALIDATE_REGEXP, [
            "options" => ["regexp" => "/^[A-Za-z0-9._-]{3,50}$/"]
        ])) {
            return false;
        }
        return true;
    }

    public static function password(string $password): bool
    {
        if (strlen($password) < 6) {
            return false;
        }
        return true;
    }

    public static function checkUserId(int $animationUserId): bool
    {
        if (Session::user()["id"] !== $animationUserId) {
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
