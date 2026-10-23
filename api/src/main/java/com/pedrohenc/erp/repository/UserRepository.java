package com.pedrohenc.erp.repository;

import com.pedrohenc.erp.entity.TbUser;
import com.pedrohenc.erp.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface UserRepository extends JpaRepository<TbUser, Long>, JpaSpecificationExecutor<TbUser> {

    Optional<TbUser> findByEmail(String normalizedEmail);

    boolean existsByEmail(String normalizedEmail);

    boolean existsByEmailAndIdNot(String normalizedEmail, Long id);

    long countByRoleAndActiveTrue(UserRole role);
}
