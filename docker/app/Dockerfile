FROM php:8.2-apache

ARG DB_SERVER
ENV DB_SERVER=${DB_SERVER}

ARG DB_PORT
ENV DB_PORT=${DB_PORT}

ARG DB_NAME
ENV DB_NAME=${DB_NAME}

ARG DB_USER
ENV DB_USER=${DB_USER}

ARG DB_PASSWORD
ENV DB_PASSWORD=${DB_PASSWORD}

ARG BASE_PATH
ENV BASE_PATH=${BASE_PATH}

ARG NUM_OF_ANIMATIONS_PER_PAGE
ENV NUM_OF_ANIMATIONS_PER_PAGE=${NUM_OF_ANIMATIONS_PER_PAGE}

RUN apt-get update && apt-get install -y zip unzip \
 && docker-php-ext-install pdo pdo_mysql mysqli \
 && a2enmod rewrite headers

COPY docker/app/vhost.conf /etc/apache2/sites-available/000-default.conf

WORKDIR /var/www

COPY frontend/ /var/www/frontend/
COPY backend/ /var/www/backend/

COPY docker/app/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
 && chown -R www-data:www-data /var/www/frontend /var/www/backend

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["apache2-foreground"]
