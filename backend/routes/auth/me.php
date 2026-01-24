<?php
declare(strict_types=1);

require_once __DIR__ . "/../../app/Middlewares/requireAuth.php";

requireAuth();

$user = $_SESSION["user"];

Response::success([
    "user" => $user,
]);
