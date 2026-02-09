<?php

declare(strict_types=1);

require_once __DIR__ . "/../Repositories/AnimationRepositories.php";
require_once __DIR__ . "/../Helpers/Validator.php";
require_once __DIR__ . "/Controller.php";

/// AnimationController е клас съдържащ имплементация на контролерите за операциите върху анимации
class AnimationController extends Controller
{
    // конролер за изтриване на съществуваща анимация ако този който се опита да я изтрие е собственика
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

    /// контролер за създаване на нова анимация 
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

    // контролер за запазване на анимация ако съществува и този 
    // който се опитва да я запази е собственик 
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

                $end_ats = [];
                foreach ($animationSegments as $segment) {
                    array_push($end_ats, (float)$segment["end_at"]);
                }

                $animationDuration = max($end_ats);

                if(number_format($animationDuration,2) > 60){
                    Response::error("INVALID_DURATION", "Анимацията не може да е по-дълга от 60 секунди",401);
                    return;
                }

                $result = AnimationRepositories::updateAnimation(
                    $conn,
                    $animationId,
                    $animationSettings,
                    $animationName,
                    $animationDuration,
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

    /// контролер който връща цялата анимация
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

    /// контролер който връща id-тата на всички анимации на дадена страница
    public static function getAllAnimations(): void
    {
        self::withDb(function ($conn) {
            $page = (int)Request::param("page", 1);
            $searchText = (string)Request::param("search_text", "");
            $userId = Session::user()["id"];

            $data = AnimationRepositories::getAnimationsByUser($conn, $userId, $page, $searchText);

            if (!$data["ok"]) {
                Response::error("PAGE_PROBLEM", $data['error'], 404);
                return;
            }

            Response::success([
                "animations" => $data["items"],
                "numOfPages" => $data["numOfPages"]
            ], 200);
        });
    }
}
