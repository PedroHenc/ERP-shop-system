package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.dashboard.DashboardSummaryResponse;
import com.pedrohenc.erp.dto.dashboard.RestockItemResponse;
import com.pedrohenc.erp.repository.BrandRepository;
import com.pedrohenc.erp.repository.ProductRepository;
import com.pedrohenc.erp.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final int RESTOCK_LIMIT = 8;

    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final SupplierRepository supplierRepository;

    public DashboardSummaryResponse summary(boolean includeSuppliers) {
        List<RestockItemResponse> restock = productRepository.findRestock(PageRequest.of(0, RESTOCK_LIMIT)).stream()
                .map(product -> new RestockItemResponse(
                        product.getId(),
                        product.getSku(),
                        product.getName(),
                        product.getStockQuantity(),
                        product.getMinimumStock()))
                .toList();

        return new DashboardSummaryResponse(
                productRepository.countByActiveTrue(),
                productRepository.countLowStock(),
                productRepository.countOutOfStock(),
                productRepository.sumInventoryValue().setScale(2, RoundingMode.HALF_UP),
                brandRepository.countByActiveTrue(),
                includeSuppliers ? supplierRepository.countByActiveTrue() : null,
                restock);
    }
}
