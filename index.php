<?php
/**
 * JurisWiki Colombia - Punto de Entrada para cPanel (Spaceship / Apache)
 */
header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');

readfile(__DIR__ . '/index.html');
exit;
