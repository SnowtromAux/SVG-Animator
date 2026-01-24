<?php

function requireAuth(){
    Session::start();
    $user = $_SESSION["user"] ?? null;
    if (!$user) {
            Response::error("UNAUTHORIZED", "Не сте логнати.", 401);
    }
}



