package bapjul.restaurant.exception;

public class RestaurantAccessDeniedException
        extends RuntimeException {

    public RestaurantAccessDeniedException(
            String message
    ) {
        super(message);
    }
}