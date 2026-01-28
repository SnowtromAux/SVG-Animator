<?php

declare(strict_types=1);

/// DataBase е клас който слага абстракция върху стандартните
/// методи за изпълнение на заявки към базата данни с цел преизползване на код
/// и улеснен начин на изпъление на заявки

class DataBase
{
    /// stmt създава връзката между заявката и базата, като и байндва необходимите параметри
    public static function stmt(mysqli $db, string $sql, string $types = "", array $params = []): mysqli_stmt
    {
        $stmt = mysqli_prepare($db, $sql);
        if ($types !== "") {
            mysqli_stmt_bind_param($stmt, $types, ...$params);
        }
        return $stmt;
    }

    /// exec изпълнява заявка към базата и връща броя променени редове
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

    /// insert вмъква нов ред в таблицата 
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

    /// взима някаква стойност от базата
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

    /// transaction приема функция която изпълнява няколко заявки, 
    /// яко някоя от тях фейлне базата се връща в състоянието от преди заявката
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

    /// връща ред от базата
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

    /// връща всички редове от таблицата които отговарят на заявката
    public static function fetchAll(mysqli $db, string $sql, string $types = "", array $params = []): array
    {
        $stmt = self::stmt($db, $sql, $types, $params);
        try {
            mysqli_stmt_execute($stmt);

            $result = mysqli_stmt_get_result($stmt);
            if ($result === false) {
                throw new RuntimeException("mysqlnd is required for fetchAll via get_result()");
            }

            $rows = [];
            while ($row = mysqli_fetch_assoc($result)) {
                $rows[] = $row;
            }
            return $rows;
        } finally {
            mysqli_stmt_close($stmt);
        }
    }
}
