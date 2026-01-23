<?php
declare(strict_types=1);

$user = Session::requireAuth();

Response::success([
    "user" => $user,
]);
