package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.report.StockReportRequest;
import com.pedrohenc.erp.dto.report.StockReportResponse;
import com.pedrohenc.erp.dto.report.StockReportResponse.CategoryValue;
import com.pedrohenc.erp.dto.report.StockReportResponse.DailyPoint;
import com.pedrohenc.erp.dto.report.StockReportResponse.ProductAmount;
import com.pedrohenc.erp.dto.report.StockReportResponse.ReasonAmount;
import com.pedrohenc.erp.dto.report.StockReportResponse.Totals;
import com.pedrohenc.erp.entity.StockMovementReason;
import com.pedrohenc.erp.entity.StockMovementType;
import com.pedrohenc.erp.entity.UnitOfMeasure;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.repository.ReportQueries;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ReportService {

    /** A little over a year, so "last 365 days" fits whatever the zone offsets do. */
    static final Duration MAX_PERIOD = Duration.ofDays(367);
    private static final int TOP = 10;
    private static final Set<StockMovementReason> LOSS_REASONS = Set.of(StockMovementReason.LOSS, StockMovementReason.DAMAGE);

    private final ReportQueries queries;

    public ReportService(ReportQueries queries) {
        this.queries = queries;
    }

    @Transactional(readOnly = true)
    public StockReportResponse stock(StockReportRequest request) {
        Instant from = request.from();
        Instant to = request.to();
        if (!from.isBefore(to)) {
            throw new FieldErrorException("to", "The end of the period must come after its start");
        }
        if (Duration.between(from, to).compareTo(MAX_PERIOD) > 0) {
            throw new FieldErrorException("from", "The period can cover at most a year");
        }
        ZoneId zone = zone(request.zone());

        Map<StockMovementType, Long> counts = new EnumMap<>(StockMovementType.class);
        for (Object[] row : queries.countByType(from, to)) {
            counts.put((StockMovementType) row[0], (Long) row[1]);
        }

        // Every day of the period, so the chart has no gaps; the last day is the one `to` closes.
        Map<LocalDate, BigDecimal[]> days = new LinkedHashMap<>();
        LocalDate last = to.minusNanos(1).atZone(zone).toLocalDate();
        for (LocalDate day = from.atZone(zone).toLocalDate(); !day.isAfter(last); day = day.plusDays(1)) {
            days.put(day, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
        }
        BigDecimal valueIn = BigDecimal.ZERO;
        BigDecimal valueOut = BigDecimal.ZERO;
        for (Object[] row : queries.signedValues(from, to)) {
            BigDecimal value = (BigDecimal) row[1];
            BigDecimal[] day = days.get(((Instant) row[0]).atZone(zone).toLocalDate());
            if (value.signum() > 0) {
                valueIn = valueIn.add(value);
                if (day != null) day[0] = day[0].add(value);
            } else if (value.signum() < 0) {
                valueOut = valueOut.add(value.negate());
                if (day != null) day[1] = day[1].add(value.negate());
            }
        }
        List<DailyPoint> daily = new ArrayList<>(days.size());
        days.forEach((day, values) -> daily.add(new DailyPoint(day, values[0], values[1])));

        long movements = counts.values().stream().mapToLong(Long::longValue).sum();
        Totals totals = new Totals(movements, counts.getOrDefault(StockMovementType.ENTRY, 0L),
                counts.getOrDefault(StockMovementType.EXIT, 0L), counts.getOrDefault(StockMovementType.ADJUSTMENT, 0L),
                valueIn, valueOut);

        return new StockReportResponse(
                totals,
                daily,
                queries.topExits(StockMovementType.EXIT, from, to, PageRequest.of(0, TOP)).stream().map(ReportService::productAmount).toList(),
                queries.losses(LOSS_REASONS, from, to, PageRequest.of(0, TOP)).stream().map(ReportService::productAmount).toList(),
                queries.byReason(from, to).stream()
                        .map(row -> new ReasonAmount((StockMovementType) row[0], (StockMovementReason) row[1], (Long) row[2], (BigDecimal) row[3]))
                        .toList(),
                queries.stockByCategory().stream()
                        .map(row -> new CategoryValue((String) row[0], (Long) row[1], (BigDecimal) row[2]))
                        .toList());
    }

    private static ZoneId zone(String value) {
        if (!StringUtils.hasText(value)) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(value);
        } catch (DateTimeException ex) {
            throw new FieldErrorException("zone", "Unknown time zone");
        }
    }

    private static ProductAmount productAmount(Object[] row) {
        return new ProductAmount((Long) row[0], (String) row[1], (String) row[2], (UnitOfMeasure) row[3],
                (BigDecimal) row[4], (BigDecimal) row[5]);
    }
}
