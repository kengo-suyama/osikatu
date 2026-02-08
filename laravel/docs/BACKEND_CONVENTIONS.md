# Backend Instructions (Laravel)

## API Response Conventions

All API endpoints MUST use the standardized response envelope format.

### Success Response

```json
{
  "success": {
    "data": { ... }
  }
}
```

Optional meta field:
```json
{
  "success": {
    "data": { ... },
    "meta": {
      "pagination": { ... }
    }
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Optional details field:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": ["error message"]
    }
  }
}
```

### Using ApiResponse Helper

All controllers SHOULD use the `App\Support\ApiResponse` helper:

```php
use App\Support\ApiResponse;

// Success response
return ApiResponse::success($data);
return ApiResponse::success($data, $meta, 201);

// Error response
return ApiResponse::error('NOT_FOUND', 'Resource not found', null, 404);
return ApiResponse::error('VALIDATION_ERROR', 'Invalid input', $errors, 422);
```

### Common Error Codes

- `UNAUTHORIZED` (401) - Authentication failed
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (422) - Input validation failed
- `INTERNAL_ERROR` (500) - Server error

## Database Migrations

### Reversibility Requirement

All migrations MUST be reversible. Every migration MUST have a proper `down()` method that reverses the changes made in `up()`.

#### Good Examples

```php
// Creating a table
public function up(): void
{
    Schema::create('settlements', function (Blueprint $table) {
        $table->id();
        $table->foreignId('circle_id')->constrained()->cascadeOnDelete();
        $table->string('title');
        $table->timestamps();
    });
}

public function down(): void
{
    Schema::dropIfExists('settlements');
}
```

```php
// Adding a column
public function up(): void
{
    Schema::table('diaries', function (Blueprint $table) {
        $table->json('tags')->nullable()->after('is_locked');
    });
}

public function down(): void
{
    Schema::table('diaries', function (Blueprint $table) {
        $table->dropColumn('tags');
    });
}
```

```php
// Adding a foreign key
public function up(): void
{
    Schema::table('circle_members', function (Blueprint $table) {
        $table->foreignId('me_profile_id')->nullable()
            ->constrained('me_profiles')->nullOnDelete();
    });
}

public function down(): void
{
    Schema::table('circle_members', function (Blueprint $table) {
        $table->dropConstrainedForeignId('me_profile_id');
    });
}
```

### Testing Reversibility

Before committing migrations, test that they can be rolled back:

```bash
php artisan migrate
php artisan migrate:rollback
php artisan migrate
```

## E2E Testing with SQLite

When database schema changes affect end-to-end tests, ensure compatibility with SQLite (used in E2E CI environment).

### SQLite Compatibility

- Use `TEXT` for JSON columns (SQLite doesn't have native JSON type)
- Avoid database-specific features (MySQL-only functions, PostgreSQL arrays)
- Test migrations work on SQLite:

```bash
# In .env.testing
DB_CONNECTION=sqlite
DB_DATABASE=:memory:

# Run tests
php artisan test
```

### E2E Test Data

Seeders used for E2E tests must:
- Create minimal required data
- Be idempotent (safe to run multiple times)
- Work on SQLite database

## Required Checks

### Before Committing Backend Changes

1. **Run Laravel tests**:
   ```bash
   cd laravel
   php artisan test
   ```

2. **If behavior affects UI flows, run E2E tests**:
   ```bash
   cd frontend
   npm run e2e:ci
   ```

### What Each Check Validates

- **`php artisan test`**: Unit tests, feature tests, API contracts
- **`npm run e2e:ci`**: Full stack integration (Next.js + Laravel + SQLite)

## Code Quality Standards

### File Encoding

- All PHP files MUST be UTF-8 without BOM
- First line MUST be `<?php`
- Second line MUST be blank or `declare(strict_types=1);`

### Type Safety

- Use `declare(strict_types=1);` in all new files
- Type hint all parameters and return types
- Use PHP 8.x features (constructor property promotion, named arguments)

### Validation

- Use Form Requests for complex validation
- Keep validation rules DRY (extract to reusable rules)
- Return validation errors with proper envelope format

## Documentation Updates

When making backend changes that affect frontend:

1. Update API documentation in `docs/api/`
2. Update DTO types in `frontend/lib/types.ts` to match camelCase responses
3. Add examples to this document if introducing new patterns

## Example Controller

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGoodRequest;
use App\Http\Resources\GoodResource;
use App\Models\Good;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use Illuminate\Http\Request;

class GoodController extends Controller
{
    public function index(Request $request)
    {
        $goods = Good::query()
            ->where('user_id', CurrentUser::id())
            ->orderByDesc('purchase_date')
            ->get();

        return ApiResponse::success(GoodResource::collection($goods));
    }

    public function store(StoreGoodRequest $request)
    {
        $good = Good::create($request->validated() + [
            'user_id' => CurrentUser::id(),
        ]);

        return ApiResponse::success(new GoodResource($good), null, 201);
    }

    public function show(Request $request, int $id)
    {
        $good = Good::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        return ApiResponse::success(new GoodResource($good));
    }

    public function destroy(Request $request, int $id)
    {
        $good = Good::query()
            ->where('user_id', CurrentUser::id())
            ->findOrFail($id);

        $good->delete();

        return ApiResponse::success(null);
    }
}
```
