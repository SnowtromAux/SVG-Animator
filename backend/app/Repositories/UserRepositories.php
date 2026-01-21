<?php

/// Помощен клас в който се обръщаме към базата за да обработим заявки свързани с user

class UserRepository
{
    public static function findByEmailOrUsername(mysqli $db, string $email, string $username): ?array
    {
        $stmt = mysqli_prepare(
            $db,
            "SELECT id, email, username, password FROM user WHERE email = ? OR username = ? LIMIT 1"
        );
        mysqli_stmt_bind_param($stmt, "ss", $email, $username);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_bind_result($stmt, $id, $e, $u, $p);

        if (mysqli_stmt_fetch($stmt)) {
            return ["id" => $id, "email" => $e, "username" => $u, "password" => $p];
        }
        return null;
    }

    public static function create(mysqli $db, string $username, string $email, string $password): int
    {
        $stmt = mysqli_prepare(
            $db,
            "INSERT INTO user (username, email, password) VALUES (?, ?, ?)"
        );
        mysqli_stmt_bind_param($stmt, "sss", $username, $email, $password);
        mysqli_stmt_execute($stmt);
        return mysqli_insert_id($db);
    }
}
