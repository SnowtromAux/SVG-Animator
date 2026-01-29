<?php

require_once __DIR__ . "/Controller.php";
require_once __DIR__ . "/../Repositories/PostRepositories.php";
require_once __DIR__ . "/../Repositories/AnimationRepositories.php";
require_once __DIR__ . "/../Helpers/Validator.php";

class PostController extends Controller
{

    public static function createPost(): void
    {
        self::withDb(
            function ($conn) {
                $animationId = Request::json()['animation_id'] ?? null;
                $userId = Session::user()["id"];

                if (!$animationId) {
                    Response::error("MISSING_ID", "не е предоставено id на анимацията");
                    return;
                }

                $animationUserId = AnimationRepositories::getAnimationUserId($conn, $animationId);
                if ($animationUserId === null) {
                    Response::error("ANIMATION_NOT_FOUND", "не може да открием анимация с това id", 401);
                    return;
                }

                if (!Validator::checkUserId($animationUserId)) {
                    Response::error("FORBIDDEN", "не може да изтриете анимация която не е ваша", 403);
                    return;
                }

                $result = PostRepository::createPost($conn, $userId, $animationId);

                if (!$result) {
                    Response::error("DATABASE_FAIL", "неуспяхме да създаде нов пост");
                } else {
                    Response::success([
                        "post_id" => $result
                    ], 200);
                }
            }
        );
    }
}
