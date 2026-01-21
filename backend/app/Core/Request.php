<?php
/// Имплементация на базов Rest API Request за по лесна работа
/// Чрез метода json() взимаме body-то на рекуеста 
/// $data = Request::json()
/// Чрез метода param(key, default? ) взимаме стойноста на параметъра в с дадения ключ от body-то
/// Чрез метода params() взимаме параметрите от URL-a на заявката
class Request
{
    public static function json(): array
    {
        $raw = file_get_contents("php://input");
        $data = json_decode($raw ?? "", true);

        if (!is_array($data)) {
            Response::error("INVALID_JSON", "Invalid JSON body.", 400);
        }

        return $data;
    }

    public static function param(string $key, $default = null)
    {
        return $_GET[$key] ?? $default; 
    }

    public static function params(): array
    {
        return $_GET;
    }
}
