<?php

declare(strict_types=1);

require __DIR__ . '/app/Helpers/EnvLoader.php';

EnvLoader::load(__DIR__ . '/.env');

require_once __DIR__ . "/app/Core/Request.php";
require_once __DIR__ . "/app/Core/Response.php";
require_once __DIR__ . "/app/Core/Database.php";
require_once __DIR__ . "/app/Core/Session.php";
require_once __DIR__ . "/app/Core/Router.php";
require_once __DIR__ . "/app/Models/RequestMethod.php";

require_once __DIR__ . "/config/cors.php";

if (RequestMethod::tryFrom($_SERVER['REQUEST_METHOD']) === null) {
    Response::error("METHOD_NOT_ALLOWED", "Your request method is not allowed", 405);
}

$base_path = $_ENV['BASE_PATH'];
$router = new Router('routes/', $base_path);


try {
    $router->dispatch();
} catch (mysqli_sql_exception $e) {
    Response::error("DATABASE_ERROR", $e->getMessage(), 500);
} catch (Exception $e) {
    Response::error("INTERNAL_SERVER_ERROR", $e->getMessage(), 500);
}
