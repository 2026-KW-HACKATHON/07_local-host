package bapjul.stay.proof;
import bapjul.location.api.StayRequest;
import bapjul.stay.*;
import bapjul.user.domain.User;
import bapjul.user.domain.UserRole;
import bapjul.user.repository.UserRepository;
import bapjul.restaurant.domain.Restaurant;
import bapjul.restaurant.repository.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
@Service
public class StayProofService {
    private final StayProofRepository proofs;
    private final UserRepository users;
    private final RestaurantRepository restaurants;
    private final Clock clock;
    private final StayWindowValidator validator=new StayWindowValidator(StayRules.DEFAULT);
    public record ProofRequest(Long restaurantId,Instant capturedAt,List<StayRequest.Sample> samples) {}
    public record ProofView(String proofToken,Instant expiresAt,Long restaurantId) {}
    public StayProofService(StayProofRepository proofs,UserRepository users,RestaurantRepository restaurants,Clock clock){
        this.proofs=proofs;this.users=users;this.restaurants=restaurants;this.clock=clock;
    }
    @Transactional
    public ProofView create(String email,ProofRequest request) {
        User user=users.findByEmail(email).orElseThrow(()->new IllegalArgumentException("계정을 찾을 수 없습니다."));
        if(user.getRole()!=UserRole.CUSTOMER) throw new IllegalArgumentException("손님 계정만 체류 증명을 발급받을 수 있습니다.");
        if(request==null || request.restaurantId()==null || request.capturedAt()==null || request.samples()==null)
            throw new IllegalArgumentException("체류 요청 정보를 입력해야 합니다.");
        Instant now=clock.instant();
        if(request.capturedAt().isBefore(now.minusSeconds(60)) || request.capturedAt().isAfter(now.plusSeconds(10)))
            throw new IllegalArgumentException("위치 측정 시각은 최근 60초 이내여야 합니다.");
        Restaurant restaurant=restaurants.findById(request.restaurantId()).orElseThrow(()->new IllegalArgumentException("식당을 찾을 수 없습니다."));
        if(restaurant.getLatitude()==null || restaurant.getLongitude()==null)
            throw new IllegalArgumentException("식당 좌표가 없어 제보할 수 없습니다.");
        StayWindow window=validator.validate(request.samples().stream().map(StayRequest.Sample::toGeoSample).toList());
        GeoSample position=window.getLatest();
        if(GeoDistance.meters(position.getLatitude(),position.getLongitude(),restaurant.getLatitude(),restaurant.getLongitude())>50.0)
            throw new IllegalArgumentException("식당과 50m 이내의 체류 기록이 필요합니다.");
        StayProof proof=proofs.save(new StayProof(UUID.randomUUID().toString(),user,restaurant,now));
        return new ProofView(proof.getToken(),proof.getExpiresAt(),restaurant.getId());
    }
    @Transactional
    public void consume(String token,String email,Long restaurantId) {
        if(token==null || token.isBlank()) throw new IllegalArgumentException("체류 증명 토큰이 필요합니다.");
        StayProof proof=proofs.lockByToken(token).orElseThrow(()->new IllegalArgumentException("체류 증명을 찾을 수 없습니다."));
        if(!proof.getUser().getEmail().equals(email) || !proof.getRestaurant().getId().equals(restaurantId))
            throw new IllegalArgumentException("체류 증명이 사용자 또는 식당과 일치하지 않습니다.");
        proof.consume(clock.instant());
    }
}
