<?php

require_once __DIR__ . "/../Helpers/DataBase.php";

class PostRepository
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
}
