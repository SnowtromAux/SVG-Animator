<?php

require_once __DIR__ . "/../Helpers/DataBase.php";

class AnimationRepositories
{
    public static function deleteAnimationById(mysqli $db, int $animationId): int
    {
        $sql = "DELETE FROM animation WHERE id = ?;";

        return DataBase::exec(
            $db,
            $sql,
            "i",
            [$animationId]
        );
    }

    public static function createAnimation(mysqli $db, int $userId, array|string $settings, string $svgText, string $name): int
    {
        $settingsJson = is_string($settings)
            ? $settings
            : json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        $sql = "INSERT INTO animation (user_id, name, starting_svg, animation_settings) VALUES (?, ?, ?, ?);";

        return DataBase::insert(
            $db,
            $sql,
            "isss",
            [$userId, $name, $svgText, $settingsJson]
        );
    }

    public static function getAnimationUserId(mysqli $db, int $animationId): ?int
    {
        $sql = "SELECT user_id FROM animation WHERE id = ?;";

        $val = DataBase::fetchValue(
            $db,
            $sql,
            "i",
            [$animationId]
        );

        return $val === null ? null : (int)$val;
    }

    public static function updateAnimation(
        mysqli $db,
        int $animationId,
        string $animationSettings,
        string $animationName,
        int $totalDuration,
        array $animationSegments
    ): bool {
        DataBase::transaction(
            $db,
            function () use ($db, $animationId, $animationSettings, $animationName, $totalDuration, $animationSegments) {

                $sql_update = "UPDATE animation 
                               SET 
                               animation_settings = ?, 
                               name = ?, duration = ?
                               WHERE id = ?";

                DataBase::exec(
                    $db,
                    $sql_update,
                    "ssii",
                    [$animationSettings, $animationName, $totalDuration, $animationId]
                );

                $sql_delete_segment = "DELETE 
                                       FROM animation_segment 
                                       WHERE animation_id = ?";

                DataBase::exec(
                    $db,
                    $sql_delete_segment,
                    "i",
                    [$animationId]
                );

                $sql_segment = "INSERT INTO animation_segment
                               (
                                animation_id, 
                                step,
                                animation_data,
                                easing,
                                duration
                                ) 
                                VALUES (?,?,?,?,?);";

                foreach ($animationSegments as $segment) {
                    DataBase::exec(
                        $db,
                        $sql_segment,
                        "iissi",
                        [
                            $animationId,
                            (int)$segment["step"],
                            (string)$segment["animation_data"],
                            (string)$segment["easing"],
                            (int)$segment["duration"],
                        ]
                    );
                }
            }
        );

        return true;
    }

    public static function getAnimationById(mysqli $db, int $animationId): ?array
    {
        $sqlAnimation = "
            SELECT id, name, starting_svg, animation_settings, duration
            FROM animation
            WHERE id = ?;
        ";

        $animation = DataBase::fetchRow($db, $sqlAnimation, "i", [$animationId]);
        if ($animation === null) {
            return null;
        }

        $animation["id"] = (int)$animation["id"];
        $animation["duration"] = (int)$animation["duration"];

        $sqlSegments = "
            SELECT id, animation_id, step, animation_data, easing, duration
            FROM animation_segment
            WHERE animation_id = ?
            ORDER BY step ASC;
        ";

        $segments = DataBase::fetchAll($db, $sqlSegments, "i", [$animationId]);

        foreach ($segments as &$seg) {
            $seg["id"] = (int)$seg["id"];
            $seg["animation_id"] = (int)$seg["animation_id"];
            $seg["step"] = (int)$seg["step"];
            $seg["duration"] = (int)$seg["duration"];
        }
        unset($seg);

        $animation["animation_segments"] = $segments;

        return $animation;
    }
}
