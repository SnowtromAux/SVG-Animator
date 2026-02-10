<?php

require_once __DIR__ . "/../Helpers/DataBase.php";

class PostRepositories
{
    public static function createPost(mysqli $db, int $userId, int $animationId, string $description): int
    {
        $sql = "INSERT INTO post 
            (animation_id, user_id, description)
            VALUES (?, ?, ?)";

        $insertedId = DataBase::insert(
            $db,
            $sql,
            "iis",
            [$animationId, $userId, $description]
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

    public static function getNextPosts(mysqli $db, ?int $currentPostId): array
    {
        if ($currentPostId === null) {
            $sql = "SELECT 
                    id,
                    animation_id,
                    user_id,
                    description,
                    likes_count,
                    dislikes_count,
                    created_at
                FROM post
                ORDER BY created_at ASC
                LIMIT 20";

            return DataBase::fetchAll($db, $sql);
        }

        $sqlCreatedAt = "SELECT created_at FROM post WHERE id = ?";
        $createdAt = DataBase::fetchValue($db, $sqlCreatedAt, "i", [$currentPostId]);

        if ($createdAt === null) {
            return [];
        }

        $sql = "SELECT 
                id,
                animation_id,
                user_id,
                description,
                likes_count,
                dislikes_count,
                created_at
            FROM post
            WHERE created_at > ?
            ORDER BY created_at ASC
            LIMIT 20";

        return DataBase::fetchAll($db, $sql, "s", [$createdAt]);
    }

    public static function getPostsByUserId(mysqli $db, ?int $currentPostId, int $userId)
    {
        if ($currentPostId === null) {
            $sql = "SELECT 
                    id,
                    animation_id,
                    user_id,
                    description,
                    likes_count,
                    dislikes_count,
                    created_at
                FROM post
                WHERE user_id = ?
                ORDER BY created_at ASC
                LIMIT 20";

            return DataBase::fetchAll($db, $sql, "i", [$userId]);
        }

        $sqlCreatedAt = "SELECT created_at FROM post WHERE id = ?";
        $createdAt = DataBase::fetchValue($db, $sqlCreatedAt, "i", [$currentPostId]);

        if ($createdAt === null) {
            return [];
        }

        $sql = "SELECT 
                id,
                animation_id,
                user_id,
                description,
                likes_count,
                dislikes_count,
                created_at
            FROM post
            WHERE created_at > ? AND user_id = ?
            ORDER BY created_at ASC
            LIMIT 20";

        return DataBase::fetchAll($db, $sql, "si", [$createdAt, $userId]);
    }
}
