package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.stock.StockMovementRequest;
import com.pedrohenc.erp.dto.stock.StockMovementResponse;
import com.pedrohenc.erp.entity.StockMovementReason;
import com.pedrohenc.erp.entity.StockMovementType;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.TbStockMovement;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.repository.ProductRepository;
import com.pedrohenc.erp.repository.StockMovementRepository;
import com.pedrohenc.erp.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StockMovementServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-30T12:00:00Z");

    @Mock
    private StockMovementRepository movementRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private EntityManager entityManager;

    private StockMovementService service;
    private TbProduct product;

    @BeforeEach
    void setUp() {
        service = new StockMovementService(movementRepository, productRepository, userRepository, Clock.fixed(NOW, ZoneOffset.UTC), entityManager);
        product = TbProduct.builder().id(7L).storeId(3L).sku("SKU-7").name("Granola")
                .stockQuantity(new BigDecimal("10.000")).allowNegativeStock(false).build();
        when(productRepository.findForStockUpdate(7L)).thenReturn(Optional.of(product));
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(TbUser.builder().id(1L).name("Ana Admin").build()));
        when(movementRepository.save(any(TbStockMovement.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private StockMovementResponse record(StockMovementType type, StockMovementReason reason, String quantity) {
        return service.record(1L, 7L, new StockMovementRequest(type, reason, new BigDecimal(quantity), "  note  "));
    }

    @Test
    void entryAddsToTheStock() {
        StockMovementResponse response = record(StockMovementType.ENTRY, StockMovementReason.PURCHASE, "5");

        assertThat(response.quantity()).isEqualByComparingTo("5");
        assertThat(response.balanceAfter()).isEqualByComparingTo("15");
        assertThat(response.createdByName()).isEqualTo("Ana Admin");
        assertThat(response.note()).isEqualTo("note");
        assertThat(response.createdAt()).isEqualTo(NOW);
        verify(productRepository).updateStockQuantity(7L, new BigDecimal("15.000"));
    }

    @Test
    void exitRemovesFromTheStockAsANegativeChange() {
        StockMovementResponse response = record(StockMovementType.EXIT, StockMovementReason.LOSS, "4");

        assertThat(response.quantity()).isEqualByComparingTo("-4");
        assertThat(response.balanceAfter()).isEqualByComparingTo("6");
    }

    @Test
    void exitBeyondTheStockIsRejectedUnlessNegativeStockIsAllowed() {
        assertThatThrownBy(() -> record(StockMovementType.EXIT, StockMovementReason.SALE, "11"))
                .isInstanceOf(FieldErrorException.class)
                .hasMessage("Not enough stock: 10 available");
        verify(movementRepository, never()).save(any());
        verify(productRepository, never()).updateStockQuantity(anyLong(), any());

        product.setAllowNegativeStock(true);
        assertThat(record(StockMovementType.EXIT, StockMovementReason.SALE, "11").balanceAfter()).isEqualByComparingTo("-1");
    }

    @Test
    void adjustmentSetsTheCountedQuantityAndStoresTheDifference() {
        StockMovementResponse response = record(StockMovementType.ADJUSTMENT, StockMovementReason.INVENTORY_COUNT, "7");

        assertThat(response.quantity()).isEqualByComparingTo("-3");
        assertThat(response.balanceAfter()).isEqualByComparingTo("7");
    }

    @Test
    void adjustmentToTheCurrentStockIsRejected() {
        assertThatThrownBy(() -> record(StockMovementType.ADJUSTMENT, StockMovementReason.INVENTORY_COUNT, "10"))
                .isInstanceOf(FieldErrorException.class)
                .satisfies(ex -> assertThat(((FieldErrorException) ex).getField()).isEqualTo("quantity"));
    }

    @Test
    void zeroEntryIsRejected() {
        assertThatThrownBy(() -> record(StockMovementType.ENTRY, StockMovementReason.PURCHASE, "0"))
                .isInstanceOf(FieldErrorException.class)
                .hasMessage("Quantity must be greater than zero");
    }

    @Test
    void reasonMustMatchTheType() {
        assertThatThrownBy(() -> record(StockMovementType.ENTRY, StockMovementReason.SALE, "1"))
                .isInstanceOf(FieldErrorException.class)
                .satisfies(ex -> assertThat(((FieldErrorException) ex).getField()).isEqualTo("reason"));
        assertThat(record(StockMovementType.EXIT, StockMovementReason.OTHER, "1").reason()).isEqualTo(StockMovementReason.OTHER);
    }

    @Test
    void initialMovementsCannotBeRecordedByHand() {
        assertThatThrownBy(() -> record(StockMovementType.INITIAL, StockMovementReason.INITIAL_STOCK, "1"))
                .isInstanceOf(FieldErrorException.class)
                .satisfies(ex -> assertThat(((FieldErrorException) ex).getField()).isEqualTo("type"));
    }

    @Test
    void recordInitialSkipsProductsWithoutStock() {
        product.setStockQuantity(BigDecimal.ZERO);
        service.recordInitial(product, 1L);
        verify(movementRepository, never()).save(any());

        product.setStockQuantity(new BigDecimal("4.500"));
        service.recordInitial(product, 1L);
        ArgumentCaptor<TbStockMovement> captor = ArgumentCaptor.forClass(TbStockMovement.class);
        verify(movementRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(StockMovementType.INITIAL);
        assertThat(captor.getValue().getBalanceAfter()).isEqualByComparingTo("4.5");
    }
}
