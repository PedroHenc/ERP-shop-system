package com.pedrohenc.erp.dto.sale;

import com.pedrohenc.erp.entity.PaymentMethod;
import com.pedrohenc.erp.entity.SaleStatus;
import com.pedrohenc.erp.entity.TbSale;
import com.pedrohenc.erp.entity.TbSaleItem;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UnitOfMeasure;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record SaleResponse(
        Long id,
        Long number,
        SaleStatus status,
        BigDecimal subtotal,
        BigDecimal itemsDiscount,
        BigDecimal discount,
        BigDecimal total,
        PaymentMethod paymentMethod,
        BigDecimal amountPaid,
        BigDecimal change,
        String note,
        String createdByName,
        Instant createdAt,
        Instant cancelledAt,
        String cancelledByName,
        String cancelReason,
        List<Item> items
) {

    public record Item(Long id, Long productId, String sku, String name, UnitOfMeasure unitOfMeasure, BigDecimal quantity,
                       BigDecimal unitPrice, BigDecimal discount, BigDecimal total) {

        static Item from(TbSaleItem item) {
            return new Item(item.getId(), item.getProduct() == null ? null : item.getProduct().getId(), item.getSku(),
                    item.getName(), item.getUnitOfMeasure(), item.getQuantity(), item.getUnitPrice(), item.getDiscount(),
                    item.getTotal());
        }
    }

    public static SaleResponse from(TbSale sale) {
        return new SaleResponse(sale.getId(), sale.getNumber(), sale.getStatus(), sale.getSubtotal(), sale.getItemsDiscount(),
                sale.getDiscount(), sale.getTotal(), sale.getPaymentMethod(), sale.getAmountPaid(), sale.getChange(),
                sale.getNote(), name(sale.getCreatedBy()), sale.getCreatedAt(), sale.getCancelledAt(),
                name(sale.getCancelledBy()), sale.getCancelReason(), sale.getItems().stream().map(Item::from).toList());
    }

    private static String name(TbUser user) {
        return user == null ? null : user.getName();
    }
}
