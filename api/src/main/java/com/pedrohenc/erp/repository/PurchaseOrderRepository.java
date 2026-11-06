package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.TbPurchaseOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<TbPurchaseOrder, Long>, JpaSpecificationExecutor<TbPurchaseOrder> {

    /** The next order number of the signed-in store; call with the store row locked. */
    @Query("select coalesce(max(o.number), 0) + 1 from TbPurchaseOrder o")
    long nextNumber();

    /** Locks the order, so it is received (or cancelled) once. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from TbPurchaseOrder o where o.id = :id")
    Optional<TbPurchaseOrder> findForUpdate(Long id);

    /** [orderId, item count] of the given orders. */
    @Query("select i.purchaseOrder.id, count(i) from TbPurchaseOrderItem i where i.purchaseOrder.id in :ids group by i.purchaseOrder.id")
    List<Object[]> countItems(List<Long> ids);

    /** [productId, quantity] still on order: items of drafts and sent orders. */
    @Query("select i.product.id, sum(i.quantity) from TbPurchaseOrderItem i join i.purchaseOrder o "
            + "where o.status in (com.pedrohenc.erp.entity.PurchaseOrderStatus.DRAFT, com.pedrohenc.erp.entity.PurchaseOrderStatus.ORDERED) "
            + "and i.product is not null group by i.product.id")
    List<Object[]> quantitiesOnOrder();
}
