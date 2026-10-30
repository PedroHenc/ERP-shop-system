package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.TbSale;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SaleRepository extends JpaRepository<TbSale, Long>, JpaSpecificationExecutor<TbSale> {

    /** The next sale number of the signed-in store; call with the store row locked. */
    @Query("select coalesce(max(s.number), 0) + 1 from TbSale s")
    long nextNumber();

    /** Locks the sale, so two cancellations of the same sale cannot both return its stock. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from TbSale s where s.id = :id")
    Optional<TbSale> findForUpdate(Long id);

    /** [saleId, item count] of the given sales. */
    @Query("select i.sale.id, count(i) from TbSaleItem i where i.sale.id in :ids group by i.sale.id")
    List<Object[]> countItems(List<Long> ids);
}
