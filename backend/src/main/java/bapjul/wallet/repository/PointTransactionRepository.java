package bapjul.wallet.repository;
import bapjul.wallet.domain.PointTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
public interface PointTransactionRepository extends JpaRepository<PointTransaction,Long> {
    boolean existsByKey(String key);
    Page<PointTransaction> findByUser_IdOrderByCreatedAtDescIdDesc(Long userId,Pageable pageable);
}
