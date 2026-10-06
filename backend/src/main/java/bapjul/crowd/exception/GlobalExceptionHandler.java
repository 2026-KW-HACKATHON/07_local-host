package bapjul.crowd.exception;

import bapjul.auth.exception.DuplicateUserException;
import bapjul.auth.exception.InvalidCredentialsException;

import bapjul.restaurant.exception.RestaurantNotFoundException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

import bapjul.restaurant.exception.RestaurantAccessDeniedException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CrowdDataNotFoundException.class)
    public ResponseEntity<Map<String, String>>
    handleCrowdDataNotFound(
            CrowdDataNotFoundException e
    ) {

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(
                        Map.of(
                                "message",
                                e.getMessage()
                        )
                );
    }

    @ExceptionHandler(RestaurantNotFoundException.class)
    public ResponseEntity<Map<String, String>>
    handleRestaurantNotFound(
            RestaurantNotFoundException e
    ) {

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(
                        Map.of(
                                "message",
                                e.getMessage()
                        )
                );
    }

    @ExceptionHandler(DuplicateUserException.class)
public ResponseEntity<Map<String, String>>
handleDuplicateUser(
        DuplicateUserException e
) {
    return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(
                    Map.of(
                            "message",
                            e.getMessage()
                    )
            );
}

@ExceptionHandler(InvalidCredentialsException.class)
public ResponseEntity<Map<String, String>>
handleInvalidCredentials(
        InvalidCredentialsException e
) {
    return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(
                    Map.of(
                            "message",
                            e.getMessage()
                    )
            );
}
@ExceptionHandler(RestaurantAccessDeniedException.class)
public ResponseEntity<Map<String, String>>
handleRestaurantAccessDenied(
        RestaurantAccessDeniedException e
) {

    return ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .body(
                    Map.of(
                            "message",
                            e.getMessage()
                    )
            );
}
}