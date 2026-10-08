package bapjul.stay.proof;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.repository.query.Param;

public interface StayProofRepository extends JpaRepository<StayProof,Long>{
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select s from StayProof s where s.token=:token")
    Optional<StayProof> lockByToken(@Param("token") String token);
}
