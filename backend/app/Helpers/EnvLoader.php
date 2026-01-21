<?php

/// Клас EnvLoader се грижи да това да четем .env файла и да го зарежда в глобалната променлива $_ENV

class EnvLoader
{
    public static function load(string $path): void
    {
        if (!file_exists($path)) {
            throw new RuntimeException(".env файлът не е намерен: {$path}");
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {

            if (str_starts_with(trim($line), '#')) {
                continue;
            }

            [$key, $value] = array_pad(explode('=', $line, 2), 2, null);

            $key = trim($key);
            $value = trim($value);

            $value = trim($value, "\"'");

            if ($key === '') {
                continue;
            }
            
            if (array_key_exists($key, $_ENV)) {
                continue;
            }

            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}
