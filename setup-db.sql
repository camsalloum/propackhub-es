-- Local dev: create database and user for Estimation Studio
-- Run as PostgreSQL superuser: psql -U postgres -f setup-db.sql

CREATE USER es_user WITH PASSWORD 'es_password';

CREATE DATABASE estimation_studio OWNER es_user;

GRANT ALL PRIVILEGES ON DATABASE estimation_studio TO es_user;
