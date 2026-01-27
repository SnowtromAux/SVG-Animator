<?php

declare(strict_types=1);

abstract class Controller
{
    protected static function withDb(callable $fn): void
    {
        try {
            $db = MySQLClient::getInstance();
            $db->connect();
            $conn = $db->getConnection();

            $fn($conn);
        } catch (mysqli_sql_exception $e) {
            Response::error("DATABASE_ERROR", $e->getMessage(), 500);
        } catch (Exception $e) {
            Response::error("INTERNAL_SERVER_ERROR", $e->getMessage(), 500);
        }
    }
}
