package com.pedrohenc.erp.repository;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2 applied to a database that already holds single-store data: the legacy schema (V1) is built
 * and filled without {@code store_id}, then migrated to the latest version. Bare Flyway, no Spring
 * context. Skipped when Docker is not available.
 */
@Testcontainers(disabledWithoutDocker = true)
class MigrationFromLegacySchemaIT {

    private static final String SCHEMA = "shop_api";

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));

    private static FluentConfiguration flyway() {
        return Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .schemas(SCHEMA)
                .defaultSchema(SCHEMA)
                .locations("classpath:db/migration");
    }

    private static Connection connect() throws SQLException {
        Connection connection = DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        try (Statement statement = connection.createStatement()) {
            statement.execute("set search_path to " + SCHEMA);
        }
        return connection;
    }

    @BeforeAll
    static void migrateLegacyDatabase() throws SQLException {
        flyway().target("1").load().migrate();

        try (Connection connection = connect(); Statement statement = connection.createStatement()) {
            statement.executeUpdate("insert into tb_brands (active, version, name) values (true, 0, 'Acme')");
            statement.executeUpdate("""
                    insert into tb_products (active, allow_negative_stock, minimum_stock, price, reorder_point,
                        stock_quantity, version, unit_of_measure, sku, category, name, brand_id)
                    select true, false, 0, 9.90, 0, 5, 0, 'UNIT', 'SKU-1', 'Grocery', 'Rice', id
                      from tb_brands where name = 'Acme'
                    """);
            statement.executeUpdate("""
                    insert into tb_users (active, failed_attempts, version, role, name, password_hash, email)
                    values (true, 0, 0, 'ADMIN', 'Ana', '{noop}secret', 'ana@shop.com')
                    """);
            statement.executeUpdate("""
                    insert into tb_refresh_tokens (created_at, expires_at, user_id, token_hash)
                    select now(), now() + interval '7 days', id, repeat('a', 64)
                      from tb_users where email = 'ana@shop.com'
                    """);
            // A schema grown by ddl-auto=update can carry two single-column uniques on one column.
            statement.execute("alter table tb_brands add constraint tb_brands_name_key2 unique (name)");
        }

        flyway().load().migrate();
    }

    private static long count(Statement statement, String sql) throws SQLException {
        try (ResultSet rows = statement.executeQuery(sql)) {
            rows.next();
            return rows.getLong(1);
        }
    }

    @Test
    void legacyRowsMoveToStoreOne() throws SQLException {
        try (Connection connection = connect(); Statement statement = connection.createStatement()) {
            for (String table : new String[] {"tb_brands", "tb_products", "tb_users", "tb_refresh_tokens"}) {
                assertThat(count(statement, "select count(*) from " + table)).as(table).isEqualTo(1);
                assertThat(count(statement, "select count(*) from " + table + " where store_id = 1")).as(table).isEqualTo(1);
            }
        }
    }

    @Test
    void everySingleColumnUniqueOnBrandNameIsDropped() throws SQLException {
        try (Connection connection = connect(); Statement statement = connection.createStatement()) {
            assertThat(count(statement, """
                    select count(*) from pg_constraint con
                      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
                     where con.conrelid = 'shop_api.tb_brands'::regclass and con.contype = 'u'
                       and array_length(con.conkey, 1) = 1 and a.attname = 'name'
                    """)).isZero();
        }
    }

    @Test
    void globalUniquesReplacedByComposites() throws SQLException {
        try (Connection connection = connect(); Statement statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                long storeTwo;
                try (ResultSet rows = statement.executeQuery(
                        "insert into tb_stores (name, active) values ('Segunda loja', true) returning id")) {
                    rows.next();
                    storeTwo = rows.getLong(1);
                }

                statement.executeUpdate(
                        "insert into tb_brands (active, version, name, store_id) values (true, 0, 'Acme', " + storeTwo + ")");
                assertThat(count(statement, "select count(*) from tb_brands where name = 'Acme'")).isEqualTo(2);

                assertThatThrownBy(() -> statement.executeUpdate(
                        "insert into tb_brands (active, version, name, store_id) values (true, 0, 'Acme', 1)"))
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("uk_brands_store_name");
            } finally {
                // Leave the migrated rows as they were for the other test.
                connection.rollback();
            }
        }
    }
}
