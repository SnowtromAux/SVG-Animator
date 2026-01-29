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

                $result = PostRepositories::createPost($conn, $userId, $animationId);

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

    public static function deletePost(): void
    {
        self::withDb(
            function ($conn) {
                $postId = Request::json()['post_id'] ?? null;

                if (!$postId) {
                    Response::error("MISSING_ID", "не е предоставено id на пост");
                    return;
                }

                $postUserId = PostRepositories::getPostUserId($conn, $postId);
                if ($postUserId === null) {
                    Response::error("ANIMATION_NOT_FOUND", "не може да открием пост с това id", 401);
                    return;
                }

                if (!Validator::checkUserId($postUserId)) {
                    Response::error("FORBIDDEN", "не може да изтриете пост който не е ваш", 403);
                    return;
                }

                $affectedRows = PostRepositories::deletePost($conn, $postId);

                if ($affectedRows === 1) {
                    Response::success([
                        "message" => "Успешно изтрит пост",
                    ], 200);
                } else if ($affectedRows === 0) {
                    Response::error(
                        "DELETION_FAILED",
                        "Не успяхте да изтриете поста"
                    );
                } else {
                    Response::error(
                        "DELETION_PROBLEM",
                        "Възникна неочаквана грешка"
                    );
                }
            }
        );
    }

    public static function likePost(): void
    {
        self::withDb(
            function ($conn) {
                $postId = Request::json()["post_id"] ?? null;
                $userId = Session::user()["id"];

                if (!$postId) {
                    Response::error("MISSING_ID", "не е предоставено id на пост");
                    return;
                }

                $likedPost = PostRepositories::likePost($conn, $postId, $userId);

                Response::success([
                    "message" => ($likedPost? "поста беше харесан успешно" : "поста вече е харесан") 
                ], 200);
            }
        );
    }

    public static function dislikePost(): void
    {
        self::withDb(
            function ($conn) {
                $postId = Request::json()["post_id"] ?? null;
                $userId = Session::user()["id"];

                if (!$postId) {
                    Response::error("MISSING_ID", "не е предоставено id на пост");
                    return;
                }

                $likedPost = PostRepositories::dislikePost($conn, $postId, $userId);

                Response::success([
                    "message" => ($likedPost? "поста беше нехаресан успешно" : "поста вече е нехаресван") 
                ], 200);
            }
        );
    }
}
