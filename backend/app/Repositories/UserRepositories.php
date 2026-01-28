<?php

declare(strict_types=1);

require_once __DIR__ . "/../Helpers/DataBase.php";

// UserRepository е клас който държи всички методи които правят заявки към базата 
/// свързани с user
class UserRepository
{
    public static function findByEmailOrUsername(mysqli $db, string $email, string $username): ?array
    {
        $sql = "SELECT id, email, username, password
                FROM user
                WHERE email = ? OR username = ?";

        return DataBase::fetchRow(
            $db,
            $sql,
            "ss",
            [$email, $username]
        );
    }

    public static function create(mysqli $db, string $username, string $email, string $password): int
    {
        $sql = "INSERT INTO user 
                (username, email, password) 
                VALUES (?, ?, ?);";

        return DataBase::insert(
            $db,
            $sql,
            "sss",
            [$username, $email, $password]
        );
    }
}
