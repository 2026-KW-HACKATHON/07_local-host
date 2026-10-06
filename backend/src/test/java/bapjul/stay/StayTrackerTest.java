package bapjul.stay;

import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;

class StayTrackerTest {
    private GeoSample sample(double meters, long time) {
        return new GeoSample(0, Math.toDegrees(meters / 6_378_137.0), 5, time);
    }
    private Optional<StayWindow> observe(StayTracker tracker, double meters, long time) {
        return tracker.observe(sample(meters, time), time);
    }
    private List<GeoSample> window(long end) {
        List<GeoSample> samples = new ArrayList<>();
        for (long t = 0; t < end; t += 15_000) samples.add(sample(0, t));
        samples.add(sample(0, end));
        return samples;
    }

    @Test void firesAtFiveMinutesNotFourMinutesFiftyNineSeconds() {
        StayTracker tracker = new StayTracker();
        for (long t = 0; t <= 285_000; t += 15_000) assertFalse(observe(tracker, 0, t).isPresent());
        assertFalse(observe(tracker, 0, 299_000).isPresent());
        StayWindow result = observe(tracker, 0, 300_000).orElseThrow(AssertionError::new);
        assertEquals(300_000, result.getDurationMillis());
        for (long t = 315_000; t <= 600_000; t += 15_000) assertFalse(observe(tracker, 0, t).isPresent());
    }

    @Test void smallGpsJitterDoesNotRestartStay() {
        StayTracker tracker = new StayTracker();
        observe(tracker, 0, 0);
        for (long t = 15_000; t < 300_000; t += 15_000) {
            assertFalse(observe(tracker, t % 30_000 == 0 ? 6 : -6, t).isPresent());
        }
        assertTrue(observe(tracker, 6, 300_000).isPresent());
    }

    @Test void movingLittleByLittleDoesNotCountAsStayingAtOnePlace() {
        StayTracker tracker = new StayTracker();
        for (int i = 0; i <= 20; i++) assertFalse(observe(tracker, i * 8, i * 15_000L).isPresent());
    }

    @Test void leavingThenReturningStartsANewWindow() {
        StayTracker tracker = new StayTracker();
        for (long t = 0; t <= 240_000; t += 15_000) observe(tracker, 0, t);
        observe(tracker, 50, 255_000);
        observe(tracker, 0, 270_000);
        for (long t = 285_000; t < 570_000; t += 15_000) assertFalse(observe(tracker, 0, t).isPresent());
        assertTrue(observe(tracker, 0, 570_000).isPresent());
    }

    @Test void missingObservationsDoNotCountAsFiveMinuteStay() {
        StayTracker tracker = new StayTracker();
        observe(tracker, 0, 0);
        assertFalse(observe(tracker, 0, 300_000).isPresent());
        for (long t = 315_000; t < 600_000; t += 15_000) assertFalse(observe(tracker, 0, t).isPresent());
        assertTrue(observe(tracker, 0, 600_000).isPresent());
    }

    @Test void lowAccuracyResetsAccumulatedTime() {
        StayTracker tracker = new StayTracker();
        for (long t = 0; t <= 270_000; t += 15_000) observe(tracker, 0, t);
        tracker.observe(new GeoSample(0, 0, 100, 285_000), 285_000);
        assertFalse(observe(tracker, 0, 300_000).isPresent());
    }

    @Test void staleAndFutureSamplesCannotTriggerAnEvent() {
        StayTracker tracker = new StayTracker();
        for (long t = 0; t <= 285_000; t += 15_000) observe(tracker, 0, t);
        assertFalse(tracker.observe(sample(0, 300_000), 340_000).isPresent());
        assertFalse(tracker.observe(sample(0, 400_000), 350_000).isPresent());
    }

    @Test void duplicateOrReversedSamplesDoNotAdvanceTheClock() {
        StayTracker tracker = new StayTracker();
        for (long t = 0; t <= 285_000; t += 15_000) observe(tracker, 0, t);
        assertFalse(tracker.observe(sample(0, 285_000), 290_000).isPresent());
        assertFalse(tracker.observe(sample(0, 280_000), 290_000).isPresent());
        assertTrue(observe(tracker, 0, 300_000).isPresent());
    }

    @Test void newVisitCanFireAfterFirstVisitEnds() {
        StayTracker tracker = new StayTracker();
        for (long t = 0; t < 300_000; t += 15_000) observe(tracker, 0, t);
        assertTrue(observe(tracker, 0, 300_000).isPresent());
        observe(tracker, 100, 315_000);
        for (long t = 330_000; t < 615_000; t += 15_000) observe(tracker, 100, t);
        assertTrue(observe(tracker, 100, 615_000).isPresent());
    }

    @Test void trackersDoNotShareStateBetweenUsers() {
        StayTracker a = new StayTracker();
        StayTracker b = new StayTracker();
        for (long t = 0; t <= 285_000; t += 15_000) observe(a, 0, t);
        assertFalse(observe(b, 0, 300_000).isPresent());
        assertTrue(observe(a, 0, 300_000).isPresent());
    }

    @Test void validatorChecksIntermediatePositionsAndGaps() {
        StayWindowValidator validator = new StayWindowValidator(StayRules.DEFAULT);
        List<GeoSample> moved = window(300_000);
        moved.set(10, sample(50, 150_000));
        assertThrows(IllegalArgumentException.class, () -> validator.validate(moved));
        List<GeoSample> gap = new ArrayList<>();
        gap.add(sample(0, 0)); gap.add(sample(0, 300_000));
        assertThrows(IllegalArgumentException.class, () -> validator.validate(gap));
    }

    @Test void validatorRejectsShortDuplicateAndPoorAccuracyWindows() {
        StayWindowValidator validator = new StayWindowValidator(StayRules.DEFAULT);
        assertThrows(IllegalArgumentException.class, () -> validator.validate(window(299_999)));
        List<GeoSample> duplicate = window(300_000);
        duplicate.set(10, sample(0, 135_000));
        assertThrows(IllegalArgumentException.class, () -> validator.validate(duplicate));
        List<GeoSample> poor = window(300_000);
        poor.set(10, new GeoSample(0, 0, 21, 150_000));
        assertThrows(IllegalArgumentException.class, () -> validator.validate(poor));
    }

    @Test void validatorAllowsStayRadiusBoundaryAndRejectsJustOutside() {
        StayWindowValidator validator = new StayWindowValidator(StayRules.DEFAULT);
        List<GeoSample> valid = window(300_000);
        valid.set(20, sample(20, 300_000));
        assertEquals(300_000, validator.validate(valid).getDurationMillis());
        valid.set(20, sample(20.001, 300_000));
        assertThrows(IllegalArgumentException.class, () -> validator.validate(valid));
    }

    @Test void invalidCoordinatesCannotEnterTheDetector() {
        assertThrows(IllegalArgumentException.class, () -> new GeoSample(Double.NaN, 0, 1, 0));
        assertThrows(IllegalArgumentException.class, () -> new GeoSample(91, 0, 1, 0));
        assertThrows(IllegalArgumentException.class, () -> new GeoSample(0, 181, 1, 0));
        assertThrows(IllegalArgumentException.class, () -> new GeoSample(0, 0, Double.POSITIVE_INFINITY, 0));
    }
}
