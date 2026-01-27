<?php

declare(strict_types=1);

class DataBase
{
    public static function stmt(mysqli $db, string $sql, string $types = "", array $params = []): mysqli_stmt
    {
        $stmt = mysqli_prepare($db, $sql);
        if ($types !== "") {
            mysqli_stmt_bind_param($stmt, $types, ...$params);
        }
        return $stmt;
    }

    public static function exec(mysqli $db, string $sql, string $types = "", array $params = []): int
    {
        $stmt = self::stmt($db, $sql, $types, $params);
        try {
            mysqli_stmt_execute($stmt);
            return mysqli_stmt_affected_rows($stmt);
        } finally {
            mysqli_stmt_close($stmt);
        }
    }

    public static function insert(mysqli $db, string $sql, string $types = "", array $params = []): int
    {
        $stmt = self::stmt($db, $sql, $types, $params);
        try {
            mysqli_stmt_execute($stmt);
            return (int) mysqli_insert_id($db);
        } finally {
            mysqli_stmt_close($stmt);
        }
    }

    public static function fetchValue(mysqli $db, string $sql, string $types = "", array $params = []): mixed
    {
        $stmt = self::stmt($db, $sql, $types, $params);
        try {
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);
            if ($result === false) {
                throw new Exception("mysqlnd is required for fetchValue via get_result()");
            }
            $row = mysqli_fetch_row($result);
            return $row ? $row[0] : null;
        } finally {
            mysqli_stmt_close($stmt);
        }
    }

    public static function transaction(mysqli $db, callable $fn): mixed
    {
        mysqli_begin_transaction($db);
        try {
            $res = $fn();
            mysqli_commit($db);
            return $res;
        } catch (Throwable $e) {
            mysqli_rollback($db);
            throw $e;
        }
    }

    public static function fetchRow(mysqli $db, string $sql, string $types = "", array $params = []): ?array
    {
        $stmt = self::stmt($db, $sql, $types, $params);
        try {
            mysqli_stmt_execute($stmt);

            $result = mysqli_stmt_get_result($stmt);
            if ($result === false) {
                throw new RuntimeException("mysqlnd is required for fetchRow via get_result()");
            }

            $row = mysqli_fetch_assoc($result);
            return $row ?: null;
        } finally {
            mysqli_stmt_close($stmt);
        }
    }
}
