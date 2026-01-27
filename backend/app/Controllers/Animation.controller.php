<?php

declare(strict_types=1);

require_once __DIR__ . "/../Repositories/AnimationRepositories.php";
require_once __DIR__ . "/../Helpers/Validator.php";

class AnimationController
{
    public static function deleteAnimation()
    {
        $data = Request::json();
        $animationId = $data["animation_id"];

        try {
            $db = MySQLClient::getInstance();
            $db->connect();
            $conn = $db->getConnection();
        } catch (Exception $e) {
            Response::error(
                "INTERNAL_SERVER_ERROR",
                $e->getMessage(),
                500
            );
            return;
        }

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

    public static function createAnimation()
    {

        $userId = Session::user()["id"];

        $data = Request::json();
        $svgText = $data["svg_text"];
        $settings = $data["settings"];
        $name = $data["name"];

        try {
            $db = MySQLClient::getInstance();
            $db->connect();
            $conn = $db->getConnection();
        } catch (Exception $e) {
            Response::error(
                "INTERNAL_SERVER_ERROR",
                $e->getMessage(),
                500
            );
            return;
        }

        $newID = AnimationRepositories::createAnimation($conn, $userId, $settings, $svgText, $name);

        if ($newID === -1) {
            Response::error("CREATION_FAILED", "failed to create animation");
        } else {
            Response::success([
                "message" => "Успешно създадена анимация",
                "id" => $newID
            ], 200);
        }
    }

    public static function saveAnimation()
    {
        $data = Request::json();

        $animationId = $data["animation_id"];
        $animationSettings = $data["animation_settings"];
        $animationName = $data["animation_name"];

        $animationSegments = $data["animation_segments"];

        //animation segments: [{ step: int , duration: int , easing: string, animation_data: JSON }] 

        $totalDuration = 0;

        try {
            $db = MySQLClient::getInstance();
            $db->connect();
            $conn = $db->getConnection();
        } catch (Exception $e) {
            Response::error(
                "INTERNAL_SERVER_ERROR",
                $e->getMessage(),
                500
            );
            return;
        }

        $animationUserId = AnimationRepositories::getAnimationUserId($conn, $animationId);

        try {
            Validator::checkUserId($animationUserId);
        } catch (Exception $e) {
            Response::error("INVALID_USER", $e->getMessage());
            return;
        }

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
}
