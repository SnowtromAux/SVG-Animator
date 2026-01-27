<?php

declare(strict_types=1);

require_once __DIR__ . "/../../app/Middlewares/requireAuth.php";
require_once __DIR__ . "/../../app/Controllers/Animation.controller.php";

$method = RequestMethod::tryFrom($_SERVER['REQUEST_METHOD'] ?? '');

switch ($method) {
    case RequestMethod::PUT:
        requireAuth();
        AnimationController::saveAnimation();
        break;
    default:
        Response::error('METHOD_NOT_FOUND', "route with this method not found", 400);
}