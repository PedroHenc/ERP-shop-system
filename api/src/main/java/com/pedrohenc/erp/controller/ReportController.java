package com.pedrohenc.erp.controller;

import com.pedrohenc.erp.dto.report.StockReportRequest;
import com.pedrohenc.erp.dto.report.StockReportResponse;
import com.pedrohenc.erp.security.Roles;
import com.pedrohenc.erp.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PreAuthorize(Roles.REPORTS)
    @GetMapping("/stock")
    public StockReportResponse stock(@Valid @ModelAttribute StockReportRequest request) {
        return reportService.stock(request);
    }
}
