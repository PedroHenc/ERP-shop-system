package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.TbProduct;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<TbProduct, Long>, JpaSpecificationExecutor<TbProduct> {

    boolean existsBySku(String sku);

    boolean existsBySkuAndIdNot(String sku, Long id);

    boolean existsByBarcode(String barcode);

    boolean existsByBarcodeAndIdNot(String barcode, Long id);

    long countByActiveTrue();

    @Query("select count(p) from TbProduct p where p.active = true and p.stockQuantity > 0 and p.stockQuantity <= p.minimumStock")
    long countLowStock();

    @Query("select count(p) from TbProduct p where p.active = true and p.stockQuantity <= 0")
    long countOutOfStock();

    @Query("select coalesce(sum(p.price * p.stockQuantity), 0) from TbProduct p where p.active = true and p.stockQuantity > 0")
    BigDecimal sumInventoryValue();

    @Query("select p from TbProduct p where p.active = true and (p.stockQuantity <= p.minimumStock or p.stockQuantity <= 0) order by p.stockQuantity asc, p.name asc, p.id asc")
    List<TbProduct> findRestock(Pageable pageable);

    /** Locks the product's row until the transaction ends, so concurrent movements apply one after another. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from TbProduct p where p.id = :id")
    Optional<TbProduct> findForStockUpdate(Long id);

    /**
     * Writes the new balance without bumping the product's version: stock moves on its own, so an edit
     * form opened before a movement can still save the catalog fields. The caller detaches the product
     * (the persistence context still holds the old balance); clearing everything would detach a sale in progress.
     */
    @Modifying(flushAutomatically = true)
    @Query("update TbProduct p set p.stockQuantity = :balance where p.id = :id")
    void updateStockQuantity(Long id, BigDecimal balance);
}
