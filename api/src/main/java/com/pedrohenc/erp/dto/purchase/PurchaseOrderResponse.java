package com.pedrohenc.erp.dto.purchase;

import com.pedrohenc.erp.entity.PurchaseOrderStatus;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.TbPurchaseOrder;
import com.pedrohenc.erp.entity.TbPurchaseOrderItem;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UnitOfMeasure;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record PurchaseOrderResponse(
        Long id,
        Long number,
        PurchaseOrderStatus status,
        Long supplierId,
        String supplierName,
        String notes,
        BigDecimal total,
        BigDecimal receivedTotal,
        String createdByName,
        Instant createdAt,
        Instant orderedAt,
        Instant receivedAt,
        String receivedByName,
        Instant cancelledAt,
        List<Item> items
) {

    /**
     * {@code productStock} and {@code productCost} are the product's live values (null once it is deleted),
     * so the receiving screen can show the cost it will average into.
     */
    public record Item(Long id, Long productId, String sku, String name, UnitOfMeasure unitOfMeasure, BigDecimal quantity,
                       BigDecimal unitCost, BigDecimal total, BigDecimal receivedQuantity, BigDecimal receivedUnitCost,
                       BigDecimal productStock, BigDecimal productCost) {

        static Item from(TbPurchaseOrderItem item) {
            TbProduct product = item.getProduct();
            return new Item(item.getId(), product == null ? null : product.getId(), item.getSku(), item.getName(),
                    item.getUnitOfMeasure(), item.getQuantity(), item.getUnitCost(), item.getTotal(),
                    item.getReceivedQuantity(), item.getReceivedUnitCost(),
                    product == null ? null : product.getStockQuantity(), product == null ? null : product.getCostPrice());
        }
    }

    public static PurchaseOrderResponse from(TbPurchaseOrder order) {
        return new PurchaseOrderResponse(order.getId(), order.getNumber(), order.getStatus(), order.getSupplier().getId(),
                supplierName(order), order.getNotes(), order.getTotal(), order.getReceivedTotal(), name(order.getCreatedBy()),
                order.getCreatedAt(), order.getOrderedAt(), order.getReceivedAt(), name(order.getReceivedBy()),
                order.getCancelledAt(), order.getItems().stream().map(Item::from).toList());
    }

    /** The trade name when there is one, as people call the supplier. */
    public static String supplierName(TbPurchaseOrder order) {
        String trade = order.getSupplier().getTradeName();
        return trade != null && !trade.isBlank() ? trade : order.getSupplier().getLegalName();
    }

    private static String name(TbUser user) {
        return user == null ? null : user.getName();
    }
}
