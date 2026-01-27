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

                try {
                    Validator::checkUserId($animationUserId);
                } catch (Exception $e) {
                    Response::error("INVALID_USER", $e->getMessage());
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
                    Response::error("ANIMATION_NOT_FOUND", "не може да открием анимация с това id");
                    return;
                }

                Validator::checkUserId($animationUserId);

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
}
