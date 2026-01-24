<?php

/// requireAuth e middlewere който използваме в началото на ендпоинти които изискват log-нат потребител за да бъдат достъпени
function requireAuth(){
    Session::start();
    $user = $_SESSION["user"] ?? null;
    if (!$user) {
            Response::error("UNAUTHORIZED", "Не сте логнати.", 401);
    }
}



