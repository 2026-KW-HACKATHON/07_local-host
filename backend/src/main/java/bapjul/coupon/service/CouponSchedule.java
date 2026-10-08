package bapjul.coupon.service;
import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;
/** Weekdays use ISO Monday=1..Sunday=7. A crossing-midnight slot retains its start-day weekday. */
public final class CouponSchedule {
    private static final ZoneId SEOUL=ZoneId.of("Asia/Seoul");
    private CouponSchedule() {}
    public static String days(List<Integer> days) {
        if(days==null || days.isEmpty()) return "";
        if(days.stream().anyMatch(n->n==null || n<1 || n>7)) throw new IllegalArgumentException("사용 요일은 1~7입니다.");
        return days.stream().distinct().sorted().map(String::valueOf).collect(Collectors.joining(","));
    }
    public static String ranges(List<String> ranges) {
        if(ranges==null || ranges.isEmpty()) return "";
        if(ranges.size()>10) throw new IllegalArgumentException("시간 구간은 최대 10개입니다.");
        for(String range:ranges) { parse(range); }
        return String.join(";",ranges);
    }
    private static LocalTime[] parse(String range) {
        try {
            if(range==null || !range.matches("\\d{2}:\\d{2}-\\d{2}:\\d{2}")) throw new IllegalArgumentException("시간은 HH:mm-HH:mm 형식입니다.");
            LocalTime a=LocalTime.parse(range.substring(0,5)), b=LocalTime.parse(range.substring(6,11));
            if(a.equals(b)) throw new IllegalArgumentException("시작과 종료 시간이 같을 수 없습니다.");
            return new LocalTime[]{a,b};
        } catch(DateTimeParseException ex) { throw new IllegalArgumentException("시간 형식을 확인해 주세요."); }
    }
    private static boolean dayAllowed(String csv,int day) {
        return csv==null || csv.isBlank() || Arrays.asList(csv.split(",")).contains(String.valueOf(day));
    }
    public static boolean allowed(Instant instant,String days,String ranges) {
        ZonedDateTime when=instant.atZone(SEOUL);
        int today=when.getDayOfWeek().getValue(),yesterday=today==1?7:today-1;
        LocalTime now=when.toLocalTime();
        if(ranges==null || ranges.isBlank()) return dayAllowed(days,today);
        for(String s:ranges.split(";")) {
            LocalTime[] pair=parse(s);
            if(pair[0].isBefore(pair[1])) {
                if(dayAllowed(days,today) && !now.isBefore(pair[0]) && now.isBefore(pair[1])) return true;
            } else {
                if((dayAllowed(days,today) && !now.isBefore(pair[0])) ||
                   (dayAllowed(days,yesterday) && now.isBefore(pair[1]))) return true;
            }
        }
        return false;
    }
    public static boolean postOpen(LocalDate endDate,Instant now) {
        return endDate==null || !now.atZone(SEOUL).toLocalDate().isAfter(endDate);
    }
}
