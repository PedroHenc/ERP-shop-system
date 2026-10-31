package com.pedrohenc.erp.service;

import com.pedrohenc.erp.dto.scan.ScanPreviewResponse;
import com.pedrohenc.erp.dto.scan.ScanSessionCreatedResponse;
import com.pedrohenc.erp.dto.scan.ScanSessionResponse;
import com.pedrohenc.erp.dto.scan.ScanSessionResponse.ScanSessionStatus;
import com.pedrohenc.erp.dto.scan.ScanSubmitResponse;
import com.pedrohenc.erp.entity.TbScanSession;
import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.exception.FieldErrorException;
import com.pedrohenc.erp.exception.InvalidScanSessionException;
import com.pedrohenc.erp.exception.ResourceNotFoundException;
import com.pedrohenc.erp.repository.ScanSessionRepository;
import com.pedrohenc.erp.repository.StoreRepository;
import com.pedrohenc.erp.repository.UserRepository;
import com.pedrohenc.erp.security.TokenHashes;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Phone-to-screen barcode handoff. The signed-in screen opens a session and shows its token as a QR
 * code; the phone (not signed in) sends one code with that token; the screen polls until it arrives.
 * The token is the only credential, so it is long, random, single-use and short-lived. A batch session
 * (several new products) takes up to {@link #MAX_BATCH_CODES} distinct codes until it expires or the
 * screen closes it.
 */
@Service
public class ScanSessionService {

    static final Duration TTL = Duration.ofMinutes(10);
    static final Duration BATCH_TTL = Duration.ofMinutes(30);
    public static final int MAX_BATCH_CODES = 200;
    /** 24 random bytes: a 32-character URL-safe token. */
    private static final int TOKEN_BYTES = 24;

    private final ScanSessionRepository repository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final Clock clock;

    public ScanSessionService(ScanSessionRepository repository, UserRepository userRepository, StoreRepository storeRepository,
                              Clock clock) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.clock = clock;
    }

    @Transactional
    public ScanSessionCreatedResponse create(long actingUserId, boolean batch) {
        TbUser user = userRepository.findById(actingUserId).orElseThrow(() -> new ResourceNotFoundException("User", actingUserId));
        String token = TokenHashes.newRawToken(TOKEN_BYTES);
        Instant now = clock.instant();
        TbScanSession session = repository.save(TbScanSession.builder()
                .storeId(user.getStoreId())
                .tokenHash(TokenHashes.sha256Hex(token))
                .createdBy(user)
                .createdAt(now)
                .expiresAt(now.plus(batch ? BATCH_TTL : TTL))
                .batch(batch)
                .build());
        return new ScanSessionCreatedResponse(session.getId(), token, session.getExpiresAt());
    }

    /** The screen's poll. Only the user who opened the session sees it (others get 404, like another store's). */
    @Transactional(readOnly = true)
    public ScanSessionResponse find(long actingUserId, Long id) {
        TbScanSession session = owned(actingUserId, id);
        ScanSessionStatus status = session.getCode() != null
                ? ScanSessionStatus.SCANNED
                : clock.instant().isBefore(session.getExpiresAt()) ? ScanSessionStatus.WAITING : ScanSessionStatus.EXPIRED;
        return new ScanSessionResponse(session.getId(), status, session.isBatch(), session.getCode(),
                List.copyOf(session.getCodes()), session.getExpiresAt());
    }

    /** The screen is done with a batch: the phone's next code is refused. */
    @Transactional
    public void close(long actingUserId, Long id) {
        TbScanSession session = owned(actingUserId, id);
        Instant now = clock.instant();
        if (now.isBefore(session.getExpiresAt())) {
            session.setExpiresAt(now);
        }
    }

    private TbScanSession owned(long actingUserId, Long id) {
        return repository.findById(id)
                .filter(s -> s.getCreatedBy().getId() == actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Scan session", id));
    }

    /** Anonymous: lets the phone say which store is waiting before it turns the camera on. */
    @Transactional(readOnly = true)
    public ScanPreviewResponse preview(String rawToken) {
        TbScanSession session = open(repository.findByTokenHash(TokenHashes.sha256Hex(rawToken.trim())).orElse(null));
        String storeName = storeRepository.findById(session.getStoreId()).map(store -> store.getName()).orElse("");
        return new ScanPreviewResponse(storeName, session.getExpiresAt(), session.isBatch(), session.getCodes().size());
    }

    /**
     * Anonymous: a code from the phone. A single session takes one (a second, or one after expiry, is
     * refused); a batch keeps distinct codes, a repeated one is reported rather than added.
     */
    @Transactional
    public ScanSubmitResponse submit(String rawToken, String code) {
        TbScanSession session = open(repository.findForUpdateByTokenHash(TokenHashes.sha256Hex(rawToken.trim())).orElse(null));
        session.setScannedAt(clock.instant());
        if (!session.isBatch()) {
            session.setCode(code);
            return new ScanSubmitResponse(1, false);
        }
        if (session.getCodes().contains(code)) {
            return new ScanSubmitResponse(session.getCodes().size(), true);
        }
        if (session.getCodes().size() >= MAX_BATCH_CODES) {
            throw new FieldErrorException("code", "This session already has " + MAX_BATCH_CODES + " codes");
        }
        session.getCodes().add(code);
        return new ScanSubmitResponse(session.getCodes().size(), false);
    }

    private TbScanSession open(TbScanSession session) {
        if (session == null || session.getCode() != null || !clock.instant().isBefore(session.getExpiresAt())) {
            throw new InvalidScanSessionException();
        }
        return session;
    }
}
