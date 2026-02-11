<?php

require_once __DIR__ . "/Controller.php";
require_once __DIR__ . "/../Repositories/PostRepositories.php";
require_once __DIR__ . "/../Repositories/AnimationRepositories.php";
require_once __DIR__ . "/../Repositories/UserRepositories.php";
require_once __DIR__ . "/../Helpers/Validator.php";

class PostController extends Controller
{
    public static function createPost(): void
    {
        self::withDb(
            function ($conn) {
                $animationId = Request::json()['animation_id'] ?? null;
                $description = Request::json()['description'] ?? '';
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
                    Response::error("FORBIDDEN", "не може да направите пост с анимация която не е ваша", 403);
                    return;
                }

                $result = PostRepositories::createPost($conn, $userId, $animationId, $description);

                if (!$result) {
                    Response::error("DATABASE_FAIL", "неуспяхте да създаде нов пост");
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

                $numLikesDislikes = PostRepositories::likePost($conn, $postId, $userId);

                Response::success([
                    "message" => "поста беше харесан успешно",
                    "data" => $numLikesDislikes,
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

                $numLikesDislikes = PostRepositories::dislikePost($conn, $postId, $userId);

                Response::success([
                    "message" => "поста беше нехаресан успешно",
                    "data" => $numLikesDislikes,
                ], 200);
            }
        );
    }

    public static function getAllPosts(): void
    {
        self::withDb(function (mysqli $conn) {
            $currentPostId = Request::param("current_post_id");
            $nextPosts = PostRepositories::getNextPosts($conn, $currentPostId);

            foreach ($nextPosts as &$post) {
                $animationId = (int)$post['animation_id'];
                $animation = AnimationRepositories::getAnimationById($conn, $animationId);

                $post['animation'] = $animation;
                $userId = (int)$post['user_id'];
                $post['username'] = UserRepository::getUsernameById($conn, $userId);
            }
            unset($post);

            Response::success([
                "nextPosts" => $nextPosts
            ], 200);
        });
    }

    public static function getMyPosts()
    {
        self::withDb(function ($conn) {

            $currentPostId = Request::param("current_post_id");
            $userId = (int)Session::user()["id"];
            $nextPosts = PostRepositories::getPostsByUserId($conn, $currentPostId, $userId);

            foreach ($nextPosts as &$post) {
                $animationId = (int)$post['animation_id'];
                $animation = AnimationRepositories::getAnimationPreviewById($conn, $animationId);

                $post['animation'] = $animation;
                $userId = (int)$post['user_id'];
                $post['username'] = UserRepository::getUsernameById($conn, $userId);
            }
            unset($post);

            Response::success([
                "nextPosts" => $nextPosts
            ], 200);
        });
    }

    public static function getPostsByUserId()
    {
        self::withDb(function ($conn) {
            $currentPostId = Request::param("current_post_id");
            $userId = Request::param("user_id");
            if (!$userId) {
                Response::error('MISSING_ID', "не е подаден user_id", 400);
                return;
            }

            $nextPosts = PostRepositories::getPostsByUserId($conn, $currentPostId, $userId);

            foreach ($nextPosts as &$post) {
                $animationId = (int)$post['animation_id'];
                $animation = AnimationRepositories::getAnimationPreviewById($conn, $animationId);

                $post['animation'] = $animation;
                $userId = (int)$post['user_id'];
                $post['username'] = UserRepository::getUsernameById($conn, $userId);
            }
            unset($post);

            Response::success([
                "nextPosts" => $nextPosts
            ], 200);
        });
    }
}
