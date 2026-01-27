<?php

class AnimationRepositories
{

    public static function deleteAnimationById($db, $animationId)
    {

        /// Не е нужно да се грижим за сегментите на анимацията тъй като когато изтрием 
        /// анимация сегментите се изтриват автоматично

        $stmt = mysqli_prepare(
            $db,
            "DELETE FROM animation WHERE id = ?"
        );

        if (!$stmt) {
            return false;
        }

        mysqli_stmt_bind_param($stmt, "i", $animationId);

        mysqli_stmt_execute($stmt);
        $affectedRows = mysqli_stmt_affected_rows($stmt);

        mysqli_stmt_close($stmt);

        return $affectedRows;
    }

    public static function createAnimation($db, $userId, $settings, $svgText, $name)
    {
        if (is_array($settings) || is_object($settings)) {
            $settingsJson = json_encode($settings, JSON_UNESCAPED_UNICODE);
        } else {
            $settingsJson = (string)$settings;
        }

        json_decode($settingsJson);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return -1;
        }

        $stmt = mysqli_prepare(
            $db,
            "INSERT INTO animation (user_id, name, starting_svg, animation_settings)
             VALUES (?, ?, ?, ?)"
        );

        if (!$stmt) {
            return -1;
        }

        mysqli_stmt_bind_param($stmt, "isss", $userId, $name, $svgText, $settingsJson);

        $ok = mysqli_stmt_execute($stmt);
        if (!$ok) {
            mysqli_stmt_close($stmt);
            return -1;
        }

        $newId = mysqli_insert_id($db);
        mysqli_stmt_close($stmt);

        return $newId;
    }
}
