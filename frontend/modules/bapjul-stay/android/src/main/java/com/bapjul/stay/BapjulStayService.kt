package com.bapjul.stay

import android.Manifest
import android.app.*
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.*
import android.net.Uri
import bapjul.stay.*
import bapjul.location.android.StayApiClient
import com.google.android.gms.location.*
import org.json.JSONObject

// JS 화면의 생명주기와 분리된 사용자 동의 기반 location foreground service.
// 원본 GPS와 토큰은 디스크에 기록하지 않고 프로세스 종료 시 함께 폐기합니다.
class BapjulStayService : Service() {
  companion object {
    private const val CHANNEL = "bapjul-stay"
    private const val NOTIFICATION = 5101
    @Volatile var status: JSONObject = JSONObject().put("running", false).put("phase", "stopped").put("message", "위치 수집이 꺼져 있어요.")
      private set
    fun publish(running: Boolean, phase: String, message: String, result: JSONObject? = null) {
      status = JSONObject().put("running", running).put("phase", phase).put("message", message)
        .put("updatedAt", System.currentTimeMillis()).put("recommendation", result ?: JSONObject.NULL)
    }
  }
  private val tracker = StayTracker()
  private val handler = Handler(Looper.getMainLooper())
  private lateinit var locations: FusedLocationProviderClient
  private var api: StayApiClient? = null
  private var token = ""
  private var active = false
  private var lastSampleElapsed = 0L
  private var confirmedPosition: GeoSample? = null
  private var generation = 0L
  private var pending = false

  private val watchdog = object : Runnable {
    override fun run() {
      if (!active) return
      if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
        publish(false, "error", "위치 권한이 변경돼 수집을 중지했어요.")
        stopSelf(); return
      }
      if (lastSampleElapsed != 0L && SystemClock.elapsedRealtime() - lastSampleElapsed > StayRules.MAX_SAMPLE_GAP_MILLIS) {
        tracker.reset(); confirmedPosition = null; generation++
        publish(true, "waiting", "GPS 관측이 끊겨 새 5분 구간을 기다리고 있어요.")
        lastSampleElapsed = 0L
      }
      handler.postDelayed(this, 15000)
    }
  }
  private val callback = object : LocationCallback() {
    override fun onLocationResult(result: LocationResult) {
      if (!active) return
      for (location in result.locations) {
        val now = SystemClock.elapsedRealtime()
        if (!location.hasAccuracy()) { invalidate("정확한 GPS 위치를 기다리고 있어요."); continue }
        try {
          val sample = GeoSample(location.latitude, location.longitude, location.accuracy.toDouble(), location.elapsedRealtimeNanos / 1000000)
          val gap = sample.elapsedRealtimeMillis - lastSampleElapsed
          if (sample.accuracyMeters > StayRules.DEFAULT.maxAccuracyMeters || now - sample.elapsedRealtimeMillis > StayRules.MAX_LOCAL_SAMPLE_AGE_MILLIS) {
            invalidate("GPS 오차가 커서 정확한 위치를 기다리고 있어요."); continue
          }
          if (lastSampleElapsed != 0L && gap <= 0) continue
          if (lastSampleElapsed != 0L && gap > StayRules.MAX_SAMPLE_GAP_MILLIS) invalidate("새 5분 체류 구간을 확인하고 있어요.")
          lastSampleElapsed = sample.elapsedRealtimeMillis
          val previous = confirmedPosition
          if (previous != null && GeoDistance.meters(previous, sample) > StayRules.DEFAULT.stayRadiusMeters) {
            confirmedPosition = null; generation++
            publish(true, "observing", "이동을 감지해 새 5분 체류 구간을 확인하고 있어요.")
          }
          val window = tracker.observe(sample, now)
          if (window.isPresent && !pending) {
            pending = true
            confirmedPosition = sample
            val requestGeneration = generation
            publish(true, "loading", "5분 체류를 확인했어요. 근처 식당을 조회하고 있어요.")
            api?.fetch(window.get(), location.time, token, object : StayApiClient.Callback {
              override fun onSuccess(response: JSONObject) {
                pending = false
                if (!active || generation != requestGeneration) return
                publish(true, "ready", if (response.optInt("count") > 0) "머무르고 있는 식당을 선택해 주세요." else "50m 안에 좌표가 등록된 식당이 없어요.", response)
                getSystemService(NotificationManager::class.java).notify(NOTIFICATION,
                  notification(if (response.optInt("count") > 0) "5분 체류를 확인했어요. 눌러서 입장한 식당을 선택해 주세요." else "50m 안에 좌표가 등록된 식당이 없어요."))
              }
              override fun onError(error: Exception) {
                pending = false
                if (!active || generation != requestGeneration) return
                if (error.message?.contains("HTTP 401") == true || error.message?.contains("HTTP 403") == true) {
                  publish(false, "error", "로그인이 만료돼 위치 수집을 중지했어요. 다시 로그인해 주세요.")
                  stopSelf(); return
                }
                // 오래된 위치를 재전송하지 않고 새 관측을 시작합니다.
                tracker.reset(); confirmedPosition = null; generation++
                publish(true, "error", "식당 조회에 실패했어요. 새 5분 구간을 관측하며 재시도해요.")
              }
            })
          }
        } catch (error: IllegalArgumentException) { invalidate("GPS 정보를 다시 확인하고 있어요.") }
      }
    }
  }
  private fun invalidate(message: String) {
    tracker.reset(); confirmedPosition = null; lastSampleElapsed = 0; generation++
    publish(true, "waiting", message)
  }
  override fun onCreate() {
    super.onCreate()
    locations = LocationServices.getFusedLocationProviderClient(this)
    getSystemService(NotificationManager::class.java).createNotificationChannel(
      NotificationChannel(CHANNEL, "식당 체류 확인", NotificationManager.IMPORTANCE_LOW))
  }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == "STOP") { stopSelf(); return START_NOT_STICKY }
    if (active) return START_NOT_STICKY
    val baseUrl = intent?.getStringExtra("baseUrl") ?: return START_NOT_STICKY
    token = intent.getStringExtra("token") ?: return START_NOT_STICKY
    try {
      val notification = notification("GPS로 5분 체류를 확인해요. 앱에서 식당을 선택해 주세요.")
      if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
      else startForeground(NOTIFICATION, notification)
      if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) throw SecurityException()
      api = StayApiClient(baseUrl); active = true
      publish(true, "observing", "같은 곳에서 5분 체류하는지 확인하고 있어요.")
      val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 15000)
        .setMinUpdateIntervalMillis(10000).setMaxUpdateDelayMillis(0).setWaitForAccurateLocation(true).build()
      locations.requestLocationUpdates(request, callback, Looper.getMainLooper()).addOnFailureListener {
        publish(false, "error", "GPS 수집을 시작하지 못했어요. 위치 설정을 확인해 주세요."); stopSelf()
      }
      handler.postDelayed(watchdog, 15000)
    } catch (error: Exception) {
      publish(false, "error", "위치 수집을 시작하지 못했어요. 권한과 위치 설정을 확인해 주세요."); stopSelf()
    }
    // 강제 종료/재부팅 후 몰래 재시작하지 않으며 사용자가 화면에서 다시 시작합니다.
    return START_NOT_STICKY
  }
  private fun notification(body: String): Notification {
    val launch = Intent(Intent.ACTION_VIEW, Uri.parse("bapjul://report")).setPackage(packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    val open = PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val stop = PendingIntent.getService(this, 1, Intent(this, BapjulStayService::class.java).setAction("STOP"), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    return Notification.Builder(this, CHANNEL)
      .setContentTitle("밥줄 · 식당 체류 확인 중")
      .setContentText(body)
      .setSmallIcon(android.R.drawable.ic_menu_mylocation).setOngoing(true)
      .setContentIntent(open).addAction(Notification.Action.Builder(null, "수집 중지", stop).build()).build()
  }
  override fun onDestroy() {
    active = false; generation++; token = ""
    handler.removeCallbacks(watchdog)
    locations.removeLocationUpdates(callback)
    api?.close(); api = null; tracker.reset(); confirmedPosition = null
    if (status.optString("phase") != "error") publish(false, "stopped", "위치 수집이 꺼져 있어요.")
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }
  override fun onBind(intent: Intent?): IBinder? = null
}
