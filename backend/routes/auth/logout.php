<?php
declare(strict_types=1);

Session::requireAuth();

Session::logout();

Response::success(["message" => "Изходът е успешен."]);
