import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.StringJoiner;

/** JDK 17: java scripts/DemoRequest.java [http://localhost:8080] */
class DemoRequest {
    public static void main(String[] args) throws Exception {
        String baseUrl = args.length == 0 ? "http://localhost:8080" : args[0].replaceAll("/+$", "");
        StringJoiner samples = new StringJoiner(",", "[", "]");
        for (int i = 0; i <= 20; i++) {
            samples.add("{\"latitude\":37.6195,\"longitude\":127.0598,\"accuracyMeters\":8.0,\"elapsedRealtimeMillis\":"
                + (1000000 + i * 15000) + "}");
        }
        String body = "{\"capturedAt\":\"" + Instant.now() + "\",\"samples\":" + samples + "}";
        HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/api/v1/location/stays/recommendations"))
            .timeout(Duration.ofSeconds(10)).header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        HttpResponse<String> response = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()
            .send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("HTTP " + response.statusCode());
        System.out.println(response.body());
        if (response.statusCode() != 200) System.exit(1);
    }
}
