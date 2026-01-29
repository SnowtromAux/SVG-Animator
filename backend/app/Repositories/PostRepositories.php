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
}
