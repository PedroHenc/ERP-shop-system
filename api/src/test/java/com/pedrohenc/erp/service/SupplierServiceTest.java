package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.supplier.SupplierPageRequest;
import com.pedrohenc.erp.dto.supplier.SupplierRequest;
import com.pedrohenc.erp.dto.supplier.SupplierResponse;
import com.pedrohenc.erp.entity.TbSupplier;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.repository.SupplierRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import java.util.List;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SupplierServiceTest {

    private static final String INVALID_TAX_ID = "Tax ID must have up to 14 letters or digits";
    private static final String DUPLICATE_TAX_ID = "A supplier with this tax ID already exists";

    @Mock
    private SupplierRepository supplierRepository;

    @InjectMocks
    private SupplierService supplierService;

    private static TbSupplier supplier(Long version, String taxId) {
        TbSupplier supplier = new TbSupplier();
        supplier.setLegalName("Acme Ltda");
        supplier.setTaxId(taxId);
        supplier.setActive(true);
        supplier.setVersion(version);
        return supplier;
    }

    private static SupplierRequest request(String taxId, Long version) {
        return new SupplierRequest("Acme Ltda", null, taxId, null, null, true, version);
    }

    private static void assertFieldError(Throwable ex, String field, String message) {
        assertThat(ex).isInstanceOf(FieldErrorException.class).hasMessage(message);
        assertThat(((FieldErrorException) ex).getField()).isEqualTo(field);
    }

    @Test
    void normalizesTaxId() {
        assertThat(SupplierService.normalizeTaxId("de 123.456/789")).isEqualTo("DE123456789");
        assertThat(SupplierService.normalizeTaxId("12.345.678/0001-90")).isEqualTo("12345678000190");
        assertThat(SupplierService.normalizeTaxId("  ")).isNull();
        assertThat(SupplierService.normalizeTaxId(null)).isNull();
    }

    @Test
    void createSavesBlankOptionalsAsNull() {
        when(supplierRepository.save(any(TbSupplier.class))).thenAnswer(inv -> inv.getArgument(0));

        supplierService.create(new SupplierRequest(" Acme Ltda ", "  ", "", "", " ", true, null));

        ArgumentCaptor<TbSupplier> captor = ArgumentCaptor.forClass(TbSupplier.class);
        verify(supplierRepository).save(captor.capture());
        TbSupplier saved = captor.getValue();
        assertThat(saved.getLegalName()).isEqualTo("Acme Ltda");
        assertThat(saved.getTradeName()).isNull();
        assertThat(saved.getTaxId()).isNull();
        assertThat(saved.getEmail()).isNull();
        assertThat(saved.getPhone()).isNull();
    }

    @Test
    void createSavesNormalizedTaxId() {
        when(supplierRepository.existsByTaxId("12345678000190")).thenReturn(false);
        when(supplierRepository.save(any(TbSupplier.class))).thenAnswer(inv -> inv.getArgument(0));

        SupplierResponse response = supplierService.create(request("12.345.678/0001-90", null));

        assertThat(response.taxId()).isEqualTo("12345678000190");
    }

    @Test
    void createRejectsTaxIdLongerThan14AfterNormalizing() {
        assertThatThrownBy(() -> supplierService.create(request("12.345.678/0001-901", null)))
                .satisfies(ex -> assertFieldError(ex, "taxId", INVALID_TAX_ID));

        verify(supplierRepository, never()).save(any());
    }

    @Test
    void createRejectsTaxIdWithOtherCharacters() {
        assertThatThrownBy(() -> supplierService.create(request("12#34", null)))
                .satisfies(ex -> assertFieldError(ex, "taxId", INVALID_TAX_ID));

        verify(supplierRepository, never()).save(any());
    }

    @Test
    void createRejectsDuplicateNormalizedTaxId() {
        when(supplierRepository.existsByTaxId("12345678000190")).thenReturn(true);

        assertThatThrownBy(() -> supplierService.create(request("12.345.678/0001-90", null)))
                .satisfies(ex -> assertFieldError(ex, "taxId", DUPLICATE_TAX_ID));

        verify(supplierRepository, never()).save(any());
    }

    @Test
    void updateRejectsNormalizedDuplicateTaxIdOfAnotherSupplier() {
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(supplier(0L, "99999999000199")));
        when(supplierRepository.existsByTaxIdAndIdNot("12345678000190", 1L)).thenReturn(true);

        assertThatThrownBy(() -> supplierService.update(1L, request("12.345.678/0001-90", null)))
                .satisfies(ex -> assertFieldError(ex, "taxId", DUPLICATE_TAX_ID));

        verify(supplierRepository, never()).saveAndFlush(any());
    }

    @Test
    void updateKeepingOwnTaxIdSucceeds() {
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(supplier(0L, "12345678000190")));
        when(supplierRepository.existsByTaxIdAndIdNot("12345678000190", 1L)).thenReturn(false);
        when(supplierRepository.saveAndFlush(any(TbSupplier.class))).thenAnswer(inv -> inv.getArgument(0));

        SupplierResponse response = supplierService.update(1L, request("12.345.678/0001-90", 0L));

        assertThat(response.taxId()).isEqualTo("12345678000190");
        verify(supplierRepository).saveAndFlush(any(TbSupplier.class));
    }

    @Test
    void updateWithStaleVersionThrowsConflict() {
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(supplier(2L, null)));

        assertThatThrownBy(() -> supplierService.update(1L, request(null, 1L)))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);

        verify(supplierRepository, never()).saveAndFlush(any());
        verify(supplierRepository, never()).save(any());
    }

    @Test
    void setStatusChangesActiveOnly() {
        TbSupplier entity = supplier(0L, "12345678000190");
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(supplierRepository.saveAndFlush(any(TbSupplier.class))).thenAnswer(inv -> inv.getArgument(0));

        SupplierResponse response = supplierService.setStatus(1L, false);

        assertThat(entity.getActive()).isFalse();
        assertThat(entity.getLegalName()).isEqualTo("Acme Ltda");
        assertThat(entity.getTaxId()).isEqualTo("12345678000190");
        assertThat(response.active()).isFalse();
    }

    @SuppressWarnings("unchecked")
    @Test
    void taxIdFilterThatNormalizesToEmptyIsIgnored() {
        when(supplierRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<TbSupplier>(List.of()));

        supplierService.findPage(new SupplierPageRequest(null, null, null, null, null, "-", null));

        ArgumentCaptor<Specification<TbSupplier>> captor = ArgumentCaptor.forClass(Specification.class);
        verify(supplierRepository).findAll(captor.capture(), any(Pageable.class));
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        captor.getValue().toPredicate(mock(Root.class), mock(CriteriaQuery.class), cb);

        verify(cb, never()).like(any(jakarta.persistence.criteria.Expression.class), anyString(), org.mockito.ArgumentMatchers.anyChar());
    }
}
