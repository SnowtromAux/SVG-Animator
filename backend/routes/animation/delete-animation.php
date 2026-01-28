<?php

declare(strict_types=1);

require_once __DIR__ . "/../../app/Middlewares/requireAuth.php";
require_once __DIR__ . "/../../app/Controllers/Animation.controller.php";

// switch играе роля на рутер който пренасочва заявката спрямо нейният метод. Идеята е да имаме различни endpoint-и на един 
// route спрямо типа на заявката, подобно на router-a в Express.js
// когато добавяме нов контролер за дадена заявка, слагаме нов случай в switch case. 
// за да добавим middleware който се изпълнява преди самият controller просто го поставяме над извикването на controller-a

$method = RequestMethod::tryFrom($_SERVER['REQUEST_METHOD'] ?? '');

switch ($method) {
    case RequestMethod::DELETE:
        requireAuth();
        AnimationController::deleteAnimation();
        break;
    default:
        Response::error('METHOD_NOT_FOUND', "route with this method not found", 400);
}