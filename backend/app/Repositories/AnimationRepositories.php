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

        return $newId ?? -1;
    }

    public static function getAnimationUserId($db, $animationId){
        $stmt = mysqli_prepare(
            $db,
            "SELECT user_id
             FROM animation
             WHERE id = ?;"
        );

        if (!$stmt) {
            throw new Exception('Prepare failed: ' . mysqli_error($db));
        }

        mysqli_stmt_bind_param(
            $stmt,
            "i",
            $animationId
        );

        if (!mysqli_stmt_execute($stmt)) {
            $err = mysqli_stmt_error($stmt);
            mysqli_stmt_close($stmt);
            throw new Exception('Execute failed: ' . $err);
        }

        mysqli_stmt_bind_result($stmt, $userId);
        $fetched = mysqli_stmt_fetch($stmt);
        mysqli_stmt_close($stmt);

        if ($fetched === null) {
            return -1;
        }

        if ($fetched === false) {
            return -1;
        }

        return $userId;
    }


    private static function updateAnimationData($db, $animationId, $animationSettings, $animationName, $totalDuration)
    {
        $stmt = mysqli_prepare(
            $db,
            "UPDATE animation
                 SET
                 animation_settings = ?,
                 name = ?,
                 duration = ?
            WHERE id = ?;"
        );

        if (!$stmt) {
            throw new Exception('Prepare failed: ' . mysqli_error($db));
        }

        mysqli_stmt_bind_param(
            $stmt,
            "ssii",
            $animationSettings,
            $animationName,
            $totalDuration,
            $animationId
        );

        if (!mysqli_stmt_execute($stmt)) {
            throw new Exception('Execute failed: ' . mysqli_stmt_error($stmt));
        }

        mysqli_stmt_close($stmt);
    }

    private static function deleteOldAnimationSegments($db, $animationId)
    {
        $stmt = mysqli_prepare(
            $db,
            "DELETE FROM animation_segment
             WHERE animation_id = ?;"
        );

        if (!$stmt) {
            throw new Exception('Prepare failed: ' . mysqli_error($db));
        }

        mysqli_stmt_bind_param(
            $stmt,
            "i",
            $animationId
        );

        if (!mysqli_stmt_execute($stmt)) {
            throw new Exception('Execute failed: ' . mysqli_stmt_error($stmt));
        }

        mysqli_stmt_close($stmt);
    }

    private static function createNewAnimationSegments($db, $animationId, $step, $duration, $easing, $animationData)
    {
        $stmt = mysqli_prepare(
            $db,
            "INSERT INTO animation_segment (animation_id, step, animation_data, easing, duration )
             VALUES (?,?,?,?,?);"
        );

        if (!$stmt) {
            throw new Exception('Prepare failed: ' . mysqli_error($db));
        }

        mysqli_stmt_bind_param(
            $stmt,
            "iissi",
            $animationId,
            $step,
            $animationData,
            $easing,
            $duration
        );

        if (!mysqli_stmt_execute($stmt)) {
            throw new Exception('Execute failed: ' . mysqli_stmt_error($stmt));
        }

        mysqli_stmt_close($stmt);
    }


    public static function updateAnimation($db, $animationId, $animationSettings, $animationName, $totalDuration, $animationSegments): bool
    {
        $oldAutocommit = mysqli_autocommit($db, false);

        try {
            if (!mysqli_begin_transaction($db)) {
                throw new Exception('Begin transaction failed: ' . mysqli_error($db));
            }

            self::updateAnimationData($db, $animationId, $animationSettings, $animationName, $totalDuration);
            self::deleteOldAnimationSegments($db, $animationId);

            foreach ($animationSegments as $segment) {
                $step = (int)$segment["step"];
                $duration = (int)$segment["duration"];
                $easing = (string)$segment["easing"];
                $animationData = $segment["animation_data"]; // JSON string

                self::createNewAnimationSegments($db, $animationId, $step, $duration, $easing, $animationData);
            }

            if (!mysqli_commit($db)) {
                throw new Exception('Commit failed: ' . mysqli_error($db));
            }

            mysqli_autocommit($db, true);
            return true;
        } catch (Exception $e) {
            mysqli_rollback($db);
            mysqli_autocommit($db, true);

            return false;
        }
    }
}
