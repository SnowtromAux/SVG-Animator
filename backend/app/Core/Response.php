<?php
/// Имплементация на Rest API Responce за улеснение 
/// Чрез метода json(data, status) връщаме успешен responce с дефоутен статус 200. 
/// Метода връща в json формат данните пратени от сървъра като отговор (помощен метод за success и error)
/// Метода success връща данните като json обект с поле success: true и data: който е обект с данните
/// Метода error връща данните като json обект с поле success: false и информация за грешката
class Response
{
    public static function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header("Content-Type: application/json; charset=UTF-8");
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function success(array $data = [], int $status = 200): void
    {
        self::json(["success" => true, ...$data], $status);
    }

    public static function error(string $code, string $message, int $status = 400, array $extra = []): void
    {
        self::json([
            "success" => false,
            "error" => [
                "code" => $code,
                "message" => $message,
                ...$extra
            ]
        ], $status);
    }
}
