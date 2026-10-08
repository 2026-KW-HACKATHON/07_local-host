package bapjul.location.api;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(assignableTypes = StayRecommendationController.class)
public class ApiExceptionHandler {
    public record ErrorResponse(String code, String message) {}

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> invalidStay(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_STAY", ex.getMessage()));
    }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ErrorResponse> invalidBody(Exception ex) {
        return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_REQUEST", "요청 형식 또는 위치 관측값을 확인해 주세요."));
    }
}
