package com.ireneliu.jingqihome.xr.content

import android.annotation.SuppressLint
import android.content.pm.ApplicationInfo
import android.content.Context
import android.graphics.Color
import android.net.Uri
import android.util.Log
import android.webkit.WebChromeClient
import android.webkit.ConsoleMessage
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceError
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import java.io.IOException

private const val TAG = "QuietHouseWebView"
private const val APP_ASSET_HOST = "appassets.androidplatform.net"
private const val APP_ASSET_ROOT = "/assets/web/"
private const val APP_START_URL = "https://$APP_ASSET_HOST${APP_ASSET_ROOT}index.html"

private class DiagnosticWebChromeClient : WebChromeClient() {
    override fun onConsoleMessage(message: ConsoleMessage): Boolean {
        Log.i(
            TAG,
            "JS ${message.messageLevel()} ${message.sourceId()}:${message.lineNumber()} ${message.message()}"
        )
        return true
    }
}

private class BundledAssetWebViewClient(context: Context) : WebViewClient() {
    private val assets = context.applicationContext.assets

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        val uri = request?.url ?: return null
        val assetPath = uri.toBundledAssetPath() ?: return null

        return try {
            WebResourceResponse(
                mimeType(assetPath),
                if (assetPath.isTextResource()) "UTF-8" else null,
                assets.open(assetPath)
            ).apply {
                responseHeaders = mapOf(
                    "Cache-Control" to "no-cache",
                    "Access-Control-Allow-Origin" to "https://$APP_ASSET_HOST"
                )
            }
        } catch (error: IOException) {
            Log.e(TAG, "Missing bundled web asset: $assetPath", error)
            null
        }
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        Log.i(TAG, "Bundled page loaded: $url")
        view?.postDelayed({
            view.evaluateJavascript(
                """
                (() => {
                  const canvas = document.querySelector('.scene canvas');
                  return JSON.stringify({
                    ready: document.readyState,
                    rootChildren: document.getElementById('root')?.childElementCount ?? -1,
                    canvasClient: canvas ? [canvas.clientWidth, canvas.clientHeight] : null,
                    canvasBacking: canvas ? [canvas.width, canvas.height] : null
                  });
                })()
                """.trimIndent()
            ) { result -> Log.i(TAG, "Page diagnostics: $result") }
        }, 1200)
    }

    override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?
    ) {
        super.onReceivedError(view, request, error)
        Log.e(
            TAG,
            "Web request failed mainFrame=${request?.isForMainFrame} url=${request?.url} " +
                "code=${error?.errorCode} description=${error?.description}"
        )
    }

    override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
        Log.e(TAG, "WebView renderer gone crashed=${detail?.didCrash()} priority=${detail?.rendererPriorityAtExit()}")
        return false
    }

    private fun Uri.toBundledAssetPath(): String? {
        if (scheme != "https" || host != APP_ASSET_HOST) return null
        val requestPath = path ?: return null
        if (!requestPath.startsWith(APP_ASSET_ROOT)) return null

        val relativePath = requestPath.removePrefix("/assets/")
        return relativePath.takeIf {
            it.startsWith("web/") && !it.split('/').contains("..")
        }
    }

    private fun String.isTextResource(): Boolean = when (substringAfterLast('.', "")) {
        "html", "js", "mjs", "css", "json", "webmanifest", "svg", "txt" -> true
        else -> false
    }

    private fun mimeType(path: String): String = when (path.substringAfterLast('.', "")) {
        "html" -> "text/html"
        "js", "mjs" -> "text/javascript"
        "css" -> "text/css"
        "json" -> "application/json"
        "webmanifest" -> "application/manifest+json"
        "svg" -> "image/svg+xml"
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "webp" -> "image/webp"
        "gif" -> "image/gif"
        "woff" -> "font/woff"
        "woff2" -> "font/woff2"
        else -> "application/octet-stream"
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun HomePage() {
    val context = LocalContext.current
    val webView = remember(context) {
        WebView.setWebContentsDebuggingEnabled(
            context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
        )
        WebView(context).apply {
            setBackgroundColor(Color.TRANSPARENT)
            webViewClient = BundledAssetWebViewClient(context)
            webChromeClient = DiagnosticWebChromeClient()
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.mediaPlaybackRequiresUserGesture = false
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            isFocusable = true
            isFocusableInTouchMode = true
            requestFocus()
            loadUrl(APP_START_URL)
        }
    }

    DisposableEffect(webView) {
        onDispose {
            webView.stopLoading()
            webView.webChromeClient = null
            webView.destroy()
        }
    }

    AndroidView(
        modifier = Modifier.size(width = 1280.dp, height = 800.dp),
        factory = { webView }
    )
}
