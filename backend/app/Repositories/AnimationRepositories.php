<?php

class AnimationRepositories{

    public static function deleteAnimationById($db, $animationId){
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

        return $affectedRows;
    }
}
