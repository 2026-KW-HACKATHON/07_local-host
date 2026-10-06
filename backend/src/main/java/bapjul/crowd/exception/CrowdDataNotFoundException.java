package bapjul.crowd.exception;

public class CrowdDataNotFoundException
        extends RuntimeException {

    public CrowdDataNotFoundException(
            String message
    ) {
        super(message);
    }
}