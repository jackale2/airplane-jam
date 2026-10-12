package com.codeccraft.airplanejam;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Android haptics with a real amplitude and the platform's predefined effects, which @capacitor/haptics
 * cannot do. Mirrors the decision tree the studied game uses: predefined effect on API 29+, else a one-shot
 * with amplitude on API 26+, else a plain timed buzz. Any failure is swallowed (haptics are best-effort).
 */
@CapacitorPlugin(name = "AmplitudeHaptics")
public class AmplitudeHapticsPlugin extends Plugin {
    private Vibrator vibrator() {
        Context c = getContext();
        if (Build.VERSION.SDK_INT >= 31) {
            VibratorManager m = (VibratorManager) c.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return m == null ? null : m.getDefaultVibrator();
        }
        return (Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
    }

    /** { ms, amplitude (1..255, 0 = device default), effect (android predefined id, -1 = none) } */
    @PluginMethod
    public void play(PluginCall call) {
        Vibrator v = vibrator();
        if (v == null || !v.hasVibrator()) {
            call.resolve();
            return;
        }
        long ms = Math.max(1, call.getInt("ms", 20));
        int amp = call.getInt("amplitude", 0);
        int effect = call.getInt("effect", -1);
        try {
            if (Build.VERSION.SDK_INT >= 29 && effect >= 0) {
                v.vibrate(VibrationEffect.createPredefined(effect));
            } else if (Build.VERSION.SDK_INT >= 26 && amp >= 1) {
                v.vibrate(VibrationEffect.createOneShot(ms, Math.min(255, amp)));
            } else {
                v.vibrate(ms);
            }
        } catch (Exception ignored) {
            // best-effort
        }
        call.resolve();
    }

    /** { timings: ms[], amplitudes: 0..255[] } — alternating off/on, same length. */
    @PluginMethod
    public void pattern(PluginCall call) {
        Vibrator v = vibrator();
        JSArray t = call.getArray("timings");
        JSArray a = call.getArray("amplitudes");
        if (v == null || !v.hasVibrator() || t == null) {
            call.resolve();
            return;
        }
        try {
            long[] timings = new long[t.length()];
            for (int i = 0; i < timings.length; i++) timings[i] = t.getLong(i);
            if (Build.VERSION.SDK_INT >= 26 && a != null && a.length() == timings.length) {
                int[] amps = new int[timings.length];
                for (int i = 0; i < amps.length; i++) amps[i] = Math.max(0, Math.min(255, a.getInt(i)));
                v.vibrate(VibrationEffect.createWaveform(timings, amps, -1));
            } else {
                v.vibrate(timings, -1);
            }
        } catch (Exception ignored) {
            // best-effort
        }
        call.resolve();
    }

    @PluginMethod
    public void available(PluginCall call) {
        Vibrator v = vibrator();
        JSObject o = new JSObject();
        o.put("value", v != null && v.hasVibrator());
        call.resolve(o);
    }
}
