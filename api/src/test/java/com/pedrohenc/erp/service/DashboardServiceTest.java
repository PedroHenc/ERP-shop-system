package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.dashboard.DashboardSummaryResponse;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.repository.BrandRepository;
import com.pedrohenc.erp.repository.ProductRepository;
import com.pedrohenc.erp.repository.SupplierRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private BrandRepository brandRepository;

    @Mock
    private SupplierRepository supplierRepository;

    @InjectMocks
    private DashboardService dashboardService;

    private static TbProduct product() {
        return TbProduct.builder()
                .id(7L)
                .sku("SKU-7")
                .name("Widget")
                .stockQuantity(new BigDecimal("2.000"))
                .minimumStock(new BigDecimal("5.000"))
                .build();
    }

    private void stubCounts() {
        when(productRepository.countByActiveTrue()).thenReturn(10L);
        when(productRepository.countLowStock()).thenReturn(2L);
        when(productRepository.countOutOfStock()).thenReturn(1L);
        when(productRepository.sumInventoryValue()).thenReturn(new BigDecimal("150.5"));
        when(brandRepository.countByActiveTrue()).thenReturn(4L);
        when(productRepository.findRestock(org.mockito.ArgumentMatchers.any())).thenReturn(List.of(product()));
    }

    @Test
    void summaryAggregatesRepositoryValues() {
        stubCounts();
        when(supplierRepository.countByActiveTrue()).thenReturn(3L);

        DashboardSummaryResponse summary = dashboardService.summary(true);

        assertThat(summary.activeProducts()).isEqualTo(10L);
        assertThat(summary.lowStock()).isEqualTo(2L);
        assertThat(summary.outOfStock()).isEqualTo(1L);
        assertThat(summary.inventoryValue()).isEqualTo(new BigDecimal("150.50"));
        assertThat(summary.activeBrands()).isEqualTo(4L);
        assertThat(summary.activeSuppliers()).isEqualTo(3L);
        assertThat(summary.restock()).hasSize(1);
        assertThat(summary.restock().get(0).sku()).isEqualTo("SKU-7");
        assertThat(summary.restock().get(0).id()).isEqualTo(7L);
    }

    @Test
    void summaryOmitsSuppliersWhenNotAllowed() {
        stubCounts();

        DashboardSummaryResponse summary = dashboardService.summary(false);

        assertThat(summary.activeSuppliers()).isNull();
        verify(supplierRepository, never()).countByActiveTrue();
    }

    @Test
    void restockAsksForEightItems() {
        stubCounts();

        dashboardService.summary(false);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).findRestock(captor.capture());
        assertThat(captor.getValue().getPageSize()).isEqualTo(8);
        assertThat(captor.getValue().getPageNumber()).isEqualTo(0);
    }
}
