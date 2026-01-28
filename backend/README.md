# PHP REST API Backend (Simple Router + Controllers + Repositories)

Този проект е минималистичен PHP REST API backend, базиран на:
- **file-based routing** (всяка `.php` файл в `routes/` е endpoint),
- **Controller-и** за бизнес логика,
- **Repository слой** за работа с базата,
- **JSON Request/Response helper-и**,
- **Session-based auth** (login/logout + middleware за защитени routes),
- **.env конфигурация** (EnvLoader).

> `index.php` е root entrypoint-а на проекта.

---

## Съдържание
- [Архитектура и структура](#архитектура-и-структура)
- [Поток на заявките](#поток-на-заявките)
- [Класове и файлове](#класове-и-файлове)
- [Middlewares](#middlewares)
- [Models](#models)
- [Repositories](#repositories)
- [Controllers](#controllers)
- [Endpoints и routing](#endpoints-и-routing)
- [Как се добавя нов endpoint](#как-се-добавя-нов-endpoint)
- [Как се добавя нов тип заявка](#как-се-добавя-нов-тип-заявка)
- [База данни](#база-данни)
- [Auth и сесии](#auth-и-сесии)
- [CORS](#cors)

---

## Архитектура и структура

По снимката и наличните файлове структурата изглежда така:

backend/
    index.php

app/
    Controllers/
        Auth.controller.php
        Animation.controller.php
        Controller.php

Core/
    Database.php
    Request.php
    Response.php
    Router.php
    Session.php
    DataBase.php

Helpers/
    EnvLoader.php
    PasswordHasher.php
    Validator.php

Middlewares/
    requireAuth.php

Models/
    RequestMethod.php

Repositories/
    UserRepositories.php
    AnimationRepositories.php

Services/
    empty for now

config/
    cors.php

database/
    migrations/
    seeders/

routes/
    auth/
        login.php
        logout.php
        me.php
        register.php
    animation/
        (endpoints според наличните route файлове)

**Идея на структурата:**
- `index.php` – entrypoint, bootstrap-ва средата, CORS, core класове и пуска Router-а.
- `routes/` – реалните endpoint-и като файлове (file-based routing).
- `Controllers/` – HTTP handlers (логика по операции).
- `Repositories/` – комуникация с базата (SQL, prepared statements / helper абстракции).
- `Core/` – инфраструктура: Request, Response, Router, Session, Database.
- `Helpers/` – utility класове (валидация, хеширане, .env loader).
- `Middlewares/` – защити/проверки, които се викат в началото на route файлове.

---

## Поток на заявките

1. **HTTP заявка** към `index.php` (или към публичния root, който сочи към него).
2. `index.php`:
   - зарежда `.env` чрез `EnvLoader::load()`
   - include-ва core класовете
   - include-ва `config/cors.php`
   - валидира HTTP метода чрез `RequestMethod::tryFrom($_SERVER['REQUEST_METHOD'])`
   - създава `Router('routes/', $base_path)` и вика `$router->dispatch()`
3. `Router::dispatch()`:
   - взима `REQUEST_URI`
   - маха `BASE_PATH`
   - конвертира URL пътя към файл: `routes/<route>.php`
   - `require`-ва route файла, ако съществува; иначе връща 404
4. Route файлът (напр. `routes/auth/login.php`):
   - обикновено:
     - проверява request method (ако е имплементирано на ниво route)
     - включва нужните controller-и/middleware-и
     - вика конкретен controller метод (напр. `AuthController::login()`)
5. Controller методът:
   - чете JSON (`Request::json()`)
   - валидира (`Validator`)
   - работи с DB чрез `MySQLClient` (+ repositories / DB helper-и)
   - връща JSON отговор чрез `Response::success()` или `Response::error()`

---

## Класове и файлове

### `index.php` (Entrypoint)
**Отговорности:**
- Зарежда env променливи (`.env`) чрез `EnvLoader`.
- Зарежда core класовете (Request/Response/Database/Session/Router).
- Зарежда CORS конфигурация (`config/cors.php`).
- Валидира дали HTTP методът е позволен чрез enum `RequestMethod`.
- Стартира routing-а.

Ключов момент:
- Ако методът **не е** в `RequestMethod`, връща:
  - `405 METHOD_NOT_ALLOWED` чрез `Response::error(...)`.

---

### `app/Core/Router.php`
**Какво прави:**
- Map-ва URL път към `.php` файл в `routes/`.
- Поддържа `BASE_PATH` (от `.env`) за случаи, когато проектът не е на домейн root.

**Алгоритъм:**
- `/BASE_PATH/auth/login` → `routes/auth/login.php`

**Защита:**
- Валидира route-а да съдържа само `[a-zA-Z0-9_\-\/]`, иначе връща `INVALID_ROUTE`.

---

### `app/Core/Request.php`
**Цел:** удобен достъп до входни данни.

Методи:
- `Request::json(): array`
  - чете body (`php://input`), decode-ва JSON
  - ако не е валиден JSON → `Response::error("INVALID_JSON", ...)` (400)
- `Request::param(string $key, $default = null)`
  - връща `$_GET[$key]` (query params)
- `Request::params(): array`
  - връща всички `$_GET` параметри

---

### `app/Core/Response.php`
**Цел:** стандартни JSON отговори.

Методи:
- `Response::json(array $data, int $status = 200)`
  - задава HTTP status + `Content-Type: application/json`
  - `echo` JSON и `exit`
- `Response::success(array $data = [], int $status = 200)`
  - връща `{"success": true, ...}`
- `Response::error(string $code, string $message, int $status = 400, array $extra = [])`
  - връща:
    ```json
    {
      "success": false,
      "error": { "code": "...", "message": "...", ... }
    }
    ```

---

### `app/Core/Session.php`
**Цел:** session management за auth.

Методи:
- `Session::start()`
  - пуска PHP session (ако не е стартирана)
  - задава cookie параметри (httponly, samesite, etc.)
- `Session::login($userId, $username, $email)`
  - `session_regenerate_id(true)`
  - записва `$_SESSION["user"] = [...]`
- `Session::user(): ?array`
  - връща текущия user или null
- `Session::logout()`
  - чисти `$_SESSION`, cookie и `session_destroy()`

---

### `app/Core/Database.php` (`MySQLClient`)
**Цел:** една-единствена DB връзка (Singleton).

Ключови неща:
- `MySQLClient::getInstance()` чете:
  - `DB_SERVER`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` от `$_ENV`
- `connect()` създава `mysqli_connect(...)` само ако няма връзка.
- `getConnection()` връща mysqli connection или хвърля exception ако не е `connect()`-нато.

---

### `app/Core/DataBase.php` (`DataBase`)
**Цел:** helper/абстракция над `mysqli` prepared statements за да няма повтаряне на `prepare/bind/execute/close` и за по-лесно взимане на резултати.

Методи:
- `DataBase::stmt(mysqli $db, string $sql, string $types = "", array $params = []): mysqli_stmt`
  - подготвя prepared statement
  - ако има `$types` → bind-ва `$params`
  - връща `mysqli_stmt` (не го изпълнява)

- `DataBase::exec(mysqli $db, string $sql, string $types = "", array $params = []): int`
  - prepare + execute
  - връща `affected_rows`
  - винаги затваря statement-а
  - подходящо за UPDATE/DELETE/INSERT (без да ти трябва id)

- `DataBase::insert(mysqli $db, string $sql, string $types = "", array $params = []): int`
  - изпълнява INSERT
  - връща `mysqli_insert_id($db)`
  - винаги затваря statement-а

- `DataBase::fetchValue(mysqli $db, string $sql, string $types = "", array $params = []): mixed`
  - връща първата колона от първия ред или `null`
  - изисква `mysqlnd` (ползва `mysqli_stmt_get_result`), иначе хвърля Exception

- `DataBase::fetchRow(mysqli $db, string $sql, string $types = "", array $params = []): ?array`
  - връща един ред като assoc масив или `null`
  - изисква `mysqlnd`, иначе хвърля RuntimeException
  - винаги затваря statement-а

- `DataBase::fetchAll(mysqli $db, string $sql, string $types = "", array $params = []): array`
  - връща всички редове като масив от assoc масиви (или `[]`)
  - изисква `mysqlnd`, иначе хвърля RuntimeException
  - винаги затваря statement-а

- `DataBase::transaction(mysqli $db, callable $fn): mixed`
  - begin transaction → изпълнява `$fn()` → commit
  - при грешка → rollback и rethrow
  - връща резултата от `$fn()`

---

### `app/Controllers/Controller.php` (`Controller`)
**Цел:** базов клас за контролерите, който централизира:
- свързване към DB
- обработка на DB/вътрешни грешки и връщане на стандартен error response

Метод:
- `protected static function withDb(callable $fn): void`
  - взима `MySQLClient::getInstance()`, `connect()`, `getConnection()`
  - изпълнява `$fn($conn)`
  - при `mysqli_sql_exception` → `Response::error("DATABASE_ERROR", ..., 500)`
  - при `Exception` → `Response::error("INTERNAL_SERVER_ERROR", ..., 500)`

---

### `app/Helpers/EnvLoader.php`
**Цел:** зарежда `.env` файл в `$_ENV` и `putenv()`.

Особености:
- прескача празни редове и коментари (`# ...`)
- не презаписва ключ, ако вече съществува в `$_ENV`
- премахва кавички от стойностите

---

### `app/Helpers/Validator.php`
**Цел:** валидация на входни данни, хвърля `Exception` при проблем.

Методи:
- `email($email)` – `filter_var(..., FILTER_VALIDATE_EMAIL)`
- `username($username)` – regex: `^[A-Za-z0-9._-]{3,50}$`
- `password($password)` – минимум 6 символа

---

### `app/Helpers/PasswordHasher.php`
**Цел:** хеширане и проверка на пароли.

- `hash($password)` → `password_hash(..., PASSWORD_DEFAULT)`
- `verify($password, $hash)` → `password_verify(...)`

---

## Middlewares

### `app/Middlewares/requireAuth.php`
**Цел:** middleware за защитени endpoint-и.

- стартира session
- проверява `$_SESSION["user"]`
- ако няма user → `Response::error("UNAUTHORIZED", "Не сте логнати.", 401)`

**Използване:** в началото на route файл.

```php
require_once __DIR__ . "/../../app/Core/Session.php";
require_once __DIR__ . "/../../app/Core/Response.php";
require_once __DIR__ . "/../../app/Middlewares/requireAuth.php";

requireAuth();
```

---

## Models

### `app/Models/RequestMethod.php`
Enum за позволените HTTP методи:
- GET
- POST
- PUT
- DELETE

**Използване:**
- използва се в `index.php`
- валидира HTTP метода
- при непозволен метод връща `405 METHOD_NOT_ALLOWED`

---

## Repositories

### `app/Repositories/UserRepositories.php` (`UserRepository`)
**Цел:** всички DB операции, свързани с user.

**Методи:**
- `findByEmailOrUsername(mysqli $db, string $email, string $username): ?array`  
  SELECT id, email, username, password FROM user
- `create(mysqli $db, string $username, string $email, string $password): int`  
  INSERT INTO user, връща insert_id

**Забележка:**
- използва `mysqli_prepare` и `bind_param`
- защита срещу SQL injection

---

### `app/Repositories/AnimationRepositories.php` (`AnimationRepositories`)
**Цел:** CRUD заявки за анимации и сегменти (repository слой, само DB логика).

Методи:
- `deleteAnimationById(mysqli $db, int $animationId): int`
  - DELETE от `animation` по id
  - връща affected rows (0 или 1)

- `createAnimation(mysqli $db, int $userId, array|string $settings, string $svgText, string $name): int`
  - `$settings` → JSON string (ако е array → `json_encode`)
  - INSERT в `animation` (user_id, name, starting_svg, animation_settings)
  - връща новото id

- `getAnimationUserId(mysqli $db, int $animationId): ?int`
  - връща `user_id` за даден `animationId` или `null`

- `updateAnimation(mysqli $db, int $animationId, string $animationSettings, string $animationName, int $totalDuration, array $animationSegments): bool`
  - транзакционно:
    - UPDATE на `animation` (settings, name, duration)
    - DELETE на сегментите за animation_id
    - INSERT на сегментите наново
  - връща `true` ако транзакцията мине без exception

- `getAnimationById(mysqli $db, int $animationId): ?array`
  - чете `animation` (id, name, starting_svg, animation_settings, duration)
  - ако няма → `null`
  - чете сегменти от `animation_segment` (ORDER BY step ASC)
  - каства числови полета към `int`
  - добавя сегментите в `animation["animation_segments"]`

- `getAnimationsByUser(mysqli $db, int $userId, int $page): array`
  - pagination:
    - `perPage` от `$_ENV["NUM_OF_ANIMATIONS_PER_PAGE"]` (default 20)
    - валидира `page`
    - брои total + смята totalPages
    - връща ids за страницата (ORDER BY id ASC, LIMIT/OFFSET)
  - връща структура:
    - успех: `["ok"=>true, "items"=>[ids...], "numOfPages"=>totalPages]`
    - проблем: `["ok"=>false, "error"=>"...", "items"=>[]]`

---

## Controllers

### `app/Controllers/Auth.controller.php` (`AuthController`)
**Цел:** регистрация/логин/логаут и информация за текущия потребител.

#### `register()`
- чете JSON body: email, username, password
- валидира:
  - email → `Validator::email`
  - username → `Validator::username`
  - password → `Validator::password`
- проверява дали има съществуващ потребител по email или username (`UserRepository::findByEmailOrUsername`)
- ако няма → създава потребител (`UserRepository::create`) с хеширана парола (`PasswordHasher::hash`)
- връща success (201) с новото user id

#### `login()`
- чете JSON body: login (email или username) и password
- търси потребител (`findByEmailOrUsername`)
- проверява паролата (`PasswordHasher::verify`)
- ако е валидно → `Session::login(id, username, email)`
- връща success или error при грешни данни

#### `logout()`
- `Session::logout()`
- връща success message

#### `me()`
- връща информацията за логнатия потребител от `$_SESSION["user"]`
- endpoint-ът трябва да е защитен с `requireAuth()`

---

### `app/Controllers/Animation.controller.php` (`AnimationController`)
**Цел:** операции за анимации (валидира вход/достъп и ползва repository метода за DB).

#### `createAnimation(): void`
- взима текущия user id от `Session::user()["id"]`
- чете JSON body: `svg_text`, `settings`, `name`
- създава анимация чрез `AnimationRepositories::createAnimation`
- връща success с новото id или error

#### `saveAnimation(): void`
- чете JSON body:
  - `animation_id`, `animation_settings`, `animation_name`, `animation_segments`
- проверява дали анимацията съществува и дали потребителят е собственик
- изчислява totalDuration като сума на `duration` за сегментите
- обновява анимацията + сегментите чрез `AnimationRepositories::updateAnimation` (транзакционно)
- връща success/error според резултата

#### `getAnimation(): void`
- чете route param `animation_id`
- ако липсва → `Response::error("MISSING_ID", ...)`
- проверява owner id (`getAnimationUserId`) и достъп (`Validator::checkUserId`)
- връща пълната анимация (`getAnimationById`) чрез `Response::success`

#### `getAllAnimations(): void`
- чете `page` от query/params (default 1)
- взима текущия user id
- вика `getAnimationsByUser`
  - ако `ok=false` → `Response::error(..., 404)`
  - ако `ok=true` → `Response::success(["animation_ids"=>..., "numOfPages"=>...])`

#### `deleteAnimation(): void`
- чете JSON body и взима `animation_id`
- проверява дали съществува (`getAnimationUserId`) и достъп (`Validator::checkUserId`)
- изтрива (`deleteAnimationById`)
- връща:
  - success ако `affectedRows === 1`
  - error ако `affectedRows === 0` или неочакван резултат

---

## Endpoints и routing

Router-ът работи file-based.

Примери:
- `/auth/login` → `routes/auth/login.php`
- `/auth/register` → `routes/auth/register.php`
- `/auth/logout` → `routes/auth/logout.php`
- `/auth/me` → `routes/auth/me.php`

**Важно:**
- Router-ът НЕ рутира по HTTP method
- всеки route файл сам проверява метода

---

## Как се добавя нов endpoint

### 1) Създай route файл

Endpoint:
`/api/profile/update`

Файл:
`routes/profile/update.php`

---

### 2) Route skeleton

```php
<?php

require_once __DIR__ . "/../../app/Core/Request.php";
require_once __DIR__ . "/../../app/Core/Response.php";
require_once __DIR__ . "/../../app/Models/RequestMethod.php";

require_once __DIR__ . "/../../app/Core/Session.php";
require_once __DIR__ . "/../../app/Middlewares/requireAuth.php";

requireAuth();

if ($_SERVER["REQUEST_METHOD"] !== RequestMethod::PUT->value) {
    Response::error("METHOD_NOT_ALLOWED", "Only PUT is allowed.", 405);
}

Response::success(["message" => "OK"]);
```

---

### 3) Готово
Няма централна регистрация.  
Файлът = endpoint.

---

## Как се добавя нов тип заявка

В `index.php`:
`RequestMethod::tryFrom($_SERVER['REQUEST_METHOD'])`

### Пример: PATCH

В `app/Models/RequestMethod.php`:
```php
case PATCH = 'PATCH';
```

Ако няма case → `405` още в `index.php`.

---

## База данни

### Конфигурация (.env)
- DB_SERVER
- DB_USER
- DB_PASSWORD
- DB_NAME

Зареждане:
```php
EnvLoader::load(__DIR__ . '/.env');
```

---

### Използване

```php
$db = MySQLClient::getInstance();
$db->connect();
$conn = $db->getConnection();
```

```php
$user = UserRepository::findByEmailOrUsername($conn, $email, $username);
```

**Препоръки:**
- SQL само в Repositories
- Controllers orchestrate-ват
- prepared statements (или helper като `DataBase`)

---

## Auth и сесии

След login:
```php
$_SESSION["user"] = [
  "id" => ...,
  "username" => ...,
  "email" => ...
];
```

---

## CORS

В `index.php`:
```php
require_once __DIR__ . "/config/cors.php";
```

CORS header-ите се прилагат глобално и обработват OPTIONS заявки.
