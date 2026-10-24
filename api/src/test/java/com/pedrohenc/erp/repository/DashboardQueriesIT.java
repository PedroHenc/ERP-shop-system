package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.TestcontainersConfiguration;
import com.pedrohenc.erp.dto.dashboard.DashboardSummaryResponse;
import com.pedrohenc.erp.dto.dashboard.RestockItemResponse;
import com.pedrohenc.erp.entity.TbBrand;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.service.DashboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Dashboard JPQL queries against a real PostgreSQL, with products seeded at the stock boundaries
 * (spec §8: low = {@code 0 < stock <= minimum}, out = {@code stock <= 0}, only active products count).
 * Skipped when Docker is not available.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class DashboardQueriesIT {

    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private BrandRepository brandRepository;
    @Autowired
    private DashboardService dashboardService;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long outZeroId;
    private long atMinimumId;
    private long negativeId;
    private long betaId;
    private long alphaFirstId;
    private long alphaSecondId;

    @BeforeEach
    void seed() {
        jdbcTemplate.update("delete from shop_api.tb_product_suppliers");
        jdbcTemplate.update("delete from shop_api.tb_products");
        jdbcTemplate.update("delete from shop_api.tb_brands");
        TbBrand brand = brandRepository.save(TbBrand.builder().name("Acme").build());

        outZeroId = save(brand, "OUT-0", "Out at zero", "10.00", "0", "2", true);
        atMinimumId = save(brand, "AT-MIN", "At minimum", "1.25", "2", "2", true);
        // Above the minimum: neither low nor out; 19.99 x 3.5 = 69.965 exercises the rounding.
        save(brand, "HEALTHY", "Healthy", "19.99", "3.5", "2", true);
        // Inactive and low: ignored by every query.
        save(brand, "INACTIVE", "Inactive low", "100.00", "1", "5", false);
        negativeId = save(brand, "NEG", "Negative", "7.00", "-3", "2", true);
        // Equal stock: ordered by name, then by id for equal names.
        betaId = save(brand, "BETA", "Beta", "0.10", "1", "4", true);
        alphaFirstId = save(brand, "ALPHA-1", "Alpha", "0.10", "1", "4", true);
        alphaSecondId = save(brand, "ALPHA-2", "Alpha", "0.10", "1", "4", true);
    }

    private long save(TbBrand brand, String sku, String name, String price, String stock, String minimum, boolean active) {
        return productRepository.save(TbProduct.builder()
                .sku(sku)
                .name(name)
                .category("Grocery")
                .brand(brand)
                .price(new BigDecimal(price))
                .stockQuantity(new BigDecimal(stock))
                .minimumStock(new BigDecimal(minimum))
                .active(active)
                .build()).getId();
    }

    @Test
    void countsOnlyActiveProducts() {
        assertThat(productRepository.countByActiveTrue()).isEqualTo(7);
    }

    @Test
    void lowStockIsAboveZeroAndAtMostTheMinimum() {
        // At minimum + Beta + 2x Alpha; zero and negative are out, not low; Healthy and Inactive are excluded.
        assertThat(productRepository.countLowStock()).isEqualTo(4);
    }

    @Test
    void outOfStockIsZeroOrNegative() {
        assertThat(productRepository.countOutOfStock()).isEqualTo(2);
    }

    @Test
    void inventoryValueSumsPositiveActiveStockAndTheServiceRoundsToCents() {
        // 1.25 x 2 + 19.99 x 3.5 + 3 x (0.10 x 1) = 2.50 + 69.965 + 0.30
        assertThat(productRepository.sumInventoryValue()).isEqualByComparingTo("72.765");

        BigDecimal value = dashboardService.summary(true).inventoryValue();
        assertThat(value).isEqualTo(new BigDecimal("72.77"));
        assertThat(value.scale()).isEqualTo(2);
    }

    @Test
    void inventoryValueIsZeroWithoutProducts() {
        jdbcTemplate.update("delete from shop_api.tb_products");

        assertThat(productRepository.sumInventoryValue()).isEqualByComparingTo("0");
        assertThat(dashboardService.summary(true).inventoryValue()).isEqualTo(new BigDecimal("0.00"));
    }

    @Test
    void restockIsOrderedByStockThenNameThenIdAndHonoursTheLimit() {
        List<Long> all = productRepository.findRestock(PageRequest.of(0, 20)).stream().map(TbProduct::getId).toList();
        assertThat(all).containsExactly(negativeId, outZeroId, alphaFirstId, alphaSecondId, betaId, atMinimumId);

        List<Long> limited = productRepository.findRestock(PageRequest.of(0, 3)).stream().map(TbProduct::getId).toList();
        assertThat(limited).containsExactly(negativeId, outZeroId, alphaFirstId);
    }

    @Test
    void summaryCombinesTheQueries() {
        DashboardSummaryResponse summary = dashboardService.summary(false);

        assertThat(summary.activeProducts()).isEqualTo(7);
        assertThat(summary.lowStock()).isEqualTo(4);
        assertThat(summary.outOfStock()).isEqualTo(2);
        assertThat(summary.activeBrands()).isEqualTo(1);
        assertThat(summary.activeSuppliers()).isNull();
        assertThat(summary.restock()).extracting(RestockItemResponse::id)
                .containsExactly(negativeId, outZeroId, alphaFirstId, alphaSecondId, betaId, atMinimumId);
    }
}
