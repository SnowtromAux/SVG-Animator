<?php

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

/// MYSQLClint създава единствена инстанция към базата данни. 
/// Използваме иплементация на Singleton дизайн патерн
/// За да вземем инстанция с която да правим заявка към базата данни пишем следните 3 реда код:
/// $db = MySQLClient::getInstance();
/// $db->connect();
/// $conn = $db->getConnection();

class MySQLClient
{
    private static ?MySQLClient $instance = null;
    private $connection = null;

    private function __construct(
        private string $db_server,
        private string $db_user,
        private string $db_password,
        private string $db_name,
        private int $db_port
    ) {}

    public static function getInstance(): MySQLClient
    {
        if (self::$instance === null) {

            $db_server = $_ENV["DB_SERVER"];
            $db_user = $_ENV["DB_USER"];
            $db_password = $_ENV["DB_PASSWORD"];
            $db_name = $_ENV["DB_NAME"];
            $db_port = $_ENV["DB_PORT"];

            self::$instance = new MySQLClient(
                $db_server,
                $db_user,
                $db_password,
                $db_name,
                $db_port
            );
        }

        return self::$instance;
    }

    public function connect(): void
    {
        if ($this->connection !== null) {
            return;
        }

        $this->connection = mysqli_connect(
            $this->db_server,
            $this->db_user,
            $this->db_password,
            $this->db_name
        );
    }

    public function getConnection()
    {
        if ($this->connection === null) {
            throw new Exception("Database not connected");
        }

        return $this->connection;
    }

    private function __clone() {}
    public function __wakeup() {}
}
