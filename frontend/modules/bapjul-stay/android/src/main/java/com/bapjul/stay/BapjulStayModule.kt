package com.bapjul.stay

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BapjulStayModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BapjulStay")
    Function("getStatus") {
      BapjulStayService.readStatus()
    }
    Function("setAppActive") { active: Boolean ->
      BapjulStayService.appActive = active
    }
    AsyncFunction("start") { baseUrl: String, token: String ->
      if (Build.VERSION.SDK_INT < 26) throw IllegalStateException("체류 확인은 Android 8 이상에서 사용할 수 있어요.")
      val context = appContext.reactContext ?: throw IllegalStateException("앱이 준비되지 않았어요.")
      val activity = appContext.currentActivity ?: throw IllegalStateException("앱 화면에서 시작해 주세요.")
      if (context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
        throw SecurityException("정확한 위치 권한이 필요해요.")
      }
      if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
        throw SecurityException("위치 수집 중임을 표시할 알림 권한이 필요해요.")
      }
      if (!baseUrl.startsWith("https://") && !(context.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0 &&
          (baseUrl.startsWith("http://10.0.2.2:") || baseUrl.startsWith("http://127.0.0.1:")))) {
        throw SecurityException("실제 앱의 위치 전송에는 HTTPS 서버가 필요해요.")
      }
      if (token.isBlank()) throw SecurityException("로그인 후 시작해 주세요.")
      val intent = Intent(activity, BapjulStayService::class.java).putExtra("baseUrl", baseUrl).putExtra("token", token)
      activity.runOnUiThread {
        try { activity.startForegroundService(intent) }
        catch (error: Exception) { BapjulStayService.publish(false, "error", "위치 수집을 시작하지 못했어요. 앱 화면에서 다시 시도해 주세요.") }
      }
    }
    AsyncFunction("stop") {
      val context = appContext.reactContext ?: throw IllegalStateException("앱이 준비되지 않았어요.")
      context.stopService(Intent(context, BapjulStayService::class.java))
      BapjulStayService.publish(false, "stopped", "위치 수집이 꺼져 있어요.")
    }
  }
}
