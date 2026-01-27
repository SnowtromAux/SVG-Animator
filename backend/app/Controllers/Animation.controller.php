<?php

declare(strict_types=1);

require_once __DIR__ . "/../Repositories/AnimationRepositories.php";
require_once __DIR__ . "/../Helpers/Validator.php";
require_once __DIR__ . "/Controller.php";

class AnimationController extends Controller
{
    public static function deleteAnimation(): void
    {
        self::withDb(
            function ($conn) {
                $data = Request::json();
                $animationId = $data["animation_id"];

                $animationUserId = AnimationRepositories::getAnimationUserId($conn, $animationId);
                if ($animationUserId === null) {
                    Response::error("ANIMATION_NOT_FOUND", "не може да открием анимация с това id", 401);
                    return;
                }

                if (!Validator::checkUserId($animationUserId)) {
                    Response::error("FORBIDDEN", "не може да изтриете анимация която не е ваша", 403);
                    return;
                }

                $affectedRows = AnimationRepositories::deleteAnimationById($conn, $animationId);

                if ($affectedRows === 1) {
                    Response::success([
                        "message" => "Успешно изтрита анимация",
                    ], 200);
                } else if ($affectedRows === 0) {
                    Response::error(
                        "DELETION_FAILED",
                        "Не успяхте да изтриете анимацията"
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

    public static function createAnimation(): void
    {
        self::withDb(
            function ($conn) {
                $userId = Session::user()["id"];

                $data = Request::json();
                $svgText = $data["svg_text"];
                $settings = $data["settings"];
                $name = $data["name"];

                $newID = AnimationRepositories::createAnimation($conn, $userId, $settings, $svgText, $name);

                if (!$newID) {
                    Response::error("CREATION_FAILED", "failed to create animation");
                } else {
                    Response::success([
                        "message" => "Успешно създадена анимация",
                        "id" => $newID
                    ], 200);
                }
            }
        );
    }

    public static function saveAnimation(): void
    {
        self::withDb(
            function ($conn) {
                $data = Request::json();

                $animationId = $data["animation_id"];
                $animationSettings = $data["animation_settings"];
                $animationName = $data["animation_name"];
                $animationSegments = $data["animation_segments"];

                //animation segments: [{ step: int , duration: int , easing: string, animation_data: JSON }] 

                $animationUserId = AnimationRepositories::getAnimationUserId($conn, $animationId);
                if ($animationUserId === null) {
                    Response::error("ANIMATION_NOT_FOUND", "не може да открием анимация с това id", 401);
                    return;
                }

                if (!Validator::checkUserId($animationUserId)) {
                    Response::error("FORBIDDEN", "не може да променяте анимация която не е ваша", 403);
                    return;
                }

                $totalDuration = 0;
                foreach ($animationSegments as $segment) {
                    $totalDuration += $segment["duration"];
                }

                $result = AnimationRepositories::updateAnimation(
                    $conn,
                    $animationId,
                    $animationSettings,
                    $animationName,
                    $totalDuration,
                    $animationSegments
                );

                if ($result == false) {
                    Response::error("UPDATE_FAILED", "анимацията не успя да се запази");
                } else {
                    Response::success([
                        "message" => "успешно запазена анимация"
                    ], 200);
                }
            }
        );
    }

    public static function getAnimation(): void
    {
        self::withDb(
            function ($conn) {
                $animationId = (int)Request::param("animation_id");
                if (!$animationId) {
                    Response::error("MISSING_ID", "не е предоставено animation_id", 400);
                    return;
                }

                $animationUserId = (int)AnimationRepositories::getAnimationUserId($conn, $animationId);
                if (!Validator::checkUserId($animationUserId)) {
                    Response::error("FORBIDDEN", "не може да достъпите анимация която не е ваша", 403);
                    return;
                }

                $animation = AnimationRepositories::getAnimationById($conn, $animationId);

                Response::success([
                    "animation" => $animation
                ], 200);
            }
        );
    }
}
