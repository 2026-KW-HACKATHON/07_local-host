package bapjul.external;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
@RestController
public class NaverSearchController {
    @Value("${naver.client-id:}") private String clientId;
    @Value("${naver.client-secret:}") private String clientSecret;
    private final RestClient client=RestClient.builder().baseUrl("https://openapi.naver.com").build();
    @GetMapping("/api/external/naver/places")
    public ResponseEntity<String> find(@RequestParam String query){
        if(query==null || query.isBlank() || query.length()>100) throw new IllegalArgumentException("검색어는 1~100자여야 합니다.");
        if(clientId.isBlank() || clientSecret.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"네이버 API 키가 설정되지 않았습니다.");
        String json=client.get().uri(uri->uri.path("/v1/search/local.json").queryParam("query",query).queryParam("display",10).build())
            .header("X-Naver-Client-Id",clientId).header("X-Naver-Client-Secret",clientSecret)
            .retrieve().body(String.class);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).header("Cache-Control","no-store").body(json);
    }
}
