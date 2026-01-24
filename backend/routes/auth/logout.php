<?php
declare(strict_types=1);

require_once __DIR__ . "/../../app/Middlewares/requireAuth.php";

requireAuth();

Session::logout();

Response::success(["message" => "Изходът е успешен."]);
