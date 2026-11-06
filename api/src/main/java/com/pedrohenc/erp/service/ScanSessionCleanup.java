package com.pedrohenc.erp.service;

import com.pedrohenc.erp.repository.ScanSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;

/**
 * Deletes scan sessions a day after they expired: they are of no use once the screen stopped polling.
 * Runs unauthenticated, so as the root tenant, across every store.
 */
@Component
public class ScanSessionCleanup {

    private static final Logger log = LoggerFactory.getLogger(ScanSessionCleanup.class);
    static final Duration KEEP_AFTER_EXPIRY = Duration.ofDays(1);

    private final ScanSessionRepository repository;
    private final Clock clock;

    public ScanSessionCleanup(ScanSessionRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Scheduled(cron = "${app.scan-cleanup.cron:0 30 4 * * *}")
    @Transactional
    public int deleteExpired() {
        int deleted = repository.deleteExpiredBefore(clock.instant().minus(KEEP_AFTER_EXPIRY));
        if (deleted > 0) {
            log.info("Deleted {} expired scan sessions", deleted);
        }
        return deleted;
    }
}
