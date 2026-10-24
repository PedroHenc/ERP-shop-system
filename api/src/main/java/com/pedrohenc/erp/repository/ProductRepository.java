package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.TbProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;

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
}
