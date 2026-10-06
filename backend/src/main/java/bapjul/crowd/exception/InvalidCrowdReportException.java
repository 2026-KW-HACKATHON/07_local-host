package bapjul.crowd.exception;

public class InvalidCrowdReportException
        extends RuntimeException {

    public InvalidCrowdReportException(
            String message
    ) {
        super(message);
    }
}