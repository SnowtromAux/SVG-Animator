<?php

require_once __DIR__ . "/../Helpers/DataBase.php";

class PostRepositories
{
    public static function createPost(mysqli $db, int $userId, int $animationId): int
    {
        $sql = "INSERT INTO post 
            (animation_id, user_id, created_at)
            VALUES (?, ?, ?)";

        $createdAt = date('Y-m-d');

        $insertedId = DataBase::insert(
            $db,
            $sql,
            "iis",
            [$animationId, $userId, $createdAt]
        );

        return $insertedId;
    }

    public static function getPostUserId(mysqli $db, int $postId): ?int
    {
        $sql = "SELECT user_id FROM post WHERE id = ?;";

        $val = DataBase::fetchValue(
            $db,
            $sql,
            "i",
            [$postId]
        );

        return $val === null ? null : (int)$val;
    }

    public static function deletePost(mysqli $db, int $postId): int
    {
        $sql = "DELETE FROM post
                WHERE post.id = ?";

        return DataBase::exec(
            $db,
            $sql,
            "i",
            [$postId]
        );
    }

    public static function likePost(mysqli $db, int $postId, int $userId): int
    {
        return DataBase::transaction(
            $db,
            function () use ($db, $postId, $userId): int {

                $sqlCheck = "SELECT id, type
                    FROM reaction
                    WHERE post_id = ? AND user_id = ?
                    LIMIT 1
                    FOR UPDATE";

                $row = DataBase::fetchRow($db, $sqlCheck, "ii", [$postId, $userId]);

                if ($row !== null) {
                    if ($row['type'] === 'like') {
                        return 0;
                    }

                    $sqlUpdate = "UPDATE reaction 
                              SET type = ? 
                              WHERE id = ?";

                    return DataBase::exec($db, $sqlUpdate, "si", ['like', (int)$row['id']]);
                }

                $sqlInsert = "INSERT INTO reaction 
                         (post_id, user_id, type)
                         VALUES (?, ?, ?)";

                DataBase::insert($db, $sqlInsert, "iis", [$postId, $userId, 'like']);

                return 1;
            }
        );
    }

    public static function dislikePost(mysqli $db, int $postId, int $userId): int
    {
        return DataBase::transaction($db, function () use ($db, $postId, $userId): int {

            $sqlCheck = "SELECT id, type
                     FROM reaction
                     WHERE post_id = ? AND user_id = ?
                     LIMIT 1
                     FOR UPDATE";

            $row = DataBase::fetchRow($db, $sqlCheck, "ii", [$postId, $userId]);

            if ($row !== null) {
                if ($row['type'] === 'dislike') {
                    return 0;
                }

                $sqlUpdate = "UPDATE reaction SET type = ? WHERE id = ?";
                return DataBase::exec(
                    $db,
                    $sqlUpdate,
                    "si",
                    ['dislike', (int)$row['id']]
                );
            }

            $sqlInsert = "INSERT INTO reaction (post_id, user_id, type)
                      VALUES (?, ?, ?)";
            DataBase::insert(
                $db,
                $sqlInsert,
                "iis",
                [$postId, $userId, 'dislike']
            );

            return 1;
        });
    }
}
