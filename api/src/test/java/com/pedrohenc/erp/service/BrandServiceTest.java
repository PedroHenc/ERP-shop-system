package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.brand.BrandDetailResponse;
import com.pedrohenc.erp.dto.brand.BrandRequest;
import com.pedrohenc.erp.entity.TbBrand;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.repository.BrandRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BrandServiceTest {

    @Mock
    private BrandRepository brandRepository;

    @InjectMocks
    private BrandService brandService;

    private static TbBrand brand(Long version) {
        TbBrand brand = new TbBrand();
        brand.setName("Acme");
        brand.setActive(true);
        brand.setVersion(version);
        return brand;
    }

    @Test
    void createTrimsNameAndRejectsCaseInsensitiveDuplicate() {
        when(brandRepository.existsByNameIgnoreCase("acme")).thenReturn(true);

        assertThatThrownBy(() -> brandService.create(new BrandRequest(" acme ", true, null)))
                .isInstanceOf(FieldErrorException.class)
                .hasMessage("A brand with this name already exists")
                .satisfies(ex -> assertThat(((FieldErrorException) ex).getField()).isEqualTo("name"));

        verify(brandRepository, never()).save(any());
    }

    @Test
    void updateRejectsDuplicateNameOfAnotherBrand() {
        when(brandRepository.findById(1L)).thenReturn(Optional.of(brand(0L)));
        when(brandRepository.existsByNameIgnoreCaseAndIdNot("Acme", 1L)).thenReturn(true);

        assertThatThrownBy(() -> brandService.update(1L, new BrandRequest("Acme", true, null)))
                .isInstanceOf(FieldErrorException.class)
                .satisfies(ex -> assertThat(((FieldErrorException) ex).getField()).isEqualTo("name"));

        verify(brandRepository, never()).saveAndFlush(any());
    }

    @Test
    void updateWithStaleVersionThrowsConflict() {
        when(brandRepository.findById(1L)).thenReturn(Optional.of(brand(2L)));

        assertThatThrownBy(() -> brandService.update(1L, new BrandRequest("Acme", true, 1L)))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);

        verify(brandRepository, never()).saveAndFlush(any());
        verify(brandRepository, never()).save(any());
    }

    @Test
    void setStatusChangesActiveOnly() {
        TbBrand entity = brand(0L);
        when(brandRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(brandRepository.saveAndFlush(any(TbBrand.class))).thenAnswer(inv -> inv.getArgument(0));

        BrandDetailResponse response = brandService.setStatus(1L, false);

        assertThat(entity.getActive()).isFalse();
        assertThat(entity.getName()).isEqualTo("Acme");
        assertThat(response.active()).isFalse();
    }
}
