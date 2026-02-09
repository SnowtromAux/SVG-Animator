<?php

require_once __DIR__ . "/../Helpers/DataBase.php";

/// AnimationRepositories е клас който държи всички методи които правят заявки към базата 
/// свързани с анимация
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

    public static function getAnimationsByUser(mysqli $db, int $userId, int $page, string $searchText): ?array
    {
        $perPage = self::getPerPage();
        [$searchText, $hasSearch] = self::normalizeSearchText($searchText);

        if ($page < 1) {
            return [
                "ok" => false,
                "error" => "Невалидна страница",
                "items" => []
            ];
        }

        [$whereSql, $whereTypes, $whereParams] = self::buildAnimationWhere($userId, $hasSearch, $searchText);

        $totalItems = self::countAnimations($db, $whereSql, $whereTypes, $whereParams);
        $totalPages = $totalItems === 0 ? 0 : (int)ceil($totalItems / $perPage);

        $pageValidation = self::validatePage($page, $totalPages);
        if ($pageValidation !== null) {
            return $pageValidation;
        }

        $offset = ($page - 1) * $perPage;

        $animations = self::fetchAnimationsPage($db, $whereSql, $whereTypes, $whereParams, $perPage, $offset);

        if (count($animations) === 0) {
            return [
                "ok" => true,
                "items" => [],
                "numOfPages" => $totalPages
            ];
        }

        $items = self::attachSegments($db, $animations);

        return [
            "ok" => true,
            "items" => $items,
            "numOfPages" => $totalPages
        ];
    }

    private static function getPerPage(): int
    {
        $perPage = (int)($_ENV["NUM_OF_ANIMATIONS_PER_PAGE"] ?? 20);
        return $perPage > 0 ? $perPage : 20;
    }

    private static function normalizeSearchText(string $searchText): array
    {
        $searchText = trim($searchText);
        return [$searchText, $searchText !== ""];
    }

    private static function buildAnimationWhere(int $userId, bool $hasSearch, string $searchText): array
    {
        $whereSql = " WHERE user_id = ? ";
        $types = "i";
        $params = [$userId];

        if ($hasSearch) {
            $whereSql .= " AND name LIKE ? ";
            $types .= "s";
            $params[] = "%" . $searchText . "%";
        }

        return [$whereSql, $types, $params];
    }

    private static function countAnimations(mysqli $db, string $whereSql, string $types, array $params): int
    {
        $sql = "SELECT COUNT(*) AS total FROM animation" . $whereSql;
        $row = DataBase::fetchRow($db, $sql, $types, $params);
        return (int)($row["total"] ?? 0);
    }

    private static function validatePage(int $page, int $totalPages): ?array
    {
        if (($totalPages === 0 && $page !== 1) || ($totalPages > 0 && $page > $totalPages)) {
            return [
                "ok" => false,
                "error" => "Няма страница с такъв номер",
                "items" => []
            ];
        }
        return null;
    }

    private static function fetchAnimationsPage(
        mysqli $db,
        string $whereSql,
        string $whereTypes,
        array $whereParams,
        int $perPage,
        int $offset
    ): array {
        $sql = "
        SELECT id, created_at, name, starting_svg, animation_settings, duration
        FROM animation
        $whereSql
        ORDER BY id ASC
        LIMIT ? OFFSET ?;
    ";

        $types = $whereTypes . "ii";
        $params = array_merge($whereParams, [$perPage, $offset]);

        return DataBase::fetchAll($db, $sql, $types, $params);
    }

    private static function attachSegments(mysqli $db, array $animations): array
    {
        $items = [];

        foreach ($animations as $a) {
            $animationId = (int)($a["id"] ?? 0);

            $segments = self::fetchSegmentsByAnimationId($db, $animationId);

            $items[] = [
                "animation" => $a,
                "animation_segments" => $segments
            ];
        }
        return $items;
    }

    private static function fetchSegmentsByAnimationId(mysqli $db, int $animationId): array
    {
        $sql = "
        SELECT id, animation_id, step, animation_data, easing, duration
        FROM animation_segment
        WHERE animation_id = ?
        ORDER BY step ASC;
        ";

        $segments = DataBase::fetchAll($db, $sql, "i", [$animationId]);

        foreach ($segments as &$seg) {
            $seg["id"] = (int)$seg["id"];
            $seg["animation_id"] = (int)$seg["animation_id"];
            $seg["step"] = (int)$seg["step"];
            $seg["duration"] = (int)$seg["duration"];
        }
        unset($seg);

        return $segments;
    }

    public static function getAnimationPreviewById(mysqli $db, int $animationId): ?array
    {
        $sql = "SELECT name, starting_svg
            FROM animation
            WHERE id = ?
            LIMIT 1";

        return DataBase::fetchRow($db, $sql, "i", [$animationId]);
    }
}
