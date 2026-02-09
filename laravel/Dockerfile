# ---------- vendor stage ----------
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --ignore-platform-reqs

# ---------- production stage ----------
FROM php:8.2-fpm-alpine AS production

RUN apk add --no-cache \
    sqlite-libs \
    && docker-php-ext-install pdo_mysql bcmath opcache

COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /var/www/html

COPY --from=vendor /app/vendor ./vendor
COPY . .

RUN cp .env.example .env \
    && php artisan key:generate \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && mkdir -p storage/framework/{sessions,views,cache} \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 9000
USER www-data
CMD ["php-fpm"]
