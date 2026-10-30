package com.pedrohenc.erp.dto.stock;

import com.pedrohenc.erp.entity.StockMovementReason;
import com.pedrohenc.erp.entity.StockMovementType;
import com.pedrohenc.erp.entity.TbProduct;
import com.pedrohenc.erp.entity.TbStockMovement;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UnitOfMeasure;

import java.math.BigDecimal;
import java.time.Instant;

public record StockMovementResponse(
        Long id,
        Long productId,
        String productName,
        String productSku,
        UnitOfMeasure unitOfMeasure,
        StockMovementType type,
        StockMovementReason reason,
        /** Signed change: positive adds to stock, negative removes. */
        BigDecimal quantity,
        BigDecimal balanceAfter,
        String note,
        /** Null for movements recorded before history began, or by a deleted user. */
        String createdByName,
        Instant createdAt
) {
    public static StockMovementResponse from(TbStockMovement movement) {
        TbProduct product = movement.getProduct();
        TbUser author = movement.getCreatedBy();
        return new StockMovementResponse(
                movement.getId(), product.getId(), product.getName(), product.getSku(), product.getUnitOfMeasure(),
                movement.getType(), movement.getReason(), movement.getQuantity(), movement.getBalanceAfter(),
                movement.getNote(), author == null ? null : author.getName(), movement.getCreatedAt());
    }
}
