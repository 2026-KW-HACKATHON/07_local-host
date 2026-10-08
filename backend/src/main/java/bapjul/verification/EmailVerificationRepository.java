package bapjul.verification;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification,Long>{
    Optional<EmailVerification> findByEmail(String email);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select e from EmailVerification e where e.email=:email")
    Optional<EmailVerification> lockByEmail(@Param("email") String email);
}
