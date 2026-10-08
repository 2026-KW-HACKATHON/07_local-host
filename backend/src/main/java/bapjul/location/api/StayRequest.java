package bapjul.location.api;

import bapjul.stay.GeoSample;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public record StayRequest(
    @NotNull Instant capturedAt,
    @NotNull @Size(min = 2, max = 128) List<@NotNull @Valid Sample> samples
) {
    public record Sample(
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @NotNull @DecimalMin("0") Double accuracyMeters,
        @NotNull @Min(0) Long elapsedRealtimeMillis
    ) {
        public GeoSample toGeoSample() {
            return new GeoSample(latitude, longitude, accuracyMeters, elapsedRealtimeMillis);
        }
    }
}
