package bapjul.profile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface UserConsentRepository extends JpaRepository<UserConsent,Long>{
    Optional<UserConsent> findByUser_Id(Long userId);
}
