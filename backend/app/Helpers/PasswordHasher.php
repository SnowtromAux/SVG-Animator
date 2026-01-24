<?php

/// Клас PasswordHasher е помощен клас който се гриза за хеширане на пароли и сравнение на парола с хеширана такава

class PasswordHasher
{
    public static function hash(string $password): string
    {
        return password_hash($password, PASSWORD_DEFAULT);
    }

    public static function verify(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }
}
