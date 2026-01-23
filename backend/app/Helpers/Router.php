<?php

/// Router предоставя удобен начин да пренасочване на заявките към съответните им handler-и. 
/// Идеята е вместо да правим заявка fetch(SVG-ANIMATOR/backend/routes/register.php)
/// да пишем fetch(backend/api/register)
/// Router получава $routesDir и $basePath, като след това за всяка заявка прави следното:
/// маха basePath и конкатенира $routesDir с осталата част от url-a и добавя .php накрая. 
/// Когато добавим файл в routes или дори папка с файлове, то можем после автоматично да правим 
/// заявка към съответният път в файловата система

class Router
{
    private string $routesDir;
    private string $basePath;

    public function __construct(string $routesDir, string $basePath)
    {
        $this->routesDir = rtrim($routesDir, '/');
        $this->basePath  = rtrim($basePath, '/');
    }

    public function dispatch(): void
    {
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

        $route = trim(str_replace($this->basePath, '', $uri), '/');

        if ($route === '') {
            $route = 'index'; 
        }

        if (!preg_match('/^[a-zA-Z0-9_\-\/]+$/', $route)) {
            Response::error(
                "INVALID_ROUTE",
                "Invalid route",
                400
            );
            return;
        }

        $routeFile = $this->routesDir . '/' . $route . '.php';

        if (is_file($routeFile)) {
            require $routeFile;
            return;
        }

        Response::error(
            "NOT_FOUND",
            "Route not found",
            404
        );
    }
}
