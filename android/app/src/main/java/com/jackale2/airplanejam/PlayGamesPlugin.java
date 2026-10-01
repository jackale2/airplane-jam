package com.jackale2.airplanejam;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.SnapshotsClient;
import com.google.android.gms.games.snapshot.Snapshot;
import com.google.android.gms.games.snapshot.SnapshotMetadataChange;
import java.nio.charset.StandardCharsets;

/**
 * Google Play Games Services v2 for the web game: sign-in state and one Saved Games slot holding the
 * save file as JSON. Everything is optional: without a Play Games project id (see README) the plugin
 * reports itself unavailable and the game keeps its save on the device only.
 */
@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {

    private boolean available = false;

    @Override
    public void load() {
        String id = getContext().getString(R.string.game_services_project_id).trim();
        if (!id.matches("\\d{6,}")) return;
        try {
            PlayGamesSdk.initialize(getContext());
            available = true;
        } catch (RuntimeException e) {
            available = false;
        }
    }

    private boolean ready(PluginCall call) {
        if (!available) {
            call.reject("Play Games is not configured", "UNAVAILABLE");
            return false;
        }
        if (getActivity() == null) {
            call.reject("No activity", "UNAVAILABLE");
            return false;
        }
        return true;
    }

    /** { available, signedIn, player? } */
    @PluginMethod
    public void status(PluginCall call) {
        if (!available || getActivity() == null) {
            call.resolve(state(false, null));
            return;
        }
        GamesSignInClient client = PlayGames.getGamesSignInClient(getActivity());
        client.isAuthenticated().addOnCompleteListener(task -> {
            boolean ok = task.isSuccessful() && task.getResult() != null && task.getResult().isAuthenticated();
            resolveWithPlayer(call, ok);
        });
    }

    /** Shows the Play Games sign-in flow (only needed when the automatic sign-in at launch did not happen). */
    @PluginMethod
    public void signIn(PluginCall call) {
        if (!ready(call)) return;
        GamesSignInClient client = PlayGames.getGamesSignInClient(getActivity());
        client.signIn().addOnCompleteListener(task -> {
            boolean ok = task.isSuccessful() && task.getResult() != null && task.getResult().isAuthenticated();
            resolveWithPlayer(call, ok);
        });
    }

    /** { data: string | null } for the named slot. */
    @PluginMethod
    public void load(PluginCall call) {
        if (!ready(call)) return;
        String name = call.getString("name", "progress");
        SnapshotsClient snapshots = PlayGames.getSnapshotsClient(getActivity());
        snapshots
            .open(name, true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED)
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful() || task.getResult() == null) {
                    call.reject(error(task.getException(), "Could not open the saved game"), "IO");
                    return;
                }
                SnapshotsClient.DataOrConflict<Snapshot> result = task.getResult();
                if (result.isConflict() || result.getData() == null) {
                    call.reject("Saved game conflict", "CONFLICT");
                    return;
                }
                Snapshot snapshot = result.getData();
                JSObject out = new JSObject();
                try {
                    byte[] bytes = snapshot.getSnapshotContents().readFully();
                    out.put("data", bytes == null || bytes.length == 0 ? null : new String(bytes, StandardCharsets.UTF_8));
                } catch (Exception e) {
                    snapshots.discardAndClose(snapshot);
                    call.reject(error(e, "Could not read the saved game"), "IO");
                    return;
                }
                snapshots.discardAndClose(snapshot);
                call.resolve(out);
            });
    }

    /** Writes { name, data, description } to the slot. */
    @PluginMethod
    public void save(PluginCall call) {
        if (!ready(call)) return;
        String name = call.getString("name", "progress");
        String data = call.getString("data");
        String description = call.getString("description", "Airplane Jam progress");
        if (data == null) {
            call.reject("No data");
            return;
        }
        SnapshotsClient snapshots = PlayGames.getSnapshotsClient(getActivity());
        snapshots
            .open(name, true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED)
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful() || task.getResult() == null || task.getResult().isConflict() || task.getResult().getData() == null) {
                    call.reject(error(task.getException(), "Could not open the saved game"), "IO");
                    return;
                }
                Snapshot snapshot = task.getResult().getData();
                snapshot.getSnapshotContents().writeBytes(data.getBytes(StandardCharsets.UTF_8));
                SnapshotMetadataChange change = new SnapshotMetadataChange.Builder().setDescription(description).build();
                snapshots.commitAndClose(snapshot, change).addOnCompleteListener(commit -> {
                    if (commit.isSuccessful()) call.resolve();
                    else call.reject(error(commit.getException(), "Could not write the saved game"), "IO");
                });
            });
    }

    private void resolveWithPlayer(PluginCall call, boolean signedIn) {
        Activity activity = getActivity();
        if (!signedIn || activity == null) {
            call.resolve(state(false, null));
            return;
        }
        PlayGames.getPlayersClient(activity).getCurrentPlayer().addOnCompleteListener(p -> {
            String player = p.isSuccessful() && p.getResult() != null ? p.getResult().getDisplayName() : null;
            call.resolve(state(true, player));
        });
    }

    private JSObject state(boolean signedIn, String player) {
        JSObject out = new JSObject();
        out.put("available", available);
        out.put("signedIn", signedIn);
        if (player != null) out.put("player", player);
        return out;
    }

    private static String error(Exception e, String fallback) {
        return e != null && e.getMessage() != null ? e.getMessage() : fallback;
    }
}
