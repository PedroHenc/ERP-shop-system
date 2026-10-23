package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.product.ProductRequest;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.UnitOfMeasure;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.repository.BrandRepository;
import com.pedrohenc.erp.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private BrandRepository brandRepository;

    @InjectMocks
    private ProductService productService;

    private static ProductRequest request(Long version) {
        return new ProductRequest("SKU-1", null, "Widget", null, "Tools", null, null,
                new BigDecimal("10.00"), UnitOfMeasure.UNIT, BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ZERO,
                false, true, version);
    }

    private static TbProduct productWithVersion(Long version) {
        TbProduct product = new TbProduct();
        product.setVersion(version);
        return product;
    }

    @Test
    void updateWithStaleVersionThrowsConflict() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(productWithVersion(2L)));

        assertThatThrownBy(() -> productService.update(1L, request(1L)))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);

        verify(productRepository, never()).saveAndFlush(any());
    }

    @Test
    void updateWithoutVersionSaves() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(productWithVersion(2L)));
        when(productRepository.saveAndFlush(any(TbProduct.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(productService.update(1L, request(null))).isNotNull();

        verify(productRepository, times(1)).saveAndFlush(any(TbProduct.class));
    }

    @Test
    void createWithDuplicateSkuThrowsFieldError() {
        when(productRepository.existsBySku("SKU-1")).thenReturn(true);

        assertThatThrownBy(() -> productService.create(request(null)))
                .isInstanceOf(FieldErrorException.class)
                .hasMessage("A product with this SKU already exists")
                .satisfies(ex -> assertThat(((FieldErrorException) ex).getField()).isEqualTo("sku"));
    }
}
