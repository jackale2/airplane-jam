package com.jackale2.airplanejam;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayGamesPlugin.class); // Google Play Games cloud save (see PlayGamesPlugin)
        super.onCreate(savedInstanceState);
        // Phones stay in portrait. Tablets, foldables and Chromebooks may rotate: the game has a
        // landscape layout (and Android 16 ignores orientation locks on large screens anyway).
        if (getResources().getConfiguration().smallestScreenWidthDp >= 600) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_FULL_USER);
        }
        // The back button goes to the game first (close a dialog, pause, go home). Only when the
        // game does not use it (on the home screen) does the app move to the background.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge == null || bridge.getWebView() == null) {
                    moveTaskToBack(true);
                    return;
                }
                bridge.getWebView().evaluateJavascript("(window.__onBack ? window.__onBack() : false)", (value) -> {
                    if (!"true".equals(value)) moveTaskToBack(true);
                });
            }
        });
    }
}
