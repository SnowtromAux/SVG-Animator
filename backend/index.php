<?php

declare(strict_types=1);

require __DIR__ . '/app/Helpers/EnvLoader.php';

EnvLoader::load(__DIR__ . '/.env');

require_once __DIR__ . "/app/Core/Request.php";
require_once __DIR__ . "/app/Core/Response.php";
require_once __DIR__ . "/app/Core/Database.php";
require_once __DIR__ . "/app/Core/Session.php";
require_once __DIR__ . "/app/Helpers/Router.php";

require_once __DIR__ . "/config/cors.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST" && $_SERVER["REQUEST_METHOD"] !== "GET") {
    Response::error("METHOD_NOT_ALLOWED", "Only POST and GET is allowed.", 405);
}

$base_path = $_ENV['BASE_PATH'];
$router = new Router('routes/', $base_path );
$router->dispatch();
