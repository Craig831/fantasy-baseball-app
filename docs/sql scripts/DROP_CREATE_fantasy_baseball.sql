-- Database: fantasy_baseball
DROP DATABASE IF EXISTS fantasy_baseball;

CREATE DATABASE fantasy_baseball
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en-US'
    LC_CTYPE = 'en-US'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

COMMENT ON DATABASE fantasy_baseball
    IS 'database to support the fantasy-baseball-scorer application';