package bapjul.location.android;

import android.os.Handler;
import android.os.Looper;
import bapjul.stay.GeoSample;
import bapjul.stay.StayWindow;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** 네트워크는 작업 스레드에서 실행하고 결과만 메인 스레드로 전달한다. API 26+ 예제. */
public final class StayApiClient implements AutoCloseable {
    public interface Callback {
        void onSuccess(JSONObject response);
        void onError(Exception error);
    }
    private final String baseUrl;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private volatile boolean closed;

    public StayApiClient(String baseUrl) { this.baseUrl = baseUrl.replaceAll("/+$", ""); }

    public void fetch(StayWindow window, long capturedAtEpochMillis, String bearerToken, Callback callback) {
        if (closed) throw new IllegalStateException("종료된 API 클라이언트입니다.");
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                JSONArray points = new JSONArray();
                for (GeoSample point : window.getSamples()) {
                    points.put(new JSONObject()
                        .put("latitude", point.getLatitude()).put("longitude", point.getLongitude())
                        .put("accuracyMeters", point.getAccuracyMeters())
                        .put("elapsedRealtimeMillis", point.getElapsedRealtimeMillis()));
                }
                JSONObject request = new JSONObject()
                    .put("capturedAt", Instant.ofEpochMilli(capturedAtEpochMillis).toString()).put("samples", points);
                URL url = new URL(baseUrl + "/api/v1/location/stays/recommendations");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(5_000); connection.setReadTimeout(10_000);
                connection.setInstanceFollowRedirects(false);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                if (bearerToken != null && !bearerToken.isEmpty()) connection.setRequestProperty("Authorization", "Bearer " + bearerToken);
                connection.setDoOutput(true);
                byte[] body = request.toString().getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(body.length);
                try (OutputStream out = connection.getOutputStream()) { out.write(body); }
                int status = connection.getResponseCode();
                if (status != 200) throw new IOException("식당 조회 실패: HTTP " + status);
                StringBuilder responseText = new StringBuilder();
                try (Reader reader = new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8)) {
                    char[] buffer = new char[2048];
                    int n;
                    while ((n = reader.read(buffer)) != -1) {
                        responseText.append(buffer, 0, n);
                        if (responseText.length() > 65_536) throw new IOException("응답 크기가 예상 범위를 넘었습니다.");
                    }
                }
                JSONObject response = new JSONObject(responseText.toString());
                main.post(() -> { if (!closed) callback.onSuccess(response); });
            } catch (Exception error) {
                main.post(() -> { if (!closed) callback.onError(error); });
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }
    @Override public void close() { closed = true; executor.shutdownNow(); }
}
