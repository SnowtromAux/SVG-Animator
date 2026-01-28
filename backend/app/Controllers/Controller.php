<?php

declare(strict_types=1);

/// Controller е абстрактен клас който се наследява от контролерите. 
abstract class Controller
{
    /// withDb е wrapper фунцкия която обвива логика за свързване с 
    /// базата данни преди изпълнението на функцията с цел преизползване на код 
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
